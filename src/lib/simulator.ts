import { SIGNAL_IDS, type SignalDefinition, type SignalId, type Vertical } from './curriculum/schema';
import type { SessionMode } from './composer';
import { matchesAny, matchingIndices } from './patterns';

export type Bars = 1 | 3 | 4;

export interface Turn {
  id: string;
  speaker: 'learner' | 'buyer';
  speakerRole: string;
  content: string;
  reveal?: 'partial' | 'verbatim';
  signal?: SignalId;
  /** Set when the buyer turn is evidence for a non-MEDDPICC skill, such as a usage forecast. */
  skill?: string;
  objection?: boolean;
}

/** Buyer evidence for a skill outside MEDDPICC. Like signals, it always cites a buyer turn. */
export interface SkillEvidence {
  skill: string;
  level: 'partial' | 'verbatim';
  transcript_turn_id: string;
}

export interface SkillProbe {
  skill: string;
  probes: { partial: string[]; verbatim: string[] };
  reveal: { speaker: string; partial: string; verbatim: string };
}

export interface Binding {
  signal: SignalId;
  bars: Bars;
  transcript_turn_id: string | null;
  judge_rationale: string;
}

export interface SimContext {
  vertical: Vertical;
  signals: SignalDefinition[];
  objections: string[];
  personaRoles: string[];
  /** Optional consumption probes from the scenario. Absent in older callers. */
  skillProbes?: SkillProbe[];
}

export interface SimState {
  mode: SessionMode;
  targetSignals: SignalId[];
  turns: Turn[];
  bindings: Record<SignalId, Binding>;
  probed: SignalId[];
  /** Verbatim probe patterns already credited per signal, so repeats cannot earn proof. */
  proofProbes: Partial<Record<SignalId, number[]>>;
  learnerMessages: string[];
  objectionIndex: number;
  neutralIndex: number;
  hintsUsed: number;
  skillEvidence: Record<string, SkillEvidence>;
}

export const MAX_REVEALS_PER_TURN = 2;

const NEUTRAL_LINES = [
  'Walk me through what that means for my team.',
  'Okay. What does the next step look like?',
  'Help me understand how that works in practice.'
];

const ASSUMED = 'Assumed: the seller has not reached buyer evidence on this signal yet.';

function emptyBindings(): Record<SignalId, Binding> {
  return Object.fromEntries(
    SIGNAL_IDS.map((signal) => [signal, { signal, bars: 1, transcript_turn_id: null, judge_rationale: ASSUMED }])
  ) as Record<SignalId, Binding>;
}

export function startSimulation(ctx: SimContext, options: { mode: SessionMode; targetSignals: SignalId[] }): SimState {
  const opening: Turn = {
    id: 'turn-1',
    speaker: 'buyer',
    speakerRole: ctx.personaRoles[0] ?? 'Buyer',
    content: 'Thanks for making time. We have about twenty minutes, so start with what you think we need to hear.'
  };
  return {
    mode: options.mode,
    targetSignals: [...options.targetSignals],
    turns: [opening],
    bindings: emptyBindings(),
    probed: [],
    proofProbes: {},
    learnerMessages: [],
    objectionIndex: 0,
    neutralIndex: 0,
    hintsUsed: 0,
    skillEvidence: {}
  };
}

/**
 * Advances the simulation by one learner message. Buyers only reveal a signal
 * when the learner's message matches that signal's probes. Learner text alone
 * never changes a binding, so 4-bar evidence always cites a buyer turn.
 * The first verbatim probe earns only a partial answer. Full proof needs a
 * different verbatim probe, so repeating one question cannot earn full credit.
 */
