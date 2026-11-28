import type { FlowQuestion } from '@/components/question-flow';
import type { Curriculum } from './curriculum/load';
import { TIERS } from './curriculum/schema';
import { repToQuestion, sharpenQuestion } from './questions';
import { buildCurveball, familyOf, tierSkillIds } from './skills';
import type { Trajectory } from './store';

export const FINAL_REVIEW_SIZE = 8;

/**
 * The one bigger review at the end of the course: two questions per pillar, interleaved across
 * pillars so it tests recall, not the order things were taught. On an authored arc the questions
 * are new situations from the pillars' unplayed capstone scenes; elsewhere they are executive curveballs,
 * so nothing replays a drill.
 */
export function finalReviewQuestions(curriculum: Curriculum, trajectory: Trajectory): FlowQuestion[] {
  const arc = curriculum.arcs[trajectory.id];
  const perPillar: FlowQuestion[][] = arc
    ? arc.pillars.map((pillar) =>
        pillar.capstone.beats.slice(0, 2).map((beat) => sharpenQuestion({ beat, pillar, scene: `Pillar 0${pillar.tier}` }, 'final-review'))
      )
    : TIERS.map((tier) =>
        tierSkillIds(curriculum, curriculum.rubrics[tier])
          .map((id) => curriculum.skills.find((skill) => skill.id === id)!)
          .filter((skill) => !skill.signal)
          .slice(0, 2)
          .map((skill) => repToQuestion(buildCurveball(skill, 'final-review'), curriculum.families.find((family) => family.id === familyOf(curriculum, skill.id))?.display_name ?? ''))
      );
  const mixed: FlowQuestion[] = [];
  for (let round = 0; round < 2; round += 1) for (const set of perPillar) if (set[round]) mixed.push(set[round]!);
  return mixed.slice(0, FINAL_REVIEW_SIZE).map((question) => ({ ...question, kicker: question.kicker.replace(/^Sharpen · /, '') }));
}
