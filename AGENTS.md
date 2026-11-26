# AGENTS.md: AI GTM: Deal Master

This repo follows the spec in the PRD. Read the PRD section that matches your change before you start.

## Non-negotiable architecture rules

1. Curriculum-as-code: never hardcode vendor names, vertical objections, buyer copy, skills, talk tracks or MEDDPICC rubrics in React components. Load all domain data from `curriculum/{clusters,verticals,frameworks,rubrics,skills,scenarios}/*.json` `curriculum/diagnostic.json` and `curriculum/room.json`, validated by Zod in `src/lib/curriculum/schema.ts` and cross-checked in `src/lib/curriculum/load.ts`.
   - The skill is the central entity: 24 skills in 4 families (F fundamentals, M MEDDPICC, C consumption, E executive). Each has a talk track (strong move, weak move, proof) and a 2-minute rep.
   - Every drill lists `practices_skills`, every skill is practiced somewhere, and every MEDDPICC signal maps to exactly one M skill.
   - Every cluster x vertical pair has a scenario with a `consumption_profile`. Add a pair and you add its scenario.
2. Multi-trajectory isolation: never overwrite a user's progress when switching trajectories. Progress lives under its own trajectory id. Transferable MEDDPICC score lives in `globalCompetencies`.
3. Anti-checkbox grading: a MEDDPICC signal may reach 4 bars (verbatim proof) only when it is bound to a non-null buyer `transcript_turn_id`. Learner text never raises a signal. Keep `assertEvidenceInvariant` in `src/lib/grader.ts` and the matching check constraint in `src/db/schema.ts`. Consumption skill evidence follows the same rule through `assertSkillEvidenceInvariant`.
   - Proof points come only from verified buyer proof. Never award points for time spent, clicks or learner text.
4. Profit, Not Pilots design system, light mode only:
   - Paper #FFFFFF surfaces, deep #F4F5F7 panels, ink #0E1116 text, slate #5E6672 secondary text.
   - Fonts: Bricolage Grotesque for display and stats, Geist for everything else. Use the type roles in `src/app/globals.css` (`t-display`, `t-title`, `t-heading`, `t-body`, `t-label`, ...) instead of ad hoc sizes.
   - Pillars (base, soft, ink): value #FF9E6B / #FFF0E8 / #B85A24, work #4C9DFF / #E8F2FF / #1F6FD1, people #C77DFF / #F6EBFF / #8A3CC7, scale #2EC4A6 / #E2F8F3 / #12806B. Profit #0B9F6E (ink #08734F) for verified proof. Leak #F03E3E (ink #C92A2A) for red flags.
   - The spectrum gradient (`.btn-lit`) appears once per view, on the primary action only.
   - One decision per screen: `FocusScreen` with a sticky footer for flows, `AppShell` with the bottom nav for hubs. Feedback arrives as a profit or leak sheet with a short "why".
   - Say each thing once. A buyer quote appears once, in the conversation. A feedback drawer on a pass shows a short verdict ("Economic buyer verified"), one line on why, and Continue, with no disclosures: the buyer's proof is already marked in the conversation. A miss names the failure in one line and folds the elite move into a single disclosure. Secondary state such as the MEDDPICC tracker is a collapsed pill, never a permanent row.
   - Symbols over codes. Markets, verticals and skill families carry a `glyph` in their JSON, rendered by `src/components/glyph.tsx` inside an `IconTile`. Never show internal codes (F1, M2) to learners. Show mastery as a `MasteryBadge` (word plus symbol), not a bar meter.
   - Thin-stroke lucide icons, four-bar mastery and signal indicators, dashed borders for unverified or locked states.
   - Gamification stays performance based: streak, daily goal of 5 reps and proof points. Keep it enterprise in tone: no confetti, mascots or cartoon copy.
5. Zero typing. Learners never write free text. The deal room (`src/lib/deal-room.ts`) offers three moves per beat (elite, weak, trap) and runs the chosen line through the buyer simulator, so proof still comes only from buyer turns. A hidden buyer state (trust, risk alarm, urgency) turns traps into objections, and a buyer with no trust can end the meeting. Elite lines live in each vertical's `talk_tracks`; weak and trap lines live on the skill.
   - Onboarding is two steps (what you sell, who you sell to). The market briefing is the first node of Pillar 01 and the placement check is optional, both reached from the path.
   - Voice boss fights and tap-to-assemble artifacts need a backend or a new interaction and are deferred. The app stays a static export.
