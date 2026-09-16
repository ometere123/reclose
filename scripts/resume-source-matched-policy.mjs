#!/usr/bin/env node
// Resume the already-begun source-matched policy after an interrupted local process.
// Reads the signer only from .env.local and resumes from authoritative Kernel counts.
import fs from "node:fs";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";

const RPC = "https://studio-next.genlayer.com/api";
const chain = { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: [RPC] } } };
const kernel = "0x7DE54B6d2Fea164E325597b1D2275463180d4ddC";
const key = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key ?? "")) throw new Error(".env.local signer is missing or invalid");
const account = createAccount(key);
const client = createClient({ chain, account });
const policyKey = "policy-source-matched-current";
const safe = (v) => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const feeOptions = (e) => ({ distribution: e.distribution, ...(e.messageAllocations?.length ? { messageAllocations: e.messageAllocations } : {}) });
async function write(functionName, args) {
  const estimate = await client.estimateTransactionFeesForWrite({ account, address: kernel, functionName, args });
  const hash = await client.writeContract({ address: kernel, functionName, args, fees: feeOptions(estimate) });
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 80 });
  if (!isSuccessful(receipt)) throw new Error(`${functionName} failed: ${JSON.stringify(safe(receipt))}`);
  console.log(`${functionName}: ${hash}`);
}
async function main() {
  const counts = await client.readContract({ address: kernel, functionName: "get_policy_counts", args: [policyKey] });
  console.log(`resuming from counts ${JSON.stringify(safe(counts))}`);
  const effects = [
    ["PROVIDER_COMPROMISE_V1", 3, "provider_a", 0n, "", 1],
    ["PROVIDER_COMPROMISE_V1", 7, "", 0n, "", 1],
    ["REMEDIATION_CONFIRMED_V1", 9, "", 0n, "", 1],
    ["RECOVERY_VALIDATED_V1", 10, "", 0n, "", 2],
  ];
  for (let i = Number(counts[2]); i < effects.length; i++) await write("add_policy_effect", [policyKey, ...effects[i]]);
  const lifecycle = await client.readContract({ address: kernel, functionName: "get_policy_lifecycle", args: [policyKey] });
  if (!lifecycle[7]) await write("seal_policy", [policyKey]);
  console.log("Waiting 70 seconds for the configured policy delay...");
  await new Promise((resolve) => setTimeout(resolve, 70000));
  const afterSeal = await client.readContract({ address: kernel, functionName: "get_policy_lifecycle", args: [policyKey] });
  if (!afterSeal[8]) await write("activate_policy", [policyKey]);
  console.log("Policy resumed and activated.");
}
main().catch((error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
