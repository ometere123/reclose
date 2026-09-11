#!/usr/bin/env bash
# Reusable studio-dev (chain 61997 ONLY) deploy automation (C3 Section 40 - deployment
# automation). Codifies the exact deploy pattern this session used successfully across the full
# C2 contract set (deployment/61997/c2-manifest.json): derive the authoritative baseline fee via
# `genlayer estimate-fees` (bare, no positional contractAddress/method args - this returns the
# network's current fee distribution/policy, usable directly for a deploy's --fees/--fee-value),
# then `genlayer deploy` with exactly that fee object.
#
# Also codifies a genuine operational finding from this session: Studio-dev's RPC
# (https://studio-dev.genlayer.com/api) intermittently returns transient connectivity errors
# (ConnectTimeoutError / "fetch failed" / ECONNRESET / ETag HTML instead of JSON) on individual
# requests - confirmed to recur identically on both `genlayer deploy`'s receipt-polling step and
# on later unrelated `genlayer write`/`genlayer call` invocations throughout this session, and to
# always clear on a close retry (never required more than 2-3 attempts). This script retries the
# deploy step itself up to RETRY_COUNT times with a short pause, rather than requiring a human to
# notice the transient failure and re-run the command by hand - but it NEVER retries past a real
# protocol-level rejection (e.g. FeeValueMustBeNonZero, a UserError from the contract) and never
# silently swallows a genuine failure: every attempt's exact output is shown.
#
# Never touches private key material: `genlayer deploy`'s configured keystore/wallet signs the
# transaction; this script only shells out to the genlayer CLI with public arguments.
#
# Usage: studio-dev-deploy.sh <contractPath> [--args ...]
set -euo pipefail

RPC="https://studio-dev.genlayer.com/api"
EXPECTED_CHAIN_ID="61997"
RETRY_COUNT="${RECLOSE_DEPLOY_RETRY_COUNT:-3}"
RETRY_DELAY_SECONDS="${RECLOSE_DEPLOY_RETRY_DELAY_SECONDS:-5}"

# Transient-connectivity-shaped error substrings observed this session - NOT protocol rejections.
# A match here means "retry the exact same command", never "treat as success" or "skip the error".
TRANSIENT_ERROR_PATTERNS=(
  "ConnectTimeoutError"
  "fetch failed"
  "ECONNRESET"
  "is not valid JSON"
  "UnknownRpcError"
)

CONTRACT_PATH="$1"; shift

# Hard chain-identity guard (CLAUDE.md Section 10 rule 9/10: never substitute 61999).
NETWORK_INFO="$(genlayer network info 2>/dev/null || true)"
if ! echo "$NETWORK_INFO" | grep -q "chainId: '${EXPECTED_CHAIN_ID}'"; then
  echo "FATAL: active genlayer CLI network is not chainId ${EXPECTED_CHAIN_ID} (studio-dev). Refusing to proceed." >&2
  echo "$NETWORK_INFO" >&2
  exit 1
fi

TMP_ESTIMATE="$(mktemp)"
TMP_DEPLOY_OUT="$(mktemp)"
trap 'rm -f "$TMP_ESTIMATE" "$TMP_DEPLOY_OUT"' EXIT

echo "--- estimate-fees (baseline, no address/method) ---" >&2
genlayer estimate-fees --rpc "$RPC" --json > "$TMP_ESTIMATE" 2>/dev/null

DIST="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(json.dumps(d['distribution']))" "$TMP_ESTIMATE")"
FEE_VALUE="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d['feeValue'])" "$TMP_ESTIMATE")"
FEES_JSON="{\"distribution\":${DIST}}"

is_transient_error() {
  local output="$1"
  for pattern in "${TRANSIENT_ERROR_PATTERNS[@]}"; do
    if echo "$output" | grep -qF "$pattern"; then
      return 0
    fi
  done
  return 1
}

attempt=1
while true; do
  echo "--- deploy ${CONTRACT_PATH} $* (attempt ${attempt}/${RETRY_COUNT}, feeValue=${FEE_VALUE}) ---" >&2
  if genlayer deploy --contract "$CONTRACT_PATH" --rpc "$RPC" --fees "$FEES_JSON" --fee-value "$FEE_VALUE" "$@" 2>&1 | tee "$TMP_DEPLOY_OUT"; then
    exit 0
  fi

  OUTPUT="$(cat "$TMP_DEPLOY_OUT")"
  if is_transient_error "$OUTPUT" && [ "$attempt" -lt "$RETRY_COUNT" ]; then
    echo "--- transient connectivity error detected (matched known pattern) - retrying in ${RETRY_DELAY_SECONDS}s ---" >&2
    sleep "$RETRY_DELAY_SECONDS"
    attempt=$((attempt + 1))
    continue
  fi

  echo "--- deploy failed - not retrying further (either a real rejection, or retry budget exhausted) ---" >&2
  exit 1
done
