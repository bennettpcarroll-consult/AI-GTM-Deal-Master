import { describe, expect, it } from 'vitest';
import { loadCurriculum } from '../../src/lib/curriculum/load';
import { TIERS, type Tier } from '../../src/lib/curriculum/schema';
import { buildPath, canOpenStep } from '../../src/lib/path';
import { addOrActivateTrajectory, emptyAppState, recordSession, type AppState, type SessionRecord } from '../../src/lib/store';

const { rubrics } = loadCurriculum();

function record(tier: Tier, mode: 'drill' | 'boss', drillId: string | null, passed: boolean, score: number): SessionRecord {
  return { id: `s-${tier}-${mode}-${drillId ?? 'boss'}-${score}`, tier, mode, drillId, score, passed, autoFailIds: [], bindings: {} as SessionRecord['bindings'], transcript: [], createdAt: '2026-01-01T00:00:00.000Z' };
}

const fresh = (): AppState => addOrActivateTrajectory(emptyAppState(), 'agentic_harness', 'banking_fsi', []);
const pathOf = (state: AppState) => buildPath(state.trajectories[0]!, rubrics);
const pass = (state: AppState, tier: Tier, drillId: string | null): AppState =>
  recordSession(state, state.trajectories[0]!.id, record(tier, drillId ? 'drill' : 'boss', drillId, true, 90));
const passUnit = (state: AppState, tier: Tier): AppState => [...['d1', 'd2', 'd3'], null].reduce((next, drillId) => pass(next, tier, drillId), state);

describe('linear path', () => {
  it('starts on unit 1, drill 1, with every later unit locked', () => {
    const path = pathOf(fresh());
    expect(path.units.map((unit) => unit.status)).toEqual(['active', 'locked', 'locked', 'locked']);
    expect(path.activeUnit?.tier).toBe(1);
    expect(path.nextStep?.id).toBe('drill-1');
    expect(path.nextStep?.href).toBe('/room/1/drill-1');
    expect(path.activeUnit?.completedSteps).toBe(0);
  });

  it('gives every unit four steps: three drills, then the boss fight', () => {
    for (const unit of pathOf(fresh()).units) {
      expect(unit.steps.map((step) => step.id)).toEqual(['drill-1', 'drill-2', 'drill-3', 'boss']);
      expect(unit.steps.map((step) => step.kind)).toEqual(['drill', 'drill', 'drill', 'boss']);
    }
  });

  it('has exactly one current step, and only in the active unit', () => {
    const path = pathOf(fresh());
    const current = path.units.flatMap((unit) => unit.steps.filter((step) => step.status === 'current').map(() => unit.tier));
    expect(current).toEqual([1]);
    expect(path.units[1]?.steps.every((step) => step.status === 'upcoming')).toBe(true);
  });

  it('advances one step at a time and counts completed steps', () => {
    let state = pass(fresh(), 1, 'd1');
    expect(pathOf(state).activeUnit?.steps.map((step) => step.status)).toEqual(['complete', 'current', 'upcoming', 'upcoming']);
    expect(pathOf(state).activeUnit?.completedSteps).toBe(1);
    state = pass(pass(state, 1, 'd2'), 1, 'd3');
    expect(pathOf(state).nextStep?.kind).toBe('boss');
    expect(pathOf(state).activeUnit?.completedSteps).toBe(3);
  });

  it('keeps a failed step current and reports its best score', () => {
    const state = recordSession(fresh(), fresh().trajectories[0]!.id, record(1, 'drill', 'd1', false, 62));
    const step = pathOf(state).nextStep;
    expect(step?.id).toBe('drill-1');
    expect(step?.status).toBe('current');
    expect(step?.bestScore).toBe(62);
  });

  it('unlocks the next unit only after the boss fight is passed', () => {
    let state = pass(pass(pass(fresh(), 1, 'd1'), 1, 'd2'), 1, 'd3');
    expect(pathOf(state).units.map((unit) => unit.status)).toEqual(['active', 'locked', 'locked', 'locked']);
    state = pass(state, 1, null);
    const path = pathOf(state);
    expect(path.units.map((unit) => unit.status)).toEqual(['complete', 'active', 'locked', 'locked']);
    expect(path.nextStep?.href).toBe('/room/2/drill-1');
  });

  it('starts a placement-credited trajectory on drill 2', () => {
    let state: AppState = { ...emptyAppState(), globalCompetencies: { meddpicc: 90 } };
    state = addOrActivateTrajectory(state, 'data_context', 'insurance', ['1:d1']);
    const path = pathOf(state);
    expect(path.activeUnit?.steps[0]?.status).toBe('complete');
    expect(path.activeUnit?.steps[0]?.credited).toBe(true);
    expect(path.nextStep?.id).toBe('drill-2');
  });

  it('has no active unit and no next step once all four boss fights are passed', () => {
    const state = TIERS.reduce((next, tier) => passUnit(next, tier), fresh());
    const path = pathOf(state);
    expect(path.units.map((unit) => unit.status)).toEqual(['complete', 'complete', 'complete', 'complete']);
    expect(path.activeUnit).toBeNull();
    expect(path.nextStep).toBeNull();
  });

  it('opens only the current step, completed steps, and steps in completed units', () => {
    const state = pass(fresh(), 1, 'd1');
    const path = pathOf(state);
    expect(canOpenStep(path, 1, 'drill-1')).toBe(true);
    expect(canOpenStep(path, 1, 'drill-2')).toBe(true);
    expect(canOpenStep(path, 1, 'drill-3')).toBe(false);
    expect(canOpenStep(path, 1, 'boss')).toBe(false);
    expect(canOpenStep(path, 2, 'drill-1')).toBe(false);
    expect(canOpenStep(path, 1, 'drill-9')).toBe(false);

    const done = pathOf(passUnit(fresh(), 1));
    expect(canOpenStep(done, 1, 'boss')).toBe(true);
    expect(canOpenStep(done, 2, 'drill-1')).toBe(true);
    expect(canOpenStep(done, 2, 'boss')).toBe(false);
    expect(canOpenStep(done, 3, 'drill-1')).toBe(false);
  });
});
