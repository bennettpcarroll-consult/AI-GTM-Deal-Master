# AGENTS.md: AI GTM: Deal Master

This repo follows the spec in the PRD. Read the PRD section that matches your change before you start.

## Non-negotiable architecture rules

1. Curriculum-as-code: never hardcode vendor names, vertical objections, buyer copy, or MEDDPICC rubrics in React components. Load all domain data from `curriculum/{clusters,verticals,frameworks,rubrics}/*.json`, validated by Zod in `src/lib/curriculum/schema.ts`.
2. Multi-trajectory isolation: never overwrite a user's progress when switching trajectories. Progress lives under its own trajectory id. Transferable MEDDPICC score lives in `globalCompetencies`.
3. Anti-checkbox grading: a MEDDPICC signal may reach 4 bars (verbatim proof) only when it is bound to a non-null buyer `transcript_turn_id`. Learner text never raises a signal. Keep `assertEvidenceInvariant` in `src/lib/grader.ts` and the matching check constraint in `src/db/schema.ts`.
4. Light-mode brand system (no dark mode):
   - White (#FFFFFF) header and cards on the cool light-gray (#F8FAFC) canvas, 1px #E5E7EB borders, soft shadows.
   - Spectrum gradient (orange, pink, purple, cyan) only for the hero highlight and primary pill CTAs.
   - Pillar colors: 01 Orange (#F97316), 02 Blue (#2563EB), 03 Purple (#7C3AED), 04 Teal (#0D9488). Emerald (#10B981) for verified and profit. Red (#EF4444) for bottlenecks and auto-fail flags.
   - Thin-stroke outline icons, four-bar signal indicators, dashed borders for unverified or locked states.
5. The grader is deterministic in v1. If you add an LLM judge, it must output the same binding shape and pass through `assertEvidenceInvariant`.

## Layout

- `src/lib/` holds pure logic. Keep it free of React and browser APIs so Vitest can run it in Node.
- `src/components/` and `src/app/` hold UI. Import domain data only through `@/lib/...`.
- `src/lib/persistence.ts` is the only module that touches `localStorage`.

## Commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Mandatory pre-PR checks, in this order:
  - `pnpm typecheck`
  - `pnpm curriculum:validate`
  - `pnpm test:rubric`
- Full build before merge: `pnpm build`

## Conventions

- TypeScript strict mode. Do not add `any`. Prefer Zod parsing at system boundaries.
- Every new rubric rule needs a test in `tests/rubric/`.
- Add curriculum content as JSON first, then update the schema only if the new field needs one.
- Keep copy plain and executive. Use sentence case, and avoid em dashes in UI copy.
