import { describe, expect, it } from 'vitest';
import { loadCurriculum, signalDefinitions } from '../../src/lib/curriculum/load';
import type { VerticalId, Tier } from '../../src/lib/curriculum/schema';
import { composeScenario } from '../../src/lib/composer';
import { requestHint, sendLearnerMessage, startSimulation, verifiedCount, type SimContext } from '../../src/lib/simulator';
import { assertEvidenceInvariant } from '../../src/lib/grader';

const curriculum = loadCurriculum();

function setup(tier: Tier, mode: 'drill' | 'boss', drillIndex = 0, verticalId: VerticalId = 'banking_fsi') {
  const rubric = curriculum.rubrics[tier];
  const vertical = curriculum.verticals[verticalId];
  const payload = composeScenario({ cluster: curriculum.clusters.foundation_models, vertical, rubric, mode, drillIndex });
  const ctx: SimContext = {
    vertical,
    signals: signalDefinitions(curriculum),
    objections: payload.objection_queue,
    personaRoles: payload.personas.map((persona) => persona.role)
  };
  const state = startSimulation(ctx, { mode, targetSignals: payload.target_signals });
  return { rubric, vertical, ctx, state };
}

describe('buyer simulator and evidence binding', () => {
  it('binds 4 bars only to a buyer turn, and only after a second verbatim probe', () => {
    const { ctx, state, vertical } = setup(1, 'drill', 0);
    const first = sendLearnerMessage(ctx, state, 'What does success look like for you in numbers?');
    expect(first.bindings.metrics.bars).toBe(3);
    const next = sendLearnerMessage(ctx, first, 'How much do you need to cut this quarter?');
    const binding = next.bindings.metrics;
    expect(binding.bars).toBe(4);
    const turn = next.turns.find((candidate) => candidate.id === binding.transcript_turn_id);
    expect(turn?.speaker).toBe('buyer');
    expect(turn?.content).toBe(vertical.buyer_reveals.metrics.verbatim);
    expect(() => assertEvidenceInvariant(next.bindings, next.turns)).not.toThrow();
  });

  it('binds 3 bars for a partial probe, with no verbatim evidence', () => {
    const { ctx, state, vertical } = setup(1, 'drill', 0);
    const next = sendLearnerMessage(ctx, state, 'We track our KPI every month.');
    expect(next.bindings.metrics.bars).toBe(3);
    expect(next.bindings.metrics.transcript_turn_id).not.toBeNull();
    const turn = next.turns.find((candidate) => candidate.id === next.bindings.metrics.transcript_turn_id);
    expect(turn?.content).toBe(vertical.buyer_reveals.metrics.partial);
  });

  it('does not upgrade when the same verbatim question is repeated', () => {
    const { ctx, state } = setup(1, 'drill', 0);
    const once = sendLearnerMessage(ctx, state, 'What does success look like in numbers?');
    const twice = sendLearnerMessage(ctx, once, 'What does success look like in numbers?');
    expect(twice.bindings.metrics.bars).toBe(3);
  });

  it('never raises a signal from learner claims alone', () => {
    const { ctx, state } = setup(1, 'drill', 0);
    const next = sendLearnerMessage(ctx, state, 'I believe the CIO is the economic buyer and the deal is basically done.');
    expect(next.bindings.economic_buyer.bars).toBe(1);
    expect(next.turns.some((turn) => turn.reveal !== undefined)).toBe(false);
  });

  it('upgrades a partial signal to verbatim and cites the newer buyer turn', () => {
    const { ctx, state } = setup(1, 'drill', 0);
    const partial = sendLearnerMessage(ctx, state, 'We track our KPI every month.');
    const partialTurnId = partial.bindings.metrics.transcript_turn_id;
    const verbatim = sendLearnerMessage(ctx, partial, 'What does success look like in numbers?');
    expect(verbatim.bindings.metrics.bars).toBe(4);
    expect(verbatim.bindings.metrics.transcript_turn_id).not.toBe(partialTurnId);
  });

  it('raises an objection on every second learner message', () => {
    const { ctx, state } = setup(1, 'drill', 0);
    const once = sendLearnerMessage(ctx, state, 'Tell me more about how you work.');
    expect(once.turns.some((turn) => turn.objection)).toBe(false);
    const twice = sendLearnerMessage(ctx, once, 'And how does onboarding go?');
    const objection = twice.turns.find((turn) => turn.objection);
    expect(objection?.content).toBe(ctx.objections[0]);
  });

  it('offers coach hints in drills only, and never in boss fights', () => {
    const drill = setup(1, 'drill', 0);
    const hinted = requestHint(drill.ctx, drill.state);
    expect(hinted.hint).toContain('success');
    expect(hinted.state.hintsUsed).toBe(1);

    const boss = setup(1, 'boss');
    expect(requestHint(boss.ctx, boss.state).hint).toBeNull();
  });

  it('counts verified target signals only', () => {
    const { ctx, state } = setup(1, 'drill', 0);
    const once = sendLearnerMessage(ctx, state, 'What does success look like in numbers?');
    expect(verifiedCount(once)).toBe(0);
    const next = sendLearnerMessage(ctx, once, 'How much do you need to cut this quarter?');
    expect(verifiedCount(next)).toBe(1);
    expect(next.targetSignals).toEqual(['metrics', 'economic_buyer']);
  });

  it('puts all eight signals in scope for boss fights', () => {
    const { state } = setup(2, 'boss');
    expect(state.targetSignals).toHaveLength(8);
  });
});
