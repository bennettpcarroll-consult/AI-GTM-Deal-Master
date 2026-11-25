CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trajectory_id" uuid NOT NULL,
	"tier" smallint NOT NULL,
	"artifact_url" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_hash" text NOT NULL,
	CONSTRAINT "credentials_verification_hash_unique" UNIQUE("verification_hash")
);
--> statement-breakpoint
CREATE TABLE "global_competencies" (
	"user_id" uuid NOT NULL,
	"framework_id" text NOT NULL,
	"verified_score" real DEFAULT 0 NOT NULL,
	"last_verified_at" timestamp with time zone,
	CONSTRAINT "global_competencies_user_id_framework_id_pk" PRIMARY KEY("user_id","framework_id")
);
--> statement-breakpoint
CREATE TABLE "meddpicc_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"pillar" text NOT NULL,
	"signal" text NOT NULL,
	"signal_bars" smallint NOT NULL,
	"transcript_turn_id" uuid,
	"judge_rationale" text,
	CONSTRAINT "signal_bars_allowed" CHECK ("meddpicc_evidence"."signal_bars" IN (1, 3, 4)),
	CONSTRAINT "verbatim_requires_turn" CHECK ("meddpicc_evidence"."signal_bars" < 4 OR "meddpicc_evidence"."transcript_turn_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "rubric_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"core_score" real,
	"boss_score" real,
	"passed" boolean DEFAULT false NOT NULL,
	"auto_fail_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lineage_xray_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trajectory_id" uuid NOT NULL,
	"tier" smallint NOT NULL,
	"session_kind" text NOT NULL,
	"drill_id" text,
	"mode" text DEFAULT 'text' NOT NULL,
	"persona_state_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"duration_sec" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_index" integer NOT NULL,
	"speaker_role" text NOT NULL,
	"content" text NOT NULL,
	"sentiment_delta" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_trajectories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cluster_id" text NOT NULL,
	"vertical_id" text NOT NULL,
	"current_tier" smallint DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"active_trajectory_id" uuid,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_trajectory_id_user_trajectories_id_fk" FOREIGN KEY ("trajectory_id") REFERENCES "public"."user_trajectories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_competencies" ADD CONSTRAINT "global_competencies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meddpicc_evidence" ADD CONSTRAINT "meddpicc_evidence_session_id_simulation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."simulation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meddpicc_evidence" ADD CONSTRAINT "meddpicc_evidence_transcript_turn_id_transcript_turns_id_fk" FOREIGN KEY ("transcript_turn_id") REFERENCES "public"."transcript_turns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_evaluations" ADD CONSTRAINT "rubric_evaluations_session_id_simulation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."simulation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_sessions" ADD CONSTRAINT "simulation_sessions_trajectory_id_user_trajectories_id_fk" FOREIGN KEY ("trajectory_id") REFERENCES "public"."user_trajectories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_session_id_simulation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."simulation_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trajectories" ADD CONSTRAINT "user_trajectories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_trajectories_unique_combo" ON "user_trajectories" USING btree ("user_id","cluster_id","vertical_id");