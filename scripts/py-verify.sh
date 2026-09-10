#!/usr/bin/env bash
# Conditional Python verification gate, added per external A0 review finding A0-006.
#
# Previous versions of CI/Makefile suppressed genvm-lint and pytest failures unconditionally with
# `|| true`, which would silently mask a real failure the moment product contracts or Python tests
# actually exist. This script instead:
#   - reports an explicit SKIPPED when there is genuinely nothing to check yet (F0 state);
#   - runs the real check and FAILS THE BUILD (propagates a nonzero exit code) the moment there is
#     something to check.
# Do not reintroduce `|| true` around either check.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

STATUS=0

echo "=== genvm-lint gate ==="
DISCOVERY_OUTPUT=$(node scripts/list-deployable-contracts.js)
DISCOVERY_EXIT=$?
echo "$DISCOVERY_OUTPUT"
CANDIDATE_COUNT=$(echo "$DISCOVERY_OUTPUT" | grep -oE "contains [0-9]+ deployable-contract candidate" | grep -oE "[0-9]+" || echo "0")
if [ "$DISCOVERY_EXIT" -ne 0 ]; then
  echo "FAIL: contract-discovery boundary check itself failed (see output above)."
  STATUS=1
elif [ "${CANDIDATE_COUNT:-0}" = "0" ]; then
  echo "SKIPPED: no deployable-contract candidates exist yet under contracts/ (F0/pre-C1 state). Nothing to lint."
else
  echo "Found $CANDIDATE_COUNT deployable-contract candidate(s) - running genvm-lint (failure now fails the build)."
  if command -v genvm-lint >/dev/null 2>&1; then
    genvm-lint check contracts
    LINT_EXIT=$?
  else
    echo "FAIL: deployable contracts exist but genvm-lint is not installed/on PATH."
    LINT_EXIT=1
  fi
  if [ "$LINT_EXIT" -ne 0 ]; then
    echo "FAIL: genvm-lint reported errors against deployable contract candidates."
    STATUS=1
  fi
fi

echo ""
echo "=== pytest gate ==="
PY_TEST_FILES=$(find tests -type f \( -name "test_*.py" -o -name "*_test.py" \) 2>/dev/null)
if [ -z "$PY_TEST_FILES" ]; then
  echo "SKIPPED: no Python test files exist yet under tests/ (F0/pre-C1 state). Nothing to run."
else
  echo "Found Python test files - running pytest (failure now fails the build)."
  python3 -m pytest tests -v
  PYTEST_EXIT=$?
  if [ "$PYTEST_EXIT" -ne 0 ]; then
    echo "FAIL: pytest reported failures."
    STATUS=1
  fi
fi

echo ""
if [ "$STATUS" -eq 0 ]; then
  echo "py-verify: PASS (see SKIPPED notes above for anything not yet applicable)."
else
  echo "py-verify: FAIL."
fi
exit "$STATUS"
