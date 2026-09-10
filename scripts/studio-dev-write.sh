#!/usr/bin/env bash
# Reusable studio-dev (chain 61997 ONLY) authoritative fee-derived write tool (C1R Section 21).
#
# Resolves the exact fee distribution/messageAllocations for a write by asking the network
# itself via `genlayer estimate-fees <contract> <method> --args ...` (which runs a real
# gen_call/sim_estimateTransactionFees simulation against the target RPC and returns the
# authoritative fees the actual on-chain execution will need - including any internal
# cross-contract messageAllocations tree GenVM's consensus contract requires), then submits
# `genlayer write` with exactly that fee object. This replaces hand-guessing an allocation tree.
#
# Never touches private key material: `genlayer write`'s configured keystore/wallet signs the
# transaction; this script only shells out to the genlayer CLI with public arguments.
#
# Usage: studio-dev-write.sh <contractAddress> <method> [--args ...]
set -euo pipefail

RPC="https://studio-dev.genlayer.com/api"
EXPECTED_CHAIN_ID="61997"

CONTRACT="$1"; shift
METHOD="$1"; shift

# Hard chain-identity guard (CLAUDE.md Section 10 rule 9/10: never substitute 61999).
NETWORK_INFO="$(genlayer network info 2>/dev/null || true)"
if ! echo "$NETWORK_INFO" | grep -q "chainId: '${EXPECTED_CHAIN_ID}'"; then
  echo "FATAL: active genlayer CLI network is not chainId ${EXPECTED_CHAIN_ID} (studio-dev). Refusing to proceed." >&2
  echo "$NETWORK_INFO" >&2
  exit 1
fi

TMP_ESTIMATE="$(mktemp)"
trap 'rm -f "$TMP_ESTIMATE"' EXIT

echo "--- estimate-fees ${CONTRACT} ${METHOD} $* ---" >&2
genlayer estimate-fees "$CONTRACT" "$METHOD" --rpc "$RPC" --json "$@" > "$TMP_ESTIMATE" 2>/dev/null

DIST="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(json.dumps(d['distribution']))" "$TMP_ESTIMATE")"
FEE_VALUE="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d['feeValue'])" "$TMP_ESTIMATE")"
MSG_ALLOC="$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(json.dumps(d.get('messageAllocations') or []))" "$TMP_ESTIMATE")"

if [ "$MSG_ALLOC" = "[]" ]; then
  FEES_JSON="{\"distribution\":${DIST}}"
else
  FEES_JSON="{\"distribution\":${DIST},\"messageAllocations\":${MSG_ALLOC}}"
fi

echo "--- write ${CONTRACT} ${METHOD} $* (feeValue=${FEE_VALUE}) ---" >&2
exec genlayer write "$CONTRACT" "$METHOD" --rpc "$RPC" --fees "$FEES_JSON" --fee-value "$FEE_VALUE" "$@"
