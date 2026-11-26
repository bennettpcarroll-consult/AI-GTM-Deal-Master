import type { Curriculum } from './curriculum/load';
import { TIERS, type Rubric, type Scenario, type Skill, type Tier } from './curriculum/schema';
import type { SkillProbe } from './simulator';
import { drillKey, type AppState, type Trajectory } from './store';

/** Mastery levels shown as the 4-bar indicator. */
export type Mastery = 1 | 2 | 3 | 4;
export const MASTERY_LABELS: Record<Mastery, string> = {
  1: 'Not started',
  2: 'Practiced',
  3: 'Proven',
  4: 'Certified'
};

/** Skills a drill builds: its MEDDPICC targets plus the skills it practices. */
export function drillSkillIds(curriculum: Curriculum, rubric: Rubric, drillIndex: number): string[] {
  const drill = rubric.drills[drillIndex];
  if (!drill) return [];
  const fromSignals = drill.target_signals
    .map((signal) => curriculum.skills.find((skill) => skill.signal === signal)?.id)
    .filter((id): id is string => Boolean(id));
  return [...new Set([...fromSignals, ...drill.practices_skills])];
}

/** Every skill a pillar teaches. Its boss fight tests all of them. */
export function tierSkillIds(curriculum: Curriculum, rubric: Rubric): string[] {
  return [...new Set(rubric.drills.flatMap((_, index) => drillSkillIds(curriculum, rubric, index)))];
}

/** The cluster and vertical a learner sells into. Enough to find an authored arc. */
export type SkillPath = Pick<Trajectory, 'clusterId' | 'verticalId'>;

/**
 * Skills a drill builds on this path. An authored arc teaches the skills its scenes play, so a
 * debrief or recap never credits a skill the learner did not practise. Generated rooms follow the rubric.
 */
export function pathDrillSkillIds(curriculum: Curriculum, path: SkillPath | undefined, tier: Tier, drillIndex: number): string[] {
  const arcDrill = path ? curriculum.arcs[`${path.clusterId}__${path.verticalId}`]?.pillars.find((pillar) => pillar.tier === tier)?.drills[drillIndex] : undefined;
  if (arcDrill) return [...new Set(arcDrill.beats.map((beat) => beat.skill))];
  return drillSkillIds(curriculum, curriculum.rubrics[tier], drillIndex);
}

/** Every skill a pillar teaches on this path. */
export function pathTierSkillIds(curriculum: Curriculum, path: SkillPath | undefined, tier: Tier): string[] {
  return [...new Set(curriculum.rubrics[tier].drills.flatMap((_, index) => pathDrillSkillIds(curriculum, path, tier, index)))];
}

/** Where a skill is taught: the pillar and drill numbers, on the learner's path when one is given. */
export function whereTaught(curriculum: Curriculum, skillId: string, path?: SkillPath): { tier: Tier; drillIndex: number }[] {
  const out: { tier: Tier; drillIndex: number }[] = [];
  for (const tier of TIERS) {
    curriculum.rubrics[tier].drills.forEach((_, drillIndex) => {
      if (pathDrillSkillIds(curriculum, path, tier, drillIndex).includes(skillId)) out.push({ tier, drillIndex });
    });
  }
  return out;
}

/**
 * Mastery for one skill in one trajectory.
 * Certified: the boss fight of a pillar that teaches it was passed (zero red flags).
 * Proven: a drill that builds it was passed.
 * Practiced: attempted in a drill or boss fight, answered correctly in the diagnostic, or done as a rep.
 */
export function skillMastery(curriculum: Curriculum, state: AppState, trajectory: Trajectory | undefined, skillId: string): Mastery {
  const places = whereTaught(curriculum, skillId, trajectory);
  if (trajectory) {
    if (places.some(({ tier }) => trajectory.boss[String(tier)]?.passed)) return 4;
    if (places.some(({ tier, drillIndex }) => trajectory.drills[drillKey(tier, curriculum.rubrics[tier].drills[drillIndex]?.id ?? '')]?.passed)) {
      return 3;
    }
    const attempted = trajectory.sessions.some((session) => {
      if (session.mode === 'boss') return pathTierSkillIds(curriculum, trajectory, session.tier).includes(skillId);
      const index = curriculum.rubrics[session.tier].drills.findIndex((drill) => drill.id === session.drillId);
      return pathDrillSkillIds(curriculum, trajectory, session.tier, index).includes(skillId);
    });
    if (attempted) return 2;
  }
  if (state.diagnostic?.answers[skillId]) return 2;
  if (state.engagement?.repSkills.includes(skillId)) return 2;
  return 1;
}

