#!/bin/bash
#
# Verification gate for react-gantt-edge.
#
# Run this at the start of a session to confirm you are on a clean baseline, and
# again before claiming any feature done. It is the only thing that settles
# "does this work" — a passing run is the evidence you paste into
# .claude/harness/progress.md.
#
# Usage:
#   ./init.sh          full gate (install, lint, types, tests, format, build)
#   ./init.sh --quick  skip install and build — the inner loop while iterating
#
set -euo pipefail

cd "$(dirname "$0")"

QUICK=0
if [ "${1:-}" = "--quick" ]; then
  QUICK=1
fi

step() {
  echo ""
  echo "=== $* ==="
}

if [ "$QUICK" -eq 0 ]; then
  step "pnpm install --frozen-lockfile"
  pnpm install --frozen-lockfile
fi

# oxlint exits 0 on warnings. There is one known warning (clsx default import in
# TaskResizer.tsx); errors are what fail this gate.
step "pnpm lint"
pnpm lint

step "pnpm check-types"
pnpm check-types

# 485 tests across 43 files in packages/react-gantt as of commit 8d4c65c.
step "pnpm test"
pnpm test

# Known to fail on a clean checkout — see feature baseline-format-debt in
# .claude/harness/feature_list.json. Fix with `pnpm format`.
step "pnpm format:check"
pnpm format:check

if [ "$QUICK" -eq 0 ]; then
  step "pnpm build"
  pnpm build
fi

echo ""
echo "=== Verification complete — all checks passed ==="
echo ""
echo "Next steps:"
echo "  1. Read .claude/harness/feature_list.json for current feature state."
echo "  2. Pick ONE feature whose dependencies are all 'done'. Set it to"
echo "     'in_progress' and record it as activeFeature."
echo "  3. Implement only that feature."
echo "  4. Re-run ./init.sh and paste the result into"
echo "     .claude/harness/progress.md as evidence before marking it done."
