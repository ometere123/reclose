#!/usr/bin/env node
// Read-only preparation for the canonical E1 Run A compromise report.
// Builds the EAP from the frozen, commit-pinned synthetic fixture and composes the
// Judge -> Kernel -> Target allocation tree only from live genlayer-js estimates.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createClient,
  chains,
  MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  deriveInternalMessageCallKey,
  encodeInternalMessageFeeParams,
} from "genlayer-js";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";
import { canonicalKeccak256, keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";
import { kernelDecisionEntrypointForPhase } from "../packages/protocol-sdk/dist/feeAllocation.js";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";
import { composeJudgeKernelTargetBranches, estimateRepeatedTargetAllocation } from "./studio-dev-fee-allocation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_RELATIVE = process.argv[2] ?? "deployment/61997/r1-lifecycle-split-run-a-working-manifest.json";
const MANIFEST = JSON.parse(await fs.readFile(path.resolve(ROOT, MANIFEST_RELATIVE), "utf8"));
const CHAIN_ID = 61997;
const RPC = "https://studio-dev.genlayer.com/api";
const KERNEL = MANIFEST.contracts.AssuranceKernel.address;
const JUDGE = MANIFEST.contracts.IncidentJudgeV1.address;
const TARGET = MANIFEST.contracts.ReferenceAgentProtocol.address;
const OWNER = MANIFEST.deployer;
const TARGET_ID = MANIFEST.targetId;
const POLICY_KEY = MANIFEST.policy.policyKey;
const POLICY_VERSION = Number(MANIFEST.policy.version);
const POLICY_HASH = MANIFEST.policy.manifestHash;
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
  if (!KERNEL || !JUDGE || !TARGET || !OWNER || !TARGET_ID || !POLICY_KEY || !POLICY_HASH || MANIFEST.policy.status !== "active") {
    fail(`Deployment manifest is incomplete or policy is not marked active: ${MANIFEST_RELATIVE}`);
  }
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
  const receiveDecisionArgs = () => [
    incidentId, "", TARGET_ID, POLICY_KEY, POLICY_VERSION, POLICY_HASH, RULE_ID, RESOURCE_ID,
    OWNER, eap.artifactHash, 1, "CREDENTIAL_COMPROMISE", 1,
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

  // A confirmed outcome can emit both accepted and finalized Judge -> Kernel messages. Estimate
  // every Target child independently, encode each exact GenLayer fee distribution, then give the
  // Kernel simulation one explicit mode-2 bucket per repeated method/recipient/phase call key.
  // Never substitute an open aggregate message-fee bucket for these internal emissions.
  const branchTrees = [];
  for (const decisionStage of [1, 2]) {
    const onAcceptance = decisionStage === 1;
    const actionCalls = targetActionsForStage(decisionStage);
    if (actionCalls.length === 0) fail(`No governed target effects are applicable to decision stage ${decisionStage}.`);
    console.error(`Estimating ${onAcceptance ? "accepted/provisional" : "finalized"} Target child calls (${actionCalls.length}).`);
    const targetIndividualEstimates = [];
    for (const action of actionCalls) {
      targetIndividualEstimates.push(await client.estimateTransactionFeesForWrite({
        account: targetSimAccount,
        address: TARGET,
        functionName: "apply_assurance_action",
        args: [action.actionId, action.incidentId, action.policyKey, action.actionType, action.resourceId, action.paramU256, action.paramString, action.decisionStage],
        value: 0n,
      }));
    }
    const targetEstimateDetails = targetIndividualEstimates.map((estimate, index) => ({
      action: actionCalls[index],
      feeValue: String(estimate.feeValue),
      distribution: jsonSafe(estimate.distribution),
      messageAllocations: jsonSafe(estimate.messageAllocations ?? []),
      callKey: deriveInternalMessageCallKey("apply_assurance_action"),
      encodedFeeParams: encodeInternalMessageFeeParams(estimate.distribution),
    }));
    console.error(`Individually estimated ${onAcceptance ? "accepted" : "finalized"} Target calls (all values below come from the live SDK estimator): ${JSON.stringify(jsonSafe(targetEstimateDetails), null, 2)}`);
    const repeated = await estimateRepeatedTargetAllocation({
      client,
      actions: actionCalls.map((action) => ({
        account: targetSimAccount,
        address: TARGET,
        functionName: "apply_assurance_action",
        args: [action.actionId, action.incidentId, action.policyKey, action.actionType, action.resourceId, action.paramU256, action.paramString, action.decisionStage],
        value: 0n,
      })),
      initialEstimates: targetIndividualEstimates,
      recipient: TARGET,
      functionName: "apply_assurance_action",
      onAcceptance,
      rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
    });
    console.error(`Repeated ${onAcceptance ? "accepted" : "finalized"} Target calls all simulated with the estimator-produced common profile: ${JSON.stringify(jsonSafe({ commonDistribution: repeated.commonDistribution, feeParamsByValidatedEmission: repeated.feeParamsByValidatedEmission, feeValues: repeated.feeValues, allocation: repeated.allocation }), null, 2)}`);

    const kernelFunctionName = kernelDecisionEntrypointForPhase(onAcceptance);
    console.error(`Estimating Kernel ${kernelFunctionName} (${onAcceptance ? "provisional" : "final"}) with one explicit phase-matched Target allocation.`);
    let kernelEstimate;
    try {
      kernelEstimate = await client.estimateTransactionFeesForWrite({
        account: judgeAccount,
        address: KERNEL,
        functionName: kernelFunctionName,
        args: receiveDecisionArgs(),
        value: 0n,
        messageAllocations: [repeated.allocation],
      });
    } catch (error) {
      console.error(`Kernel stage ${decisionStage} RPC details: ${JSON.stringify(compactFailure(error))}`);
      throw error;
    }
    const kernelAllocations = Array.isArray(kernelEstimate.messageAllocations) ? kernelEstimate.messageAllocations : [];
    console.error(`Kernel stage ${decisionStage} estimate succeeded: ${JSON.stringify({
      feeValue: String(kernelEstimate.feeValue),
      distribution: jsonSafe(kernelEstimate.distribution),
      explicitChildAllocationReadback: jsonSafe(kernelAllocations),
    })}`);
    branchTrees.push({ decisionStage, onAcceptance, actionCalls, targetIndividualEstimates, targetEstimates: repeated.validatedEstimates, targetAllocation: repeated.allocation, kernelFunctionName, kernelEstimate, kernelAllocations });
  }

  const { allocations: composedAllocations, topLevelMessageFees } = composeJudgeKernelTargetBranches({
    branches: branchTrees,
    kernelAddress: KERNEL,
    provisionalKernelFunctionName: kernelDecisionEntrypointForPhase(true),
    finalKernelFunctionName: kernelDecisionEntrypointForPhase(false),
    targetAddress: TARGET,
    targetFunctionName: "apply_assurance_action",
    rootParentIndex: MESSAGE_ALLOCATION_ROOT_PARENT_INDEX,
  });

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
  if (asBigInt(estimate.distribution?.totalMessageFees, "root totalMessageFees") !== topLevelMessageFees) {
    fail(`Root SDK preset totalMessageFees (${estimate.distribution?.totalMessageFees}) does not equal the sum of post-rollup root allocation budgets (${topLevelMessageFees}).`);
  }
  if (estimate.messageAllocations.length !== composedAllocations.length) {
    fail(`Root SDK preset returned ${estimate.messageAllocations.length} allocations; expected the complete explicit tree of ${composedAllocations.length}.`);
  }
  for (let index = 0; index < composedAllocations.length; index += 1) {
    const expected = composedAllocations[index];
    const actual = estimate.messageAllocations[index];
    if (!(Number(actual.messageType) === Number(expected.messageType) || String(actual.messageType).toLowerCase() === "internal") ||
        Boolean(actual.onAcceptance) !== Boolean(expected.onAcceptance) ||
        asBigInt(actual.parentIndex, `root allocation ${index} parentIndex`) !== expected.parentIndex ||
        !sameAddress(actual.recipient, expected.recipient) ||
        String(actual.callKey).toLowerCase() !== String(expected.callKey).toLowerCase() ||
        asBigInt(actual.budget, `root allocation ${index} budget`) !== expected.budget ||
        String(actual.feeParams).toLowerCase() !== String(expected.feeParams).toLowerCase()) {
      fail(`Root SDK preset allocation ${index} differs from the complete explicit phase-specific tree.`);
    }
  }

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
        ...branch.targetIndividualEstimates.map((targetEstimate, index) => ({ address: TARGET, functionName: "apply_assurance_action", args: branch.actionCalls[index], simulation: "individual-profile-baseline", feeValue: targetEstimate.feeValue.toString(), distribution: jsonSafe(targetEstimate.distribution), encodedFeeParams: encodeInternalMessageFeeParams(targetEstimate.distribution), allocationCount: targetEstimate.messageAllocations?.length ?? 0 })),
        ...branch.targetEstimates.map((targetEstimate, index) => ({ address: TARGET, functionName: "apply_assurance_action", args: branch.actionCalls[index], simulation: "validated-common-profile", feeValue: targetEstimate.feeValue.toString(), distribution: jsonSafe(targetEstimate.distribution), encodedFeeParams: branch.targetAllocation.feeParams, allocationCount: targetEstimate.messageAllocations?.length ?? 0 })),
        { address: TARGET, functionName: "explicit repeated-message allocation", onAcceptance: branch.onAcceptance, repeatedMessages: branch.actionCalls.length, budget: branch.targetAllocation.budget.toString(), feeParams: branch.targetAllocation.feeParams },
        { address: KERNEL, functionName: branch.kernelFunctionName, decisionStage: branch.decisionStage, feeValue: branch.kernelEstimate.feeValue.toString(), distribution: jsonSafe(branch.kernelEstimate.distribution), allocationCount: branch.kernelAllocations.length },
      ]),
      postRollupRootMessageFees: topLevelMessageFees.toString(),
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
