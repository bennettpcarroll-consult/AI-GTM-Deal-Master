import { scenarioFor, signalDefinitions, type Curriculum } from './curriculum/load';
import { SIGNAL_IDS, type Arc, type ArcBeat, type ArcPillar, type ClusterId, type RoomRules, type Rubric, type SignalId, type Skill, type Tier, type Vertical, type VerticalId, verticalForTier } from './curriculum/schema';
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

export interface CastMember {
  id: string;
  name: string;
  role: string;
}

export interface Beat {
  id: string;
  kind: BeatKind;
  skillId: string | null;
  signal: SignalId | null;
  /** Already shuffled, so the elite move is not always first. */
  moves: Move[];
  /** Authored beats only: who speaks, and the move's goal while the coaching scaffold is on. */
  speaker?: CastMember;
  goal?: string;
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
  /** Authored beats only: the named failure mode of a wrong pick. */
  failure?: string;
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
  /** Authored scenes only: how many beats are in play. */
  arcLength?: number;
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
  /** Set when the trajectory has an authored arc. The room then plays these beats instead of the generated plan. */
  arc: ArcScene | null;
}

/** One authored scene: a drill, a capstone, a fast-track capstone or a targeted retry. */
export interface ArcScene {
  arc: Arc;
  pillar: ArcPillar;
  kind: 'drill' | 'capstone';
  variant: 'full' | 'fast' | 'retry';
  title: string;
  setting: string;
  curveball: string | null;
  beats: ArcBeat[];
  cast: Record<string, CastMember>;
  /** Goal labels show in tier 1 and 2 drills only. The scaffold fades as the learner climbs. */
  scaffold: boolean;
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
  /** Authored beats only: the failure mode behind a wrong pick, and what the buyer said back. */
  failure?: { id: string; label: string; lesson: string };
  reply?: string;
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
  // Openers run in meeting order: the up-front contract, then research, then the point of view.
  const openers = practiced.filter((id) => OPENERS.includes(id)).sort((a, b) => OPENERS.indexOf(a) - OPENERS.indexOf(b)).map(toItem);
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

/** The buyer's written answer to a move. Pin beats answer the settle and assume follow-ups. */
function replyTo(skill: Skill, beatKind: BeatKind, kind: MoveKind): string | undefined {
  const replies = skill.rep.replies;
  if (beatKind === 'pin' && kind === 'weak') return replies.settle ?? replies.weak;
  if (beatKind === 'pin' && kind === 'trap') return replies.assume ?? replies.trap;
  return kind === 'elite' ? replies.elite : replies[kind];
}

/** True once any buyer has said this exact line in the meeting. */
function said(sim: SimState, content: string): boolean {
  return sim.turns.some((turn) => turn.speaker === 'buyer' && turn.content === content);
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

/** The buyer who raises a beat is the one who will answer it, so the thread stays with one person. */
function setupSpeaker(rc: RoomContext, item: PlanItem, cursor: number): string {
  if (item.kind === 'signal') return rc.vertical.buyer_reveals[item.signal].speaker;
  const probe = item.kind === 'evidence' ? rc.sim.skillProbes?.find((candidate) => candidate.skill === item.skillId) : undefined;
  return probe?.reveal.speaker ?? rc.roles[cursor % rc.roles.length] ?? 'Buyer';
}

/** Skips finished items, then has the buyer set up the next beat with its own line. */
function settle(rc: RoomContext, rs: RoomState): RoomState {
  if (rc.arc) return settleArc(rc, rc.arc, rs);
  let next = rs;
  while (next.cursor < next.plan.length && itemDone(next, next.plan[next.cursor]!)) {
    next = { ...next, cursor: next.cursor + 1, attempts: 0 };
  }
  const item = next.plan[next.cursor];
  // Every beat opens on a buyer line: the skill's own setup for a rep or a fresh signal, the partial answer for a pin.
  const fresh = item && (item.kind === 'rep' || (item.kind === 'signal' ? next.sim.bindings[item.signal].bars === 1 : !next.sim.skillEvidence[item.skillId]));
  if (!next.objection && !next.walkedOut && item && fresh) {
    const buyer = item.kind === 'signal' ? rc.vertical.buyer_reveals[item.signal].setup : repLines(rc, item.skillId).buyer;
    // Seller-led beats need no setup once the meeting is under way, and no buyer line is ever said twice.
    const sellerLed = skillOf(rc.curriculum, item.skillId).rep.seller_led && next.sim.turns.length > 0;
    if (!sellerLed && !said(next.sim, buyer)) {
      next = { ...next, sim: addBuyerTurn(next.sim, { speakerRole: setupSpeaker(rc, item, next.cursor), content: buyer }) };
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
  return rs.walkedOut || (rs.cursor >= (rs.arcLength ?? rs.plan.length) && !rs.objection);
}

function shuffle(moves: Move[], seed: string): Move[] {
  const order = moves.map((_, index) => index).sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`));
  return order.map((index) => moves[index]!);
}

/** The beat in play. A move the learner already tried on this beat is taken off the table, so no line is said twice. */
export function currentBeat(rc: RoomContext, rs: RoomState): Beat | null {
  const beat = beatInPlay(rc, rs);
  if (!beat) return null;
  const tried = new Set(rs.picks.filter((pick) => pick.beatId === beat.id).map((pick) => pick.text));
  return { ...beat, moves: beat.moves.filter((move) => !tried.has(move.text)) };
}

function beatInPlay(rc: RoomContext, rs: RoomState): Beat | null {
  if (roomDone(rs)) return null;
  if (rc.arc) return arcBeat(rc.arc, rs);
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
  if (rs.arcLength !== undefined) return { value: rs.walkedOut ? rs.arcLength : Math.min(rs.cursor, rs.arcLength), max: rs.arcLength };
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
  if (rc.arc) return chooseArcMove(rc, rc.arc, rs, beat, move);
  const elite = beat.moves.find((candidate) => candidate.kind === 'elite')!.text;
  const rules = rc.rules;
  const before = rs.sim;
  // The buyer answers the exact line the learner chose, and the person who was just speaking answers it.
  const written = beat.kind === 'objection' ? rules.objection_replies[move.kind] : beat.skillId ? replyTo(skillOf(rc.curriculum, beat.skillId), beat.kind, move.kind) : undefined;
  const reaction = written && !said(before, written) ? written : '';
  const reactionRole = [...before.turns].reverse().find((turn) => turn.speaker === 'buyer')?.speakerRole;
  const planned = rs.plan[rs.cursor];
  // Only the beat's own target can be revealed, so a question never draws an answer to a different one.
  const focus = beat.kind === 'objection' || beat.kind === 'rep' || !planned ? {} : planned.kind === 'signal' ? { signal: planned.signal } : { skill: planned.skillId };
  const sim = sendLearnerMessage(rc.sim, before, move.text, { reaction, focus, ...(reactionRole ? { reactionRole } : {}) });

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
  // An objection is raised once: the next one nobody has voiced yet, and a drill never stacks a second.
  const cadence = boss && next.picks.length % rules.mood.boss_objection_every === 0;
  const raised = next.sim.turns.some((turn) => turn.objection);
  const text = rc.objections.find((candidate) => !said(next.sim, candidate));
  if (!next.objection && beat.kind !== 'objection' && (mood.risk >= rules.mood.objection_risk || cadence) && text && (boss || !raised)) {
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
export interface RoomInput {
  clusterId: ClusterId;
  verticalId: VerticalId;
  tier: Tier;
  mode: SessionMode;
  drillIndex: number;
  /** Authored capstones only: replay just these beats (a targeted retry). */
  beatIds?: string[];
  /** Authored capstones only: play the core beats, for a learner who cleared every drill cleanly. */
  fastTrack?: boolean;
}

export function setUpRoom(curriculum: Curriculum, input: RoomInput): { payload: ScenarioPayload; rc: RoomContext; state: RoomState } {
  const cluster = curriculum.clusters[input.clusterId];
  const vertical = verticalForTier(curriculum.verticals[input.verticalId], input.tier);
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
  const arcScene = arcSceneFor(curriculum, input);
  const rc: RoomContext = { sim, rules: curriculum.room, curriculum, vertical, mode: input.mode, objections: payload.objection_queue, roles, labelFor, arc: arcScene };
  if (arcScene) return { payload, rc, state: startArcRoom(rc, arcScene, input.mode) };
  // The first beat's buyer line opens the meeting, so the generic simulator opener is dropped.
  const opened = startSimulation(sim, { mode: input.mode, targetSignals: payload.target_signals });
  const state = startRoom(rc, { ...opened, turns: [] }, plan);
  return { payload, rc, state };
}

// ---------------------------------------------------------------------------
// Authored arcs. One account runs through all four pillars, each beat is written
// by hand, and every wrong option is tied to a named failure mode with its own
// buyer reply. Proof still comes only from buyer turns.
// ---------------------------------------------------------------------------

export function arcFor(curriculum: Curriculum, clusterId: ClusterId, verticalId: VerticalId): Arc | null {
  return curriculum.arcs[`${clusterId}__${verticalId}`] ?? null;
}

export function arcPillar(curriculum: Curriculum, clusterId: ClusterId, verticalId: VerticalId, tier: Tier): ArcPillar | null {
  return arcFor(curriculum, clusterId, verticalId)?.pillars.find((pillar) => pillar.tier === tier) ?? null;
}

function arcSceneFor(curriculum: Curriculum, input: RoomInput): ArcScene | null {
  const arc = arcFor(curriculum, input.clusterId, input.verticalId);
  if (!arc) return null;
  const pillar = arc.pillars.find((candidate) => candidate.tier === input.tier);
  if (!pillar) throw new Error(`Arc ${arc.id} has no tier ${input.tier}`);
  const cast = Object.fromEntries(pillar.cast.map((member) => [member.id, member]));
  if (input.mode === 'drill') {
    const drill = pillar.drills[input.drillIndex];
    if (!drill) throw new Error(`Arc ${arc.id} tier ${input.tier} has no drill ${input.drillIndex + 1}`);
    return { arc, pillar, kind: 'drill', variant: 'full', title: drill.title, setting: drill.setting, curveball: null, beats: drill.beats, cast, scaffold: pillar.tier <= 2 };
  }
  const all = pillar.capstone.beats;
  const variant: ArcScene['variant'] = input.beatIds?.length ? 'retry' : input.fastTrack ? 'fast' : 'full';
  const beats = variant === 'retry' ? all.filter((beat) => input.beatIds!.includes(beat.id)) : variant === 'fast' ? all.filter((beat) => beat.core) : all;
  if (beats.length === 0) throw new Error(`Arc ${arc.id} tier ${input.tier} capstone has no beats to play`);
  return {
    arc,
    pillar,
    kind: 'capstone',
    variant,
    title: pillar.capstone.title,
    setting: pillar.capstone.setting,
    curveball: pillar.capstone.curveball,
    beats,
    cast,
    scaffold: false
  };
}

/** The beats a session must get right first time to pass: core beats in a capstone, every beat in a retry. */
export function requiredBeats(scene: ArcScene): ArcBeat[] {
  return scene.kind === 'capstone' && scene.variant !== 'retry' ? scene.beats.filter((beat) => beat.core) : scene.beats;
}

function eliteOf(beat: ArcBeat) {
  return beat.options.find((option) => option.kind === 'elite')!;
}

function signalKey(key: string | undefined): SignalId | null {
  return key && (SIGNAL_IDS as readonly string[]).includes(key) ? (key as SignalId) : null;
}

function castLabel(member: CastMember | undefined): string {
  return member ? `${member.name}, ${member.role}` : 'Buyer';
}

function startArcRoom(rc: RoomContext, scene: ArcScene, mode: SessionMode): RoomState {
  const graded = scene.kind === 'drill' ? scene.beats : requiredBeats(scene);
  const targetSignals = [...new Set(graded.map((beat) => signalKey(eliteOf(beat).evidence?.key)).filter((signal): signal is SignalId => Boolean(signal)))];
  const base = startSimulation(rc.sim, { mode, targetSignals });
  const required = requiredBeats(scene).length;
  const sim: SimState = { ...base, turns: [], authored: { flags: [], beats: scene.beats.length, clean: 0, required, requiredClean: 0 } };
  return settleArc(rc, scene, {
    sim,
    mood: { ...rc.rules.mood.start },
    plan: [],
    cursor: 0,
    attempts: 0,
    objection: null,
    objectionIndex: 0,
    picks: [],
    walkedOut: false,
    arcLength: scene.beats.length
  });
}

/** Has the speaker of the next beat say their line, once. Lines are unique across an arc, so content identifies them. */
function settleArc(rc: RoomContext, scene: ArcScene, rs: RoomState): RoomState {
  if (rs.walkedOut) return rs;
  const beat = scene.beats[rs.cursor];
  if (!beat || rs.sim.turns.some((turn) => turn.speaker === 'buyer' && turn.content === beat.line)) return rs;
  return { ...rs, sim: addBuyerTurn(rs.sim, { speakerRole: castLabel(scene.cast[beat.speaker]), content: beat.line }) };
}

function arcBeat(scene: ArcScene, rs: RoomState): Beat | null {
  const beat = scene.beats[rs.cursor];
  if (!beat) return null;
  const level = eliteOf(beat).evidence?.level;
  const kind: BeatKind = level === 'partial' ? 'open' : level === 'verbatim' ? 'pin' : 'rep';
  return {
    id: beat.id,
    kind,
    skillId: beat.skill,
    signal: beat.signal ?? null,
    moves: shuffle(beat.options.map((option) => ({ kind: option.kind, text: option.text })), `${beat.id}:${rs.attempts}`),
    speaker: scene.cast[beat.speaker],
    goal: scene.scaffold ? beat.goal : undefined
  };
}

function chooseArcMove(rc: RoomContext, scene: ArcScene, rs: RoomState, beat: Beat, move: Move): { state: RoomState; outcome: Outcome } {
  const authored = scene.beats[rs.cursor]!;
  const option = authored.options.find((candidate) => candidate.text === move.text)!;
  const elite = eliteOf(authored);
  const rules = rc.rules;
  const before = rs.sim;

  let sim: SimState = {
    ...before,
    turns: [...before.turns, { id: `turn-${before.turns.length + 1}`, speaker: 'learner', speakerRole: 'You', content: move.text }],
    learnerMessages: [...before.learnerMessages, move.text]
  };
  const evidenceKey = option.evidence?.key;
  const signal = signalKey(evidenceKey);
  const reply: Turn = {
    id: `turn-${sim.turns.length + 1}`,
    speaker: 'buyer',
    speakerRole: castLabel(scene.cast[option.reply_by ?? authored.speaker]),
    content: option.reply,
    ...(option.evidence ? { reveal: option.evidence.level } : {}),
    ...(signal ? { signal } : evidenceKey ? { skill: evidenceKey } : {})
  };
  sim = { ...sim, turns: [...sim.turns, reply] };
  if (authored.signal && !sim.probed.includes(authored.signal)) sim = { ...sim, probed: [...sim.probed, authored.signal] };

  let evidence: Outcome['evidence'] = null;
  if (option.evidence && evidenceKey) {
    const { level } = option.evidence;
    if (signal) {
      sim = {
        ...sim,
        bindings: {
          ...sim.bindings,
          [signal]: {
            signal,
            bars: level === 'verbatim' ? 4 : Math.max(3, sim.bindings[signal].bars) as 3 | 4,
            transcript_turn_id: reply.id,
            judge_rationale: level === 'verbatim' ? `Buyer stated the signal in their own words (${reply.id}).` : `Buyer acknowledged the issue without a metric or authority (${reply.id}).`
          }
        }
      };
    } else {
      sim = { ...sim, skillEvidence: { ...sim.skillEvidence, [evidenceKey]: { skill: evidenceKey, level, transcript_turn_id: reply.id } } };
    }
    evidence = { turnId: reply.id, quote: reply.content, level, label: rc.labelFor(evidenceKey) };
  }

  const firstTry = rs.attempts === 0;
  const clean = firstTry && option.kind === 'elite';
  const isRequired = requiredBeats(scene).some((candidate) => candidate.id === authored.id);
  const counts = sim.authored!;
  sim = {
    ...sim,
    authored: {
      ...counts,
      clean: counts.clean + (clean ? 1 : 0),
      requiredClean: counts.requiredClean + (clean && isRequired ? 1 : 0),
      flags: option.flag && !counts.flags.includes(option.flag) ? [...counts.flags, option.flag] : counts.flags
    }
  };

  const effect = rules.effects[option.kind];
  const mood: Mood = {
    trust: clamp(rs.mood.trust + effect.trust),
    risk: clamp(rs.mood.risk + effect.risk),
    urgency: clamp(rs.mood.urgency + effect.urgency)
  };
  const prompt = lastBuyerLine(before);
  const pick: Pick = {
    beatId: authored.id,
    beatKind: beat.kind,
    skillId: authored.skill,
    signal: authored.signal ?? null,
    kind: option.kind,
    text: option.text,
    elite: elite.text,
    prompt,
    ...(option.failure ? { failure: option.failure } : {})
  };

  const advance = option.kind === 'elite' || scene.kind === 'capstone';
  let next: RoomState = {
    ...rs,
    sim,
    mood,
    picks: [...rs.picks, pick],
    cursor: advance ? rs.cursor + 1 : rs.cursor,
    attempts: advance ? 0 : rs.attempts + 1
  };
  if (scene.kind === 'capstone' && mood.trust <= rules.mood.walkout_trust) {
    const role = castLabel(scene.cast[authored.speaker]);
    next = { ...next, walkedOut: true, sim: addBuyerTurn(next.sim, { speakerRole: role, content: rules.walkout }) };
  }
  next = settleArc(rc, scene, next);

  const mode = option.failure ? rc.curriculum.failureModes[option.failure] : undefined;
  const verdict =
    option.kind === 'weak'
      ? rules.verdicts.weak
      : option.kind === 'trap'
        ? rules.verdicts.trap
        : evidence?.level === 'verbatim'
          ? `${evidence.label} ${rules.verdicts.proven}`
          : evidence
            ? rules.verdicts.partial
            : rules.verdicts.rep;
  return {
    state: next,
    outcome: {
      kind: option.kind,
      beatKind: beat.kind,
      verdict,
      why: authored.why,
      elite: elite.text,
      evidence,
      trust: effect.trust >= 0 ? 'up' : 'down',
      reply: option.reply,
      ...(mode ? { failure: mode } : {})
    }
  };
}
