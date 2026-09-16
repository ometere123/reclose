#!/usr/bin/env node
// Submit and capture the fresh confirmed remediation lifecycle on the fixed-Kernel generation.
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { createAccount, createClient, chains, isSuccessful, MESSAGE_ALLOCATION_ROOT_PARENT_INDEX } from "genlayer-js";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";
import { computeActionId } from "../packages/protocol-sdk/dist/client.js";
import { buildJudgeKernelTargetAllocationTree } from "../packages/protocol-sdk/dist/feeAllocation.js";
import { fetchAuthoritativeSnapshot, normalizedFixtureMatches } from "./content-addressed-snapshot.mjs";

const RPC = "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const manifest = JSON.parse(await fs.readFile(process.env.RECLOSE_MANIFEST ?? "deployment/61997/r1-final-generation-manifest.json", "utf8"));
const JUDGE = manifest.contracts.IncidentJudgeV1.address;
const KERNEL = manifest.contracts.AssuranceKernel.address;
const TARGET = manifest.contracts.ReferenceAgentProtocol.address;
const TARGET_ID = manifest.targetId;
const POLICY_KEY = manifest.policy.key;
const POLICY_HASH = manifest.policy.manifestHash;
const REPORTER = "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd";
const PARENT_INCIDENT_ID = `${TARGET_ID}:${REPORTER}:0`;
const FRESH_RUN = /^reclose-target-r1-final-[ab]$/.test(TARGET_ID);
const RUN = TARGET_ID.endsWith("-b") ? "b" : "a";
const REMEDIATION_URL = FRESH_RUN ? `https://raw.githubusercontent.com/ometere123/reclose/c15379270dc669947b4acfda85d2f70e4c92bcc7/release-evidence/r1/e1/live-evidence/run-${RUN}-remediation.md` : "https://raw.githubusercontent.com/ometere123/reclose/633cc5876815f904acb2006279ab68b01f09e263/release-evidence/r1/e1/e1a-final-fixtures/provider-a-remediation.md";
const EXPECTED_REMEDIATION_BYTES = FRESH_RUN ? 616 : 594;
const EXPECTED_REMEDIATION_HASH = FRESH_RUN ? (RUN === "a" ? "0x283ce7a496696afeec116d83d3a371e98a3a5bdd1fe7d76829267a15ba0d4a49" : "0x457b5609aa67a2016e9070f43e5d8ce450686f0eb4cf252d0f51074030b6e2c6") : "0xd857b55e34d5dc975f882092d0f34e513628cedf7610bbd7830be9474ed9e876";
const EVIDENCE_DIR = process.env.RECLOSE_EVIDENCE_DIR ?? "release-evidence/r1/e1/fresh-fixed-cycle";

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
  if (Number(await client.getChainId()) !== CHAIN_ID) throw new Error("wrong chain");
  const remote = await fetchAuthoritativeSnapshot(REMEDIATION_URL);
  if (remote.bytes.length !== EXPECTED_REMEDIATION_BYTES) throw new Error(`Unexpected remediation snapshot length ${remote.bytes.length}`);
  if (remote.hash.toLowerCase() !== EXPECTED_REMEDIATION_HASH) throw new Error(`Unexpected remediation snapshot hash ${remote.hash}`);
  const local = await fs.readFile(FRESH_RUN ? `release-evidence/r1/e1/live-evidence/run-${RUN}-remediation.md` : "release-evidence/r1/e1/e1a-final-fixtures/provider-a-remediation.md", "utf8");
  if (!normalizedFixtureMatches(local, remote.text)) console.warn("Local remediation fixture differs after newline normalization; remote bytes remain authoritative.");
  const reporterNonce = Number(await client.readContract({ address: JUDGE, functionName: "get_reporter_nonce", args: [REPORTER] }));
  if (!Number.isSafeInteger(reporterNonce) || reporterNonce < 0) throw new Error(`Invalid live Reporter nonce ${reporterNonce}`);
  const incidentId = `${TARGET_ID}:${REPORTER}:${reporterNonce}`;
  if (reporterNonce !== 1) throw new Error(`expected remediation nonce 1 after the verified compromise, got ${reporterNonce}`);
  const parentCondition = await client.readContract({ address: JUDGE, functionName: "get_incident_condition_code", args: [PARENT_INCIDENT_ID] });
  const parentOutcome = await client.readContract({ address: JUDGE, functionName: "get_incident_outcome", args: [PARENT_INCIDENT_ID] });
  if (String(parentCondition) !== "CREDENTIAL_COMPROMISE" || Number(parentOutcome) !== 1) throw new Error(`parent incident is not confirmed: ${parentCondition}/${parentOutcome}`);
  const observedAt = new Date().toISOString();
  const eap = JSON.parse(buildEap({
    targetId: TARGET_ID, policyHash: POLICY_HASH, ruleId: "REMEDIATION_CONFIRMED_V1",
    subject: `Confirmed remediation for ${PARENT_INCIDENT_ID}`,
    reporter: REPORTER, observedAt, retrievedAt: observedAt,
    sources: [{ sourceId: FRESH_RUN ? "reclose-live-evidence" : "reclose-reference-evidence", url: REMEDIATION_URL, sourceClass: "CONTENT_ADDRESSED_SNAPSHOT", extractedText: remote.text, snapshotRef: REMEDIATION_URL, retrievedAt: observedAt }],
  }));
  if (eap.sources[0].contentHash.toLowerCase() !== EXPECTED_REMEDIATION_HASH || eap.contentHashes[0].toLowerCase() !== EXPECTED_REMEDIATION_HASH || eap.sources[0].contentHash.toLowerCase() !== remote.hash.toLowerCase()) throw new Error("Built EAP is not bound to the authoritative remediation bytes");
  const submitArgs = [PARENT_INCIDENT_ID, POLICY_KEY, eap.artifactHash, JSON.stringify(eap), reporterNonce, ""];
  const restoreActionId = computeActionId(incidentId, POLICY_KEY, 10, "", "5", "");
  let tree;
  let explicitTreeError = null;
  try { tree = await buildJudgeKernelTargetAllocationTree(client, {
    judge: { address: JUDGE, functionName: "submit_remediation", args: submitArgs, account },
    kernel: { address: KERNEL, functionName: "receive_final_decision", account: { address: JUDGE, type: "json-rpc" }, args: [incidentId, PARENT_INCIDENT_ID, TARGET_ID, POLICY_KEY, 1, POLICY_HASH, "REMEDIATION_CONFIRMED_V1", "", REPORTER, eap.artifactHash, 1, "REMEDIATION_VERIFIED", FRESH_RUN ? 2 : 1] },
    target: { address: TARGET, functionName: "apply_assurance_action", account: { address: KERNEL, type: "json-rpc" }, args: [restoreActionId, incidentId, POLICY_KEY, 10, "", 5n, "", 2] },
  }, { rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX }); }
  catch (error) {
    explicitTreeError = String(error?.message ?? error);
    console.error(`Explicit remediation tree rejected by Studio; retrying SDK-generated allocation: ${explicitTreeError}`);
    tree = { messageAllocations: [], fallback: "SDK_GENERATED_ROOT_ALLOCATION" };
  }
  const estimate = await client.estimateTransactionFeesForWrite({ account, address: JUDGE, functionName: "submit_remediation", args: submitArgs, value: 0n, ...(tree.messageAllocations.length ? { messageAllocations: tree.messageAllocations } : {}) });
  if (!estimate || !estimate.distribution) throw new Error("Remediation fee preflight did not return a usable estimate");
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  await fs.writeFile(`${EVIDENCE_DIR}/remediation-preflight.json`, JSON.stringify({
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
  await fs.writeFile(`${EVIDENCE_DIR}/remediation-pending.json`, JSON.stringify({ schema: "reclose-r1-remediation-pending-v1", txHash: hash, incidentId, parentIncidentId: PARENT_INCIDENT_ID, reporterNonce, feeEstimate: safe(estimate) }, null, 2) + "\n");
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 3000, retries: 100 });
  const conditionCode = await client.readContract({ address: JUDGE, functionName: "get_incident_condition_code", args: [incidentId] });
  const outcome = await client.readContract({ address: JUDGE, functionName: "get_incident_outcome", args: [incidentId] });
  const output = { schema: "reclose-fixed-remediation-v2", network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC }, deployment: { judge: JUDGE, kernel: KERNEL, target: TARGET, targetId: TARGET_ID, policyKey: POLICY_KEY, policyHash: POLICY_HASH }, snapshot: { url: remote.url, httpStatus: remote.httpStatus, bytes: remote.bytes.length, hash: remote.hash }, parentIncidentId: PARENT_INCIDENT_ID, reporterNonce, incidentId, judgeResult: { conditionCode, outcome }, action: { actionId: restoreActionId, actionType: 10, paramU256: "5", expectedState: "RECOVERY" }, submitArgs, txHash: hash, receipt: safe(receipt), feeEstimate: safe(estimate), allocationTree: safe(tree), explicitTreeError };
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  await fs.writeFile(`${EVIDENCE_DIR}/remediation.json`, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ hash, status: receipt.statusName, execution: receipt.txExecutionResultName, success: isSuccessful(receipt), conditionCode, outcome, restoreActionId }));
  if (!isSuccessful(receipt)) process.exit(1);
  if (String(conditionCode) !== "REMEDIATION_VERIFIED" || Number(outcome) !== 1) {
    console.error("Correctly-bound remediation did not confirm; stopping without another write.");
    process.exit(2);
  }
}
main().catch((error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
