import type { Curriculum } from './curriculum/load';
import { TIERS, type ArcPillar, type Tier } from './curriculum/schema';
import { arcPillar } from './deal-room';
import { drillKey, drillsPassed, tierUnlocked, type AppState, type Trajectory } from './store';

/**
 * The learner's path. Each pillar runs: (market briefing on Pillar 01), the big idea for
 * authored arcs, three drills, then a one-screen recap that moves the learner straight on.
 * There is no end-of-pillar replay. The course ends with one bigger final review.
 */
export type NodeState = 'done' | 'current' | 'open' | 'locked';

export interface PathNode {
  key: string;
  href: string;
  title: string;
  kind: 'lesson' | 'concept' | 'drill' | 'recap' | 'review';
  state: NodeState;
}

export interface PillarPath {
  tier: Tier;
  pillar: ArcPillar | null;
  nodes: PathNode[];
}

/** The pass mark for the final review, as a share of questions right. */
export const FINAL_REVIEW_PASS = 0.75;

export function pathFor(curriculum: Curriculum, state: AppState, trajectory: Trajectory): PillarPath[] {
  const briefingDone = (state.lessonsDone ?? []).includes(trajectory.clusterId);
  const conceptsDone = state.conceptsDone ?? [];
  const pillars = TIERS.map((tier) => {
    const rubric = curriculum.rubrics[tier];
    const pillar = arcPillar(curriculum, trajectory.clusterId, trajectory.verticalId, tier);
    const unlocked = tierUnlocked(trajectory, tier, state.reviewer);
    const drills: PathNode[] = rubric.drills.map((drill, index) => ({
      key: drill.id,
      href: `/room/${tier}/drill-${index + 1}`,
      title: pillar?.drills[index]?.title ?? drill.title,
      kind: 'drill',
      state: !unlocked ? 'locked' : trajectory.drills[drillKey(tier, drill.id)]?.passed ? 'done' : 'open'
    }));
    const allDrills = drillsPassed(trajectory, tier) === rubric.drills.length;
    const complete = trajectory.boss[String(tier)]?.passed === true;
    const recap: PathNode = {
      key: 'recap',
      href: `/recap/${tier}`,
      title: 'Pillar recap',
      kind: 'recap',
      state: !unlocked ? 'locked' : complete ? 'done' : allDrills ? 'open' : 'locked'
    };
    const concept: PathNode[] = pillar
      ? [{ key: 'concept', href: `/concept/${tier}`, title: 'The big idea', kind: 'concept', state: !unlocked ? 'locked' : conceptsDone.includes(`${trajectory.id}:${tier}`) ? 'done' : 'open' }]
      : [];
    const briefing: PathNode[] =
      tier === 1 ? [{ key: 'briefing', href: '/briefing', title: 'Market briefing', kind: 'lesson', state: briefingDone ? 'done' : 'open' }] : [];
    const review: PathNode[] =
      tier === 4
        ? [{ key: 'review', href: '/review', title: 'Final review', kind: 'review', state: trajectory.finalReview?.passed ? 'done' : complete || state.reviewer ? 'open' : 'locked' }]
        : [];
    return { tier, pillar, nodes: [...briefing, ...concept, ...drills, recap, ...review] };
  });
  const current = pillars.flatMap(({ nodes }) => nodes).find((node) => node.state === 'open');
  if (current) current.state = 'current';
  return pillars;
}

/**
 * Reads a /room/[tier]/[mode] segment. Drills play in the room. The old "boss" route no longer
 * plays anything: it sends the learner to the pillar recap, so a saved link or an open tab
 * can never replay the drills as a boss fight.
 */
export function roomRoute(tier: number, mode: string): { kind: 'drill'; drillIndex: number } | { kind: 'redirect'; href: string } | null {
  if (!(TIERS as readonly number[]).includes(tier)) return null;
  const drill = /^drill-([1-3])$/.exec(mode);
  if (drill) return { kind: 'drill', drillIndex: Number(drill[1]) - 1 };
  if (mode === 'boss') return { kind: 'redirect', href: `/recap/${tier}` };
  return null;
}
