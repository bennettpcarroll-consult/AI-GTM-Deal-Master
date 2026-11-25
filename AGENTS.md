# AGENTS.md: AI GTM; Deal Master

This repo follows PRD v1.3. Read the PRD section that matches your change before you start.

## Non-negotiable UX rules

1. Brand: the product is "AI GTM; Deal Master", a standalone open-source brand. Do not add other brand names or taglines to the UI.
2. Singular linear flow: every screen is a single column (max width 640px to 720px) with one clear primary action.
3. Zero screen dumps: never render a maturity spectrum or any 5x4 matrix, never show all nine onboarding options on one screen, and never expand locked units by default.
4. Progressive disclosure:
   - Onboarding is two sequential steps: cluster, then vertical.
   - Locked units collapse to a single-line accordion row.
   - Inside drills, MEDDPICC progress lives in a compact collapsible dropdown at the top right, not a permanent sidebar.
   - Post-answer feedback slides up with a one-line verdict and collapsed dropdowns for logo lineage, verbatim evidence, and a better talk track.
5. Light mode only (no dark mode):
   - White (#FFFFFF) cards and top bar on the #F8FAFC background, 1px #E5E7EB borders, 14px to 18px corner radius, soft shadows.
   - Unit colors: 01 Orange (#F97316), 02 Blue (#2563EB), 03 Purple (#7C3AED), 04 Teal (#0D9488). Emerald (#10B981, text #047857) for verified and pass. Red (#EF4444, text #B91C1C) for bottlenecks and auto-fail flags.
   - Primary buttons use the `.cta` class (white text on #111827). Every button must pass WCAG AA text contrast. No gradients, and no white text on a unit color or a pastel.
   - Body copy is 14px or larger. Use thin-stroke outline icons and four-bar signal indicators.

## Non-negotiable architecture rules

1. Curriculum-as-code: never hardcode vendor names, vertical objections, buyer copy, or MEDDPICC rubrics in React components. Load all domain data from `curriculum/{clusters,verticals,frameworks,rubrics}/*.json`, validated by Zod in `src/lib/curriculum/schema.ts`.
2. Multi-trajectory isolation: never overwrite a user's progress when switching trajectories. Progress lives under its own trajectory id. Transferable MEDDPICC score lives in `globalCompetencies`.
3. Anti-checkbox grading: a MEDDPICC signal may reach 4 bars (verbatim proof) only when it is bound to a non-null buyer `transcript_turn_id`. Learner text never raises a signal. Keep `assertEvidenceInvariant` in `src/lib/grader.ts` and the matching check constraint in `src/db/schema.ts`.
4. The grader is deterministic in v1. If you add an LLM judge, it must output the same binding shape and pass through `assertEvidenceInvariant`.
5. The path is linear: `src/lib/path.ts` decides which unit is active and which step is current. The UI must not offer a step that the path marks as upcoming or locked.

## Layout

- `src/lib/` holds pure logic. Keep it free of React and browser APIs so Vitest can run it in Node.
- `src/components/` and `src/app/` hold UI. Import domain data only through `@/lib/...`.
- `src/lib/persistence.ts` is the only module that touches `localStorage`.
- Rubric packs are named `unit_<n>_<name>.json`. The code calls the unit number `tier`.

## Commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Mandatory pre-PR checks, in this order:
  - `pnpm typecheck`
  - `pnpm curriculum:validate`
  - `pnpm test:rubric`
- Full build before merge: `pnpm build`. Stop the dev server first, because both write to `.next`.

## Conventions

- TypeScript strict mode. Do not add `any`. Prefer Zod parsing at system boundaries.
- Every new rubric rule needs a test in `tests/rubric/`.
- Add curriculum content as JSON first, then update the schema only if the new field needs one.
- Keep copy plain and executive. Use sentence case for headings and body copy. Button labels follow the PRD (for example, "Start Path"). Avoid em dashes in UI copy.
