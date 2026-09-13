import assert from "node:assert/strict";
import { MESSAGE_ALLOCATION_ROOT_PARENT_INDEX, MessageType, deriveInternalMessageCallKey } from "genlayer-js";
import { buildRepeatedInternalAllocation, assertAllocationPhase, composeJudgeKernelTargetBranches } from "./studio-dev-fee-allocation.mjs";

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
  await test("two accepted emissions to the same Target method use one allocation with summed estimate budgets", async () => {
    const repeated = targetBucket([toEstimate(11n), toEstimate(13n)], true);
    assert.equal(repeated.allocation.messageType, MessageType.Internal);
    assert.equal(repeated.allocation.onAcceptance, true);
    assert.equal(repeated.allocation.parentIndex, ROOT);
    assert.equal(repeated.allocation.recipient, TARGET);
    assert.equal(repeated.allocation.callKey, deriveInternalMessageCallKey("apply_assurance_action"));
    assert.equal(repeated.allocation.budget, 24n);
    assert.equal(repeated.repeatedEmissions, 2);
  });

  await test("different estimator-encoded feeParams stop repeated-message aggregation", async () => {
    assert.throws(
      () => targetBucket([toEstimate(11n, 100n), toEstimate(13n, 101n)], true),
      /different estimator-produced feeParams/,
    );
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
      kernelFunctionName: "receive_decision",
      targetAddress: TARGET,
      targetFunctionName: "apply_assurance_action",
      rootParentIndex: ROOT,
    });
    assert.equal(tree.allocations.length, 4);
    assert.equal(tree.allocations[0].onAcceptance, true);
    assert.equal(tree.allocations[0].parentIndex, ROOT);
    assert.equal(tree.allocations[1].onAcceptance, true);
    assert.equal(tree.allocations[1].parentIndex, 0n);
    assert.equal(tree.allocations[2].onAcceptance, false);
    assert.equal(tree.allocations[2].parentIndex, ROOT);
    assert.equal(tree.allocations[3].onAcceptance, false);
    assert.equal(tree.allocations[3].parentIndex, 2n);
  });

  await test("accepted branch budget covers both provisional effects", async () => {
    const target = targetBucket([toEstimate(11n), toEstimate(13n)], true).allocation;
    const kernel = { feeValue: 40n, distribution: { totalMessageFees: 24n }, messageAllocations: [target] };
    composeJudgeKernelTargetBranches({
      branches: [{ onAcceptance: true, targetAllocation: target, kernelEstimate: kernel }, { onAcceptance: false, targetAllocation: targetBucket([toEstimate(5n)], false).allocation, kernelEstimate: { feeValue: 6n, distribution: { totalMessageFees: 5n }, messageAllocations: [targetBucket([toEstimate(5n)], false).allocation] } }],
      kernelAddress: KERNEL, kernelFunctionName: "receive_decision", targetAddress: TARGET,
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
      kernelAddress: KERNEL, kernelFunctionName: "receive_decision", targetAddress: TARGET,
      targetFunctionName: "apply_assurance_action", rootParentIndex: ROOT,
    });
    assert.equal(finalizedTarget.budget, 59n);
    const rootNodes = tree.allocations.filter((allocation) => allocation.parentIndex === ROOT);
    assert.equal(rootNodes.length, 2);
    assert.equal(tree.topLevelMessageFees, rootNodes.reduce((sum, node) => sum + node.budget, 0n));
    assert.equal(tree.topLevelMessageFees, 82n);
  });

  console.log(`Studio-dev explicit fee allocation tests: ${passed}/7 passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
