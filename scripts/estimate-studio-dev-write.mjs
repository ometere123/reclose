#!/usr/bin/env node
// C1-FINAL Section 21: authoritative, simulation-derived fee estimation for a Studio-dev write,
// using the exact pinned genlayer-js@2.0.0-rc.1's own `estimateTransactionFeesForWrite` (the same
// underlying simulation + `sim_estimateTransactionFees` RPC path `genlayer estimate-fees` itself
// uses) - never a hand-guessed --fees JSON.
//
// This is deliberately READ-ONLY: it never signs or sends a transaction, and never touches key
// material - the pinned `genlayer` CLI keystore remains the only thing that ever signs. Use this
// script's JSON output as the authoritative `--fees`/`--fee-value` input to `genlayer write`
// (see scripts/studio-dev-write.sh, which already does exactly this for non-cross-contract calls
// via the CLI's own `estimate-fees` subcommand - this script exposes the identical underlying SDK
// path directly for callers that want the raw estimate object, e.g. for the cross-contract
// messageAllocations investigation documented in release-evidence/r1/c1r/deploy-log.md).
//
// Usage:
//   node scripts/estimate-studio-dev-write.mjs <contractAddress> <functionName> [--args '[...]'] [--bigint-arg-index <n>] [--value <wei>] [--account <address>]
//
// Never invents parentIndex trees or feeParams - if the pinned estimator itself cannot resolve a
// cross-contract branch, this script surfaces the exact error/response rather than guessing.

import { createClient, chains } from "genlayer-js";

const STUDIO_DEV_CHAIN_ID = 61997;
const STUDIO_DEV_RPC = "https://studio-next.genlayer.com/api";

function parseArgs(argv) {
  const [address, functionName, ...rest] = argv;
  if (!address || !functionName) {
    console.error("Usage: node scripts/estimate-studio-dev-write.mjs <contractAddress> <functionName> [--args '[...]'] [--value <wei>]");
    process.exit(1);
  }
  let args = [];
  let value = 0n;
  let account;
  const bigintArgIndexes = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--args") {
      args = JSON.parse(rest[++i]);
    } else if (rest[i] === "--value") {
      value = BigInt(rest[++i]);
    } else if (rest[i] === "--account") {
      account = rest[++i];
    } else if (rest[i] === "--bigint-arg-index") {
      bigintArgIndexes.push(Number(rest[++i]));
    }
  }
  for (const index of bigintArgIndexes) {
    if (!Number.isInteger(index) || index < 0 || index >= args.length || typeof args[index] !== "string" || !/^\d+$/.test(args[index])) {
      throw new Error(`--bigint-arg-index ${index} must refer to a non-negative decimal string in --args`);
    }
    args[index] = BigInt(args[index]);
  }
  return { address, functionName, args, value, account };
}

async function main() {
  const { address, functionName, args, value, account } = parseArgs(process.argv.slice(2));

  const chain = { ...chains.studioDevnet, id: STUDIO_DEV_CHAIN_ID, rpcUrls: { default: { http: [STUDIO_DEV_RPC] } } };
  // C1-FINAL / CLAUDE.md Section 10: assert canonical chain identity before any network call -
  // never silently fall back to a different Studio family.
  if (chain.id !== STUDIO_DEV_CHAIN_ID) {
    console.error(`REFUSING: expected chain ID ${STUDIO_DEV_CHAIN_ID}, got ${chain.id}`);
    process.exit(1);
  }

  const client = createClient({ chain, ...(account ? { account } : {}) });
  const reportedChainId = await client.getChainId();
  if (Number(reportedChainId) !== STUDIO_DEV_CHAIN_ID) {
    console.error(`REFUSING: RPC reports chain ID ${reportedChainId}, expected ${STUDIO_DEV_CHAIN_ID} (studio-dev, not stable 61999)`);
    process.exit(1);
  }

  try {
    const estimate = await client.estimateTransactionFeesForWrite({
      address,
      functionName,
      args,
      value,
    });
    console.log(JSON.stringify(estimate, (_key, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  } catch (err) {
    const safe = (value) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
    const diagnostic = { name: err?.name ?? null, code: err?.code ?? null, message: err?.message ?? String(err), cause: err?.cause ? safe(err.cause) : null };
    console.error("ESTIMATION_FAILED_DIAGNOSTIC_JSON:");
    console.error(JSON.stringify(diagnostic, null, 2));
    process.exit(1);
  }
}

main();