export function sendLearnerMessage(ctx: SimContext, state: SimState, text: string): SimState {
  const message = text.trim();
  if (message.length === 0) return state;

  const turns = [...state.turns];
  const addTurn = (turn: Omit<Turn, 'id'>): Turn => {
    const full: Turn = { id: `turn-${turns.length + 1}`, ...turn };
    turns.push(full);
    return full;
  };

  addTurn({ speaker: 'learner', speakerRole: 'You', content: message });
  const learnerMessages = [...state.learnerMessages, message];
  const bindings: Record<SignalId, Binding> = { ...state.bindings };
  const probed = new Set<SignalId>(state.probed);
  const proofProbes: Partial<Record<SignalId, number[]>> = { ...state.proofProbes };
  const verbatimHits: { signal: SignalId; indices: number[] }[] = [];
  const partialHits: SignalId[] = [];

  for (const definition of ctx.signals) {
    const indices = matchingIndices(definition.probes.verbatim, message);
    if (indices.length > 0) {
      probed.add(definition.id);
      verbatimHits.push({ signal: definition.id, indices });
    } else if (matchesAny(definition.probes.partial, message)) {
      probed.add(definition.id);
      partialHits.push(definition.id);
    }
  }

  let reveals = 0;
  const reveal = (signal: SignalId, level: 'partial' | 'verbatim', indices: number[] = []): void => {
    const line = ctx.vertical.buyer_reveals[signal];
    const turn = addTurn({ speaker: 'buyer', speakerRole: line.speaker, content: line[level], reveal: level, signal });
    bindings[signal] =
      level === 'verbatim'
        ? { signal, bars: 4, transcript_turn_id: turn.id, judge_rationale: `Buyer stated the signal in their own words (${turn.id}).` }
        : { signal, bars: 3, transcript_turn_id: turn.id, judge_rationale: `Buyer acknowledged the issue without a metric or authority (${turn.id}).` };
    if (indices.length > 0) proofProbes[signal] = [...new Set([...(proofProbes[signal] ?? []), ...indices])];
    reveals += 1;
  };

  for (const { signal, indices } of verbatimHits) {
    if (reveals >= MAX_REVEALS_PER_TURN) break;
    const credited = proofProbes[signal] ?? [];
    if (bindings[signal].bars === 1) reveal(signal, 'partial', indices);
    else if (bindings[signal].bars === 3 && indices.some((index) => !credited.includes(index))) {
      reveal(signal, 'verbatim', indices);
    }
  }
  for (const signal of partialHits) {
    if (reveals >= MAX_REVEALS_PER_TURN) break;
    if (bindings[signal].bars === 1) reveal(signal, 'partial');
  }

  const skillEvidence: Record<string, SkillEvidence> = { ...state.skillEvidence };
  for (const probe of ctx.skillProbes ?? []) {
    if (reveals >= MAX_REVEALS_PER_TURN) break;
    const current = skillEvidence[probe.skill];
    if (current?.level === 'verbatim') continue;
    const verbatim = matchesAny(probe.probes.verbatim, message);
    const partial = verbatim || matchesAny(probe.probes.partial, message);
    if (!partial) continue;
    const level: 'partial' | 'verbatim' = current && verbatim ? 'verbatim' : 'partial';
    if (current && level === 'partial') continue;
    const turn = addTurn({
      speaker: 'buyer',
      speakerRole: probe.reveal.speaker,
      content: probe.reveal[level],
      reveal: level,
      skill: probe.skill
    });
    skillEvidence[probe.skill] = { skill: probe.skill, level, transcript_turn_id: turn.id };
    reveals += 1;
  }

  const roles = ctx.personaRoles.length > 0 ? ctx.personaRoles : ['Buyer'];
  let neutralIndex = state.neutralIndex;
  if (reveals === 0) {
    addTurn({
      speaker: 'buyer',
      speakerRole: roles[learnerMessages.length % roles.length] ?? 'Buyer',
      content: NEUTRAL_LINES[neutralIndex % NEUTRAL_LINES.length] ?? 'Go on.'
    });
    neutralIndex += 1;
  }

  let objectionIndex = state.objectionIndex;
  if (learnerMessages.length % 2 === 0 && ctx.objections.length > 0) {
    const objection = ctx.objections[objectionIndex % ctx.objections.length] ?? '';
    addTurn({
      speaker: 'buyer',
      speakerRole: roles[objectionIndex % roles.length] ?? 'Buyer',
      content: objection,
      objection: true
    });
    objectionIndex += 1;
  }

  return { ...state, turns, bindings, probed: [...probed], proofProbes, learnerMessages, objectionIndex, neutralIndex, skillEvidence };
}

export function verifiedCount(state: SimState): number {
  return state.targetSignals.filter((signal) => state.bindings[signal].bars === 4).length;
}

/** Coach hints work in drills only. Boss fights never offer them. */
export function requestHint(ctx: SimContext, state: SimState): { state: SimState; hint: string | null } {
  if (state.mode === 'boss') return { state, hint: null };
  const open = state.targetSignals.find((signal) => state.bindings[signal].bars !== 4);
  if (!open) return { state, hint: null };
  const definition = ctx.signals.find((candidate) => candidate.id === open);
  return { state: { ...state, hintsUsed: state.hintsUsed + 1 }, hint: definition?.coach_hint ?? null };
}
