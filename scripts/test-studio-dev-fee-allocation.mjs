import assert from "node:assert/strict";
import { MESSAGE_ALLOCATION_ROOT_PARENT_INDEX, MessageType, deriveInternalMessageCallKey, encodeInternalMessageFeeParams } from "genlayer-js";
import { kernelDecisionEntrypointForPhase } from "../packages/protocol-sdk/dist/feeAllocation.js";
import { assertAllocationPhase, buildRepeatedInternalAllocation, composeJudgeKernelTargetBranches, estimateRepeatedTargetAllocation } from "./studio-dev-fee-allocation.mjs";

const ROOT = MESSAGE_ALLOCATION_ROOT_PARENT_INDEX;
const KERNEL = "0x2222222222222222222222222222222222222222";
const TARGET = "0x3333333333333333333333333333333333333333";
const toEstimate = (feeValue, executionBudgetPerRound = 100n) => ({
  feeValue,
  distribution: {
    leaderTimeunitsAllocation: 1n,
    validatorTimeunitsAllocation: 2n,
    appealRounds: 0n,
    executionBudgetPerRound,
    executionConsumed: 6n,
    totalMessageFees: 7n,
    rotations: [0n],
    maxPriceGenPerTimeUnit: 3n,
    storageFeeMaxGasPrice: 4n,
    receiptFeeMaxGasPrice: 5n,
  },
});

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

function targetBucket(estimates, onAcceptance) {
  return buildRepeatedInternalAllocation({
    estimates,
    recipient: TARGET,
    functionName: "apply_assurance_action",
    onAcceptance,
    rootParentIndex: ROOT,
  });
}

