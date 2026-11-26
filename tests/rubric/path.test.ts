import { describe, expect, it } from 'vitest';
import { loadCurriculum } from '../../src/lib/curriculum/load';
import { CLUSTER_IDS, TIERS, VERTICAL_IDS } from '../../src/lib/curriculum/schema';
import { trajectoryId } from '../../src/lib/composer';
import { pathFor, roomRoute } from '../../src/lib/path';
import { finalReviewQuestions, FINAL_REVIEW_SIZE } from '../../src/lib/review';
import { addOrActivateTrajectory, completePillar, drillKey, emptyAppState, tierUnlocked, type AppState } from '../../src/lib/store';

/**
 * Benney's rule: no end-of-pillar session that replays the drills. A pillar is three drills and a
 * one-screen recap, then the next pillar. One bigger review closes the course.
 */
const curriculum = loadCurriculum();

function withAllDrillsPassed(state: AppState, id: string): AppState {
  const drills = Object.fromEntries(TIERS.flatMap((tier) => ['d1', 'd2', 'd3'].map((drill) => [drillKey(tier, drill), { passed: true, bestScore: 90, credited: false }])));
  return { ...state, trajectories: state.trajectories.map((trajectory) => (trajectory.id === id ? { ...trajectory, drills } : trajectory)) };
}

describe('pillar path without a replay', () => {
  it('never links to the old boss fight on any trajectory, and ends every pillar with a recap', () => {
    for (const clusterId of CLUSTER_IDS) {
      for (const verticalId of VERTICAL_IDS) {
        const id = trajectoryId(clusterId, verticalId);
        let state = withAllDrillsPassed(addOrActivateTrajectory(emptyAppState(), clusterId, verticalId, []), id);
        for (const tier of TIERS) state = completePillar(state, id, tier);
        const trajectory = state.trajectories[0]!;
        for (const { tier, nodes } of pathFor(curriculum, state, trajectory)) {
          const where = `${id} tier ${tier}`;
          expect(nodes.some((node) => node.href.includes('/boss')), where).toBe(false);
          const ends = nodes.slice(-(tier === 4 ? 2 : 1)).map((node) => node.kind);
          expect(ends, where).toEqual(tier === 4 ? ['recap', 'review'] : ['recap']);
          expect(nodes.filter((node) => node.kind === 'drill')).toHaveLength(3);
        }
      }
    }
  });

  it('forwards the retired boss route to the pillar recap instead of playing it', () => {
    for (const tier of TIERS) {
      expect(roomRoute(tier, 'boss')).toEqual({ kind: 'redirect', href: `/recap/${tier}` });
      expect(roomRoute(tier, 'drill-2')).toEqual({ kind: 'drill', drillIndex: 1 });
    }
    expect(roomRoute(5, 'drill-1')).toBeNull();
    expect(roomRoute(1, 'drill-4')).toBeNull();
  });

  it('opens the next pillar as soon as the drills pass and the recap is seen, with no extra session', () => {
    const id = 'agentic_harness__banking_fsi';
    const start = addOrActivateTrajectory(emptyAppState(), 'agentic_harness', 'banking_fsi', []);
    expect(tierUnlocked(completePillar(start, id, 1).trajectories[0]!, 2)).toBe(false);
    const done = completePillar(withAllDrillsPassed(start, id), id, 1).trajectories[0]!;
    expect(tierUnlocked(done, 2)).toBe(true);
    expect(done.boss['1']).toEqual({ passed: true, bestScore: 90 });
  });
});

describe('final review', () => {
  it('asks eight questions across all four pillars on every trajectory', () => {
    for (const clusterId of CLUSTER_IDS) {
      for (const verticalId of VERTICAL_IDS) {
        const state = addOrActivateTrajectory(emptyAppState(), clusterId, verticalId, []);
        const questions = finalReviewQuestions(curriculum, state.trajectories[0]!);
        expect(questions, `${clusterId} x ${verticalId}`).toHaveLength(FINAL_REVIEW_SIZE);
        expect(new Set(questions.map((question) => question.id)).size).toBe(FINAL_REVIEW_SIZE);
      }
    }
  });

  it('uses new situations on an authored arc, never a drill line', () => {
    const arc = curriculum.arcs.agentic_harness__banking_fsi!;
    const drillLines = new Set(arc.pillars.flatMap((pillar) => pillar.drills.flatMap((drill) => drill.beats.map((beat) => beat.line))));
    const state = addOrActivateTrajectory(emptyAppState(), 'agentic_harness', 'banking_fsi', []);
    const questions = finalReviewQuestions(curriculum, state.trajectories[0]!);
    expect(questions.every((question) => !drillLines.has(question.prompt))).toBe(true);
    expect(new Set(questions.map((question) => question.kicker)).size).toBe(4);
  });
});
