import {
  SIGNAL_IDS,
  type Cluster,
  type ClusterId,
  type Rubric,
  type SignalId,
  type Tier,
  type Vertical,
  type VerticalId
} from './curriculum/schema';

export type SessionMode = 'drill' | 'boss';

export interface Persona {
  role: string;
  kpis: string[];
  primary_fear: string;
}

export interface ScenarioPayload {
  trajectory_id: string;
  cluster_id: ClusterId;
  vertical_id: VerticalId;
  tier: Tier;
  mode: SessionMode;
  system_prompt: string;
  personas: Persona[];
  objection_queue: string[];
  target_signals: SignalId[];
  judge_schema: {
    signals: SignalId[];
    pass_threshold: number;
    auto_fail_flags: string[];
    evidence_rule: string;
  };
}

export interface ComposeInput {
  cluster: Cluster;
  vertical: Vertical;
  rubric: Rubric;
  mode: SessionMode;
  drillIndex?: number;
}

export function trajectoryId(clusterId: ClusterId, verticalId: VerticalId): string {
  return `${clusterId}__${verticalId}`;
}

/** Merges two lists by taking one item from each in turn, dropping duplicates. */
export function interleave(primary: readonly string[], secondary: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const length = Math.max(primary.length, secondary.length);
  for (let i = 0; i < length; i += 1) {
    for (const list of [primary, secondary]) {
      const item = list[i];
      if (item !== undefined && !seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

export function composeScenario(input: ComposeInput): ScenarioPayload {
  const { cluster, vertical, rubric, mode } = input;

  let targetSignals: SignalId[];
  if (mode === 'boss') {
    targetSignals = [...SIGNAL_IDS];
  } else {
    const index = input.drillIndex ?? -1;
    const drill = rubric.drills[index];
    if (!drill) throw new Error(`Tier ${rubric.tier} has no drill at index ${index}`);
    targetSignals = [...drill.target_signals];
  }

  const personaCount = mode === 'boss' ? rubric.boss_fight.persona_count : vertical.buying_committee.length;
  const personas: Persona[] = vertical.buying_committee.slice(0, personaCount).map((member) => ({
    role: member.role,
    kpis: [...member.kpis],
    primary_fear: member.primary_fear
  }));

  const objectionQueue = interleave(vertical.signature_objections, cluster.cluster_objections);
  const modeLine =
    mode === 'boss'
      ? `Session: Tier ${rubric.tier} boss fight with ${personas.length} buyers. All eight MEDDPICC signals are in scope.`
      : `Session: Tier ${rubric.tier} micro-drill on ${targetSignals.join(', ')}.`;

  const systemPrompt = [
    `You play the buying committee for a ${vertical.display_name} account that is evaluating ${cluster.display_name} (${cluster.value_chain_layer}).`,
    `Pricing unit: ${cluster.pricing_unit.model}. Units: ${cluster.pricing_unit.units.join(', ')}. ${cluster.pricing_unit.summary}`,
    `Competitive threats the seller must handle: ${cluster.core_competitive_threats.join('; ')}.`,
    `Regulatory and risk profile: ${vertical.regulatory_and_risk_profile.join('; ')}.`,
    `Paper process blockers: ${vertical.paper_process_blockers.join('; ')}.`,
    `Dominant friction: ${vertical.dominant_friction}`,
    `Buyers: ${personas.map((p) => `${p.role} (KPIs: ${p.kpis.join(', ')}; primary fear: ${p.primary_fear})`).join(' | ')}.`,
    modeLine,
    'Reveal a signal only when the seller asks a precise question about it. Never volunteer a verbatim admission. Stay in character and never grade the seller inside the conversation.'
  ].join('\n');

  return {
    trajectory_id: trajectoryId(cluster.id, vertical.id),
    cluster_id: cluster.id,
    vertical_id: vertical.id,
    tier: rubric.tier,
    mode,
    system_prompt: systemPrompt,
    personas,
    objection_queue: objectionQueue,
    target_signals: targetSignals,
    judge_schema: {
      signals: [...SIGNAL_IDS],
      pass_threshold: mode === 'boss' ? rubric.boss_pass_min : rubric.core_gate_pass_min,
      auto_fail_flags: mode === 'boss' ? rubric.auto_fail_flags.map((flag) => flag.id) : [],
      evidence_rule: 'A signal reaches verbatim proof (4 bars) only with a non-null buyer transcript_turn_id.'
    }
  };
}
