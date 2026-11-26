import computeInfra from '../../../curriculum/clusters/compute_infra.json';
import foundationModels from '../../../curriculum/clusters/foundation_models.json';
import dataContext from '../../../curriculum/clusters/data_context.json';
import agenticHarness from '../../../curriculum/clusters/agentic_harness.json';
import verticalAgents from '../../../curriculum/clusters/vertical_agents.json';
import bankingFsi from '../../../curriculum/verticals/banking_fsi.json';
import insurance from '../../../curriculum/verticals/insurance.json';
import lawFirms from '../../../curriculum/verticals/law_firms.json';
import consumerBrands from '../../../curriculum/verticals/consumer_brands.json';
import meddpicc from '../../../curriculum/frameworks/meddpicc.json';
import commandOfTheMessage from '../../../curriculum/frameworks/command_of_the_message.json';
import challenger from '../../../curriculum/frameworks/challenger.json';
import spicedBowtie from '../../../curriculum/frameworks/spiced_bowtie.json';
import mintoPyramid from '../../../curriculum/frameworks/minto_pyramid.json';
import tier1 from '../../../curriculum/rubrics/tier_1_inspector.json';
import tier2 from '../../../curriculum/rubrics/tier_2_challenger.json';
import tier3 from '../../../curriculum/rubrics/tier_3_consumption.json';
import tier4 from '../../../curriculum/rubrics/tier_4_closer.json';
import skillsFundamentals from '../../../curriculum/skills/fundamentals.json';
import skillsMeddpicc from '../../../curriculum/skills/meddpicc.json';
import skillsConsumption from '../../../curriculum/skills/consumption.json';
import skillsExecutive from '../../../curriculum/skills/executive.json';
import diagnostic from '../../../curriculum/diagnostic.json';
import room from '../../../curriculum/room.json';
import failureModes from '../../../curriculum/failure_modes.json';
import arcAgenticharnessBankingfsi from '../../../curriculum/arcs/agentic_harness__banking_fsi.json';
import scnComputeinfraBankingfsi from '../../../curriculum/scenarios/compute_infra__banking_fsi.json';
import scnComputeinfraInsurance from '../../../curriculum/scenarios/compute_infra__insurance.json';
import scnComputeinfraLawfirms from '../../../curriculum/scenarios/compute_infra__law_firms.json';
import scnComputeinfraConsumerbrands from '../../../curriculum/scenarios/compute_infra__consumer_brands.json';
import scnFoundationmodelsBankingfsi from '../../../curriculum/scenarios/foundation_models__banking_fsi.json';
import scnFoundationmodelsInsurance from '../../../curriculum/scenarios/foundation_models__insurance.json';
import scnFoundationmodelsLawfirms from '../../../curriculum/scenarios/foundation_models__law_firms.json';
import scnFoundationmodelsConsumerbrands from '../../../curriculum/scenarios/foundation_models__consumer_brands.json';
import scnDatacontextBankingfsi from '../../../curriculum/scenarios/data_context__banking_fsi.json';
import scnDatacontextInsurance from '../../../curriculum/scenarios/data_context__insurance.json';
import scnDatacontextLawfirms from '../../../curriculum/scenarios/data_context__law_firms.json';
import scnDatacontextConsumerbrands from '../../../curriculum/scenarios/data_context__consumer_brands.json';
import scnAgenticharnessBankingfsi from '../../../curriculum/scenarios/agentic_harness__banking_fsi.json';
import scnAgenticharnessInsurance from '../../../curriculum/scenarios/agentic_harness__insurance.json';
import scnAgenticharnessLawfirms from '../../../curriculum/scenarios/agentic_harness__law_firms.json';
import scnAgenticharnessConsumerbrands from '../../../curriculum/scenarios/agentic_harness__consumer_brands.json';
import scnVerticalagentsBankingfsi from '../../../curriculum/scenarios/vertical_agents__banking_fsi.json';
import scnVerticalagentsInsurance from '../../../curriculum/scenarios/vertical_agents__insurance.json';
import scnVerticalagentsLawfirms from '../../../curriculum/scenarios/vertical_agents__law_firms.json';
import scnVerticalagentsConsumerbrands from '../../../curriculum/scenarios/vertical_agents__consumer_brands.json';
import { z } from 'zod';
import {
  CLUSTER_IDS,
  SIGNAL_IDS,
  TIERS,
  VERTICAL_IDS,
  FAMILY_IDS,
  arcSchema,
  failureModesSchema,
  clusterSchema,
  diagnosticSchema,
  roomSchema,
  frameworkSchema,
  scenarioSchema,
  skillFamilySchema,
  rubricSchema,
  verticalSchema,
  type Arc,
  type Cluster,
  type FailureMode,
  type ClusterId,
  type Diagnostic,
  type RoomRules,
  type FamilyId,
  type Scenario,
  type Skill,
  type SkillFamily,
  type Framework,
  type Rubric,
  type SignalDefinition,
  type Tier,
  type Vertical,
  type VerticalId
} from './schema';

