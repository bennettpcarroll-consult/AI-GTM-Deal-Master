import { scenarioFor, signalDefinitions, type Curriculum } from './curriculum/load';
import type { ClusterId, RoomRules, Rubric, SignalId, Skill, Tier, Vertical, VerticalId } from './curriculum/schema';
import { composeScenario, type ScenarioPayload, type SessionMode } from './composer';
import { sendLearnerMessage, startSimulation, type SimContext, type SimState, type Turn } from './simulator';
import { buildSkillProbes } from './skills';

/**
 * The zero-typing deal room. Each beat offers three moves: one elite, one weak and one trap.
 * The chosen line runs through the buyer simulator, so buyer proof still comes only from
 * buyer turns. A hidden buyer state (trust, risk alarm, urgency) reacts to each move:
 * traps raise the risk alarm until the buyer objects, and in a boss fight a buyer who
 * loses all trust ends the meeting.
 */

export type MoveKind = 'elite' | 'weak' | 'trap';
export type BeatKind = 'rep' | 'open' | 'pin' | 'objection';

export interface Move {
  kind: MoveKind;
  text: string;
}

export interface Beat {
  id: string;
  kind: BeatKind;
  skillId: string | null;
  signal: SignalId | null;
  /** Already shuffled, so the elite move is not always first. */
  moves: Move[];
}

export type PlanItem =
  | { kind: 'rep'; skillId: string }
  | { kind: 'signal'; skillId: string; signal: SignalId }
  | { kind: 'evidence'; skillId: string };

export interface Mood {
  trust: number;
  risk: number;
  urgency: number;
}

export interface Pick {
  beatId: string;
  beatKind: BeatKind;
  skillId: string | null;
  signal: SignalId | null;
  kind: MoveKind;
  text: string;
  elite: string;
  /** What the buyer had just said when the learner chose. */
  prompt: string;
}

export interface RoomState {
  sim: SimState;
  mood: Mood;
  plan: PlanItem[];
  cursor: number;
  attempts: number;
  objection: string | null;
  objectionIndex: number;
  picks: Pick[];
  walkedOut: boolean;
}

export interface RoomContext {
  sim: SimContext;
  rules: RoomRules;
  curriculum: Curriculum;
  vertical: Vertical;
  mode: SessionMode;
  objections: string[];
  roles: string[];
  labelFor: (key: string) => string;
}

export interface Outcome {
  kind: MoveKind;
  beatKind: BeatKind;
  verdict: string;
  why: string;
  elite: string;
  /** The buyer turn that counts as evidence from this move, if any. */
  evidence: { turnId: string; quote: string; level: 'partial' | 'verbatim'; label: string } | null;
  trust: 'up' | 'down';
}

/** Openers set up the meeting and closers lock the next step. Everything else sits between signals. */
const OPENERS = ['upfront_contract', 'account_research', 'commercial_insight', 'answer_first'];
const CLOSERS = ['ramp_commit', 'adoption_plan', 'next_step_control'];
/** Discovery order for a boss fight: pain and numbers first, paper last. */
const BOSS_SIGNAL_ORDER: SignalId[] = ['identify_pain', 'metrics', 'decision_criteria', 'competition', 'champion', 'economic_buyer', 'decision_process', 'paper_process'];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function skillOf(curriculum: Curriculum, id: string): Skill {
  const skill = curriculum.skills.find((candidate) => candidate.id === id);
  if (!skill) throw new Error(`Unknown skill "${id}"`);
  return skill;
}

export function buildPlan(curriculum: Curriculum, rubric: Rubric, mode: SessionMode, drillIndex: number): PlanItem[] {
  const drills = mode === 'boss' ? rubric.drills : rubric.drills.slice(drillIndex, drillIndex + 1);
  if (drills.length === 0) throw new Error(`Tier ${rubric.tier} has no drill at index ${drillIndex}`);
  const signals =
    mode === 'boss' ? BOSS_SIGNAL_ORDER : [...new Set(drills.flatMap((drill) => drill.target_signals))];
  const practiced = [...new Set(drills.flatMap((drill) => drill.practices_skills))].filter(
    (id) => !curriculum.skills.find((skill) => skill.id === id)?.signal
  );
  const toItem = (id: string): PlanItem => (skillOf(curriculum, id).probes ? { kind: 'evidence', skillId: id } : { kind: 'rep', skillId: id });
  const openers = practiced.filter((id) => OPENERS.includes(id)).map(toItem);
  const closers = practiced.filter((id) => CLOSERS.includes(id)).map(toItem);
  const middle = practiced.filter((id) => !OPENERS.includes(id) && !CLOSERS.includes(id)).map(toItem);
  const signalItems: PlanItem[] = signals.map((signal) => {
    const skill = curriculum.skills.find((candidate) => candidate.signal === signal);
    if (!skill) throw new Error(`No skill for signal ${signal}`);
    return { kind: 'signal', skillId: skill.id, signal };
  });
  const body: PlanItem[] = [];
  const length = Math.max(signalItems.length, middle.length);
  for (let i = 0; i < length; i += 1) {
    if (signalItems[i]) body.push(signalItems[i]!);
    if (middle[i]) body.push(middle[i]!);
  }
  return [...openers, ...body, ...closers];
}

