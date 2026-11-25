import { TIERS, type Rubric, type Tier } from './curriculum/schema';
import { drillKey, type Trajectory } from './store';

export type StepStatus = 'complete' | 'current' | 'upcoming';
export type UnitStatus = 'complete' | 'active' | 'locked';

export interface PathStep {
  /** Route segment for the step: drill-1, drill-2, drill-3, or boss. */
  id: string;
  kind: 'drill' | 'boss';
  drillId: string | null;
  name: string;
  href: string;
  status: StepStatus;
  bestScore: number | null;
  credited: boolean;
}

export interface PathUnit {
  tier: Tier;
  status: UnitStatus;
  steps: PathStep[];
  completedSteps: number;
}

export interface LearningPath {
  units: PathUnit[];
  activeUnit: PathUnit | null;
  nextStep: PathStep | null;
}

/**
 * The single linear path for a trajectory. The active unit is the first one whose boss fight is not passed.
 * Inside it, the current step is the first step that is not passed: three drills, then the boss fight.
 */
export function buildPath(trajectory: Trajectory, rubrics: Record<Tier, Rubric>): LearningPath {
  const activeTier = TIERS.find((tier) => !trajectory.boss[String(tier)]?.passed) ?? null;

  const units = TIERS.map((tier): PathUnit => {
    const rubric = rubrics[tier];
    const boss = trajectory.boss[String(tier)];
    const status: UnitStatus = boss?.passed ? 'complete' : tier === activeTier ? 'active' : 'locked';

    const raw = [
      ...rubric.drills.map((drill, index) => {
        const progress = trajectory.drills[drillKey(tier, drill.id)];
        return {
          id: `drill-${index + 1}`,
          kind: 'drill' as const,
          drillId: drill.id,
          name: `Drill ${index + 1} · ${drill.title}`,
          passed: progress?.passed ?? false,
          bestScore: progress ? progress.bestScore : null,
          credited: progress?.credited ?? false
        };
      }),
      {
        id: 'boss',
        kind: 'boss' as const,
        drillId: null,
        name: rubric.boss_fight.title,
        passed: boss?.passed ?? false,
        bestScore: boss ? boss.bestScore : null,
        credited: false
      }
    ];

    const currentIndex = status === 'active' ? raw.findIndex((step) => !step.passed) : -1;
    const steps = raw.map(({ passed, ...step }, index): PathStep => ({
      ...step,
      href: `/room/${tier}/${step.id}`,
      status: passed ? 'complete' : index === currentIndex ? 'current' : 'upcoming'
    }));

    return { tier, status, steps, completedSteps: steps.filter((step) => step.status === 'complete').length };
  });

  const activeUnit = units.find((unit) => unit.status === 'active') ?? null;
  return { units, activeUnit, nextStep: activeUnit?.steps.find((step) => step.status === 'current') ?? null };
}

/** A step opens when it is the current step, or for replay once it or its whole unit is complete. */
export function canOpenStep(path: LearningPath, tier: Tier, stepId: string): boolean {
  const unit = path.units.find((candidate) => candidate.tier === tier);
  const step = unit?.steps.find((candidate) => candidate.id === stepId);
  if (!unit || !step) return false;
  if (unit.status === 'complete') return true;
  return unit.status === 'active' && step.status !== 'upcoming';
}