export interface Curriculum {
  clusters: Record<ClusterId, Cluster>;
  verticals: Record<VerticalId, Vertical>;
  frameworks: Record<string, Framework>;
  rubrics: Record<Tier, Rubric>;
  families: SkillFamily[];
  skills: Skill[];
  scenarios: Record<string, Scenario>;
  diagnostic: Diagnostic;
  room: RoomRules;
  failureModes: Record<string, FailureMode>;
  /** Authored deal arcs by trajectory id (<cluster>__<vertical>). Other trajectories use the generated room. */
  arcs: Record<string, Arc>;
}

export interface CurriculumSource {
  file: string;
  data: unknown;
}

export const CURRICULUM_SOURCES: CurriculumSource[] = [
  { file: 'clusters/compute_infra.json', data: computeInfra },
  { file: 'clusters/foundation_models.json', data: foundationModels },
  { file: 'clusters/data_context.json', data: dataContext },
  { file: 'clusters/agentic_harness.json', data: agenticHarness },
  { file: 'clusters/vertical_agents.json', data: verticalAgents },
  { file: 'verticals/banking_fsi.json', data: bankingFsi },
  { file: 'verticals/insurance.json', data: insurance },
  { file: 'verticals/law_firms.json', data: lawFirms },
  { file: 'verticals/consumer_brands.json', data: consumerBrands },
  { file: 'frameworks/meddpicc.json', data: meddpicc },
  { file: 'frameworks/command_of_the_message.json', data: commandOfTheMessage },
  { file: 'frameworks/challenger.json', data: challenger },
  { file: 'frameworks/spiced_bowtie.json', data: spicedBowtie },
  { file: 'frameworks/minto_pyramid.json', data: mintoPyramid },
  { file: 'rubrics/tier_1_inspector.json', data: tier1 },
  { file: 'rubrics/tier_2_challenger.json', data: tier2 },
  { file: 'rubrics/tier_3_consumption.json', data: tier3 },
  { file: 'rubrics/tier_4_closer.json', data: tier4 },
  { file: 'skills/fundamentals.json', data: skillsFundamentals },
  { file: 'skills/meddpicc.json', data: skillsMeddpicc },
  { file: 'skills/consumption.json', data: skillsConsumption },
  { file: 'skills/executive.json', data: skillsExecutive },
  { file: 'diagnostic.json', data: diagnostic },
  { file: 'room.json', data: room },
  { file: 'failure_modes.json', data: failureModes },
  { file: 'arcs/agentic_harness__banking_fsi.json', data: arcAgenticharnessBankingfsi },
  { file: 'scenarios/compute_infra__banking_fsi.json', data: scnComputeinfraBankingfsi },
  { file: 'scenarios/compute_infra__insurance.json', data: scnComputeinfraInsurance },
  { file: 'scenarios/compute_infra__law_firms.json', data: scnComputeinfraLawfirms },
  { file: 'scenarios/compute_infra__consumer_brands.json', data: scnComputeinfraConsumerbrands },
  { file: 'scenarios/foundation_models__banking_fsi.json', data: scnFoundationmodelsBankingfsi },
  { file: 'scenarios/foundation_models__insurance.json', data: scnFoundationmodelsInsurance },
  { file: 'scenarios/foundation_models__law_firms.json', data: scnFoundationmodelsLawfirms },
  { file: 'scenarios/foundation_models__consumer_brands.json', data: scnFoundationmodelsConsumerbrands },
  { file: 'scenarios/data_context__banking_fsi.json', data: scnDatacontextBankingfsi },
  { file: 'scenarios/data_context__insurance.json', data: scnDatacontextInsurance },
  { file: 'scenarios/data_context__law_firms.json', data: scnDatacontextLawfirms },
  { file: 'scenarios/data_context__consumer_brands.json', data: scnDatacontextConsumerbrands },
  { file: 'scenarios/agentic_harness__banking_fsi.json', data: scnAgenticharnessBankingfsi },
  { file: 'scenarios/agentic_harness__insurance.json', data: scnAgenticharnessInsurance },
  { file: 'scenarios/agentic_harness__law_firms.json', data: scnAgenticharnessLawfirms },
  { file: 'scenarios/agentic_harness__consumer_brands.json', data: scnAgenticharnessConsumerbrands },
  { file: 'scenarios/vertical_agents__banking_fsi.json', data: scnVerticalagentsBankingfsi },
  { file: 'scenarios/vertical_agents__insurance.json', data: scnVerticalagentsInsurance },
  { file: 'scenarios/vertical_agents__law_firms.json', data: scnVerticalagentsLawfirms },
  { file: 'scenarios/vertical_agents__consumer_brands.json', data: scnVerticalagentsConsumerbrands }
];

