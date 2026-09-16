#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";
import { hashCanonicalApm } from "../packages/policy-compiler/dist/index.js";

const CHAIN_ID = 61997, RPC = "https://studio-dev.genlayer.com/api", RUN = (process.env.RECLOSE_RUN_ID ?? "a").toLowerCase();
if (!/^[a-z0-9-]+$/.test(RUN)) throw new Error("RECLOSE_RUN_ID must be a simple generation label");
const FILE = process.env.RECLOSE_MANIFEST ?? `deployment/61997/r1-run-${RUN}-manifest.json`, MODULE_VERSION = 2;
const safe = v => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const m = JSON.parse(await fs.readFile(FILE, "utf8")), c = m.contracts, kernel = c.AssuranceKernel.address, judge = c.IncidentJudgeV1.address;
const policyKey = process.env.RECLOSE_POLICY_KEY ?? `policy-r1-final-${RUN}`;
const env = fsSync.readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
const key = env.match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!/^0x[0-9a-f]{64}$/i.test(key ?? "")) throw new Error("invalid signer");
const account = createAccount(key), client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } }, account });
const base = JSON.parse(await fs.readFile("deployment/61997/apm-r1-fresh-run-a.json", "utf8"));
const registryHash = m.registryHash;
function compile() {
  const apm = structuredClone(base); apm.policyId = policyKey; apm.version = 1; apm.target = { targetId: m.targetId };
  apm.judgeModules = [{ moduleId: "judge-r1-v2", address: judge, version: MODULE_VERSION }];
  apm.metadata = { generation: `r1-final-${RUN}`, sourceRegistryHash: registryHash, judgeVersion: MODULE_VERSION };
  return { apm, hash: hashCanonicalApm(apm) };
}
const first = compile(), second = compile();
if (first.hash !== second.hash || JSON.stringify(first.apm) !== JSON.stringify(second.apm)) throw new Error("policy compile is not deterministic");
const calls = [
  ["begin_policy", [m.targetId, policyKey, first.hash]],
  ["add_policy_resource", [policyKey, "provider_a"]], ["add_policy_resource", [policyKey, "provider_b"]],
  ["add_policy_rule", [policyKey, "PROVIDER_COMPROMISE_V1", judge, MODULE_VERSION, 1, true, 0n, 0n]],
  ["add_policy_rule", [policyKey, "REMEDIATION_CONFIRMED_V1", judge, MODULE_VERSION, 2, false, 0n, 0n]],
  ["add_policy_rule", [policyKey, "RECOVERY_VALIDATED_V1", judge, MODULE_VERSION, 3, false, 0n, 0n]],
  ["add_policy_effect", [policyKey, "PROVIDER_COMPROMISE_V1", 3, "provider_a", 0n, "", 1]],
  ["add_policy_effect", [policyKey, "PROVIDER_COMPROMISE_V1", 7, "", 0n, "", 1]],
  ["add_policy_effect", [policyKey, "REMEDIATION_CONFIRMED_V1", 9, "", 0n, "", 1]],
  ["add_policy_effect", [policyKey, "RECOVERY_VALIDATED_V1", 10, "", 0n, "", 2]],
  ["seal_policy", [policyKey]],
];
const previousPolicy = m.policy ?? {};
m.policy = { ...previousPolicy, key: policyKey, version: 1, manifestHash: first.hash, compileTwiceIdentical: true, countsExpected: [3, 2, 4], calls: calls.map(([functionName, args]) => ({ functionName, args: safe(args) })), steps: previousPolicy.steps ?? [] };
async function save() { await fs.writeFile(FILE, JSON.stringify(m, null, 2) + "\n"); }
async function write(index, functionName, args) {
  const old = m.policy.steps[index]; if (old?.executionResult === "FINISHED_WITH_RETURN") return old;
  if (m.policy.pending && m.policy.pending.index !== index) throw new Error("pending policy index mismatch");
  if (m.policy.pending?.index === index && m.policy.pending.txHash) {
    const pending = m.policy.pending;
    const receipt = await client.waitForTransactionReceipt({ hash: pending.txHash, waitUntil: "finalized", interval: 4000, retries: 150 });
    const execution = receipt.txExecutionResultName ?? receipt.executionResultName ?? receipt.execution_result;
    if (!isSuccessful(receipt) || execution !== "FINISHED_WITH_RETURN") throw new Error(`${functionName} recovery failed: ${JSON.stringify(safe(receipt))}`);
    m.policy.steps[index] = { index, functionName, args: safe(args), txHash: pending.txHash, estimate: pending.estimate, receipt: safe(receipt), executionResult: execution, lifecycle: "VERIFIED", recovered: true }; delete m.policy.pending; await save(); console.log(`${functionName} recovered: ${pending.txHash}`); return m.policy.steps[index];
  }
  if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("wrong chain before signing");
  const estimate = await client.estimateTransactionFeesForWrite({ account, address: kernel, functionName, args });
  const hash = await client.writeContract({ account, address: kernel, functionName, args, fees: { distribution: estimate.distribution, ...(estimate.messageAllocations?.length ? { messageAllocations: estimate.messageAllocations } : {}) } });
  m.policy.pending = { index, functionName, args: safe(args), txHash: hash, estimate: safe(estimate), lifecycle: "SUBMITTED" }; await save();
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 4000, retries: 150 });
  const execution = receipt.txExecutionResultName ?? receipt.executionResultName ?? receipt.execution_result;
  if (!isSuccessful(receipt) || execution !== "FINISHED_WITH_RETURN") throw new Error(`${functionName} failed: ${JSON.stringify(safe(receipt))}`);
  m.policy.steps[index] = { index, functionName, args: safe(args), txHash: hash, estimate: safe(estimate), receipt: safe(receipt), executionResult: execution, lifecycle: "VERIFIED" }; delete m.policy.pending; await save(); console.log(`${functionName}: ${hash}`);
}
for (let i = m.policy.steps.length; i < calls.length; i++) await write(i, calls[i][0], calls[i][1]);
const header = await client.readContract({ address: kernel, functionName: "get_policy_header", args: [policyKey] }), counts = await client.readContract({ address: kernel, functionName: "get_policy_counts", args: [policyKey] });
if (Number(counts[0]) !== 3 || Number(counts[1]) !== 2 || Number(counts[2]) !== 4 || header[2] !== true || header[3] !== false) throw new Error(`policy readback mismatch ${JSON.stringify({ header, counts })}`);
m.policy.finalReadback = { header: safe(header), counts: safe(counts) }; await save(); console.log(JSON.stringify({ run: RUN.toUpperCase(), policyKey, manifestHash: first.hash, header: safe(header), counts: safe(counts) }, null, 2));
