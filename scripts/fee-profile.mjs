#!/usr/bin/env node
// C3 Section 34 fee-profiling automation: runs the pinned genlayer-js@2.0.0-rc.1's own
// estimateTransactionFeesForWrite (the exact SDK path `genlayer estimate-fees` itself uses - same
// underlying sim_estimateTransactionFees simulation) across a declared set of REPRESENTATIVE write
// branches, and writes a single consolidated report. Never hand-guesses fee arithmetic
// (CLAUDE.md Section 34 rule: "Do not invent handwritten fee arithmetic").
//
// Usage:
//   node scripts/fee-profile.mjs <profile.json> [--out <reportPath>]
//
// profile.json shape: [{ "name": "...", "address": "0x...", "functionName": "...",
//                         "args": [...], "value": "0", "notes": "..." }, ...]
//
// A profile entry whose branch is KNOWN to trigger the documented live cross-contract dispatch
// limitation (docs/execution/C2 Live Proof Evidence.md Finding 2) is still run - this script
// reports the estimator's exact response/error for that branch rather than skipping it, since an
// honest fee profile must show what actually happens, not a curated subset.

import { createClient, chains, deriveInternalMessageCallKey } from "genlayer-js";
import { writeFileSync } from "node:fs";

const STUDIO_DEV_CHAIN_ID = 61997;
const STUDIO_DEV_RPC = "https://studio-dev.genlayer.com/api";

function parseArgs(argv) {
  const [profilePath, ...rest] = argv;
  if (!profilePath) {
    console.error("Usage: node scripts/fee-profile.mjs <profile.json> [--out <reportPath>]");
    process.exit(1);
  }
  let outPath = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--out") outPath = rest[++i];
  }
  return { profilePath, outPath };
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

async function main() {
  const { profilePath, outPath } = parseArgs(process.argv.slice(2));
  const profiles = JSON.parse(await (await import("node:fs")).promises.readFile(profilePath, "utf8"));

  const chain = { ...chains.studioDevnet, id: STUDIO_DEV_CHAIN_ID, rpcUrls: { default: { http: [STUDIO_DEV_RPC] } } };
  if (chain.id !== STUDIO_DEV_CHAIN_ID) {
    console.error(`REFUSING: expected chain ID ${STUDIO_DEV_CHAIN_ID}, got ${chain.id}`);
    process.exit(1);
  }

  const client = createClient({ chain });
  const reportedChainId = await client.getChainId();
  if (Number(reportedChainId) !== STUDIO_DEV_CHAIN_ID) {
    console.error(`REFUSING: RPC reports chain ID ${reportedChainId}, expected ${STUDIO_DEV_CHAIN_ID} (studio-dev, not stable 61999)`);
    process.exit(1);
  }

  const results = [];
  for (const profile of profiles) {
    const entry = { name: profile.name, address: profile.address, functionName: profile.functionName, notes: profile.notes ?? null };
    if (["receive_provisional_decision", "receive_final_decision"].includes(profile.functionName)) {
      entry.lifecyclePhase = profile.functionName === "receive_provisional_decision" ? "accepted/provisional" : "finalized";
      entry.internalMessageCallKey = deriveInternalMessageCallKey(profile.functionName);
    }
    try {
      const estimate = await client.estimateTransactionFeesForWrite({
        address: profile.address,
        functionName: profile.functionName,
        args: profile.args ?? [],
        value: profile.value ? BigInt(profile.value) : 0n,
      });
      entry.status = "ESTIMATED";
      entry.feeValue = String(estimate.feeValue ?? "");
      entry.distribution = jsonSafe(estimate.distribution ?? null);
      entry.messageAllocations = jsonSafe(estimate.messageAllocations ?? []);
    } catch (err) {
      entry.status = "ESTIMATION_FAILED";
      entry.error = err?.message ?? String(err);
    }
    results.push(entry);
    console.log(`${entry.status}  ${entry.name} (${entry.functionName})`);
  }

  const report = {
    network: "studio-dev",
    chainId: STUDIO_DEV_CHAIN_ID,
    generatedAt: new Date().toISOString(),
    profiles: results,
  };

  const json = JSON.stringify(report, null, 2);
  if (outPath) {
    writeFileSync(outPath, json + "\n");
    console.log(`\nReport written to ${outPath}`);
  } else {
    console.log("\n" + json);
  }
}

main().catch((e) => {
  console.error("FEE PROFILING FAILED (not fabricated - exact error below):");
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
