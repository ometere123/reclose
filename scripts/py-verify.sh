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
    # `genvm-lint lint`/`check` take exactly one contract FILE, not a directory (passing a
    # directory raised IsADirectoryError on real GitHub Actions CI - see git history for the
    # failing run) - lint each discovered candidate individually. Uses `lint` (fast, AST-based
    # safety checks, no network dependency) rather than `check` (lint+validate): `validate` needs
    # to download and match the exact pinned py-genlayer runner tarball, which this session found
    # genvm-lint's own artifact-registry resolution does not reliably do even when the correct
    # runner is already cached locally under a different scheme (see known-limitations.md). The
    # real semantic proof for these contracts is the genlayer-test Direct Mode suite below, which
    # loads and executes the actual pinned SDK - a stronger check than genvm-lint's static validate.
    LINT_EXIT=0
    CANDIDATE_PATHS=$(echo "$DISCOVERY_OUTPUT" | sed -n 's/^  //p')
    while IFS= read -r candidate; do
      [ -z "$candidate" ] && continue
      echo "--- genvm-lint lint $candidate ---"
      genvm-lint lint "$candidate" || LINT_EXIT=1
    done <<< "$CANDIDATE_PATHS"
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
  # genlayer-test's Direct Mode has a confirmed Windows-host limitation (same class of issue as
  # G0's CF-013): its message-injection helper os.unlink()s a temp file it still holds open via
  # os.dup2, which POSIX allows but Windows does not - this hangs (rather than raising) on native
  # Windows Python in some cases. WSL/Linux (including GitHub Actions' ubuntu runners) do not have
  # this problem - all C1 contract tests were independently verified passing there. Bound the
  # local Windows-native invocation with a timeout so a real local run FAILS FAST and visibly
  # rather than hanging indefinitely; this is never silently treated as a pass.
  if command -v timeout >/dev/null 2>&1; then
    timeout 180 python3 -m pytest tests -v
    PYTEST_EXIT=$?
    if [ "$PYTEST_EXIT" -eq 124 ]; then
      echo "FAIL: pytest timed out after 180s - this matches the known Windows-host genlayer-test"
      echo "  Direct Mode limitation (os.unlink on an open fd; see known-limitations.md and CF-013"
      echo "  precedent from G0). Re-run via WSL/Linux, where this suite passes (31/31 verified)."
    fi
  else
    python3 -m pytest tests -v
    PYTEST_EXIT=$?
  fi
  if [ "$PYTEST_EXIT" -ne 0 ]; then
    echo "FAIL: pytest reported failures (or timed out - see above)."
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