6. Authored arcs. A trajectory with `curriculum/arcs/<cluster>__<vertical>.json` plays hand-written scenes instead of the generated room (Agentic Harness x Banking, the Northbridge account, is the reference). One account runs through all four pillars, each pillar brings new buyers and a new commercial problem, and the MEDDPICC ladder climbs from identify to quantify to stress-test to orchestrate.
   - Every option carries its own buyer reply. Elite options carry `evidence` (open beats earn partial, pin beats verbatim). Every wrong option names a failure mode from `curriculum/failure_modes.json`, and may carry a rubric red-flag id.
   - `tests/rubric/arc-quality.test.ts` is the quality gate: no line repeats anywhere in an arc, option lengths stay within 2x, a wrong option is phrased as a question whenever the elite one is, each pillar after the first adds two new speakers, capstones bring a new voice and reuse no drill line, and the elite path scores 100. Write content to pass it; never loosen it to fit content.
   - No end-of-pillar replay, on any trajectory (Benney, 2026-11-26: replaying drill questions is boring and causes churn). A pillar is three drills, then `/recap/[tier]`, then the next pillar. The course closes with one final review (`/review`): eight questions interleaved across the four pillars, drawn from each arc's capstone scenes so they are new situations. The retired `/room/[tier]/boss` route only forwards to the recap; `tests/rubric/path.test.ts` guards this. Capstone scenes in arcs now feed the final review.
   - Learning design follows EdTech evidence, tuned for impact without grind: a worked example opens each pillar (concept card, weak line beside strong, one retrieval check); drills repeat a missed move until it lands (immediate corrective feedback naming the failure mode); coaching labels fade after tier 2 and tiers 3 to 4 add a fourth option (fading scaffold, desirable difficulty); each pillar ends with a one-screen recap (skills gained, buyer proof won) and moves straight on; missed moves return in daily reps on a 1, 3, 7 day schedule, at most 3 per set and interleaved with skill reps (spaced, interleaved retrieval). Authored sessions score first-try accuracy.
7. The grader is deterministic in v1. If you add an LLM judge, it must output the same binding shape and pass through `assertEvidenceInvariant`.

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
- All of the above plus the BMAD learnings entry: `pnpm ci:local`
- QA site: `.github/workflows/pages.yml` publishes `main` as a static export (`STATIC_EXPORT=1`) to GitHub Pages. Keep every route statically exportable: no server actions, API routes or server-side `redirect()`, and give dynamic routes `generateStaticParams`.

## BMAD and CI learnings

BMAD Method is installed for Claude Code as project skills in `.claude/skills/` (modules `core-tools` and `method`, pinned in `skills-lock.json`), with its project config in `_bmad/`. Update it with `npx skills update -p -y`, then ask the `bmad` skill to check the install.

Every CI run feeds the next change:

1. CI runs every check even when one fails, then `scripts/ci-learnings.mjs` writes `_bmad-output/ci-learnings/latest.md` (and `.json`): which checks failed, the error lines, the likely cause in this repo, and recent commits. It is posted to the job summary and uploaded as the `bmad-ci-learnings` artifact.
2. Before fixing a red run, read that entry (from the artifact, or run `pnpm ci:local`) and fix from the stated cause. Re-run only the failing check while fixing.
3. Run the `bmad-code-review` skill on the diff before opening a PR.
4. When a feature closes, run the `bmad-retrospective` skill. If a lesson changes how future work is done, add it under "Lessons from CI" below in one line. Keep that list short and delete lessons that stop applying.

## Lessons from CI

- 2026-11-26: a change to the learner journey must apply to every trajectory, not only the reference arc, and the old route must be retired with a test. Testers often keep a tab open across deploys; `src/components/fresh-build.tsx` reloads a tab when `version.json` shows a newer build, so QA always sees the latest release.

- Every deal-room line is gradable. `tests/rubric/deal-room.test.ts` plays all 320 sessions on the elite path (they must pass with zero red flags) and checks that no weak or trap line earns buyer evidence. When a weak line leaks a partial answer, reword the line rather than the probe.
- A talk track the coach teaches must be gradable. When you edit a skill's `talk_track.strong` or a signal's probes, keep `tests/rubric/skills.test.ts` ("talk tracks the coach teaches") green.
- Playwright `text=Check` also matches labels such as "CHECK 1 OF 3". Use `getByRole('button', { name, exact: true })`.
- Grammar in generated scenario copy is checked by eye only. Read a sample of every regenerated pack before committing.

## Conventions

- TypeScript strict mode. Do not add `any`. Prefer Zod parsing at system boundaries.
- Every new rubric rule needs a test in `tests/rubric/`.
- Add curriculum content as JSON first, then update the schema only if the new field needs one.
- Keep copy plain and executive. Use sentence case, and avoid em dashes in UI copy.
- Talk-track copy ships as drafted for the beta. Improve it in the JSON packs, never in components.
