#!/usr/bin/env node
// Submit and capture the fresh confirmed remediation lifecycle on the fixed-Kernel generation.
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { createAccount, createClient, chains, isSuccessful, MESSAGE_ALLOCATION_ROOT_PARENT_INDEX } from "genlayer-js";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";
import { computeActionId } from "../packages/protocol-sdk/dist/client.js";
import { buildJudgeKernelTargetAllocationTree } from "../packages/protocol-sdk/dist/feeAllocation.js";

const RPC = "https://studio-next.genlayer.com/api";
const CHAIN_ID = 61997;
const JUDGE = "0x6b8cc80DF56B2EF1577373e4e52e883272985038";
const KERNEL = "0xD06Ec39feF25f54D857A440F197eA4Fc2A3240d5";
const TARGET = "0x45894452144724EfA694403501c2aD13E8854391";
const TARGET_ID = "reclose-target-source-matched";
const POLICY_KEY = "policy-source-matched-current";
const POLICY_HASH = "0x4ed461585a207d2a28c21d224b531e96665b641836d5df1c825b7fc2cc830833";
const REPORTER = "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd";
const PARENT_INCIDENT_ID = `${TARGET_ID}:${REPORTER}:0`;
const REPORTER_NONCE = 3;
const INCIDENT_ID = `${TARGET_ID}:${REPORTER}:${REPORTER_NONCE}`;

function key() {
  const value = fsSync.readFileSync(".env.local", "utf8").match(/^STUDIO_NEXT_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(value ?? "")) throw new Error(".env.local signer is missing or invalid");
  return value;
}
function safe(value) { return JSON.parse(JSON.stringify(value, (_k, v) => typeof v === "bigint" ? v.toString() : v)); }
function feeOptions(e) {
  return { distribution: e.distribution, ...(e.messageAllocations?.length ? { messageAllocations: e.messageAllocations } : {}) };
}
async function main() {
  const account = createAccount(key());
  const client = createClient({ chain: { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } }, account });
  const fixture = await fs.readFile("release-evidence/r1/e1/fixtures/provider-a-remediation.md", "utf8");
  const observedAt = new Date().toISOString();
  const eap = JSON.parse(buildEap({
    targetId: TARGET_ID, policyHash: POLICY_HASH, ruleId: "REMEDIATION_CONFIRMED_V1",
    subject: `Confirmed remediation for ${PARENT_INCIDENT_ID}`,
    reporter: REPORTER, observedAt, retrievedAt: observedAt,
    sources: [{ sourceId: "reclose-reference-evidence", url: "https://raw.githubusercontent.com/ometere123/reclose/ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6/release-evidence/r1/e1/fixtures/provider-a-remediation.md", sourceClass: "CONTENT_ADDRESSED_SNAPSHOT", extractedText: fixture, snapshotRef: "https://raw.githubusercontent.com/ometere123/reclose/ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6/release-evidence/r1/e1/fixtures/provider-a-remediation.md", retrievedAt: observedAt }],
  }));
  const submitArgs = [PARENT_INCIDENT_ID, POLICY_KEY, eap.artifactHash, JSON.stringify(eap), REPORTER_NONCE, ""];
  const restoreActionId = computeActionId(INCIDENT_ID, POLICY_KEY, 10, "", "5", "");
  let tree;
  let explicitTreeError = null;
  try { tree = await buildJudgeKernelTargetAllocationTree(client, {
    judge: { address: JUDGE, functionName: "submit_remediation", args: submitArgs, account },
    kernel: { address: KERNEL, functionName: "receive_final_decision", account: { address: JUDGE, type: "json-rpc" }, args: [INCIDENT_ID, PARENT_INCIDENT_ID, TARGET_ID, POLICY_KEY, 1, POLICY_HASH, "REMEDIATION_CONFIRMED_V1", "", REPORTER, eap.artifactHash, 1, "REMEDIATION_VERIFIED", 1] },
    target: { address: TARGET, functionName: "apply_assurance_action", account: { address: KERNEL, type: "json-rpc" }, args: [restoreActionId, INCIDENT_ID, POLICY_KEY, 10, "", 5n, "", 2] },
  }, { rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX }); }
  catch (error) {
    explicitTreeError = String(error?.message ?? error);
    console.error(`Explicit remediation tree rejected by Studio; retrying SDK-generated allocation: ${explicitTreeError}`);
    tree = { messageAllocations: [], fallback: "SDK_GENERATED_ROOT_ALLOCATION" };
  }
  const estimate = await client.estimateTransactionFeesForWrite({ account, address: JUDGE, functionName: "submit_remediation", args: submitArgs, value: 0n, ...(tree.messageAllocations.length ? { messageAllocations: tree.messageAllocations } : {}) });
  const hash = await client.writeContract({ address: JUDGE, functionName: "submit_remediation", args: submitArgs, value: 0n, fees: feeOptions(estimate) });
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 100 });
  const output = { schema: "reclose-fixed-remediation-v1", network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC }, deployment: { judge: JUDGE, kernel: KERNEL, target: TARGET, targetId: TARGET_ID, policyKey: POLICY_KEY, policyHash: POLICY_HASH }, parentIncidentId: PARENT_INCIDENT_ID, incidentId: INCIDENT_ID, action: { actionId: restoreActionId, actionType: 10, paramU256: "5", expectedState: "RECOVERY" }, submitArgs, txHash: hash, receipt: safe(receipt), feeEstimate: safe(estimate), allocationTree: safe(tree), explicitTreeError };
  await fs.mkdir("release-evidence/r1/e1/fresh-fixed-cycle", { recursive: true });
  await fs.writeFile("release-evidence/r1/e1/fresh-fixed-cycle/remediation.json", JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ hash, status: receipt.statusName, execution: receipt.txExecutionResultName, success: isSuccessful(receipt), restoreActionId }));
  if (!isSuccessful(receipt)) process.exit(1);
}
main().catch((error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
