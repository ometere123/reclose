#!/usr/bin/env node
// Read-only preparation for the canonical E1 Run A compromise report.
// Builds the EAP from the frozen, commit-pinned synthetic fixture and composes the
// Judge -> Kernel -> Target allocation tree only from live genlayer-js estimates.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, chains, MESSAGE_ALLOCATION_ROOT_PARENT_INDEX } from "genlayer-js";
import {
  deriveInternalMessageCallKey,
  encodeInternalMessageFeeParams,
  MessageType,
} from "genlayer-js";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";
import { canonicalKeccak256, keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHAIN_ID = 61997;
const RPC = "https://studio-dev.genlayer.com/api";
const KERNEL = "0x3bD24B04ae7d8090F22752B9e489A5398E271D4f";
const JUDGE = "0x05f9E58B5ce635FCEd8076c9dAA714b19c287028";
const TARGET = "0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2";
const OWNER = "0x24fAe7CD031Ed702Be63BDeA8912141805B996bd";
const TARGET_ID = "reclose-target-006";
const POLICY_KEY = "policy-r1-008";
const POLICY_VERSION = 2;
const POLICY_HASH = "0x6c1c74ecf17d4812bb36b45ca8c162c87a3da893d675caba3f33ff4bc97d1881";
const RULE_ID = "PROVIDER_COMPROMISE_V1";
const RESOURCE_ID = "provider_a";
const SOURCE_ID = "reclose-reference-evidence";
const FIXTURE_PATH = "release-evidence/r1/e1/fixtures/provider-a-compromise.md";
const FIXTURE_COMMIT = "ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6";
const FIXTURE_URL = `https://raw.githubusercontent.com/ometere123/reclose/${FIXTURE_COMMIT}/${FIXTURE_PATH}`;
const REGISTRY_PATH = "config/source-registry-r1.json";
const REQUIRED_TREASURY_WEI = 100000000000000000n;

// All Studio-dev RPC calls in this process share one FIFO queue and bounded backoff.
installStudioDevRpcThrottle({ rpcUrl: RPC });

function fail(message) {
  throw new Error(message);
}

function sameAddress(left, right) {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function asBigInt(value, label) {
  try { return BigInt(value); } catch { fail(`${label} is not an integer: ${String(value)}`); }
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length);
  for (let start = 0; start < items.length; start += concurrency) {
    const end = Math.min(start + concurrency, items.length);
    const batch = await Promise.all(items.slice(start, end).map((item, offset) => mapper(item, start + offset)));
    batch.forEach((result, offset) => { results[start + offset] = result; });
  }
  return results;
}

function compactFailure(error) {
  const candidates = [error, error?.cause, error?.cause?.data, error?.cause?.data?.receipt, error?.cause?.data?.receipt?.leader_receipt];
  return candidates.map((item) => {
    if (!item || typeof item !== "object") return undefined;
    const result = {};
    for (const key of ["code", "message", "execution_result", "result_name", "stderr", "error_code", "error_description", "raw_error"]) {
      if (item[key] !== undefined) result[key] = item[key];
    }
    const genvm = item.genvm_result;
    if (genvm && typeof genvm === "object") {
      result.genvm_result = {};
      for (const key of ["stderr", "error_code", "error_description", "raw_error"]) if (genvm[key] !== undefined) result.genvm_result[key] = genvm[key];
    }
    return Object.keys(result).length ? result : undefined;
  }).filter(Boolean);
}

async function main() {
  const chain = { ...chains.studioDevnet, id: CHAIN_ID, rpcUrls: { default: { http: [RPC] } } };
  const client = createClient({ chain });
  const reportedChainId = Number(await client.getChainId());
  if (reportedChainId !== CHAIN_ID) fail(`RPC chain ID ${reportedChainId} is not Studio-dev ${CHAIN_ID}`);

  const read = (address, functionName, args = []) => client.readContract({ address, functionName, args });

  // Freeze the live deployment/policy identity before constructing any evidence.
  const frozenReadCalls = [
    [JUDGE, "get_kernel", []],
    [JUDGE, "get_source_registry_hash", []],
    [JUDGE, "get_source_authority", [SOURCE_ID]],
    [KERNEL, "get_target_policy_identity", [TARGET_ID]],
    [KERNEL, "get_target_details", [TARGET_ID]],
    [KERNEL, "get_policy_header", [POLICY_KEY]],
    [KERNEL, "get_policy_rule", [POLICY_KEY, RULE_ID]],
    [KERNEL, "get_policy_rule_economics", [POLICY_KEY, RULE_ID]],
    [KERNEL, "get_policy_counts", [POLICY_KEY]],
    [TARGET, "get_state", []],
    [TARGET, "get_effective_provider", []],
    [TARGET, "get_treasury_balance", []],
  ];
  const [judgeKernel, liveRegistryHash, sourceAuthority, policyIdentity, targetDetails,
    policyHeader, rule, economics, counts, targetState, effectiveProvider, treasuryBalance] =
    await mapLimit(frozenReadCalls, 1, ([address, functionName, args]) => read(address, functionName, args));

  const registry = JSON.parse(await fs.readFile(path.join(ROOT, REGISTRY_PATH), "utf8"));
  const recomputedRegistryHash = canonicalKeccak256(registry);
  if (recomputedRegistryHash.toLowerCase() !== String(liveRegistryHash).toLowerCase()) {
    fail(`Source registry mismatch: local=${recomputedRegistryHash}, Judge=${liveRegistryHash}`);
  }
  if (!sameAddress(judgeKernel, KERNEL)) fail(`Judge points at unexpected Kernel ${judgeKernel}`);
  if (String(policyIdentity?.[0]) !== POLICY_KEY || Number(policyIdentity?.[1]) !== POLICY_VERSION || String(policyIdentity?.[2]).toLowerCase() !== POLICY_HASH.toLowerCase()) {
    fail(`Active policy identity mismatch: ${JSON.stringify(jsonSafe(policyIdentity))}`);
  }
  if (Number(policyHeader?.[0]) !== POLICY_VERSION || String(policyHeader?.[1]).toLowerCase() !== POLICY_HASH.toLowerCase() || policyHeader?.[2] !== true || policyHeader?.[3] !== true) {
    fail(`Policy header is not sealed+active with the expected identity: ${JSON.stringify(jsonSafe(policyHeader))}`);
  }
  if (!sameAddress(targetDetails?.[0], TARGET) || !sameAddress(targetDetails?.[1], OWNER) ||
      Number(targetDetails?.[2]) !== 0 || String(targetDetails?.[3]) !== POLICY_KEY ||
      Number(targetDetails?.[5]) !== 1 || targetDetails?.[6] !== false) {
    fail(`Target registration/state mismatch: ${JSON.stringify(jsonSafe(targetDetails))}`);
  }
  if (!sameAddress(rule?.[0], JUDGE) || Number(rule?.[1]) !== 1 || Number(rule?.[2]) !== 1 || rule?.[3] !== true || rule?.[4] !== true) {
    fail(`Active compromise rule does not bind the expected Judge/version/kind: ${JSON.stringify(jsonSafe(rule))}`);
  }
  if (asBigInt(economics?.[0], "reportBond") !== 0n) fail("This prepared flow expects the active compromise rule to have zero report bond.");
  if (Number(targetState) !== 0 || Number(effectiveProvider) !== 1) fail(`Target is not NORMAL with Provider A selected (state=${targetState}, provider=${effectiveProvider}).`);
  if (asBigInt(treasuryBalance, "treasury balance") < REQUIRED_TREASURY_WEI) fail(`Treasury has less than 0.10 GEN for the remaining two purchases: ${treasuryBalance} wei`);

  const sourceRecord = registry.sources.find((source) => source.sourceId === SOURCE_ID);
  const authorityExpected = sourceRecord && [
    sourceRecord.canonicalOrigin,
    sourceRecord.canonicalPathPrefix,
    sourceRecord.sourceClass,
    [...sourceRecord.ruleIds].sort().join(","),
    sourceRecord.enabled,
  ];
  if (!sourceRecord || !authorityExpected || JSON.stringify(jsonSafe(sourceAuthority)) !== JSON.stringify(authorityExpected)) {
    fail(`Live Judge snapshot authority differs from the current registry: ${JSON.stringify(jsonSafe(sourceAuthority))}`);
  }
  if (sourceRecord.sourceClass !== "CONTENT_ADDRESSED_SNAPSHOT" ||
      sourceRecord.canonicalPathPrefix !== `/ometere123/reclose/${FIXTURE_COMMIT}/release-evidence/r1/e1/fixtures/` ||
      !sourceRecord.enabled || !sourceRecord.ruleIds.includes(RULE_ID)) {
    fail("The frozen fixture URL is not covered by the enabled immutable source authority.");
  }

  const effectCount = Number(counts?.[2]);
  const effects = await mapLimit(Array.from({ length: effectCount }, (_, index) => index), 1,
    (index) => read(KERNEL, "get_policy_effect_at", [POLICY_KEY, index]));
  const enabledCompromiseEffects = effects.filter((effect) => effect?.[0] === RULE_ID && effect?.[6] === true);
  if (!enabledCompromiseEffects.some((effect) => Number(effect[1]) === 3 && effect[2] === RESOURCE_ID) ||
      !enabledCompromiseEffects.some((effect) => Number(effect[1]) === 7 && effect[2] === "")) {
    fail(`Active policy does not contain the expected Provider A restriction and SAFE_MODE effects: ${JSON.stringify(jsonSafe(enabledCompromiseEffects))}`);
  }

  // Independently fetch the exact immutable fixture and compare it to the checked-out fixture.
  const response = await fetch(FIXTURE_URL, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) fail(`Immutable fixture fetch returned HTTP ${response.status}`);
  const fixtureBytes = new Uint8Array(await response.arrayBuffer());
  const fixtureText = new TextDecoder("utf-8", { fatal: true }).decode(fixtureBytes);
  const localText = await fs.readFile(path.join(ROOT, FIXTURE_PATH), "utf8");
  if (fixtureText.replace(/\r\n/g, "\n") !== localText.replace(/\r\n/g, "\n")) fail("Local compromise fixture differs from its commit-pinned raw URL.");
  const contentHash = keccak256Hex(fixtureBytes);
  if (contentHash.toLowerCase() !== keccak256Hex(fixtureText).toLowerCase()) fail("Fixture bytes are not a valid UTF-8 round-trip for the claimed content hash.");

  // Read the Reporter nonce as the final live read before constructing the canonical EAP.
  const reporterNonce = Number(await read(JUDGE, "get_reporter_nonce", [OWNER]));
  if (!Number.isSafeInteger(reporterNonce) || reporterNonce < 0) fail(`Invalid live Reporter nonce ${reporterNonce}`);
  const observedAt = new Date().toISOString();
  const evidenceJson = buildEap({
    targetId: TARGET_ID,
    policyHash: POLICY_HASH,
    ruleId: RULE_ID,
    subject: "Synthetic R1 demo: Provider A credential compromise fixture",
    reporter: OWNER,
    observedAt,
    retrievedAt: observedAt,
    sources: [{
      sourceId: SOURCE_ID,
      url: FIXTURE_URL,
      sourceClass: "CONTENT_ADDRESSED_SNAPSHOT",
      extractedText: fixtureText,
      snapshotRef: FIXTURE_URL,
      retrievedAt: observedAt,
    }],
  });
  const eap = JSON.parse(evidenceJson);
  if (eap.sources.length !== 1 || eap.sources[0].snapshotRef !== FIXTURE_URL || eap.sources[0].contentHash !== contentHash) {
    fail("Canonical EAP does not bind the independently fetched immutable snapshot.");
  }

  const submitArgs = [TARGET_ID, POLICY_KEY, RULE_ID, RESOURCE_ID, eap.artifactHash, evidenceJson, reporterNonce, ""];
  const ownerAccount = { address: OWNER, type: "json-rpc" };
  const judgeAccount = { address: JUDGE, type: "json-rpc" };
  const incidentId = `${TARGET_ID}:${OWNER.toLowerCase()}:${reporterNonce}`;
  const receiveDecisionArgs = (decisionStage) => [
    incidentId, "", TARGET_ID, POLICY_KEY, POLICY_VERSION, POLICY_HASH, RULE_ID, RESOURCE_ID,
    OWNER, eap.artifactHash, 1, "CREDENTIAL_COMPROMISE", decisionStage, 1,
  ];
  const actionKey = (actionType, resourceId) => {
    const parts = [incidentId, POLICY_KEY, String(actionType), resourceId];
    return parts.map((part) => `${part.length}:${part}`).join("");
  };
  const targetSimAccount = { address: KERNEL, type: "json-rpc" };
  const targetActionsForStage = (stage) => enabledCompromiseEffects
    .filter((effect) => stage === 2 || [2, 3, 5, 7].includes(Number(effect[1])))
    .map((effect) => ({
      actionId: actionKey(Number(effect[1]), String(effect[2])),
      incidentId,
      policyKey: POLICY_KEY,
      actionType: Number(effect[1]),
      resourceId: String(effect[2]),
      paramU256: asBigInt(effect[3], "effect param_u256"),
      paramString: String(effect[4]),
      decisionStage: stage,
    }));

  // A confirmed outcome can emit both accepted and finalized Judge -> Kernel messages. Studio's
  // discovery estimate cannot discover the accepted branch from an empty allocation list (the VM
  // fails while recording the accepted emit). Seed the exact subtrees from real per-hop estimates,
  // then let genlayer-js estimate the complete root call with those estimator-produced values.
  const branchTrees = [];
  for (const decisionStage of [2, 1]) {
    const onAcceptance = decisionStage === 1;
    const actionCalls = targetActionsForStage(decisionStage);
    if (actionCalls.length === 0) fail(`No governed target effects are applicable to decision stage ${decisionStage}.`);
    console.error(`Estimating ${onAcceptance ? "accepted/provisional" : "finalized"} Target child calls (${actionCalls.length}).`);
    const targetEstimates = [];
    for (const action of actionCalls) {
      targetEstimates.push(await client.estimateTransactionFeesForWrite({
        account: targetSimAccount,
        address: TARGET,
        functionName: "apply_assurance_action",
        args: [action.actionId, action.incidentId, action.policyKey, action.actionType, action.resourceId, action.paramU256, action.paramString, action.decisionStage],
        value: 0n,
      }));
    }
    // Studio rejected the manually pinned Target subtree while simulating receive_decision.
    // Test the documented open message-fee bucket for this child transaction, sized from the exact
    // Target write estimates. Keep Judge -> Kernel pinned and let the SDK report any child
    // allocations it can recover from the live simulation.
    const targetMessageFees = targetEstimates.reduce(
      (sum, estimate) => sum + asBigInt(estimate.feeValue, "Target child feeValue"),
      0n,
    );

    console.error(`Estimating Kernel receive_decision (${onAcceptance ? "provisional" : "final"}) with its Target allocations.`);
    let kernelEstimate;
    try {
      kernelEstimate = await client.estimateTransactionFeesForWrite({
        account: judgeAccount,
        address: KERNEL,
        functionName: "receive_decision",
        args: receiveDecisionArgs(decisionStage),
        value: 0n,
        totalMessageFees: targetMessageFees,
      });
    } catch (error) {
      console.error(`Kernel stage ${decisionStage} RPC details: ${JSON.stringify(compactFailure(error))}`);
      throw error;
    }
    if (asBigInt(kernelEstimate.distribution?.totalMessageFees ?? 0, `Kernel stage ${decisionStage} totalMessageFees`) < targetMessageFees) {
      fail(`Kernel stage ${decisionStage} estimator returned totalMessageFees below the sum of exact Target child estimates (${kernelEstimate.distribution?.totalMessageFees} < ${targetMessageFees}).`);
    }
    const kernelAllocations = Array.isArray(kernelEstimate.messageAllocations) ? kernelEstimate.messageAllocations : [];
    console.error(`Kernel stage ${decisionStage} estimate succeeded: ${JSON.stringify({
      feeValue: String(kernelEstimate.feeValue),
      distribution: jsonSafe(kernelEstimate.distribution),
      childAllocations: jsonSafe(kernelAllocations),
    })}`);
    branchTrees.push({ decisionStage, onAcceptance, actionCalls, targetEstimates, targetMessageFees, kernelEstimate, kernelAllocations });
  }

  const composedAllocations = [];
  for (const branch of branchTrees) {
    const kernelNodeIndex = BigInt(composedAllocations.length);
    composedAllocations.push({
      messageType: MessageType.Internal,
      onAcceptance: branch.onAcceptance,
      parentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
      recipient: KERNEL,
      callKey: deriveInternalMessageCallKey("receive_decision"),
      budget: asBigInt(branch.kernelEstimate.feeValue, "Kernel branch feeValue"),
      feeParams: encodeInternalMessageFeeParams(branch.kernelEstimate.distribution),
    });
    const offset = BigInt(composedAllocations.length);
    for (const allocation of branch.kernelAllocations) {
      const parentIndex = asBigInt(allocation.parentIndex ?? MESSAGE_ALLOCATION_ROOT_PARENT_INDEX, "nested parentIndex");
      composedAllocations.push({
        ...allocation,
        messageType: MessageType.Internal,
        onAcceptance: Boolean(allocation.onAcceptance),
        parentIndex: parentIndex === MESSAGE_ALLOCATION_ROOT_PARENT_INDEX ? kernelNodeIndex : offset + parentIndex,
        recipient: allocation.recipient,
        callKey: allocation.callKey,
        budget: asBigInt(allocation.budget, "nested target budget"),
        feeParams: allocation.feeParams,
      });
    }
  }

  console.error("Estimating exact Judge submit_incident with accepted and finalized nested allocations.");
  const estimate = await client.estimateTransactionFeesForWrite({
    account: ownerAccount,
    address: JUDGE,
    functionName: "submit_incident",
    args: submitArgs,
    value: 0n,
    messageAllocations: composedAllocations,
  });
  const feeValueWei = asBigInt(estimate.feeValue, "feeValue").toString();
  if (!Array.isArray(estimate.messageAllocations) || estimate.messageAllocations.length === 0) fail("Final estimator did not return the composed nested allocations.");

  // Catch nonce races after potentially slow independent simulations. The first read above was
  // immediately before EAP construction; this second guard is immediately before handing args to
  // the owner CLI. The PowerShell wrapper repeats this check immediately before signing.
  const nonceAfterEstimate = Number(await read(JUDGE, "get_reporter_nonce", [OWNER]));
  if (nonceAfterEstimate !== reporterNonce) fail(`Reporter nonce changed during estimation (${reporterNonce} -> ${nonceAfterEstimate}); rebuild instead of submitting stale args.`);

  const fees = {
    distribution: jsonSafe(estimate.distribution),
    messageAllocations: jsonSafe(estimate.messageAllocations).map((node) => ({
      messageType: "internal",
      onAcceptance: Boolean(node.onAcceptance),
      parentIndex: String(node.parentIndex ?? 0),
      recipient: node.recipient,
      callKey: node.callKey,
      budget: String(node.budget ?? 0),
      feeParams: node.feeParams,
    })),
  };
  const output = {
    schema: "reclose-e1-run-a-incident-prepared-v1",
    network: { name: "studio-dev", chainId: CHAIN_ID, rpc: RPC },
    deployment: { kernel: KERNEL, judge: JUDGE, target: TARGET, targetId: TARGET_ID },
    policy: { key: POLICY_KEY, version: POLICY_VERSION, hash: POLICY_HASH, active: true, judgeVersion: 1 },
    sourceRegistryHash: recomputedRegistryHash,
    sourceAuthority: jsonSafe(sourceAuthority),
    fixture: { sourceId: SOURCE_ID, url: FIXTURE_URL, snapshotRef: FIXTURE_URL, contentHash, bytes: fixtureBytes.length, reality: "SYNTHETIC" },
    reporter: OWNER,
    reporterNonce,
    predictedIncidentId: incidentId,
    functionName: "submit_incident",
    args: submitArgs,
    feeValueWei,
    fees,
    tree: {
      allocations: composedAllocations.map((node) => ({ ...node, parentIndex: node.parentIndex.toString(), budget: node.budget.toString() })),
      simulationSteps: branchTrees.flatMap((branch) => [
        ...branch.targetEstimates.map((targetEstimate, index) => ({ address: TARGET, functionName: "apply_assurance_action", args: branch.actionCalls[index], feeValue: targetEstimate.feeValue.toString(), allocationCount: targetEstimate.messageAllocations?.length ?? 0 })),
        { address: TARGET, functionName: "open message-fee bucket from exact child estimates", repeatedMessages: branch.actionCalls.length, feeValue: branch.targetMessageFees.toString() },
        { address: KERNEL, functionName: "receive_decision", decisionStage: branch.decisionStage, feeValue: branch.kernelEstimate.feeValue.toString(), allocationCount: branch.kernelAllocations.length },
      ]),
    },
    preflightReadbacks: {
      judgeKernel, liveRegistryHash, policyIdentity, targetDetails,
      targetState: Number(targetState), effectiveProvider: Number(effectiveProvider),
      treasuryBalanceWei: String(treasuryBalance), rule, economics, effects: enabledCompromiseEffects,
      reporterNonceAfterEstimate: nonceAfterEstimate,
    },
  };
  process.stdout.write(`${JSON.stringify(output, (_key, value) => typeof value === "bigint" ? value.toString() : value, 2)}\n`);
}

main().catch((error) => {
  console.error(`INCIDENT_PREPARATION_FAILED: ${error?.message ?? String(error)}`);
  if (error?.cause) console.error(`cause: ${error.cause?.message ?? String(error.cause)}`);
  process.exit(1);
});