async function main() {
  await test("old shared receive_decision method collides for accepted and finalized siblings under the Studio allocation key", async () => {
    const accepted = { messageType: MessageType.Internal, onAcceptance: true, parentIndex: ROOT, recipient: KERNEL, callKey: deriveInternalMessageCallKey("receive_decision") };
    const finalized = { ...accepted, onAcceptance: false };
    const allocationKey = (node) => [node.parentIndex, node.messageType, node.recipient.toLowerCase(), node.callKey.toLowerCase()].join(":");
    assert.equal(allocationKey(accepted), allocationKey(finalized));
    assert.notEqual(
      deriveInternalMessageCallKey(kernelDecisionEntrypointForPhase(true)),
      deriveInternalMessageCallKey(kernelDecisionEntrypointForPhase(false)),
    );
    assert.throws(() => assertAllocationPhase(accepted, false), /phase mismatch/);
  });

  await test("higher common Target profile simulates both accepted emissions and uses one cumulative allocation", async () => {
    const actions = [
      { address: TARGET, functionName: "apply_assurance_action", args: ["restrict"], value: 0n },
      { address: TARGET, functionName: "apply_assurance_action", args: ["safe-mode"], value: 0n },
    ];
    const initial = [toEstimate(11n, 120n), toEstimate(13n, 100n)];
    const simulatedCalls = [];
    const repeated = await estimateRepeatedTargetAllocation({
      client: { estimateTransactionFeesForWrite: async (call) => {
        simulatedCalls.push(call);
        assert.equal(call.executionBudgetPerRound, 120n);
        assert.equal(call.executionConsumed, 6n);
        assert.equal(call.totalMessageFees, 7n);
        // Model Studio returning per-action recommendations even though both
        // successful simulations were submitted with the same higher input profile.
        return toEstimate(17n, simulatedCalls.length === 1 ? 120n : 90n);
      } },
      actions,
      initialEstimates: initial,
      recipient: TARGET,
      functionName: "apply_assurance_action",
      onAcceptance: true,
      rootParentIndex: ROOT,
    });
    assert.equal(repeated.allocation.messageType, MessageType.Internal);
    assert.equal(repeated.allocation.onAcceptance, true);
    assert.equal(repeated.allocation.parentIndex, ROOT);
    assert.equal(repeated.allocation.recipient, TARGET);
    assert.equal(repeated.allocation.callKey, deriveInternalMessageCallKey("apply_assurance_action"));
    assert.equal(repeated.allocation.budget, 34n);
    assert.equal(repeated.repeatedEmissions, 2);
    assert.equal(simulatedCalls.length, 2);
    assert.ok(simulatedCalls.every((call) => call.executionBudgetPerRound === 120n));
    assert.equal(new Set(repeated.feeParamsByValidatedEmission).size, 1);
    assert.equal(repeated.allocation.feeParams, encodeInternalMessageFeeParams(initial[0].distribution));
    assert.equal(new Set(repeated.recommendedFeeParamsByValidation).size, 2);
  });

  await test("different fee distribution fields other than execution budget stop common-profile simulation", async () => {
    let calls = 0;
    await assert.rejects(estimateRepeatedTargetAllocation({
      client: { estimateTransactionFeesForWrite: async () => { calls += 1; return toEstimate(17n); } },
      actions: [{}, {}],
      initialEstimates: [toEstimate(11n, 100n), { ...toEstimate(13n, 101n), distribution: { ...toEstimate(13n, 101n).distribution, rotations: [9n] } }],
      recipient: TARGET,
      functionName: "apply_assurance_action",
      onAcceptance: true,
      rootParentIndex: ROOT,
    }), /differ in fee distribution fields other than executionBudgetPerRound/);
    assert.equal(calls, 0);
  });

  await test("repeated finalized Target effects share one simulated common profile and cumulative allocation", async () => {
    const actions = [
      { address: TARGET, functionName: "apply_assurance_action", args: ["restrict"], value: 0n },
      { address: TARGET, functionName: "apply_assurance_action", args: ["safe-mode"], value: 0n },
      { address: TARGET, functionName: "apply_assurance_action", args: ["monitor"], value: 0n },
    ];
    let simulationCount = 0;
    const repeated = await estimateRepeatedTargetAllocation({
      client: { estimateTransactionFeesForWrite: async (call) => {
        simulationCount += 1;
        return toEstimate(BigInt(20 + simulationCount), call.executionBudgetPerRound);
      } },
      actions,
      initialEstimates: [toEstimate(11n, 110n), toEstimate(13n, 100n), toEstimate(17n, 105n)],
      recipient: TARGET,
      functionName: "apply_assurance_action",
      onAcceptance: false,
      rootParentIndex: ROOT,
    });
    assert.equal(simulationCount, 3);
    assert.equal(repeated.allocation.onAcceptance, false);
    assert.equal(repeated.allocation.budget, 66n);
    assert.equal(repeated.feeValues.length, 3);
    assert.equal(new Set(repeated.feeParamsByValidatedEmission).size, 1);
  });

  await test("accepted allocation cannot satisfy a finalized emission", async () => {
    const allocation = targetBucket([toEstimate(11n)], true).allocation;
    assert.throws(() => assertAllocationPhase(allocation, false), /phase mismatch/);
  });

  await test("finalized allocation cannot satisfy an accepted emission", async () => {
    const allocation = targetBucket([toEstimate(11n)], false).allocation;
    assert.throws(() => assertAllocationPhase(allocation, true), /phase mismatch/);
  });

  await test("accepted and finalized branches coexist under distinct Judge root nodes", async () => {
    const acceptedTarget = targetBucket([toEstimate(11n), toEstimate(13n)], true).allocation;
    const finalizedTarget = targetBucket([toEstimate(17n), toEstimate(19n), toEstimate(23n)], false).allocation;
    const acceptedKernel = {
      feeValue: 40n,
      distribution: { totalMessageFees: 24n },
      messageAllocations: [acceptedTarget],
    };
    const finalizedKernel = {
      feeValue: 70n,
      distribution: { totalMessageFees: 59n },
      messageAllocations: [finalizedTarget],
    };
    const tree = composeJudgeKernelTargetBranches({
      branches: [
        { onAcceptance: true, targetAllocation: acceptedTarget, kernelEstimate: acceptedKernel },
        { onAcceptance: false, targetAllocation: finalizedTarget, kernelEstimate: finalizedKernel },
      ],
      kernelAddress: KERNEL,
        provisionalKernelFunctionName: "receive_provisional_decision",
        finalKernelFunctionName: "receive_final_decision",
      targetAddress: TARGET,
      targetFunctionName: "apply_assurance_action",
      rootParentIndex: ROOT,
    });
    assert.equal(tree.allocations.length, 4);
    assert.equal(tree.allocations[0].onAcceptance, true);
    assert.equal(tree.allocations[0].callKey, deriveInternalMessageCallKey("receive_provisional_decision"));
    assert.equal(tree.allocations[0].parentIndex, ROOT);
    assert.equal(tree.allocations[1].onAcceptance, true);
    assert.equal(tree.allocations[1].parentIndex, 0n);
    assert.equal(tree.allocations[2].onAcceptance, false);
    assert.equal(tree.allocations[2].callKey, deriveInternalMessageCallKey("receive_final_decision"));
    assert.notEqual(tree.allocations[0].callKey, tree.allocations[2].callKey);
    assert.equal(tree.allocations[2].parentIndex, ROOT);
    assert.equal(tree.allocations[3].onAcceptance, false);
    assert.equal(tree.allocations[3].parentIndex, 2n);
  });

  await test("accepted branch budget covers both provisional effects", async () => {
    const target = targetBucket([toEstimate(11n), toEstimate(13n)], true).allocation;
    const kernel = { feeValue: 40n, distribution: { totalMessageFees: 24n }, messageAllocations: [target] };
    composeJudgeKernelTargetBranches({
      branches: [{ onAcceptance: true, targetAllocation: target, kernelEstimate: kernel }, { onAcceptance: false, targetAllocation: targetBucket([toEstimate(5n)], false).allocation, kernelEstimate: { feeValue: 6n, distribution: { totalMessageFees: 5n }, messageAllocations: [targetBucket([toEstimate(5n)], false).allocation] } }],
      kernelAddress: KERNEL, provisionalKernelFunctionName: "receive_provisional_decision", finalKernelFunctionName: "receive_final_decision", targetAddress: TARGET,
      targetFunctionName: "apply_assurance_action", rootParentIndex: ROOT,
    });
    assert.equal(target.budget, 24n);
    assert.ok(kernel.feeValue >= target.budget);
  });

  await test("finalized branch budget covers every final effect and root fee total equals top-level post-rollup budgets", async () => {
    const acceptedTarget = targetBucket([toEstimate(7n)], true).allocation;
    const finalizedTarget = targetBucket([toEstimate(17n), toEstimate(19n), toEstimate(23n)], false).allocation;
    const tree = composeJudgeKernelTargetBranches({
      branches: [
        { onAcceptance: true, targetAllocation: acceptedTarget, kernelEstimate: { feeValue: 12n, distribution: { totalMessageFees: 7n }, messageAllocations: [acceptedTarget] } },
        { onAcceptance: false, targetAllocation: finalizedTarget, kernelEstimate: { feeValue: 70n, distribution: { totalMessageFees: 59n }, messageAllocations: [finalizedTarget] } },
      ],
      kernelAddress: KERNEL, provisionalKernelFunctionName: "receive_provisional_decision", finalKernelFunctionName: "receive_final_decision", targetAddress: TARGET,
      targetFunctionName: "apply_assurance_action", rootParentIndex: ROOT,
    });
    assert.equal(finalizedTarget.budget, 59n);
    const rootNodes = tree.allocations.filter((allocation) => allocation.parentIndex === ROOT);
    assert.equal(rootNodes.length, 2);
    assert.equal(tree.topLevelMessageFees, rootNodes.reduce((sum, node) => sum + node.budget, 0n));
    assert.equal(tree.topLevelMessageFees, 82n);
  });

  console.log(`Studio-dev explicit fee allocation tests: ${passed}/9 passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
