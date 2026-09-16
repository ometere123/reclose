#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";

const CHAIN_ID = 61997;
const RPC = "https://studio-dev.genlayer.com/api";
const RUN = (process.env.RECLOSE_RUN_ID ?? "a").toLowerCase();
if (!/^[ab]$/.test(RUN)) throw new Error("RECLOSE_RUN_ID must be a or b");
const TARGET_ID = `reclose-target-r1-final-${RUN}`;
const REGISTRY_HASH = "0x9710aabf127a3d98367b5b943eb2f1f4472ecc8042315de1275b1828d761e285";
const MODULE_VERSION = 2;
const MANIFEST = `deployment/61997/r1-run-${RUN}-manifest.json`;
const root = new URL("../", import.meta.url);
const file = p => new URL(p, root);
const read = p => fs.readFile(file(p), "utf8");
const safe = v => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const key = () => {
  const env = fsSync.readFileSync(file(".env.local"), "utf8");
  const match = env.match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m);
  if (!match || !/^0x[0-9a-f]{64}$/i.test(match[1].trim())) throw new Error(".env.local must contain STUDIO_NEXT_PRIVATE_KEY");
  return match[1].trim();
};
const fees = e => ({ distribution: e.distribution, ...(e.feeValue !== undefined ? { feeValue: e.feeValue } : {}), ...(e.messageAllocations?.length ? { messageAllocations: e.messageAllocations } : {}) });
const account = createAccount(key());
const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
const client = createClient({ chain, account });
const exists = async p => { try { await fs.access(file(p)); return true; } catch { return false; } };
let manifest = await exists(MANIFEST) ? JSON.parse(await read(MANIFEST)) : {
  schema: "reclose-r1-final-run-v2", run: RUN.toUpperCase(), network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC },
  targetId: TARGET_ID, judgeVersion: MODULE_VERSION, registryHash: REGISTRY_HASH, deployer: account.address,
  contracts: {}, wiring: {}, lifecycle: "NOT_SUBMITTED", createdAt: new Date().toISOString(),
};
async function save() { await fs.writeFile(file(MANIFEST), JSON.stringify(manifest, null, 2) + "\n"); }
async function assertChain() { const id = Number(await client.getChainId()); if (id !== CHAIN_ID) throw new Error(`Wrong chain ${id}; expected ${CHAIN_ID}`); }
async function wait(hash, label) {
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 4000, retries: 150 });
  if (!isSuccessful(receipt)) throw new Error(`${label} execution failed: ${JSON.stringify(safe(receipt))}`);
  return receipt;
}
async function deploy(name, sourceFile, args) {
  const prior = manifest.contracts[name];
  if (prior?.lifecycle === "VERIFIED" && prior.address) return prior.address;
  await assertChain();
  const code = await read(sourceFile);
  const record = prior ?? { sourceFile, lifecycle: "NOT_SUBMITTED" };
  record.sourceFile = sourceFile;
  record.sourceSha256 = `0x${crypto.createHash("sha256").update(code, "utf8").digest("hex")}`;
  if (record.lifecycle === "SUBMITTED" && record.deploymentTx) {
    const receipt = await wait(record.deploymentTx, `${name} recovery`);
    record.receipt = safe(receipt); record.address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address;
    if (!record.address) throw new Error(`${name} recovery has no contract address`);
    record.executionResult = "FINISHED_WITH_RETURN"; record.lifecycle = "FINALIZED";
  } else {
    const estimate = await client.estimateTransactionFees();
    const txHash = await client.deployContract({ account, code, args, fees: fees(estimate) });
    record.deploymentTx = txHash; record.estimate = safe(estimate); record.lifecycle = "SUBMITTED"; record.submittedAt = new Date().toISOString();
    manifest.contracts[name] = record; await save();
    const receipt = await wait(txHash, `${name} deployment`);
    record.receipt = safe(receipt); record.address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address;
    if (!record.address) throw new Error(`${name} deployment has no contract address`);
    record.executionResult = "FINISHED_WITH_RETURN"; record.lifecycle = "FINALIZED";
  }
  record.lifecycle = "VERIFIED"; manifest.contracts[name] = record; await save();
  console.log(`${name}: ${record.address} tx=${record.deploymentTx}`); return record.address;
}
async function write(name, address, functionName, args = [], value = 0n) {
  const prior = manifest.wiring[name];
  if (prior?.lifecycle === "VERIFIED") return prior;
  await assertChain();
  const estimate = await client.estimateTransactionFeesForWrite({ account, address, functionName, args, value });
  const txHash = await client.writeContract({ address, functionName, args, value, fees: fees(estimate) });
  manifest.wiring[name] = { address, functionName, args: safe(args), value: String(value), estimate: safe(estimate), txHash, lifecycle: "SUBMITTED" }; await save();
  const receipt = await wait(txHash, name);
  manifest.wiring[name] = { ...manifest.wiring[name], receipt: safe(receipt), executionResult: "FINISHED_WITH_RETURN", lifecycle: "VERIFIED" }; await save();
  console.log(`${name}: ${txHash}`); return manifest.wiring[name];
}

