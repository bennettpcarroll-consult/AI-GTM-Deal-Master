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
  clusterSchema,
  diagnosticSchema,
  frameworkSchema,
  scenarioSchema,
  skillFamilySchema,
  rubricSchema,
  verticalSchema,
  type Cluster,
  type ClusterId,
  type Diagnostic,
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

  if (issues.length > 0 || !diagnosticPack) throw new CurriculumError(issues);

  return {
    clusters: clusters as Record<ClusterId, Cluster>,
    verticals: verticals as Record<VerticalId, Vertical>,
    frameworks,
    rubrics: rubrics as Record<Tier, Rubric>,
    families: FAMILY_IDS.map((id) => families[id] as SkillFamily),
    skills,
    scenarios,
    diagnostic: diagnosticPack
  };
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
