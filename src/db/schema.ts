import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

// Target schema for the v2 Supabase backend (PRD section 5.4). The v1 app stores state in the browser.

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const users = pgTable('users', {
  // Matches the auth.users id issued by Supabase Auth.
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  // Points at user_trajectories.id. Kept as a plain column to avoid a circular foreign key.
  activeTrajectoryId: uuid('active_trajectory_id'),
  streakDays: integer('streak_days').notNull().default(0),
  createdAt
});

export const userTrajectories = pgTable(
  'user_trajectories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    clusterId: text('cluster_id').notNull(),
    verticalId: text('vertical_id').notNull(),
    currentTier: smallint('current_tier').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    isActive: boolean('is_active').notNull().default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex('user_trajectories_unique_combo').on(table.userId, table.clusterId, table.verticalId)]
);

export const globalCompetencies = pgTable(
  'global_competencies',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    frameworkId: text('framework_id').notNull(),
    verifiedScore: real('verified_score').notNull().default(0),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true })
  },
  (table) => [primaryKey({ columns: [table.userId, table.frameworkId] })]
);

export const simulationSessions = pgTable('simulation_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  trajectoryId: uuid('trajectory_id').notNull().references(() => userTrajectories.id, { onDelete: 'cascade' }),
  tier: smallint('tier').notNull(),
  // 'drill' or 'boss'
  sessionKind: text('session_kind').notNull(),
  drillId: text('drill_id'),
  // Interaction mode: 'voice' or 'text'
  mode: text('mode').notNull().default('text'),
  personaStateJson: jsonb('persona_state_json').notNull().default({}),
  status: text('status').notNull().default('in_progress'),
  durationSec: integer('duration_sec'),
  createdAt
});

export const transcriptTurns = pgTable('transcript_turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => simulationSessions.id, { onDelete: 'cascade' }),
  turnIndex: integer('turn_index').notNull(),
  speakerRole: text('speaker_role').notNull(),
  content: text('content').notNull(),
  sentimentDelta: real('sentiment_delta'),
  createdAt
});

export const meddpiccEvidence = pgTable(
  'meddpicc_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => simulationSessions.id, { onDelete: 'cascade' }),
    // Pillar letter: M, E, D, D, P, I, C, C
    pillar: text('pillar').notNull(),
    signal: text('signal').notNull(),
    signalBars: smallint('signal_bars').notNull(),
    transcriptTurnId: uuid('transcript_turn_id').references(() => transcriptTurns.id, { onDelete: 'set null' }),
    judgeRationale: text('judge_rationale')
  },
  (table) => [
    // Anti-checkbox rule: only 1, 3, or 4 bars, and 4 bars must cite a transcript turn.
    check('signal_bars_allowed', sql`${table.signalBars} IN (1, 3, 4)`),
    check('verbatim_requires_turn', sql`${table.signalBars} < 4 OR ${table.transcriptTurnId} IS NOT NULL`)
  ]
);

export const rubricEvaluations = pgTable('rubric_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => simulationSessions.id, { onDelete: 'cascade' }),
  coreScore: real('core_score'),
  bossScore: real('boss_score'),
  passed: boolean('passed').notNull().default(false),
  autoFailFlags: jsonb('auto_fail_flags').notNull().default([]),
  lineageXrayJson: jsonb('lineage_xray_json').notNull().default({}),
  createdAt
});

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  trajectoryId: uuid('trajectory_id').notNull().references(() => userTrajectories.id, { onDelete: 'cascade' }),
  tier: smallint('tier').notNull(),
  artifactUrl: text('artifact_url'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  verificationHash: text('verification_hash').notNull().unique()
});