function addBuyerTurn(sim: SimState, turn: Omit<Turn, 'id' | 'speaker'>): SimState {
  const full: Turn = { id: `turn-${sim.turns.length + 1}`, speaker: 'buyer', ...turn };
  return { ...sim, turns: [...sim.turns, full] };
}

function itemDone(rs: RoomState, item: PlanItem): boolean {
  if (item.kind === 'signal') return rs.sim.bindings[item.signal].bars === 4;
  if (item.kind === 'evidence') return rs.sim.skillEvidence[item.skillId]?.level === 'verbatim';
  return false;
}

function repLines(rc: RoomContext, skillId: string): { buyer: string; strong: string } {
  const skill = skillOf(rc.curriculum, skillId);
  const override = rc.vertical.rep_overrides?.[skillId];
  return { buyer: override?.buyer_line ?? skill.rep.buyer_line, strong: override?.strong ?? skill.talk_track.strong };
}

/** Skips finished items, then has the buyer set up the next rep beat with its own line. */
function settle(rc: RoomContext, rs: RoomState): RoomState {
  let next = rs;
  while (next.cursor < next.plan.length && itemDone(next, next.plan[next.cursor]!)) {
    next = { ...next, cursor: next.cursor + 1, attempts: 0 };
  }
  const item = next.plan[next.cursor];
  if (!next.objection && !next.walkedOut && item?.kind === 'rep') {
    const { buyer } = repLines(rc, item.skillId);
    const lastBuyer = [...next.sim.turns].reverse().find((turn) => turn.speaker === 'buyer');
    if (lastBuyer?.content !== buyer) {
      const role = rc.roles[next.sim.turns.length % rc.roles.length] ?? 'Buyer';
      next = { ...next, sim: addBuyerTurn(next.sim, { speakerRole: role, content: buyer }) };
    }
  }
  return next;
}

export function startRoom(rc: RoomContext, sim: SimState, plan: PlanItem[]): RoomState {
  return settle(rc, {
    sim,
    mood: { ...rc.rules.mood.start },
    plan,
    cursor: 0,
    attempts: 0,
    objection: null,
    objectionIndex: 0,
    picks: [],
    walkedOut: false
  });
}

export function roomDone(rs: RoomState): boolean {
  return rs.walkedOut || (rs.cursor >= rs.plan.length && !rs.objection);
}