export class CurriculumError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Curriculum validation failed with ${issues.length} issue(s):\n- ${issues.join('\n- ')}`);
    this.name = 'CurriculumError';
    this.issues = issues;
  }
}

function fileStem(file: string): string {
  return (file.split('/').pop() ?? file).replace(/\.json$/, '');
}

function parseSource<S extends z.ZodTypeAny>(source: CurriculumSource, schema: S, issues: string[]): z.output<S> | null {
  const result = schema.safeParse(source.data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const where = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    issues.push(`${source.file}: ${where}: ${issue.message}`);
  }
  return null;
}

export function buildCurriculum(sources: CurriculumSource[] = CURRICULUM_SOURCES): Curriculum {
  const issues: string[] = [];
  const clusters: Partial<Record<ClusterId, Cluster>> = {};
  const verticals: Partial<Record<VerticalId, Vertical>> = {};
  const frameworks: Record<string, Framework> = {};
  const rubrics: Partial<Record<Tier, Rubric>> = {};
  const families: Partial<Record<FamilyId, SkillFamily>> = {};
  const scenarios: Record<string, Scenario> = {};
  let diagnosticPack: Diagnostic | null = null;
  let roomPack: RoomRules | null = null;
  let failurePack: FailureMode[] | null = null;
  const arcs: Record<string, Arc> = {};

  for (const source of sources) {
    const folder = source.file.split('/')[0];
    const stem = fileStem(source.file);

    if (folder === 'clusters') {
      const cluster = parseSource(source, clusterSchema, issues);
      if (!cluster) continue;
      if (cluster.id !== stem) issues.push(`${source.file}: id "${cluster.id}" must match the file name`);
      if (clusters[cluster.id]) issues.push(`${source.file}: duplicate cluster "${cluster.id}"`);
      clusters[cluster.id] = cluster;
    } else if (folder === 'verticals') {
      const vertical = parseSource(source, verticalSchema, issues);
      if (!vertical) continue;
      if (vertical.id !== stem) issues.push(`${source.file}: id "${vertical.id}" must match the file name`);
      if (verticals[vertical.id]) issues.push(`${source.file}: duplicate vertical "${vertical.id}"`);
      verticals[vertical.id] = vertical;
    } else if (folder === 'frameworks') {
      const framework = parseSource(source, frameworkSchema, issues);
      if (!framework) continue;
      if (framework.id !== stem) issues.push(`${source.file}: id "${framework.id}" must match the file name`);
      if (frameworks[framework.id]) issues.push(`${source.file}: duplicate framework "${framework.id}"`);
      frameworks[framework.id] = framework;
    } else if (folder === 'rubrics') {
      const rubric = parseSource(source, rubricSchema, issues);
      if (!rubric) continue;
      if (rubric.id !== stem) issues.push(`${source.file}: id "${rubric.id}" must match the file name`);
      if (rubrics[rubric.tier]) issues.push(`${source.file}: duplicate rubric for tier ${rubric.tier}`);
      rubrics[rubric.tier] = rubric;
    } else if (folder === 'skills') {
      const family = parseSource(source, skillFamilySchema, issues);
      if (!family) continue;
      if (family.id !== stem) issues.push(`${source.file}: id "${family.id}" must match the file name`);
      if (families[family.id]) issues.push(`${source.file}: duplicate skill family "${family.id}"`);
      families[family.id] = family;
    } else if (folder === 'scenarios') {
      const scenario = parseSource(source, scenarioSchema, issues);
      if (!scenario) continue;
      if (scenario.id !== stem) issues.push(`${source.file}: id "${scenario.id}" must match the file name`);
      if (scenario.id !== `${scenario.cluster_id}__${scenario.vertical_id}`) {
        issues.push(`${source.file}: id must be <cluster_id>__<vertical_id>`);
      }
      scenarios[scenario.id] = scenario;
    } else if (source.file === 'diagnostic.json') {
      diagnosticPack = parseSource(source, diagnosticSchema, issues);
    } else if (source.file === 'room.json') {
      roomPack = parseSource(source, roomSchema, issues);
    } else if (source.file === 'failure_modes.json') {
      failurePack = parseSource(source, failureModesSchema, issues)?.modes ?? null;
    } else if (folder === 'arcs') {
      const arc = parseSource(source, arcSchema, issues);
      if (!arc) continue;
      if (arc.id !== stem || arc.id !== `${arc.cluster}__${arc.vertical}`) issues.push(`${source.file}: id must be <cluster>__<vertical> and match the file name`);
      arcs[arc.id] = arc;
    } else {
      issues.push(`${source.file}: unknown curriculum folder "${folder}"`);
    }
  }

  for (const id of CLUSTER_IDS) if (!clusters[id]) issues.push(`missing cluster file for "${id}"`);
  for (const id of VERTICAL_IDS) if (!verticals[id]) issues.push(`missing vertical file for "${id}"`);
  for (const tier of TIERS) if (!rubrics[tier]) issues.push(`missing rubric for tier ${tier}`);

  for (const tier of TIERS) {
    const rubric = rubrics[tier];
    if (!rubric) continue;
    for (const frameworkId of rubric.frameworks) {
      if (!frameworks[frameworkId]) issues.push(`${rubric.id} references unknown framework "${frameworkId}"`);
    }
  }

  const signals = frameworks.meddpicc?.signals;
  if (!signals) {
    issues.push('framework "meddpicc" must define signals');
  } else {
    const ids = signals.map((signal) => signal.id);
    for (const id of SIGNAL_IDS) {
      const count = ids.filter((candidate) => candidate === id).length;
      if (count !== 1) issues.push(`meddpicc must define signal "${id}" exactly once (found ${count})`);
    }
  }

  const skills: Skill[] = [];
  for (const familyId of FAMILY_IDS) {
    const family = families[familyId];
    if (!family) {
      issues.push(`missing skill family file for "${familyId}"`);
      continue;
    }
    skills.push(...family.skills);
  }
  const skillIds = new Set<string>();
  for (const skill of skills) {
    if (skillIds.has(skill.id)) issues.push(`skill "${skill.id}" is defined more than once`);
    skillIds.add(skill.id);
    if (skill.scenario_reveal && !skill.probes) issues.push(`skill "${skill.id}" has a scenario reveal but no probes`);
    if ((skill.signal || skill.probes) && !(skill.talk_track.pin && skill.talk_track.settle && skill.talk_track.assume)) {
      issues.push(`skill "${skill.id}" can be proven by the buyer, so its talk track needs pin, settle and assume lines`);
    }
  }
  for (const signal of SIGNAL_IDS) {
    const count = skills.filter((skill) => skill.signal === signal).length;
    if (count !== 1) issues.push(`signal "${signal}" must map to exactly one skill (found ${count})`);
  }
  const requireSkill = (id: string, where: string) => {
    if (!skillIds.has(id)) issues.push(`${where} references unknown skill "${id}"`);
  };
  for (const id of CLUSTER_IDS) clusters[id]?.priority_skills.forEach((skill) => requireSkill(skill, `cluster ${id}`));
  const taught = new Set<string>();
  for (const tier of TIERS) {
    const rubric = rubrics[tier];
    if (!rubric) continue;
    for (const drill of rubric.drills) {
      drill.practices_skills.forEach((skill) => {
        requireSkill(skill, `${rubric.id} drill ${drill.id}`);
        taught.add(skill);
      });
      for (const signal of drill.target_signals) {
        const skill = skills.find((candidate) => candidate.signal === signal);
        if (skill) taught.add(skill.id);
      }
    }
    rubric.auto_fail_flags.forEach((flag) => requireSkill(flag.skill, `${rubric.id} flag ${flag.id}`));
  }
  for (const skill of skills) {
    if (!taught.has(skill.id)) issues.push(`skill "${skill.id}" is not practiced in any drill`);
  }
  for (const clusterId of CLUSTER_IDS) {
    for (const verticalId of VERTICAL_IDS) {
      if (!scenarios[`${clusterId}__${verticalId}`]) issues.push(`missing scenario for "${clusterId}__${verticalId}"`);
    }
  }
  if (!diagnosticPack) issues.push('missing diagnostic.json');
  else diagnosticPack.items.forEach((item, index) => requireSkill(item.skill_id, `diagnostic item ${index + 1}`));

  if (!roomPack) issues.push('missing room.json');
  for (const id of VERTICAL_IDS) {
    for (const skillId of Object.keys(verticals[id]?.rep_overrides ?? {})) requireSkill(skillId, `vertical ${id} rep_overrides`);
  }

  const failureIds = new Set((failurePack ?? []).map((mode) => mode.id));
  if (!failurePack) issues.push('missing failure_modes.json');
  for (const arc of Object.values(arcs)) arcIssues(arc, { skillIds, failureIds, rubrics }).forEach((issue) => issues.push(`arc ${arc.id}: ${issue}`));

  if (issues.length > 0 || !diagnosticPack || !roomPack || !failurePack) throw new CurriculumError(issues);

  return {
    clusters: clusters as Record<ClusterId, Cluster>,
    verticals: verticals as Record<VerticalId, Vertical>,
    frameworks,
    rubrics: rubrics as Record<Tier, Rubric>,
    families: FAMILY_IDS.map((id) => families[id] as SkillFamily),
    skills,
    scenarios,
    diagnostic: diagnosticPack,
    room: roomPack,
    failureModes: Object.fromEntries(failurePack.map((mode) => [mode.id, mode])),
    arcs
  };
}

/**
 * Structural rules for an authored arc. Content quality (no repeated lines, plausible
 * distractors, length parity) is enforced by tests/rubric/arc-quality.test.ts.
 */
function arcIssues(arc: Arc, refs: { skillIds: Set<string>; failureIds: Set<string>; rubrics: Partial<Record<Tier, Rubric>> }): string[] {
  const issues: string[] = [];
  const signalIds = new Set<string>(SIGNAL_IDS);
  const beatIds = new Set<string>();
  TIERS.forEach((tier, index) => {
    if (arc.pillars[index]?.tier !== tier) issues.push(`pillar ${index + 1} must be tier ${tier}`);
  });
  for (const pillar of arc.pillars) {
    const cast = new Set(pillar.cast.map((member) => member.id));
    const flags = new Set(refs.rubrics[pillar.tier]?.auto_fail_flags.map((flag) => flag.id) ?? []);
    const scenes = [...pillar.drills, pillar.capstone];
    if (pillar.capstone.beats.filter((beat) => beat.core).length < 3) issues.push(`tier ${pillar.tier} capstone needs at least 3 core beats for the fast track`);
    for (const beat of scenes.flatMap((scene) => scene.beats)) {
      const where = `beat ${beat.id}`;
      if (beatIds.has(beat.id)) issues.push(`${where} is not unique`);
      beatIds.add(beat.id);
      if (!cast.has(beat.speaker)) issues.push(`${where} speaker "${beat.speaker}" is not in the tier ${pillar.tier} cast`);
      if (!refs.skillIds.has(beat.skill)) issues.push(`${where} references unknown skill "${beat.skill}"`);
      const need = pillar.tier >= 3 ? 4 : 3;
      if (beat.options.length !== need) issues.push(`${where} needs ${need} options at tier ${pillar.tier}`);
      const elites = beat.options.filter((option) => option.kind === 'elite');
      if (elites.length !== 1) issues.push(`${where} needs exactly one elite option`);
      if (!beat.options.some((option) => option.kind === 'trap')) issues.push(`${where} needs a trap option`);
      for (const option of beat.options) {
        if (option.reply_by && !cast.has(option.reply_by)) issues.push(`${where} reply_by "${option.reply_by}" is not in the cast`);
        if (option.kind === 'elite') {
          if (option.failure || option.flag) issues.push(`${where} elite option cannot carry a failure or flag`);
          const key = option.evidence?.key;
          if (key && !signalIds.has(key) && !refs.skillIds.has(key)) issues.push(`${where} evidence key "${key}" is not a signal or skill`);
        } else {
          if (!option.failure || !refs.failureIds.has(option.failure)) issues.push(`${where} ${option.kind} option needs a known failure mode (got "${option.failure}")`);
          if (option.evidence) issues.push(`${where} wrong options never earn evidence`);
          if (option.flag && !flags.has(option.flag)) issues.push(`${where} flag "${option.flag}" is not a tier ${pillar.tier} red flag`);
        }
      }
    }
  }
  return issues;
}

let cached: Curriculum | undefined;

export function loadCurriculum(): Curriculum {
  cached ??= buildCurriculum();
  return cached;
}

export function signalDefinitions(curriculum: Curriculum): SignalDefinition[] {
  const signals = curriculum.frameworks.meddpicc?.signals;
  if (!signals) throw new Error('The meddpicc framework has no signal definitions');
  return signals;
}

export function scenarioFor(curriculum: Curriculum, clusterId: ClusterId, verticalId: VerticalId): Scenario {
  const scenario = curriculum.scenarios[`${clusterId}__${verticalId}`];
  if (!scenario) throw new Error(`No scenario for ${clusterId} x ${verticalId}`);
  return scenario;
}

export function skillById(curriculum: Curriculum, id: string): Skill {
  const skill = curriculum.skills.find((candidate) => candidate.id === id);
  if (!skill) throw new Error(`Unknown skill "${id}"`);
  return skill;
}
