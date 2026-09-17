#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";

const CHAIN_ID = 61997;
const RPC = "https://studio-dev.genlayer.com/api";
const TARGET_ID = process.env.RECLOSE_TARGET_ID ?? "reclose-target-r1-e1a-final";
const MANIFEST = process.env.RECLOSE_MANIFEST ?? "deployment/61997/r1-final-generation-manifest.json";
const MODULE_VERSION = Number(process.env.RECLOSE_JUDGE_VERSION ?? 2);
const REGISTRY_FILE = process.env.RECLOSE_REGISTRY_FILE ?? "config/source-registry-e1a.json";
const REGISTRY_HASH = process.env.RECLOSE_REGISTRY_HASH ?? "0x30148f85dc4c0dab65b7d1db38c863160d98f1f4f4f72f3d67dc5e287918f65a";
const root = new URL("../", import.meta.url);
const path = p => new URL(p, root);
const read = p => fs.readFile(path(p), "utf8");
const safe = v => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const key = () => {
  const env = fsSync.readFileSync(fileURLToPath(path(".env.local")), "utf8");
  const match = env.match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m);
  if (!match || !/^0x[0-9a-f]{64}$/i.test(match[1].trim())) throw new Error(".env.local must contain STUDIO_NEXT_PRIVATE_KEY");
  return match[1].trim();
};
const fees = e => ({ distribution: e.distribution, ...(e.feeValue !== undefined ? { feeValue: e.feeValue } : {}), ...(e.messageAllocations?.length ? { messageAllocations: e.messageAllocations } : {}) });
const exists = async p => { try { await fs.access(path(p)); return true; } catch { return false; } };

const account = createAccount(key());
const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
const client = createClient({ chain, account });
if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error(`Wrong chain: expected ${CHAIN_ID}`);

let manifest = await exists(MANIFEST) ? JSON.parse(await read(MANIFEST)) : {
  schema: "reclose-r1-final-generation-v1", network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC },
  targetId: TARGET_ID, deployer: account.address, contracts: {}, wiring: {}, policy: {}, registryHash: REGISTRY_HASH, createdAt: new Date().toISOString()
};
async function save() { await fs.writeFile(path(MANIFEST), JSON.stringify(manifest, null, 2) + "\n"); }
async function wait(hash, label) {
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 4000, retries: 150 });
  if (!isSuccessful(receipt)) throw new Error(`${label} finalized with execution failure: ${JSON.stringify(safe(receipt))}`);
  return receipt;
}
async function deploy(name, sourceFile, args) {
  const prior = manifest.contracts[name];
  if (prior?.lifecycle === "VERIFIED" && prior.address) return prior.address;
  let record = prior ?? { sourceFile, lifecycle: "NOT_SUBMITTED" };
  if (record.lifecycle === "SUBMITTED" && record.deploymentTx) {
    const receipt = await wait(record.deploymentTx, `${name} recovery`);
    const address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address;
    if (!address) throw new Error(`${name} recovered without contract address`);
    record = { ...record, address, receipt: safe(receipt), executionResult: "SUCCESS", lifecycle: "FINALIZED" };
  } else {
    const code = await read(sourceFile);
    record.sourceSha256 = `0x${crypto.createHash("sha256").update(code, "utf8").digest("hex")}`;
    const estimate = await client.estimateTransactionFees();
    const txHash = await client.deployContract({ account, code, args, fees: fees(estimate) });
    record = { ...record, sourceFile, deploymentTx: txHash, lifecycle: "SUBMITTED", submittedAt: new Date().toISOString(), estimate: safe(estimate) };
    manifest.contracts[name] = record;
    await save();
    const receipt = await wait(txHash, `${name} deployment`);
    const address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address;
    if (!address) throw new Error(`${name} deployment returned no contract address`);
    record = { ...record, address, receipt: safe(receipt), executionResult: "SUCCESS", lifecycle: "FINALIZED" };
  }
  manifest.contracts[name] = record; await save(); console.log(`${name}: ${record.address} (${record.deploymentTx})`); return record.address;
}
async function write(name, address, functionName, args = [], value = 0n) {
  const prior = manifest.wiring[name];
  if (prior?.lifecycle === "VERIFIED") return prior;
  if (prior?.lifecycle === "SUBMITTED" && prior.txHash) {
    const receipt = await wait(prior.txHash, name);
    const result = { ...prior, receipt: safe(receipt), lifecycle: "VERIFIED", executionResult: "SUCCESS" };
    manifest.wiring[name] = result; await save(); return result;
  }
  if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error(`Wrong chain before signing ${name}`);
  const estimate = await client.estimateTransactionFeesForWrite({ account, address, functionName, args, value });
  const txHash = await client.writeContract({ address, functionName, args, value, fees: fees(estimate) });
  manifest.wiring[name] = { address, functionName, args: safe(args), txHash, lifecycle: "SUBMITTED", estimate: safe(estimate) }; await save();
  const receipt = await wait(txHash, name);
  manifest.wiring[name] = { ...manifest.wiring[name], receipt: safe(receipt), lifecycle: "VERIFIED", executionResult: "SUCCESS" }; await save(); console.log(`${name}: ${txHash}`); return manifest.wiring[name];
}

