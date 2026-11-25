import { z } from 'zod';

export const CLUSTER_IDS = ['compute_infra', 'foundation_models', 'data_context', 'agentic_harness', 'vertical_agents'] as const;
export const VERTICAL_IDS = ['banking_fsi', 'insurance', 'law_firms', 'consumer_brands'] as const;
export const SIGNAL_IDS = ['metrics', 'economic_buyer', 'decision_criteria', 'decision_process', 'paper_process', 'identify_pain', 'champion', 'competition'] as const;
export const TIERS = [1, 2, 3, 4] as const;
export const ICON_IDS = ['target', 'node-graph', 'users', 'layers'] as const;
/** Presentation symbols. Rendered by src/components/glyph.tsx. */
export const GLYPH_IDS = ['cpu', 'sparkles', 'database', 'workflow', 'bot', 'landmark', 'shopping-bag', 'umbrella', 'scale', 'compass', 'target', 'gauge', 'briefcase'] as const;
export type GlyphId = (typeof GLYPH_IDS)[number];
export const FAMILY_IDS = ['fundamentals', 'meddpicc', 'consumption', 'executive'] as const;
export const SCENARIO_REVEAL_IDS = ['forecast', 'ramp'] as const;

export type ClusterId = (typeof CLUSTER_IDS)[number];
export type VerticalId = (typeof VERTICAL_IDS)[number];
export type SignalId = (typeof SIGNAL_IDS)[number];
export type Tier = (typeof TIERS)[number];
export type IconId = (typeof ICON_IDS)[number];
export type FamilyId = (typeof FAMILY_IDS)[number];
export type ScenarioRevealId = (typeof SCENARIO_REVEAL_IDS)[number];

const isValidRegex = (pattern: string): boolean => {
  try {
    return new RegExp(pattern, 'i') instanceof RegExp;
  } catch {
    return false;
  }
};

const nonEmpty = z.string().min(1);
const regexString = nonEmpty.refine(isValidRegex, { message: 'Not a valid regular expression' });
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected a six-digit hex color');
const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const signalIdSchema = z.enum(SIGNAL_IDS);
const skillIdSchema = z.string().regex(/^[a-z_]+$/, 'Skill ids use lowercase letters and underscores');

const lessonSchema = z.object({
  cards: z.array(z.object({ title: nonEmpty, body: nonEmpty })).length(4),
  quiz: z
    .array(
      z
        .object({
          prompt: nonEmpty,
          options: z.array(nonEmpty).length(3),
          answer: z.number().int().min(0).max(2),
          why: nonEmpty
        })
    )
    .length(3)
});
export type Lesson = z.infer<typeof lessonSchema>;

export const clusterSchema = z.object({
  id: z.enum(CLUSTER_IDS),
  display_name: nonEmpty,
  glyph: z.enum(GLYPH_IDS),
  value_chain_layer: nonEmpty,
  /** Position in the AI value chain, 1 = closest to silicon. */
  stack_order: z.number().int().min(1).max(5),
  archetypal_vendors: z.array(nonEmpty).min(1),
  pricing_unit: z.object({
    model: nonEmpty,
    units: z.array(nonEmpty).min(1),
    summary: nonEmpty
  }),
  core_competitive_threats: z.array(nonEmpty).min(1),
  cluster_objections: z.array(nonEmpty).min(1),
  marquee_lineage: z.array(z.object({ label: nonEmpty, url: z.string().url() })).min(1),
  priority_skills: z.array(skillIdSchema).min(2).max(5),
  lesson: lessonSchema
});
export type Cluster = z.infer<typeof clusterSchema>;

const buyerRevealSchema = z.object({
  speaker: nonEmpty,
  partial: nonEmpty,
  verbatim: nonEmpty
});
const buyerRevealsShape = Object.fromEntries(SIGNAL_IDS.map((id) => [id, buyerRevealSchema])) as Record<SignalId, typeof buyerRevealSchema>;

export const verticalSchema = z.object({
  id: z.enum(VERTICAL_IDS),
  display_name: nonEmpty,
  short_name: nonEmpty,
  glyph: z.enum(GLYPH_IDS),
  regulatory_and_risk_profile: z.array(nonEmpty).min(1),
  paper_process_blockers: z.array(nonEmpty).min(1),
  dominant_friction: nonEmpty,
  value_frame: nonEmpty,
  buying_committee: z
    .array(
      z.object({
        role: nonEmpty,
        kpis: z.array(nonEmpty).min(1),
        primary_fear: nonEmpty
      })
    )
    .min(3),
  signature_objections: z.array(nonEmpty).min(1),
  buyer_reveals: z.object(buyerRevealsShape)
});
export type Vertical = z.infer<typeof verticalSchema>;

