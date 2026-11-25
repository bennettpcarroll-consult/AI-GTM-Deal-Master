import { describe, expect, it } from 'vitest';
import { loadCurriculum, signalDefinitions } from '../../src/lib/curriculum/load';
import type { Tier } from '../../src/lib/curriculum/schema';
import { composeScenario } from '../../src/lib/composer';
import { assertEvidenceInvariant, gradeSession } from '../../src/lib/grader';
import { sendLearnerMessage, startSimulation, type SimContext, type SimState } from '../../src/lib/simulator';

const curriculum = loadCurriculum();

function run(tier: Tier, mode: 'drill' | 'boss', messages: string[], drillIndex = 0): { rubric: (typeof curriculum.rubrics)[Tier]; state: SimState } {
  const rubric = curriculum.rubrics[tier];
  const vertical = curriculum.verticals.banking_fsi;
  const payload = composeScenario({ cluster: curriculum.clusters.foundation_models, vertical, rubric, mode, drillIndex });
  const ctx: SimContext = {
    vertical,
    signals: signalDefinitions(curriculum),
    objections: payload.objection_queue,
    personaRoles: payload.personas.map((persona) => persona.role)
  };
  let state = startSimulation(ctx, { mode, targetSignals: payload.target_signals });
  for (const message of messages) state = sendLearnerMessage(ctx, state, message);
  return { rubric, state };
}

describe('deterministic grader', () => {
  it('scores a verbatim plus a partial signal as 88 but does not pass the drill', () => {
    const { rubric, state } = run(1, 'drill', [
      'We track our KPI every month.',
      'What does success look like for you in numbers?',
      'What is the budget for this project?'
    ], 0);
    const result = gradeSession(rubric, state);
    expect(result.score).toBe(88);
    expect(result.verifiedCount).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('passes a drill only when every target signal has verbatim proof', () => {
    const { rubric, state } = run(1, 'drill', [
      'What does success look like in numbers?',
      'How much do you need to cut this quarter?',
      'Who signs the PO on this?',
      'Who would sign off on this?'
    ], 0);
    const result = gradeSession(rubric, state);
    expect(result.verifiedCount).toBe(2);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('fails the same drill when the tier gate is 90', () => {
    const { rubric, state } = run(1, 'drill', [
      'We track our KPI every month.',
      'What does success look like for you in numbers?',
      'What is the budget for this project?'
    ], 0);
    expect(gradeSession({ ...rubric, core_gate_pass_min: 90 }, state).passed).toBe(false);
  });

  it('gives a single verbatim question partial credit only, so one keyword cannot earn proof', () => {
    const { rubric, state } = run(1, 'drill', ['What does success look like for you in numbers?'], 0);
    expect(state.bindings.metrics.bars).toBe(3);
    const result = gradeSession(rubric, state);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  it('scores learner-only claims at the assumed level (25) and fails', () => {
    const { rubric, state } = run(1, 'drill', ['The CIO is the economic buyer, trust me.']);
    const result = gradeSession(rubric, state);
    expect(result.score).toBe(25);
    expect(result.passed).toBe(false);
  });

  it('flags paper process as ignored in a tier 1 boss fight that never probes it', () => {
    const { rubric, state } = run(1, 'boss', ['What does success look like in numbers?']);
    const result = gradeSession(rubric, state);
    expect(result.autoFails.map((flag) => flag.id)).toContain('paper_process_ignored');
    expect(result.passed).toBe(false);
  });

  it('flags a champion the seller never tied to budget or access in a tier 1 boss fight', () => {
    const { rubric, state } = run(1, 'boss', ['Our champion is the VP, that is settled.']);
    expect(gradeSession(rubric, state).autoFails.map((flag) => flag.id)).toContain('coach_as_champion');
  });

  it('flags an unbounded free pilot in a tier 3 boss fight', () => {
    const { rubric, state } = run(3, 'boss', ['Let us start with a free pilot for next quarter.']);
    const ids = gradeSession(rubric, state).autoFails.map((flag) => flag.id);
    expect(ids).toContain('unbounded_pilot');
    expect(ids).toContain('no_eval_harness');
  });

  it('does not flag an unbounded pilot when the same message names an exit gate', () => {
    const { rubric, state } = run(3, 'boss', ['A free pilot with clear exit criteria and accuracy gates sounds right.']);
    expect(gradeSession(rubric, state).autoFails.map((flag) => flag.id)).not.toContain('unbounded_pilot');
  });

  it('never applies auto-fail flags to drills', () => {
    const { rubric, state } = run(3, 'drill', ['Let us start with a free pilot for next quarter.'], 0);
    expect(gradeSession(rubric, state).autoFails).toEqual([]);
  });

  it('flags a tier 4 boss fight that never mentions the financial thesis', () => {
    const { rubric, state } = run(4, 'boss', ['Our platform is fast and simple to deploy.']);
    expect(gradeSession(rubric, state).autoFails.map((flag) => flag.id)).toContain('buries_financial_thesis');
  });

  it('rejects a 4-bar binding that cites no transcript turn', () => {
    const { state } = run(1, 'drill', []);
    const broken = {
      ...state.bindings,
      metrics: { signal: 'metrics' as const, bars: 4 as const, transcript_turn_id: null, judge_rationale: 'checkbox' }
    };
    expect(() => assertEvidenceInvariant(broken, state.turns)).toThrow(/no transcript_turn_id/);
  });

  it('rejects a 4-bar binding that cites a learner turn', () => {
    const { state } = run(1, 'drill', ['What does success look like in numbers?']);
    const learnerTurn = state.turns.find((turn) => turn.speaker === 'learner');
    const broken = {
      ...state.bindings,
      metrics: { signal: 'metrics' as const, bars: 4 as const, transcript_turn_id: learnerTurn?.id ?? null, judge_rationale: 'self-report' }
    };
    expect(() => assertEvidenceInvariant(broken, state.turns)).toThrow(/must cite a buyer turn/);
  });
});
