#!/usr/bin/env node
// Writes a BMAD-readable learnings entry for one CI run.
// Output: _bmad-output/ci-learnings/latest.md and latest.json, plus the
// GitHub job summary. Run locally after `pnpm ci:local` to get the same file.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CHECKS = [
  { id: 'typecheck', label: 'Typecheck', command: 'pnpm typecheck', pattern: /error TS\d+|: error/ },
  { id: 'curriculum', label: 'Curriculum packs', command: 'pnpm curriculum:validate', pattern: /error|invalid|unknown|missing|expected/i },
  { id: 'rubric', label: 'Rubric regression tests', command: 'pnpm test:rubric', pattern: /FAIL|✗|×|AssertionError|Expected|Received/ },
  { id: 'build', label: 'Build', command: 'pnpm build', pattern: /Error|Failed to compile|Type error/ },
];

// What each failure usually means in this repo, so the next agent starts from the cause.
const HINTS = {
  typecheck: 'Schema or prop types drifted. Change src/lib/curriculum/schema.ts first, then callers.',
  curriculum: 'A JSON pack broke a cross-check in src/lib/curriculum/load.ts (unknown skill, missing scenario, signal without a skill).',
  rubric: 'Grading behaviour changed. Never weaken a test: verbatim evidence must still cite a buyer turn.',
  build: 'Usually a client/server boundary or an unused import that only the production build catches.',
};

const git = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const outcomeOf = (id) => {
  const raw = process.env[`OUTCOME_${id.toUpperCase()}`];
  if (raw) return raw;
  return existsSync(`ci-logs/${id}.log`) ? 'unknown' : 'skipped';
};

const excerpt = (id, pattern) => {
  const file = `ci-logs/${id}.log`;
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, 'utf8').replace(/\x1b\[[0-9;]*m/g, '').split('\n');
  return lines.filter((line) => pattern.test(line)).map((line) => line.trim()).filter(Boolean).slice(0, 12);
};

const results = CHECKS.map((check) => {
  const outcome = outcomeOf(check.id);
  return { ...check, outcome, evidence: outcome === 'failure' ? excerpt(check.id, check.pattern) : [] };
});
const failed = results.filter((r) => r.outcome === 'failure');

const run = {
  date: new Date().toISOString(),
  sha: process.env.GITHUB_SHA ?? git('git rev-parse HEAD'),
  ref: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git('git rev-parse --abbrev-ref HEAD'),
  run_url: process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  commits: git('git log --oneline -10').split('\n').filter(Boolean),
  changed_files: git('git diff --name-only HEAD~1 HEAD').split('\n').filter(Boolean),
  status: failed.length ? 'failed' : 'passed',
  checks: results.map(({ id, label, command, outcome, evidence }) => ({ id, label, command, outcome, evidence, hint: outcome === 'failure' ? HINTS[id] : null })),
};

const md = [
  `# CI learnings: ${run.status === 'passed' ? 'all checks passed' : `${failed.length} check(s) failed`}`,
  '',
  `- Ref: \`${run.ref}\` at \`${run.sha.slice(0, 7)}\``,
  run.run_url ? `- Run: ${run.run_url}` : null,
  `- Date: ${run.date}`,
  '',
  '| Check | Command | Outcome |',
  '| --- | --- | --- |',
  ...results.map((r) => `| ${r.label} | \`${r.command}\` | ${r.outcome === 'success' ? 'passed' : r.outcome} |`),
  '',
  ...failed.flatMap((r) => [
    `## ${r.label} failed`,
    '',
    `Likely cause: ${HINTS[r.id]}`,
    '',
    r.evidence.length ? '```' : '_No matching error lines. Open the log in the run artifact._',
    ...r.evidence,
    r.evidence.length ? '```' : null,
    '',
  ]),
  '## For the next agent',
  '',
  failed.length
    ? `Fix the failing checks above first. Re-run only those commands while fixing. Then run the bmad-code-review skill on the diff and record the root cause in the PR description.`
    : 'Nothing to fix. If this run closed out a feature, run the bmad-retrospective skill and keep one lesson in AGENTS.md if it changes how future work is done.',
  '',
  '## Recent commits',
  '',
  ...run.commits.map((c) => `- ${c}`),
]
  .filter((line) => line !== null)
  .join('\n');

mkdirSync('_bmad-output/ci-learnings', { recursive: true });
writeFileSync('_bmad-output/ci-learnings/latest.md', `${md}\n`);
writeFileSync('_bmad-output/ci-learnings/latest.json', `${JSON.stringify(run, null, 2)}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
console.log(md);
process.exit(failed.length ? 1 : 0);