export function masteryMap(curriculum: Curriculum, state: AppState, trajectory: Trajectory | undefined): Record<string, Mastery> {
  return Object.fromEntries(curriculum.skills.map((skill) => [skill.id, skillMastery(curriculum, state, trajectory, skill.id)]));
}

export function familyOf(curriculum: Curriculum, skillId: string): string {
  return curriculum.families.find((family) => family.skills.some((skill) => skill.id === skillId))?.id ?? '';
}

export interface RepQuestion {
  skill: Skill;
  prompt: string;
  options: string[];
  answer: number;
}

/** Small deterministic hash so the same seed always shuffles the same way. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** One quick rep: the buyer's line and three replies, only one of them strong. */
export function buildRep(skill: Skill, seed: string): RepQuestion {
  const replies = [skill.talk_track.strong, skill.talk_track.weak, skill.rep.off_move];
  const order = [0, 1, 2].sort((a, b) => hash(`${seed}:${skill.id}:${a}`) - hash(`${seed}:${skill.id}:${b}`));
  return {
    skill,
    prompt: skill.rep.buyer_line,
    options: order.map((index) => replies[index] as string),
    answer: order.indexOf(0)
  };
}

export function diagnosticQuestions(curriculum: Curriculum): RepQuestion[] {
  return curriculum.diagnostic.items.map((item) => {
    const skill = curriculum.skills.find((candidate) => candidate.id === item.skill_id);
    if (!skill) throw new Error(`Unknown diagnostic skill ${item.skill_id}`);
    return buildRep(skill, 'diagnostic');
  });
}

/** Today's reps: the weakest skills first, rotated by day so the set changes daily. */
export function dailyReps(curriculum: Curriculum, mastery: Record<string, Mastery>, day: string, count = 5): RepQuestion[] {
  const ranked = [...curriculum.skills].sort((a, b) => {
    const byMastery = (mastery[a.id] ?? 1) - (mastery[b.id] ?? 1);
    return byMastery !== 0 ? byMastery : hash(`${day}:${a.id}`) - hash(`${day}:${b.id}`);
  });
  return ranked.slice(0, count).map((skill) => buildRep(skill, day));
}

/** Family score for the diagnostic result: correct answers out of the family's items. */
export function diagnosticByFamily(curriculum: Curriculum, answers: Record<string, boolean>): { familyId: string; label: string; correct: number; total: number }[] {
  return curriculum.families.map((family) => {
    const items = curriculum.diagnostic.items.filter((item) => family.skills.some((skill) => skill.id === item.skill_id));
    return {
      familyId: family.id,
      label: family.display_name,
      correct: items.filter((item) => answers[item.skill_id]).length,
      total: items.length
    };
  });
}

/** Points earned in a session: one per verified signal or consumption skill, all backed by buyer turns. */
export function proofCount(session: { bindings: Record<string, { bars: number }>; skillEvidence?: Record<string, { level: string }> }): number {
  const signals = Object.values(session.bindings).filter((binding) => binding.bars === 4).length;
  const skills = Object.values(session.skillEvidence ?? {}).filter((item) => item.level === 'verbatim').length;
  return signals + skills;
}


/** Consumption probes for the buyer simulator, with the buyer's lines taken from the scenario. */
export function buildSkillProbes(curriculum: Curriculum, scenario: Scenario): SkillProbe[] {
  return curriculum.skills.flatMap((skill) => {
    if (!skill.probes || !skill.scenario_reveal) return [];
    return [{ skill: skill.id, probes: skill.probes, reveal: scenario.consumption_profile.reveals[skill.scenario_reveal] }];
  });
}