function shuffle(moves: Move[], seed: string): Move[] {
  const order = moves.map((_, index) => index).sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`));
  return order.map((index) => moves[index]!);
}

export function currentBeat(rc: RoomContext, rs: RoomState): Beat | null {
  if (roomDone(rs)) return null;
  if (rs.objection) {
    const id = `objection-${rs.objectionIndex}`;
    const lines = rc.rules.objection_moves;
    return {
      id,
      kind: 'objection',
      skillId: 'objection_handling',
      signal: null,
      moves: shuffle(
        [
          { kind: 'elite', text: lines.elite },
          { kind: 'weak', text: lines.weak },
          { kind: 'trap', text: lines.trap }
        ],
        `${id}:${rs.attempts}`
      )
    };
  }
  const item = rs.plan[rs.cursor];
  if (!item) return null;
  const skill = skillOf(rc.curriculum, item.skillId);
  let kind: BeatKind;
  let moves: Move[];
  if (item.kind === 'rep') {
    kind = 'rep';
    moves = [
      { kind: 'elite', text: repLines(rc, item.skillId).strong },
      { kind: 'weak', text: skill.talk_track.weak },
      { kind: 'trap', text: skill.rep.off_move }
    ];
  } else {
    const opened = item.kind === 'signal' ? rs.sim.bindings[item.signal].bars === 3 : Boolean(rs.sim.skillEvidence[item.skillId]);
    const ladder = item.kind === 'signal' ? rc.vertical.talk_tracks[item.signal] : { open: skill.talk_track.strong, pin: skill.talk_track.pin ?? skill.talk_track.strong };
    kind = opened ? 'pin' : 'open';
    moves = opened
      ? [
          { kind: 'elite', text: ladder.pin },
          { kind: 'weak', text: skill.talk_track.settle ?? skill.talk_track.weak },
          { kind: 'trap', text: skill.talk_track.assume ?? skill.rep.off_move }
        ]
      : [
          { kind: 'elite', text: ladder.open },
          { kind: 'weak', text: skill.talk_track.weak },
          { kind: 'trap', text: skill.rep.off_move }
        ];
  }
  const id = `${rs.cursor}-${kind}-${item.skillId}`;
  return { id, kind, skillId: item.skillId, signal: item.kind === 'signal' ? item.signal : null, moves: shuffle(moves, `${id}:${rs.attempts}`) };
}

const clamp = (value: number) => Math.max(0, Math.min(100, value));

/** Progress in beats: a rep is one beat, a signal or a consumption number is two (open, then pin). */
export function roomProgress(rs: RoomState): { value: number; max: number } {
  const units = (item: PlanItem) => (item.kind === 'rep' ? 1 : 2);
  const max = rs.plan.reduce((sum, item) => sum + units(item), 0);
  let value = rs.plan.slice(0, rs.cursor).reduce((sum, item) => sum + units(item), 0);
  const item = rs.plan[rs.cursor];
  if (item && item.kind === 'signal' && rs.sim.bindings[item.signal].bars === 3) value += 1;
  if (item && item.kind === 'evidence' && rs.sim.skillEvidence[item.skillId]) value += 1;
  return { value: rs.walkedOut ? max : Math.min(value, max), max };
}

function lastBuyerLine(sim: SimState): string {
  return [...sim.turns].reverse().find((turn) => turn.speaker === 'buyer')?.content ?? '';
}

export function chooseMove(rc: RoomContext, rs: RoomState, index: number): { state: RoomState; outcome: Outcome } {
  const beat = currentBeat(rc, rs);
  const move = beat?.moves[index];
  if (!beat || !move) throw new Error('No move to choose');
  const elite = beat.moves.find((candidate) => candidate.kind === 'elite')!.text;
  const rules = rc.rules;
  const reactions = rules.reactions[move.kind];
  const reaction = reactions[rs.picks.length % reactions.length];
  const before = rs.sim;
  const sim = sendLearnerMessage(rc.sim, before, move.text, { reaction });

  const effect = rules.effects[move.kind];
  const handled = beat.kind === 'objection' && move.kind === 'elite';
  const mood: Mood = {
    trust: clamp(rs.mood.trust + effect.trust),
    risk: clamp(rs.mood.risk + effect.risk - (handled ? 25 : 0)),
    urgency: clamp(rs.mood.urgency + effect.urgency)
  };
  const pick: Pick = {
    beatId: beat.id,
    beatKind: beat.kind,
    skillId: beat.skillId,
    signal: beat.signal,
    kind: move.kind,
    text: move.text,
    elite,
    prompt: rs.objection ?? lastBuyerLine(before)
  };

  let next: RoomState = { ...rs, sim, mood, picks: [...rs.picks, pick] };
  const boss = rc.mode === 'boss';
  const item = rs.plan[rs.cursor];

  // Evidence this move produced for the beat's own target.
  let evidence: Outcome['evidence'] = null;
  if (item && beat.kind !== 'objection' && beat.kind !== 'rep') {
    if (item.kind === 'signal' && sim.bindings[item.signal].bars !== before.bindings[item.signal].bars) {
      const binding = sim.bindings[item.signal];
      const turn = sim.turns.find((candidate) => candidate.id === binding.transcript_turn_id);
      if (turn) evidence = { turnId: turn.id, quote: turn.content, level: binding.bars === 4 ? 'verbatim' : 'partial', label: rc.labelFor(item.signal) };
    }
    if (item.kind === 'evidence' && sim.skillEvidence[item.skillId]?.level !== before.skillEvidence[item.skillId]?.level) {
      const found = sim.skillEvidence[item.skillId]!;
      const turn = sim.turns.find((candidate) => candidate.id === found.transcript_turn_id);
      if (turn) evidence = { turnId: turn.id, quote: turn.content, level: found.level, label: rc.labelFor(item.skillId) };
    }
  }

  if (beat.kind === 'objection') {
    // A drill keeps the objection open until it is handled. A boss fight moves on either way.
    if (handled || boss) next = { ...next, objection: null, attempts: 0, objectionIndex: next.objectionIndex + 1 };
    else next = { ...next, attempts: next.attempts + 1 };
  } else if (beat.kind === 'rep') {
    if (move.kind === 'elite' || boss) next = { ...next, cursor: next.cursor + 1, attempts: 0 };
    else next = { ...next, attempts: next.attempts + 1 };
  } else if (evidence) {
    next = { ...next, attempts: 0 };
  } else if (boss || move.kind === 'elite') {
    // A boss fight never repeats a missed beat. An elite line that earns nothing also moves on, so a gap in the content cannot trap the learner.
    next = { ...next, cursor: next.cursor + 1, attempts: 0 };
  } else {
    next = { ...next, attempts: next.attempts + 1 };
  }

  // The hidden buyer state talks back: a raised risk alarm becomes an objection, and boss fights add pressure on a beat.
  const cadence = boss && next.picks.length % rules.mood.boss_objection_every === 0;
  if (!next.objection && beat.kind !== 'objection' && (mood.risk >= rules.mood.objection_risk || cadence) && rc.objections.length > 0) {
    const text = rc.objections[next.objectionIndex % rc.objections.length]!;
    const role = rc.roles[next.objectionIndex % rc.roles.length] ?? 'Buyer';
    next = { ...next, objection: text, sim: addBuyerTurn(next.sim, { speakerRole: role, content: text, objection: true }) };
  }
  if (boss && mood.trust <= rules.mood.walkout_trust) {
    const role = rc.roles[0] ?? 'Buyer';
    next = { ...next, objection: null, walkedOut: true, sim: addBuyerTurn(next.sim, { speakerRole: role, content: rules.walkout }) };
  }
  next = settle(rc, next);

  const skill = beat.skillId ? rc.curriculum.skills.find((candidate) => candidate.id === beat.skillId) : undefined;
  const verdict =
    move.kind === 'weak'
      ? rules.verdicts.weak
      : move.kind === 'trap'
        ? rules.verdicts.trap
        : beat.kind === 'objection'
          ? rules.verdicts.objection
          : evidence?.level === 'verbatim'
            ? `${evidence.label} ${rules.verdicts.proven}`
            : evidence
              ? rules.verdicts.partial
              : rules.verdicts.rep;
  return {
    state: next,
    outcome: {
      kind: move.kind,
      beatKind: beat.kind,
      verdict,
      why: beat.kind === 'objection' ? rules.objection_why : (skill?.talk_track.move ?? ''),
      elite,
      evidence,
      trust: effect.trust >= 0 ? 'up' : 'down'
    }
  };
}

/** How the buyer feels at the end, in words. The numbers stay hidden. */
export function trustLabel(mood: Mood, walkedOut: boolean): string {
  if (walkedOut) return 'Lost';
  if (mood.trust >= 75) return 'High';
  if (mood.trust >= 45) return 'Steady';
  return 'Low';
}

/** Everything a session needs: the composed scenario, the room context and the opening state. */
export function setUpRoom(
  curriculum: Curriculum,
  input: { clusterId: ClusterId; verticalId: VerticalId; tier: Tier; mode: SessionMode; drillIndex: number }
): { payload: ScenarioPayload; rc: RoomContext; state: RoomState } {
  const cluster = curriculum.clusters[input.clusterId];
  const vertical = curriculum.verticals[input.verticalId];
  const rubric = curriculum.rubrics[input.tier];
  const payload = composeScenario({ cluster, vertical, rubric, mode: input.mode, drillIndex: input.drillIndex });
  const signals = signalDefinitions(curriculum);
  const roles = payload.personas.map((persona) => persona.role);
  const plan = buildPlan(curriculum, rubric, input.mode, input.drillIndex);
  const evidenceSkills = new Set(plan.filter((item) => item.kind === 'evidence').map((item) => item.skillId));
  // Objections come from the hidden buyer state, so the simulator's own cadence is switched off.
  // Consumption numbers are only in play when this session teaches them, so the buyer never answers an off-topic question.
  const sim: SimContext = {
    vertical,
    signals,
    objections: [],
    personaRoles: roles,
    skillProbes: buildSkillProbes(curriculum, scenarioFor(curriculum, cluster.id, vertical.id)).filter((probe) => evidenceSkills.has(probe.skill))
  };
  const labelFor = (key: string) =>
    signals.find((signal) => signal.id === key)?.label ?? curriculum.skills.find((skill) => skill.id === key)?.label ?? key;
  const rc: RoomContext = { sim, rules: curriculum.room, curriculum, vertical, mode: input.mode, objections: payload.objection_queue, roles, labelFor };
  const state = startRoom(rc, startSimulation(sim, { mode: input.mode, targetSignals: payload.target_signals }), plan);
  return { payload, rc, state };
}
