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
  /** Authored scenes only: beats not answered with the elite move first time. */
  misses?: SessionMiss[];
  /** Authored capstones only: the full capstone, the fast track or a targeted retry. */
  variant?: 'full' | 'fast' | 'retry';
}

export interface SessionMiss {
  beatId: string;
  skillId: string;
  failure?: string;
}

/** A missed move scheduled for spaced retrieval in daily reps. */
export interface SharpenItem {
  trajectoryId: string;
  beatId: string;
  skillId: string;
  failure?: string;
  /** Day (YYYY-MM-DD) the move is next due. */
  due: string;
  /** Clean recalls in a row. Three graduate the move. */
  reviews: number;
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
  /**
   * Pillar completion by tier. The name is kept from the old boss fights so saved progress still
   * reads: a pillar now completes when its three drills pass and the learner sees the recap.
   */
  boss: Record<string, BossProgress>;
  /** The one bigger review at the end of the course. */
  finalReview?: BossProgress;
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
  /** Pillar concept cards finished, as "<trajectoryId>:<tier>". */
  conceptsDone?: string[];
  /** Missed moves waiting for spaced retrieval. */
  sharpen?: SharpenItem[];
  /** Reviewer mode (?preview=1): every pillar is open, so a hiring manager can see the executive material. */
  reviewer?: boolean;
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

/** Turns reviewer mode on or off. Progress is untouched either way. */
export function setReviewer(state: AppState, on: boolean): AppState {
  return Boolean(state.reviewer) === on ? state : { ...state, reviewer: on };
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

export function tierUnlocked(trajectory: Trajectory, tier: Tier, reviewer = false): boolean {
  if (tier === 1 || reviewer) return true;
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

/**
 * True when every drill in the tier has a session with no missed move. Such a learner has
 * shown the pillar's skills already, so the capstone offers a three-move fast track.
 */
export function drillsCleared(trajectory: Trajectory, tier: Tier, drillIds: string[]): boolean {
  return drillIds.every((drillId) =>
    trajectory.sessions.some((session) => session.tier === tier && session.mode === 'drill' && session.drillId === drillId && session.misses !== undefined && session.misses.length === 0)
  );
}

/** Marks a pillar complete once all its drills pass. Unlocks the next pillar. No replay session is needed. */
export function completePillar(state: AppState, trajectoryIdToUpdate: string, tier: Tier): AppState {
  return {
    ...state,
    trajectories: state.trajectories.map((trajectory) => {
      if (trajectory.id !== trajectoryIdToUpdate || trajectory.boss[String(tier)]?.passed) return trajectory;
      if (drillsPassed(trajectory, tier) < DRILL_IDS.length) return trajectory;
      const scores = DRILL_IDS.map((drillId) => trajectory.drills[drillKey(tier, drillId)]?.bestScore ?? 0);
      const bestScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      return { ...trajectory, boss: { ...trajectory.boss, [String(tier)]: { passed: true, bestScore } } };
    })
  };
}

/** Records a final review attempt. The best score and a pass are kept. */
export function recordFinalReview(state: AppState, trajectoryIdToUpdate: string, score: number, passed: boolean): AppState {
  return {
    ...state,
    trajectories: state.trajectories.map((trajectory) =>
      trajectory.id === trajectoryIdToUpdate
        ? { ...trajectory, finalReview: { passed: (trajectory.finalReview?.passed ?? false) || passed, bestScore: Math.max(trajectory.finalReview?.bestScore ?? 0, score) } }
        : trajectory
    )
  };
}