await assertChain();
const kernel = await deploy("AssuranceKernel", "contracts/assurance_kernel.py", [1, 60]);
const targetBefore = await client.readContract({ address: kernel, functionName: "get_target_details", args: [TARGET_ID] });
if (targetBefore?.[0] && !/^0x0{40}$/i.test(String(targetBefore[0]))) throw new Error(`Target namespace already exists: ${JSON.stringify(safe(targetBefore))}`);
const providerA = await deploy("ProviderStubA", "contracts/provider_stub_a.py", []);
const providerB = await deploy("ProviderStubB", "contracts/provider_stub_b.py", []);
const target = await deploy("ReferenceAgentProtocol", "contracts/reference_agent_protocol.py", [account.address, TARGET_ID, providerA, providerB, 1000000000000000000n, 100000000000000000n, true]);
const judge = await deploy("IncidentJudgeV1", "contracts/incident_judge_v1.py", [kernel, MODULE_VERSION, REGISTRY_HASH, await read("config/source-registry-r1-live.json")]);
const vault = await deploy("IncentiveVault", "contracts/incentive_vault.py", [kernel, judge, 1]);
manifest.contracts = { ...manifest.contracts, AssuranceKernel: { ...manifest.contracts.AssuranceKernel, address: kernel }, ProviderStubA: { ...manifest.contracts.ProviderStubA, address: providerA }, ProviderStubB: { ...manifest.contracts.ProviderStubB, address: providerB }, ReferenceAgentProtocol: { ...manifest.contracts.ReferenceAgentProtocol, address: target }, IncidentJudgeV1: { ...manifest.contracts.IncidentJudgeV1, address: judge }, IncentiveVault: { ...manifest.contracts.IncentiveVault, address: vault } }; await save();
await write("targetController", target, "set_assurance_controller", [kernel]);
await write("targetRegistration", kernel, "register_target", [TARGET_ID, target, true]);
await write("judgeVault", judge, "set_vault", [vault]);
const reads = {};
for (const [label, address, functionName, args] of [
  ["targetId", target, "get_assurance_target_id", []], ["targetOwner", target, "get_assurance_owner", []], ["targetController", target, "get_assurance_controller", []], ["targetState", target, "get_state", []], ["targetRevoked", target, "is_assurance_authority_revoked", []], ["judgeType", judge, "get_module_type", []], ["judgeKernel", judge, "get_kernel", []], ["judgeVault", judge, "get_vault", []], ["judgeVersion", judge, "get_module_version", []], ["judgeRegistry", judge, "get_source_registry_hash", []], ["vaultType", vault, "get_module_type", []], ["vaultKernel", vault, "get_kernel", []], ["vaultJudge", vault, "get_judge", []], ["kernelTarget", kernel, "get_target_details", [TARGET_ID]],
]) reads[label] = safe(await client.readContract({ address, functionName, args }));
const zero = "0x" + "0".repeat(40);
if (String(reads.targetId) !== TARGET_ID || String(reads.targetOwner).toLowerCase() !== account.address.toLowerCase() || String(reads.targetController).toLowerCase() !== kernel.toLowerCase() || Number(reads.targetState) !== 0 || reads.targetRevoked !== false || reads.judgeType !== "INCIDENT_JUDGE" || String(reads.judgeKernel).toLowerCase() !== kernel.toLowerCase() || String(reads.judgeVault).toLowerCase() !== vault.toLowerCase() || Number(reads.judgeVersion) !== MODULE_VERSION || String(reads.judgeRegistry).toLowerCase() !== REGISTRY_HASH.toLowerCase() || reads.vaultType !== "INCENTIVE_VAULT" || String(reads.vaultKernel).toLowerCase() !== kernel.toLowerCase() || String(reads.vaultJudge).toLowerCase() !== judge.toLowerCase() || String(reads.kernelTarget?.[0]).toLowerCase() !== target.toLowerCase() || String(reads.kernelTarget?.[0]).toLowerCase() === zero) throw new Error(`Fresh binding readback failed: ${JSON.stringify(reads)}`);
manifest.readbacks = reads; manifest.lifecycle = "VERIFIED"; manifest.completedAt = new Date().toISOString(); await save();
console.log(JSON.stringify({ manifest: MANIFEST, run: RUN.toUpperCase(), targetId: TARGET_ID, deployer: account.address, contracts: { AssuranceKernel: kernel, ProviderStubA: providerA, ProviderStubB: providerB, ReferenceAgentProtocol: target, IncidentJudgeV1: judge, IncentiveVault: vault }, registryHash: REGISTRY_HASH, judgeVersion: MODULE_VERSION }, null, 2));
