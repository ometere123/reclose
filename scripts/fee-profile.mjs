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
// A profile entry whose branch is known to fail a prior read-only simulation is still represented
// in the output, but do not repeat a stable accepted-message failure merely to regenerate the same
// result. Retain the exact existing response until the Studio-dev behavior or call path changes.

import { createClient, chains, deriveInternalMessageCallKey } from "genlayer-js";
import { writeFileSync } from "node:fs";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";
import { validateFeeProfileInputs } from "./fee-profile-input.mjs";

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
  const generation = profiles?.[0]?.deploymentGeneration;
  const inputErrors = validateFeeProfileInputs(profiles, generation);
  if (inputErrors.length) {
    console.error("FEE PROFILE PREFLIGHT FAILED (no Studio-dev RPC request sent):");
    for (const error of inputErrors) console.error(`- ${error}`);
    process.exit(2);
  }

  // Fee profiling performs multiple Studio-dev simulations. Keep them on the same serialized,
  // bounded RPC queue used by the incident preflight and transaction polling scripts.
  installStudioDevRpcThrottle();

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
    const entry = {
      name: profile.name,
      address: profile.address,
      functionName: profile.functionName,
      deploymentGeneration: profile.deploymentGeneration ?? null,
      notes: profile.notes ?? null,
    };
    if (profile.knownFailure) {
      entry.status = profile.knownFailure.status;
      entry.error = profile.knownFailure.error;
      entry.evidenceRef = profile.knownFailure.evidenceRef;
      results.push(entry);
      console.log(`${entry.status}  ${entry.name} (retained from evidence; no RPC retry)`);
      continue;
    }
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
    deploymentGeneration: profiles[0]?.deploymentGeneration ?? null,
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
