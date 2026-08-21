#!/bin/bash
#
# Verification gate for react-gantt-edge.
#
# Run this before claiming any change is done. It is the only thing that settles
# "does this work"; a passing run is the evidence.
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

# Fix a failure here with `pnpm format`.
step "pnpm format:check"
pnpm format:check

if [ "$QUICK" -eq 0 ]; then
  step "pnpm build"
  pnpm build
fi

echo ""
echo "=== Verification complete — all checks passed ==="
