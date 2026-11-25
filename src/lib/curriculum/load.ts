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
import tier1 from '../../../curriculum/rubrics/unit_1_inspector.json';
import tier2 from '../../../curriculum/rubrics/unit_2_challenger.json';
import tier3 from '../../../curriculum/rubrics/unit_3_consumption.json';
import tier4 from '../../../curriculum/rubrics/unit_4_closer.json';
import { z } from 'zod';
import {
  CLUSTER_IDS,
  SIGNAL_IDS,
  TIERS,
  VERTICAL_IDS,
  clusterSchema,
  frameworkSchema,
  rubricSchema,
  verticalSchema,
  type Cluster,
  type ClusterId,
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
  { file: 'rubrics/unit_1_inspector.json', data: tier1 },
  { file: 'rubrics/unit_2_challenger.json', data: tier2 },
  { file: 'rubrics/unit_3_consumption.json', data: tier3 },
  { file: 'rubrics/unit_4_closer.json', data: tier4 }
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

  if (issues.length > 0) throw new CurriculumError(issues);

  return {
    clusters: clusters as Record<ClusterId, Cluster>,
    verticals: verticals as Record<VerticalId, Vertical>,
    frameworks,
    rubrics: rubrics as Record<Tier, Rubric>
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
