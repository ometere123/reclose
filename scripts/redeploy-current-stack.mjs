#!/usr/bin/env node
// Deploy the six current Reclose contracts with the documented 60-second policy delay,
// wire them, construct the canonical R1 policy, and activate it. The signer is read only
// from STUDIO_NEXT_PRIVATE_KEY in .env.local; the key is never printed or persisted.

import fs from "node:fs/promises";
import fsSync from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, chains, isSuccessful } from "genlayer-js";
import { hashCanonicalApm } from "../packages/policy-compiler/dist/index.js";

const CHAIN_ID = 61997;
const RPC = "https://studio-next.genlayer.com/api";
const root = new URL("../", import.meta.url);
const read = (p) => fs.readFile(new URL(p, root), "utf8");

function envKey() {
  const text = fsSync.readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8");
  const match = text.match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m);
  if (!match || !/^0x[0-9a-fA-F]{64}$/.test(match[1].trim())) throw new Error(".env.local must contain STUDIO_NEXT_PRIVATE_KEY");
  return match[1].trim();
}
function safe(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => typeof v === "bigint" ? v.toString() : v));
}
function feesFromEstimate(estimate) {
  return { distribution: estimate.distribution, feeValue: estimate.feeValue, ...(estimate.messageAllocations ? { messageAllocations: estimate.messageAllocations } : {}) };
}
function sourceCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: fileURLToPath(root), encoding: "utf8" }).trim();
}
async function main() {
  const account = createAccount(envKey());
  const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
  const client = createClient({ chain, account });
  if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("RPC is not Studio Next chain 61997");
  const deployer = account.address;
  const deployment = { schema: "reclose-source-matched-stack-v1", network: "studio-dev", chainId: CHAIN_ID, rpc: RPC, sourceCommit: sourceCommit(), deployer, contracts: {}, wiring: {}, policy: {} };

  async function wait(hash, label) {
    const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 80 });
    if (!isSuccessful(receipt)) throw new Error(`${label} finalized with execution failure: ${JSON.stringify(safe(receipt))}`);
    return receipt;
  }
  async function estimateWrite(address, functionName, args = [], value = 0n) {
    return client.estimateTransactionFeesForWrite({ account, address, functionName, args, value });
  }
  async function write(address, functionName, args = [], value = 0n) {
    const estimate = await estimateWrite(address, functionName, args, value);
    const hash = await client.writeContract({ address, functionName, args, value, fees: feesFromEstimate(estimate) });
    const receipt = await wait(hash, functionName);
    console.log(`${functionName}: ${hash}`);
    return { hash, receipt, estimate };
  }
  async function deploy(name, file, args = []) {
    const code = await read(file);
    const estimate = await client.estimateTransactionFees();
    const hash = await client.deployContract({ account, code, args, fees: feesFromEstimate(estimate) });
    const receipt = await wait(hash, `${name} deployment`);
    const address = receipt.contractAddress ?? receipt.contract_address ?? receipt.data?.contract_address;
    if (!address) throw new Error(`${name} deployment returned no contract address`);
    deployment.contracts[name] = { address, deploymentTx: hash, sourceCommit: deployment.sourceCommit, executionResult: "SUCCESS" };
    console.log(`${name}: ${address} (${hash})`);
    return address;
  }

  const providerA = await deploy("ProviderStubA", "contracts/provider_stub_a.py");
  const providerB = await deploy("ProviderStubB", "contracts/provider_stub_b.py");
  const targetId = "reclose-target-source-matched";
  const target = await deploy("ReferenceAgentProtocol", "contracts/reference_agent_protocol.py", [
    deployer,
    targetId,
    providerA,
    providerB,
    1000000000000000000n,
    100000000000000000n,
    true,
  ]);
  const kernel = await deploy("AssuranceKernel", "contracts/assurance_kernel.py", [1, 60]);
  const sourceRegistryHash = "0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386";
  const sourceRegistryJson = await read("config/source-registry-r1.json");
  const judge = await deploy("IncidentJudgeV1", "contracts/incident_judge_v1.py", [kernel, 1, sourceRegistryHash, sourceRegistryJson]);
  const vault = await deploy("IncentiveVault", "contracts/incentive_vault.py", [kernel, judge, 1]);
  deployment.contracts.ProviderStubA.address = providerA;
  deployment.contracts.ProviderStubB.address = providerB;
  deployment.contracts.ReferenceAgentProtocol.address = target;
  deployment.contracts.AssuranceKernel.address = kernel;
  deployment.contracts.IncidentJudgeV1.address = judge;
  deployment.contracts.IncentiveVault.address = vault;

  deployment.wiring.targetController = await write(target, "set_assurance_controller", [kernel]);
  deployment.wiring.targetRegistration = await write(kernel, "register_target", ["reclose-target-source-matched", target, true]);
  deployment.wiring.judgeVault = await write(judge, "set_vault", [vault]);

  const policyKey = "policy-source-matched-current";
  const apm = JSON.parse(await read("deployment/61997/apm-r1-fresh-run-a.json"));
  apm.policyId = policyKey;
  apm.target.targetId = targetId;
  apm.judgeModules = apm.judgeModules.map((module) => ({ ...module, address: judge }));
  apm.metadata = { ...apm.metadata, generation: "r1-source-matched-current", sourceCommit: deployment.sourceCommit };
  const policyHash = hashCanonicalApm(apm);
  const steps = [
    ["begin_policy", [targetId, policyKey, policyHash]],
    ["add_policy_resource", [policyKey, "provider_a"]],
    ["add_policy_resource", [policyKey, "provider_b"]],
    ["add_policy_rule", [policyKey, "PROVIDER_COMPROMISE_V1", judge, 1, 1, true, 0n, 0n]],
    ["add_policy_rule", [policyKey, "REMEDIATION_CONFIRMED_V1", judge, 1, 2, false, 0n, 0n]],
    ["add_policy_rule", [policyKey, "RECOVERY_VALIDATED_V1", judge, 1, 3, false, 0n, 0n]],
    ["add_policy_effect", [policyKey, "PROVIDER_COMPROMISE_V1", 3, "provider_a", 0n, "", 1]],
    ["add_policy_effect", [policyKey, "PROVIDER_COMPROMISE_V1", 7, "", 0n, "", 1]],
    ["add_policy_effect", [policyKey, "REMEDIATION_CONFIRMED_V1", 9, "", 0n, "", 1]],
    ["add_policy_effect", [policyKey, "RECOVERY_VALIDATED_V1", 10, "", 0n, "", 2]],
    ["seal_policy", [policyKey]],
  ];
  deployment.policy = { key: policyKey, targetId, manifestHash: policyHash, version: 1, steps: [] };
  for (const [functionName, args] of steps) {
    const result = await write(kernel, functionName, args);
    deployment.policy.steps.push({ functionName, args, txHash: result.hash, feeValue: safe(result.estimate.feeValue), distribution: safe(result.estimate.distribution) });
  }
  console.log("Waiting 70 seconds for the configured 60-second authority-expansion timelock...");
  await new Promise((resolve) => setTimeout(resolve, 70000));
  const activation = await write(kernel, "activate_policy", [policyKey]);
  deployment.policy.activation = { txHash: activation.hash, feeValue: safe(activation.estimate.feeValue), distribution: safe(activation.estimate.distribution) };
  const out = new URL("../deployment/61997/r1-source-matched-current-manifest.json", import.meta.url);
  await fs.writeFile(out, JSON.stringify(deployment, null, 2) + "\n");
  console.log(`Wrote ${out.pathname}`);
}
main().catch((error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
