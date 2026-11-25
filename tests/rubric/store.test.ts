import { describe, expect, it } from 'vitest';
import { addOrActivateTrajectory, drillKey, emptyAppState, recordSession, resetTrajectory, setActiveTrajectory, type SessionRecord } from '../../src/lib/store';
import { loadCurriculum, signalDefinitions } from '../../src/lib/curriculum/load';
import { SIGNAL_IDS, type Tier } from '../../src/lib/curriculum/schema';
import { composeScenario, trajectoryId } from '../../src/lib/composer';
import { sendLearnerMessage, startSimulation, type SimContext } from '../../src/lib/simulator';
import { gradeSession } from '../../src/lib/grader';

const curriculum = loadCurriculum();

function record(tier: Tier, mode: 'drill' | 'boss', drillId: string | null, passed: boolean, score: number): SessionRecord {
  return { id: `s-${tier}-${mode}-${drillId ?? 'boss'}-${score}`, tier, mode, drillId, score, passed, autoFailIds: [], bindings: {} as SessionRecord['bindings'], transcript: [], createdAt: '2026-01-01T00:00:00.000Z' };
}

describe('state store', () => {
  it('builds stable trajectory ids from cluster and vertical', () => {
    expect(trajectoryId('foundation_models', 'banking_fsi')).toBe('foundation_models__banking_fsi');
  });

  it('keeps progress separate per trajectory and never overwrites it on switch', () => {
    let state = addOrActivateTrajectory(emptyAppState(), 'foundation_models', 'banking_fsi', [], '2026-01-01T00:00:00.000Z');
    state = recordSession(state, trajectoryId('foundation_models', 'banking_fsi'), record(1, 'drill', 'd1', true, 90));
    state = addOrActivateTrajectory(state, 'vertical_agents', 'consumer_brands', [], '2026-01-02T00:00:00.000Z');
    expect(state.activeTrajectoryId).toBe('vertical_agents__consumer_brands');
    expect(state.trajectories[0]?.drills[drillKey(1, 'd1')]?.passed).toBe(true);
    state = setActiveTrajectory(state, 'foundation_models__banking_fsi');
    expect(state.trajectories.find((t) => t.id === 'foundation_models__banking_fsi')?.drills[drillKey(1, 'd1')]?.passed).toBe(true);
  });

  it('re-adding an existing trajectory activates it without duplicating it', () => {
    let state = addOrActivateTrajectory(emptyAppState(), 'data_context', 'insurance', []);
    state = addOrActivateTrajectory(state, 'data_context', 'insurance', []);
    expect(state.trajectories).toHaveLength(1);
  });

  it('credits the tier 1 introductory drill only when MEDDPICC was verified at 85 or higher', () => {
    let state = addOrActivateTrajectory(emptyAppState(), 'foundation_models', 'banking_fsi', ['1:d1']);
    expect(state.trajectories[0]?.drills['1:d1']).toBeUndefined();
    state = { ...state, globalCompetencies: { meddpicc: 90 } };
    state = addOrActivateTrajectory(state, 'data_context', 'insurance', ['1:d1']);
    expect(state.trajectories[1]?.drills['1:d1']).toEqual({ passed: true, bestScore: 85, credited: true });
  });

  it('keeps the best score and never lowers it on retake', () => {
    let state = addOrActivateTrajectory(emptyAppState(), 'vertical_agents', 'law_firms', []);
    const id = state.trajectories[0]!.id;
    state = recordSession(state, id, record(2, 'drill', 'd1', true, 88));
    state = recordSession(state, id, record(2, 'drill', 'd1', false, 50));
    expect(state.trajectories[0]?.drills[drillKey(2, 'd1')]).toEqual({ passed: true, bestScore: 88, credited: false });
  });

  it('reset clears progress but keeps the trajectory', () => {
    let state = addOrActivateTrajectory(emptyAppState(), 'data_context', 'law_firms', []);
    const id = state.trajectories[0]!.id;
    state = recordSession(state, id, record(1, 'boss', null, true, 90));
    state = resetTrajectory(state, id);
    expect(state.trajectories).toHaveLength(1);
    expect(state.trajectories[0]?.boss).toEqual({});
    expect(state.trajectories[0]?.sessions).toEqual([]);
  });

  it('records a real graded session end to end', () => {
    const vertical = curriculum.verticals.banking_fsi;
    const rubric = curriculum.rubrics[1];
    const payload = composeScenario({ cluster: curriculum.clusters.compute_infra, vertical, rubric, mode: 'drill', drillIndex: 0 });
    const ctx: SimContext = { vertical, signals: signalDefinitions(curriculum), objections: payload.objection_queue, personaRoles: payload.personas.map((p) => p.role) };
    let sim = startSimulation(ctx, { mode: 'drill', targetSignals: payload.target_signals });
    sim = sendLearnerMessage(ctx, sim, 'What does success look like in numbers?');
    sim = sendLearnerMessage(ctx, sim, 'How much do you need to cut this quarter?');
    sim = sendLearnerMessage(ctx, sim, 'Who signs the PO on this?');
    sim = sendLearnerMessage(ctx, sim, 'Who has the final say on the budget?');
    const graded = gradeSession(rubric, sim);
    const state = recordSession(addOrActivateTrajectory(emptyAppState(), 'compute_infra', 'banking_fsi', []), trajectoryId('compute_infra', 'banking_fsi'), {
      id: 'e2e', tier: 1, mode: 'drill', drillId: 'd1', score: graded.score, passed: graded.passed, autoFailIds: [], bindings: sim.bindings, transcript: sim.turns, createdAt: '2026-01-01T00:00:00.000Z'
    });
    expect(graded.score).toBe(100);
    expect(state.trajectories[0]?.drills['1:d1']?.passed).toBe(true);
    expect(SIGNAL_IDS).toContain('economic_buyer');
  });
});