const kernel = await deploy("AssuranceKernel", "contracts/assurance_kernel.py", [1, 60]);
const initialTarget = await client.readContract({ address: kernel, functionName: "get_target_details", args: [TARGET_ID] });
if (initialTarget?.[0] && !/^0x0{40}$/i.test(String(initialTarget[0]))) throw new Error(`Target namespace already exists in fresh Kernel: ${JSON.stringify(safe(initialTarget))}`);
const providerA = await deploy("ProviderStubA", "contracts/provider_stub_a.py", []);
const providerB = await deploy("ProviderStubB", "contracts/provider_stub_b.py", []);
const target = await deploy("ReferenceAgentProtocol", "contracts/reference_agent_protocol.py", [account.address, TARGET_ID, providerA, providerB, 1000000000000000000n, 100000000000000000n, true]);
const registryJson = await read(REGISTRY_FILE);
const judge = await deploy("IncidentJudgeV1", "contracts/incident_judge_v1.py", [kernel, MODULE_VERSION, REGISTRY_HASH, registryJson]);
const vault = await deploy("IncentiveVault", "contracts/incentive_vault.py", [kernel, judge, MODULE_VERSION]);
manifest.contracts.ProviderStubA = { ...manifest.contracts.ProviderStubA, address: providerA };
manifest.contracts.ProviderStubB = { ...manifest.contracts.ProviderStubB, address: providerB };
manifest.contracts.ReferenceAgentProtocol = { ...manifest.contracts.ReferenceAgentProtocol, address: target };
manifest.contracts.AssuranceKernel = { ...manifest.contracts.AssuranceKernel, address: kernel };
manifest.contracts.IncidentJudgeV1 = { ...manifest.contracts.IncidentJudgeV1, address: judge };
manifest.contracts.IncentiveVault = { ...manifest.contracts.IncentiveVault, address: vault };
await save();
await write("targetController", target, "set_assurance_controller", [kernel]);
await write("targetRegistration", kernel, "register_target", [TARGET_ID, target, true]);
await write("judgeVault", judge, "set_vault", [vault]);
const reads = {};
for (const [label, address, functionName, args] of [
  ["targetId", target, "get_assurance_target_id", []], ["targetOwner", target, "get_assurance_owner", []], ["targetController", target, "get_assurance_controller", []], ["targetState", target, "get_state", []], ["targetRevoked", target, "is_assurance_authority_revoked", []], ["judgeKernel", judge, "get_kernel", []], ["judgeVault", judge, "get_vault", []], ["judgeVersion", judge, "get_module_version", []], ["judgeRegistry", judge, "get_source_registry_hash", []], ["vaultKernel", vault, "get_kernel", []], ["vaultJudge", vault, "get_judge", []], ["kernelTarget", kernel, "get_target_details", [TARGET_ID]]
]) reads[label] = safe(await client.readContract({ address, functionName, args }));
if (String(reads.targetId) !== TARGET_ID || String(reads.targetOwner).toLowerCase() !== account.address.toLowerCase() || String(reads.targetController).toLowerCase() !== kernel.toLowerCase() || Number(reads.targetState) !== 0 || reads.targetRevoked !== false || String(reads.judgeKernel).toLowerCase() !== kernel.toLowerCase() || String(reads.judgeVault).toLowerCase() !== vault.toLowerCase() || Number(reads.judgeVersion) !== MODULE_VERSION || String(reads.judgeRegistry).toLowerCase() !== REGISTRY_HASH.toLowerCase() || String(reads.vaultKernel).toLowerCase() !== kernel.toLowerCase() || String(reads.vaultJudge).toLowerCase() !== judge.toLowerCase()) throw new Error(`Binding readback failed: ${JSON.stringify(reads)}`);
manifest.readbacks = reads; manifest.registry = { path: REGISTRY_FILE, hash: REGISTRY_HASH }; manifest.registryHash = REGISTRY_HASH; manifest.judgeVersion = MODULE_VERSION; manifest.lifecycle = "VERIFIED"; await save();
console.log(JSON.stringify({ manifest: MANIFEST, contracts: { AssuranceKernel: kernel, ProviderStubA: providerA, ProviderStubB: providerB, ReferenceAgentProtocol: target, IncidentJudgeV1: judge, IncentiveVault: vault }, readbacks: reads }, null, 2));
