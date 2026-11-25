import { CREDIT_THRESHOLD, DRILL_IDS, STAGES, type Stage } from './constants';
import { trajectoryId } from './composer';
import { TIERS, type ClusterId, type SignalId, type Tier, type VerticalId } from './curriculum/schema';
import type { Binding, SkillEvidence, Turn } from './simulator';

export interface SessionRecord {
  id: string;
  tier: Tier;
  mode: 'drill' | 'boss';
  drillId: string | null;
  score: number;
  passed: boolean;
  autoFailIds: string[];
  bindings: Record<SignalId, Binding>;
  transcript: Turn[];
  createdAt: string;
  /** Buyer evidence for consumption skills. Missing on sessions saved before skills existed. */
  skillEvidence?: Record<string, SkillEvidence>;
  hintsUsed?: number;
}

export interface DrillProgress {
  passed: boolean;
  bestScore: number;
  credited: boolean;
}

export interface BossProgress {
  passed: boolean;
  bestScore: number;
}

export interface Trajectory {
  id: string;
  clusterId: ClusterId;
  verticalId: VerticalId;
  createdAt: string;
  sessions: SessionRecord[];
  drills: Record<string, DrillProgress>;
  boss: Record<string, BossProgress>;
}

/** Result of the starting diagnostic: skill id to whether the learner picked the strongest reply. */
export interface DiagnosticResult {
  completedAt: string;
  answers: Record<string, boolean>;
}

/** Engagement counters. Points come only from verified buyer proof, never from time spent. */
export interface Engagement {
  streak: number;
  lastActiveDay: string | null;
  today: string | null;
  repsToday: number;
  points: number;
  /** Skill ids the learner has practiced in quick reps. */
  repSkills: string[];
}

export interface AppState {
  version: 1;
  activeTrajectoryId: string | null;
  trajectories: Trajectory[];
  globalCompetencies: { meddpicc: number };
  diagnostic?: DiagnosticResult;
  engagement?: Engagement;
  /** Clusters whose market lesson the learner has finished. */
  lessonsDone?: ClusterId[];
}

export function drillKey(tier: Tier, drillId: string): string {
  return `${tier}:${drillId}`;
}

export function emptyAppState(): AppState {
  return { version: 1, activeTrajectoryId: null, trajectories: [], globalCompetencies: { meddpicc: 0 } };
}

/**
 * Adds a trajectory, or activates it when it already exists. Existing progress is never touched.
 * Placement credit applies only when the learner already verified MEDDPICC at the credit threshold.
 */
export function addOrActivateTrajectory(
  state: AppState,
  clusterId: ClusterId,
  verticalId: VerticalId,
  eligibleDrillKeys: string[],
  now: string = new Date().toISOString()
): AppState {
  const id = trajectoryId(clusterId, verticalId);
  if (state.trajectories.some((trajectory) => trajectory.id === id)) {
    return { ...state, activeTrajectoryId: id };
  }
  const drills: Record<string, DrillProgress> = {};
  if (state.globalCompetencies.meddpicc >= CREDIT_THRESHOLD) {
    for (const key of eligibleDrillKeys) {
      drills[key] = { passed: true, bestScore: CREDIT_THRESHOLD, credited: true };
    }
  }
  const trajectory: Trajectory = { id, clusterId, verticalId, createdAt: now, sessions: [], drills, boss: {} };
  return { ...state, activeTrajectoryId: id, trajectories: [...state.trajectories, trajectory] };
}

export function setActiveTrajectory(state: AppState, id: string): AppState {
  return state.trajectories.some((trajectory) => trajectory.id === id) ? { ...state, activeTrajectoryId: id } : state;
}

function applySession(trajectory: Trajectory, record: SessionRecord): Trajectory {
  const sessions = [...trajectory.sessions, record];
  if (record.mode === 'drill' && record.drillId) {
    const key = drillKey(record.tier, record.drillId);
    const previous = trajectory.drills[key];
    return {
      ...trajectory,
      sessions,
      drills: {
        ...trajectory.drills,
        [key]: {
          passed: (previous?.passed ?? false) || record.passed,
          bestScore: Math.max(previous?.bestScore ?? 0, record.score),
          credited: previous?.credited ?? false
        }
      }
    };
  }
  const tierKey = String(record.tier);
  const previous = trajectory.boss[tierKey];
  return {
    ...trajectory,
    sessions,
    boss: {
      ...trajectory.boss,
      [tierKey]: {
        passed: (previous?.passed ?? false) || record.passed,
        bestScore: Math.max(previous?.bestScore ?? 0, record.score)
      }
    }
  };
}

export function recordSession(state: AppState, trajectoryIdToUpdate: string, record: SessionRecord): AppState {
  return {
    ...state,
    globalCompetencies: { meddpicc: Math.max(state.globalCompetencies.meddpicc, record.score) },
    trajectories: state.trajectories.map((trajectory) =>
      trajectory.id === trajectoryIdToUpdate ? applySession(trajectory, record) : trajectory
    )
  };
}

export function resetTrajectory(state: AppState, trajectoryIdToReset: string): AppState {
  return {
    ...state,
    trajectories: state.trajectories.map((trajectory) =>
      trajectory.id === trajectoryIdToReset ? { ...trajectory, sessions: [], drills: {}, boss: {} } : trajectory
    )
  };
}

export function drillsPassed(trajectory: Trajectory, tier: Tier): number {
  return DRILL_IDS.filter((drillId) => trajectory.drills[drillKey(tier, drillId)]?.passed).length;
}

export function bossesPassed(trajectory: Trajectory): number {
  return TIERS.filter((tier) => trajectory.boss[String(tier)]?.passed).length;
}

export function tierUnlocked(trajectory: Trajectory, tier: Tier): boolean {
  if (tier === 1) return true;
  const previous = tier - 1 as Tier;
  return trajectory.boss[String(previous)]?.passed === true;
}

export function pillarStage(trajectory: Trajectory, tier: Tier): Stage {
  const boss = trajectory.boss[String(tier)];
  if (boss?.passed) return boss.bestScore >= 100 ? STAGES[4] : STAGES[3];
  const passed = drillsPassed(trajectory, tier);
  if (passed === DRILL_IDS.length) return STAGES[2];
  return passed > 0 ? STAGES[1] : STAGES[0];
}

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

/** The lowest-stage pillar. Ties go to the earlier pillar. */
export function weakestTier(trajectory: Trajectory): Tier {
  let worst: Tier = 1;
  for (const tier of TIERS) {
    if (stageIndex(pillarStage(trajectory, tier)) < stageIndex(pillarStage(trajectory, worst))) worst = tier;
  }
  return worst;
}
