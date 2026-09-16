#!/usr/bin/env node
// Submit and capture the fresh confirmed remediation lifecycle on the fixed-Kernel generation.
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { createAccount, createClient, chains, isSuccessful, MESSAGE_ALLOCATION_ROOT_PARENT_INDEX } from "genlayer-js";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";
import { computeActionId } from "../packages/protocol-sdk/dist/client.js";
import { buildJudgeKernelTargetAllocationTree } from "../packages/protocol-sdk/dist/feeAllocation.js";
import { fetchAuthoritativeSnapshot, normalizedFixtureMatches } from "./content-addressed-snapshot.mjs";

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
const REMEDIATION_URL = "https://raw.githubusercontent.com/ometere123/reclose/ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6/release-evidence/r1/e1/fixtures/provider-a-remediation.md";
const EXPECTED_REMEDIATION_BYTES = 734;
const EXPECTED_REMEDIATION_HASH = "0x2ad13ff8a80da7b24495ea9a3708ddc2ce62a9afb2f63b77d62ecb6e621af9b1";

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
  const remote = await fetchAuthoritativeSnapshot(REMEDIATION_URL);
  if (remote.bytes.length !== EXPECTED_REMEDIATION_BYTES) throw new Error(`Unexpected remediation snapshot length ${remote.bytes.length}`);
  if (remote.hash.toLowerCase() !== EXPECTED_REMEDIATION_HASH) throw new Error(`Unexpected remediation snapshot hash ${remote.hash}`);
  const local = await fs.readFile("release-evidence/r1/e1/fixtures/provider-a-remediation.md", "utf8");
  if (!normalizedFixtureMatches(local, remote.text)) console.warn("Local remediation fixture differs after newline normalization; remote bytes remain authoritative.");
  const reporterNonce = Number(await client.readContract({ address: JUDGE, functionName: "get_reporter_nonce", args: [REPORTER] }));
  if (!Number.isSafeInteger(reporterNonce) || reporterNonce < 0) throw new Error(`Invalid live Reporter nonce ${reporterNonce}`);
  const incidentId = `${TARGET_ID}:${REPORTER}:${reporterNonce}`;
  const observedAt = new Date().toISOString();
  const eap = JSON.parse(buildEap({
    targetId: TARGET_ID, policyHash: POLICY_HASH, ruleId: "REMEDIATION_CONFIRMED_V1",
    subject: `Confirmed remediation for ${PARENT_INCIDENT_ID}`,
    reporter: REPORTER, observedAt, retrievedAt: observedAt,
    sources: [{ sourceId: "reclose-reference-evidence", url: REMEDIATION_URL, sourceClass: "CONTENT_ADDRESSED_SNAPSHOT", extractedText: remote.text, snapshotRef: REMEDIATION_URL, retrievedAt: observedAt }],
  }));
  if (eap.sources[0].contentHash.toLowerCase() !== EXPECTED_REMEDIATION_HASH || eap.contentHashes[0].toLowerCase() !== EXPECTED_REMEDIATION_HASH || eap.sources[0].contentHash.toLowerCase() !== remote.hash.toLowerCase()) throw new Error("Built EAP is not bound to the authoritative remediation bytes");
  const submitArgs = [PARENT_INCIDENT_ID, POLICY_KEY, eap.artifactHash, JSON.stringify(eap), reporterNonce, ""];
  const restoreActionId = computeActionId(incidentId, POLICY_KEY, 10, "", "5", "");
  let tree;
  let explicitTreeError = null;
  try { tree = await buildJudgeKernelTargetAllocationTree(client, {
    judge: { address: JUDGE, functionName: "submit_remediation", args: submitArgs, account },
    kernel: { address: KERNEL, functionName: "receive_final_decision", account: { address: JUDGE, type: "json-rpc" }, args: [incidentId, PARENT_INCIDENT_ID, TARGET_ID, POLICY_KEY, 1, POLICY_HASH, "REMEDIATION_CONFIRMED_V1", "", REPORTER, eap.artifactHash, 1, "REMEDIATION_VERIFIED", 1] },
    target: { address: TARGET, functionName: "apply_assurance_action", account: { address: KERNEL, type: "json-rpc" }, args: [restoreActionId, incidentId, POLICY_KEY, 10, "", 5n, "", 2] },
  }, { rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX }); }
  catch (error) {
    explicitTreeError = String(error?.message ?? error);
    console.error(`Explicit remediation tree rejected by Studio; retrying SDK-generated allocation: ${explicitTreeError}`);
    tree = { messageAllocations: [], fallback: "SDK_GENERATED_ROOT_ALLOCATION" };
  }
  const estimate = await client.estimateTransactionFeesForWrite({ account, address: JUDGE, functionName: "submit_remediation", args: submitArgs, value: 0n, ...(tree.messageAllocations.length ? { messageAllocations: tree.messageAllocations } : {}) });
  if (!estimate || !estimate.distribution) throw new Error("Remediation fee preflight did not return a usable estimate");
  await fs.mkdir("release-evidence/r1/e1/fresh-fixed-cycle", { recursive: true });
  await fs.writeFile("release-evidence/r1/e1/fresh-fixed-cycle/remediation-preflight.json", JSON.stringify({
    schema: "reclose-fixed-remediation-preflight-v1",
    network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC },
    snapshot: { url: remote.url, httpStatus: remote.httpStatus, bytes: remote.bytes.length, hash: remote.hash },
    reporter: { address: REPORTER, liveNonce: reporterNonce },
    incidentId,
    eap: { artifactHash: eap.artifactHash, contentHash: eap.sources[0].contentHash, contentHashes: eap.contentHashes },
    feeEstimate: safe(estimate),
    allocationTree: safe(tree),
    explicitTreeError,
  }, null, 2) + "\n");
  console.error("Read-only remediation preflight passed; submitting exactly one transaction.");
  const hash = await client.writeContract({ address: JUDGE, functionName: "submit_remediation", args: submitArgs, value: 0n, fees: feeOptions(estimate) });
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 100 });
  const conditionCode = await client.readContract({ address: JUDGE, functionName: "get_incident_condition_code", args: [incidentId] });
  const outcome = await client.readContract({ address: JUDGE, functionName: "get_incident_outcome", args: [incidentId] });
  const output = { schema: "reclose-fixed-remediation-v2", network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC }, deployment: { judge: JUDGE, kernel: KERNEL, target: TARGET, targetId: TARGET_ID, policyKey: POLICY_KEY, policyHash: POLICY_HASH }, snapshot: { url: remote.url, httpStatus: remote.httpStatus, bytes: remote.bytes.length, hash: remote.hash }, parentIncidentId: PARENT_INCIDENT_ID, reporterNonce, incidentId, judgeResult: { conditionCode, outcome }, action: { actionId: restoreActionId, actionType: 10, paramU256: "5", expectedState: "RECOVERY" }, submitArgs, txHash: hash, receipt: safe(receipt), feeEstimate: safe(estimate), allocationTree: safe(tree), explicitTreeError };
  await fs.mkdir("release-evidence/r1/e1/fresh-fixed-cycle", { recursive: true });
  await fs.writeFile("release-evidence/r1/e1/fresh-fixed-cycle/remediation.json", JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ hash, status: receipt.statusName, execution: receipt.txExecutionResultName, success: isSuccessful(receipt), conditionCode, outcome, restoreActionId }));
  if (!isSuccessful(receipt)) process.exit(1);
  if (String(conditionCode) !== "REMEDIATION_VERIFIED" || Number(outcome) !== 1) {
    console.error("Correctly-bound remediation did not confirm; stopping without another write.");
    process.exit(2);
  }
}
main().catch((error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
