#!/usr/bin/env node
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { execFileSync } from "node:child_process";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";

const CHAIN_ID = 61997;
const RPC = "https://studio-next.genlayer.com/api";
const KERNEL = "0xD06Ec39feF25f54D857A440F197eA4Fc2A3240d5";
const TARGET_ID = "reclose-target-r1-e1a-final";
const POLICY_KEY = "policy-r1-e1a";
const REGISTRY_HASH = "0x30148f85dc4c0dab65b7d1db38c863160d98f1f4f4f72f3d67dc5e287918f65a";
const root = new URL("../", import.meta.url);
const text = (name) => fs.readFile(new URL(name, root), "utf8");
const safe = (v) => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
function key() { const v = fsSync.readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim(); if (!/^0x[0-9a-f]{64}$/i.test(v ?? "")) throw new Error("Invalid STUDIO_NEXT_PRIVATE_KEY"); return v; }
function fees(e) { return { distribution: e.distribution, ...(e.messageAllocations?.length ? { messageAllocations: e.messageAllocations } : {}) }; }

const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
const account = createAccount(key());
const client = createClient({ chain, account });
async function wait(hash, label) { const r = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 100 }); if (!isSuccessful(r)) throw new Error(`${label} failed: ${JSON.stringify(safe(r))}`); return r; }
async function write(address, functionName, args = [], value = 0n) { const e = await client.estimateTransactionFeesForWrite({ account, address, functionName, args, value }); const hash = await client.writeContract({ address, functionName, args, value, fees: fees(e) }); const receipt = await wait(hash, functionName); console.log(`${functionName}: ${hash}`); return { hash, receipt, estimate: e }; }
async function deploy(name, codeFile, args = []) { const code = await text(codeFile); const e = await client.estimateTransactionFees(); const hash = await client.deployContract({ account, code, args, fees: fees(e) }); const receipt = await wait(hash, `${name} deployment`); const address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address; if (!address) throw new Error(`${name} deployment returned no address`); console.log(`${name}: ${address}`); return { address, hash, receipt, estimate: e }; }

if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("Wrong chain");
console.error("E1-A deployment: preflight passed");
const oldTarget = await client.readContract({ address: KERNEL, functionName: "get_target_details", args: [TARGET_ID] });
if (oldTarget?.[0] && String(oldTarget[0]) !== "0x0000000000000000000000000000000000000000") throw new Error(`Target ID already exists: ${JSON.stringify(safe(oldTarget))}`);
console.error("E1-A deployment: namespace available");
const providerA = await deploy("ProviderStubA", "contracts/provider_stub_a.py");
const providerB = await deploy("ProviderStubB", "contracts/provider_stub_b.py");
const target = await deploy("ReferenceAgentProtocol", "contracts/reference_agent_protocol.py", [account.address, TARGET_ID, providerA.address, providerB.address, 1000000000000000000n, 100000000000000000n, true]);
const judge = await deploy("IncidentJudgeV1", "contracts/incident_judge_v1.py", [KERNEL, 1, REGISTRY_HASH, await text("config/source-registry-e1a.json")]);
const vault = await deploy("IncentiveVault", "contracts/incentive_vault.py", [KERNEL, judge.address, 1]);
const wiring = {
  targetController: await write(target.address, "set_assurance_controller", [KERNEL]),
  targetRegistration: await write(KERNEL, "register_target", [TARGET_ID, target.address, true]),
  judgeVault: await write(judge.address, "set_vault", [vault.address]),
};
const targetDetails = await client.readContract({ address: KERNEL, functionName: "get_target_details", args: [TARGET_ID] });
const targetOwner = await client.readContract({ address: target.address, functionName: "get_assurance_owner", args: [] });
const targetController = await client.readContract({ address: target.address, functionName: "get_assurance_controller", args: [] });
const targetState = await client.readContract({ address: target.address, functionName: "get_state", args: [] });
const judgeKernel = await client.readContract({ address: judge.address, functionName: "get_kernel", args: [] });
const judgeVault = await client.readContract({ address: judge.address, functionName: "get_vault", args: [] });
const judgeVersion = await client.readContract({ address: judge.address, functionName: "get_module_version", args: [] });
const liveRegistry = await client.readContract({ address: judge.address, functionName: "get_source_registry_hash", args: [] });
const vaultKernel = await client.readContract({ address: vault.address, functionName: "get_kernel", args: [] });
const vaultJudge = await client.readContract({ address: vault.address, functionName: "get_judge", args: [] });
if (String(targetOwner).toLowerCase() !== account.address.toLowerCase() || String(targetController).toLowerCase() !== KERNEL.toLowerCase() || Number(targetState) !== 0 || String(judgeKernel).toLowerCase() !== KERNEL.toLowerCase() || String(judgeVault).toLowerCase() !== vault.address.toLowerCase() || String(liveRegistry).toLowerCase() !== REGISTRY_HASH || String(vaultKernel).toLowerCase() !== KERNEL.toLowerCase() || String(vaultJudge).toLowerCase() !== judge.address.toLowerCase()) throw new Error("Fresh deployment binding readback failed");
const manifest = { schema: "reclose-e1a-generation-v1", network: { name: "studio-next", chainId: CHAIN_ID, rpc: RPC }, sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), deployer: account.address, kernelReused: KERNEL, targetId: TARGET_ID, contracts: { ProviderStubA: providerA, ProviderStubB: providerB, ReferenceAgentProtocol: target, IncidentJudgeV1: judge, IncentiveVault: vault }, registry: { path: "config/source-registry-e1a.json", hash: REGISTRY_HASH }, wiring, readbacks: safe({ targetDetails, targetOwner, targetController, targetState, judgeKernel, judgeVault, judgeVersion, liveRegistry, vaultKernel, vaultJudge }) };
await fs.writeFile(new URL("../deployment/61997/r1-e1a-generation-manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ targetId: TARGET_ID, policyKey: POLICY_KEY, deployer: account.address, contracts: Object.fromEntries(Object.entries(manifest.contracts).map(([k, v]) => [k, v.address])) }, null, 2));
