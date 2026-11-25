# AI GTM: Deal Master

An open-source, gamified AI GTM training platform from the [Profit, Not Pilot](https://profitnotpilot.com/) brand system.

Learners choose an AI value-chain cluster and a customer vertical, learn the market in a short lesson, take a 12-question diagnostic, then work a gamified path of deal drills and 2-minute skill reps. Every skill is graded on verbatim buyer evidence, not on checkboxes.

## Run it

Requirements: Node.js 20.9+ (22 LTS recommended) and pnpm 10+.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Checks (the same ones CI runs):

```bash
pnpm typecheck
pnpm curriculum:validate   # validates every JSON pack and all 20 cluster x vertical trajectories
pnpm test:rubric           # deterministic simulator, grader, composer, and store tests
pnpm build
pnpm ci:local              # all of the above, plus the BMAD CI learnings entry
```

## Curriculum as code

All domain content lives in `curriculum/`, not in React components:

| Folder | Contents |
| :--- | :--- |
| `curriculum/clusters/` | 5 AI value-chain clusters: pricing unit, threats, objections, lineage links |
| `curriculum/verticals/` | 4 customer verticals: buying committee, regulatory blockers, buyer reveals |
| `curriculum/frameworks/` | MEDDPICC (with signal probes), Command of the Message, Challenger, SPICED Bowtie, Minto Pyramid |
| `curriculum/rubrics/` | 4 mastery tiers: gates, drills (with the skills each practices), boss fights, auto-fail red flags |
| `curriculum/skills/` | 24 skills in 4 families (fundamentals, MEDDPICC, consumption, executive), each with a talk track, proof rule and 2-minute rep |
| `curriculum/scenarios/` | 20 cluster x vertical scenarios, each with a consumption profile (unit, volume, growth, forecast and ramp reveals) |
| `curriculum/diagnostic.json` | the 12-item starting diagnostic, 3 per skill family |

To fork the academy for your own market, edit or add JSON, then run `pnpm curriculum:validate`. The validator checks every file against the Zod schemas in `src/lib/curriculum/schema.ts` and cross-checks references.

## How grading works

- The learner's own claims never raise a signal. Only buyer turns can.
- A signal reaches 4 bars (verbatim proof) only when it is bound to a buyer `transcript_turn_id`. The database enforces the same rule in `src/db/schema.ts`.
- Consumption skills (usage forecast, ramp commit) follow the same rule: the buyer must reveal the numbers.
- Proof points are earned only from verified buyer proof.
- Boss fights also check auto-fail red flags. A pass needs the boss gate score and zero flags.

## Project layout

```text
curriculum/            declarative JSON packs (validated at build time)
scripts/               curriculum validator, CI learnings writer
src/app/               Next.js routes: welcome, start (onboarding), path, skills, reps, room, settings
src/components/        UI components
src/lib/               composer, simulator, grader, skills, engagement, state store, curriculum loader
.claude/skills/, _bmad/ BMAD Method skills and config (see AGENTS.md)
src/db/schema.ts       Drizzle schema for the v2 Supabase backend
tests/rubric/          Vitest regression suites
```

## Status (v1 core)

Included: curriculum packs and validator, 20 trajectories, the runtime composer, a scripted buyer simulator with evidence binding, the deterministic grader, multi-trajectory progress with placement credit, the skills layer with talk tracks, market lessons and the diagnostic, the gamified path, daily reps, streaks and proof points, the focused drill room with proof sheets and scorecard, and the Drizzle schema.

Not yet included: Supabase auth and hosted persistence (state lives in the browser's local storage), a live LLM buyer engine and LLM-as-Judge grader (the grader interface is ready for one), voice streaming, shareable credential pages, the `pnpm fork:init` CLI, and the weekly forecast drill.

## License

MIT. See [LICENSE](LICENSE).
