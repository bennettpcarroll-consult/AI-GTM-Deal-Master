#!/usr/bin/env bash
# Runs the same checks as CI and writes the BMAD learnings entry locally.
set -o pipefail
mkdir -p ci-logs
run() {
  local id="$1"; shift
  if "$@" 2>&1 | tee "ci-logs/$id.log"; then outcome=success; else outcome=failure; fi
  export "OUTCOME_${id^^}=$outcome"
}
run typecheck pnpm typecheck
run curriculum pnpm curriculum:validate
run rubric pnpm test:rubric
run build pnpm build
node scripts/ci-learnings.mjs