export const signalDefinitionSchema = z.object({
  id: signalIdSchema,
  label: nonEmpty,
  definition: nonEmpty,
  coach_hint: nonEmpty,
  probes: z.object({
    partial: z.array(regexString).min(1),
    verbatim: z.array(regexString).min(1)
  })
});
export type SignalDefinition = z.infer<typeof signalDefinitionSchema>;

export const frameworkSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/, 'Use lowercase letters, digits, and underscores'),
  display_name: nonEmpty,
  summary: nonEmpty,
  evidence_standard: z.string().optional(),
  core_moves: z.array(nonEmpty).min(2),
  used_in_tiers: z.array(tierSchema).min(1),
  signals: z.array(signalDefinitionSchema).optional()
});
export type Framework = z.infer<typeof frameworkSchema>;

export const detectorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('pattern_without'),
    trigger: z.array(regexString).min(1),
    required: z.array(regexString).min(1)
  }),
  z.object({
    type: z.literal('pattern_never_seen'),
    patterns: z.array(regexString).min(1)
  }),
  z.object({
    type: z.literal('signal_never_probed'),
    signal: signalIdSchema
  })
]);
export type Detector = z.infer<typeof detectorSchema>;

export const rubricSchema = z.object({
  id: z.string().regex(/^tier_[1-4]_[a-z_]+$/, 'Expected tier_<n>_<name>'),
  tier: tierSchema,
  pillar: z.string().regex(/^0[1-4]$/),
  role_title: nonEmpty,
  pillar_theme: nonEmpty,
  color: hexColor,
  text_color: hexColor,
  icon: z.enum(ICON_IDS),
  acv_band: nonEmpty,
  frameworks: z.array(nonEmpty).min(1),
  supporting_frameworks: z.array(nonEmpty),
  core_gate_pass_min: z.number().min(0).max(100),
  boss_pass_min: z.number().min(0).max(100),
  auto_fail_flags: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z_]+$/),
        label: nonEmpty,
        description: nonEmpty,
        skill: skillIdSchema,
        detector: detectorSchema
      })
    )
    .min(1),
  artifact: nonEmpty,
  transition_banner: z.object({ kicker: nonEmpty, title: nonEmpty, body: nonEmpty }),
  drills: z
    .array(
      z.object({
        id: z.string().regex(/^d[1-3]$/),
        title: nonEmpty,
        prompt: nonEmpty,
        target_signals: z.array(signalIdSchema).min(1).max(3),
        practices_skills: z.array(skillIdSchema).min(1),
        placement_credit_eligible: z.boolean().optional()
      })
    )
    .length(3),
  boss_fight: z.object({
    title: nonEmpty,
    persona_count: z.number().int().min(1).max(3),
    learner_brief: nonEmpty
  })
});
export type Rubric = z.infer<typeof rubricSchema>;

const probesSchema = z.object({
  partial: z.array(regexString).min(1),
  verbatim: z.array(regexString).min(1)
});

export const skillSchema = z.object({
  id: skillIdSchema,
  code: z.string().regex(/^[FMCE][1-8]$/, 'Expected a code such as F1 or M8'),
  label: nonEmpty,
  definition: nonEmpty,
  evidence: nonEmpty,
  talk_track: z.object({ move: nonEmpty, strong: nonEmpty, weak: nonEmpty, proof: nonEmpty }),
  rep: z.object({ buyer_line: nonEmpty, off_move: nonEmpty }),
  signal: signalIdSchema.optional(),
  probes: probesSchema.optional(),
  scenario_reveal: z.enum(SCENARIO_REVEAL_IDS).optional()
});
export type Skill = z.infer<typeof skillSchema>;

export const skillFamilySchema = z.object({
  id: z.enum(FAMILY_IDS),
  display_name: nonEmpty,
  glyph: z.enum(GLYPH_IDS),
  summary: nonEmpty,
  skills: z.array(skillSchema).min(1)
});
export type SkillFamily = z.infer<typeof skillFamilySchema>;

const revealLineSchema = z.object({ speaker: nonEmpty, partial: nonEmpty, verbatim: nonEmpty });

export const scenarioSchema = z.object({
  id: z.string().regex(/^[a-z_]+__[a-z_]+$/),
  cluster_id: z.enum(CLUSTER_IDS),
  vertical_id: z.enum(VERTICAL_IDS),
  situation: nonEmpty,
  workload: nonEmpty,
  consumption_profile: z.object({
    unit: nonEmpty,
    current_volume: nonEmpty,
    growth: nonEmpty,
    seasonality: nonEmpty,
    reveals: z.object({ forecast: revealLineSchema, ramp: revealLineSchema })
  })
});
export type Scenario = z.infer<typeof scenarioSchema>;

export const diagnosticSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  intro: nonEmpty,
  items: z.array(z.object({ skill_id: skillIdSchema })).min(4)
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
