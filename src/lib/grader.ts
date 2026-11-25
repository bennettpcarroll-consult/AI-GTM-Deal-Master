import { SIGNAL_IDS, type Detector, type Rubric, type SignalId } from './curriculum/schema';
import { matchesAny } from './patterns';
import type { Binding, SimState, SkillEvidence, Turn } from './simulator';

export interface AutoFailHit {
  id: string;
  label: string;
  description: string;
}

export interface GradeResult {
  bindings: Record<SignalId, Binding>;
  targetSignals: SignalId[];
  score: number;
  gate: number;
  passed: boolean;
  autoFails: AutoFailHit[];
  verifiedCount: number;
  skillEvidence: Record<string, SkillEvidence>;
}

/** Throws when a 4-bar binding is not backed by a buyer turn. This is the anti-checkbox rule. */
export function assertEvidenceInvariant(bindings: Record<SignalId, Binding>, turns: Turn[]): void {
  for (const signal of SIGNAL_IDS) {
    const binding = bindings[signal];
    if (binding.bars !== 4) continue;
    if (!binding.transcript_turn_id) {
      throw new Error(`${signal}: verbatim (4-bar) signal has no transcript_turn_id`);
    }
    const turn = turns.find((candidate) => candidate.id === binding.transcript_turn_id);
    if (!turn || turn.speaker !== 'buyer') {
      throw new Error(`${signal}: verbatim (4-bar) signal must cite a buyer turn`);
    }
  }
}

/** Skill evidence outside MEDDPICC follows the same rule: it must cite a buyer turn. */
export function assertSkillEvidenceInvariant(evidence: Record<string, SkillEvidence>, turns: Turn[]): void {
  for (const item of Object.values(evidence)) {
    const turn = turns.find((candidate) => candidate.id === item.transcript_turn_id);
    if (!turn || turn.speaker !== 'buyer') {
      throw new Error(`${item.skill}: skill evidence must cite a buyer turn`);
    }
  }
}

/** Average of bars across the signals, scaled to 0 to 100 (4 bars = 100, 3 = 75, 1 = 25). */
export function scoreSignals(bindings: Record<SignalId, Binding>, signals: SignalId[]): number {
  if (signals.length === 0) return 0;
  const total = signals.reduce((sum, signal) => sum + bindings[signal].bars, 0);
  return Math.round((total / (4 * signals.length)) * 100);
}

export function detectorFires(detector: Detector, learnerMessages: string[], probed: SignalId[]): boolean {
  switch (detector.type) {
    case 'pattern_without':
      return learnerMessages.some(
        (message) => matchesAny(detector.trigger, message) && !matchesAny(detector.required, message)
      );
    case 'pattern_never_seen':
      return !learnerMessages.some((message) => matchesAny(detector.patterns, message));
    case 'signal_never_probed':
      return !probed.includes(detector.signal);
  }
}

/** Auto-fail flags apply to boss fights only. Drills target specific signals, so they never trip them. */
export function evaluateAutoFails(rubric: Rubric, state: SimState): AutoFailHit[] {
  if (state.mode !== 'boss') return [];
  return rubric.auto_fail_flags
    .filter((flag) => detectorFires(flag.detector, state.learnerMessages, state.probed))
    .map(({ id, label, description }) => ({ id, label, description }));
}

/**
 * A boss fight passes on the average score, with no auto-fail flags. A drill also needs
 * verbatim (4-bar) proof on every target signal, so one strong signal cannot carry a partial one.
 */
export function gradeSession(rubric: Rubric, state: SimState): GradeResult {
  assertEvidenceInvariant(state.bindings, state.turns);
  assertSkillEvidenceInvariant(state.skillEvidence, state.turns);
  const score = scoreSignals(state.bindings, state.targetSignals);
  const gate = state.mode === 'boss' ? rubric.boss_pass_min : rubric.core_gate_pass_min;
  const autoFails = evaluateAutoFails(rubric, state);
  const verifiedCount = state.targetSignals.filter((signal) => state.bindings[signal].bars === 4).length;
  const fullyVerified = state.mode === 'boss' || verifiedCount === state.targetSignals.length;
  return {
    bindings: state.bindings,
    targetSignals: state.targetSignals,
    score,
    gate,
    passed: score >= gate && autoFails.length === 0 && fullyVerified,
    autoFails,
    verifiedCount,
    skillEvidence: state.skillEvidence
  };
}
