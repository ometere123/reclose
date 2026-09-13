import {
  deriveInternalMessageCallKey,
  encodeInternalMessageFeeParams,
  MessageType,
} from "genlayer-js";

function asBigInt(value, label) {
  try { return BigInt(value); } catch { throw new Error(`${label} is not an integer: ${String(value)}`); }
}

function isInternalMessageType(value) {
  return Number(value) === Number(MessageType.Internal) || String(value).toLowerCase() === "internal";
}

export function assertAllocationPhase(allocation, expectedOnAcceptance, label = "message allocation") {
  if (Boolean(allocation?.onAcceptance) !== Boolean(expectedOnAcceptance)) {
    throw new Error(`${label} phase mismatch: allocation onAcceptance=${Boolean(allocation?.onAcceptance)}, emitted phase=${Boolean(expectedOnAcceptance)}`);
  }
}

/** Create one mode-2 allocation bucket for repeated, identical internal emissions. */
export function buildRepeatedInternalAllocation({
  estimates,
  recipient,
  functionName,
  onAcceptance,
  rootParentIndex,
}) {
  if (!Array.isArray(estimates) || estimates.length === 0) throw new Error("At least one real child estimate is required.");
  const feeParamsByEmission = estimates.map((estimate, index) => {
    if (!estimate?.distribution) throw new Error(`Target estimate ${index} has no SDK fee distribution.`);
    return encodeInternalMessageFeeParams(estimate.distribution);
  });
  const uniqueParams = [...new Set(feeParamsByEmission.map((params) => params.toLowerCase()))];
  if (uniqueParams.length !== 1) {
    throw new Error(`Repeated ${functionName} emissions have different estimator-produced feeParams; refusing to combine: ${JSON.stringify(feeParamsByEmission)}`);
  }

  const feeValues = estimates.map((estimate, index) => asBigInt(estimate.feeValue, `Target estimate ${index} feeValue`));
  const totalBudget = feeValues.reduce((sum, value) => sum + value, 0n);
  const allocation = {
    messageType: MessageType.Internal,
    onAcceptance: Boolean(onAcceptance),
    parentIndex: BigInt(rootParentIndex),
    recipient,
    callKey: deriveInternalMessageCallKey(functionName),
    budget: totalBudget,
    feeParams: feeParamsByEmission[0],
  };
  return { allocation, feeParamsByEmission, feeValues, totalBudget, repeatedEmissions: estimates.length };
}

/** Build the complete phase-separated Judge -> Kernel -> Target tree after both child simulations pass. */
export function composeJudgeKernelTargetBranches({
  branches,
  kernelAddress,
  kernelFunctionName,
  targetAddress,
  targetFunctionName,
  rootParentIndex,
}) {
  if (!Array.isArray(branches) || branches.length !== 2) throw new Error("Expected accepted and finalized Kernel estimates.");
  const accepted = branches.find((branch) => branch.onAcceptance === true);
  const finalized = branches.find((branch) => branch.onAcceptance === false);
  if (!accepted || !finalized) throw new Error("Both accepted and finalized Kernel estimates are required.");
  const root = BigInt(rootParentIndex);
  const targetCallKey = deriveInternalMessageCallKey(targetFunctionName);
  const allocations = [];

  for (const branch of [accepted, finalized]) {
    const label = branch.onAcceptance ? "accepted Kernel->Target" : "finalized Kernel->Target";
    const targetAllocation = branch.targetAllocation;
    assertAllocationPhase(targetAllocation, branch.onAcceptance, label);
    if (targetAllocation.messageType !== MessageType.Internal ||
        BigInt(targetAllocation.parentIndex) !== root ||
        String(targetAllocation.recipient).toLowerCase() !== targetAddress.toLowerCase() ||
        String(targetAllocation.callKey).toLowerCase() !== targetCallKey.toLowerCase()) {
      throw new Error(`${label} allocation does not match the expected internal Target call, phase, and root parent.`);
    }

    const kernelEstimate = branch.kernelEstimate;
    const estimatedChildren = Array.isArray(kernelEstimate?.messageAllocations) ? kernelEstimate.messageAllocations : [];
    if (estimatedChildren.length !== 1) {
      throw new Error(`${label} Kernel simulation did not return exactly one validated repeated-emission allocation (returned ${estimatedChildren.length}).`);
    }
    const estimatedChild = estimatedChildren[0];
    assertAllocationPhase(estimatedChild, branch.onAcceptance, `${label} SDK readback`);
    if (!isInternalMessageType(estimatedChild.messageType) ||
        BigInt(estimatedChild.parentIndex) !== root ||
        String(estimatedChild.recipient).toLowerCase() !== targetAddress.toLowerCase() ||
        String(estimatedChild.callKey).toLowerCase() !== targetCallKey.toLowerCase() ||
        BigInt(estimatedChild.budget) !== BigInt(targetAllocation.budget) ||
        String(estimatedChild.feeParams).toLowerCase() !== String(targetAllocation.feeParams).toLowerCase()) {
      throw new Error(`${label} SDK estimate did not preserve the exact explicit Target allocation supplied to the simulation.`);
    }
    const kernelMessageFees = asBigInt(kernelEstimate?.distribution?.totalMessageFees, `${label} Kernel distribution.totalMessageFees`);
    if (kernelMessageFees !== BigInt(targetAllocation.budget)) {
      throw new Error(`${label} Kernel estimate totalMessageFees (${kernelMessageFees}) does not equal the exact Target allocation budget (${targetAllocation.budget}).`);
    }
    const kernelBudget = asBigInt(kernelEstimate.feeValue, `${label} Kernel feeValue`);
    if (kernelBudget < BigInt(targetAllocation.budget)) {
      throw new Error(`${label} Kernel feeValue (${kernelBudget}) does not cover its Target child allocation (${targetAllocation.budget}); refusing to inflate it.`);
    }

    const kernelNodeIndex = BigInt(allocations.length);
    allocations.push({
      messageType: MessageType.Internal,
      onAcceptance: branch.onAcceptance,
      parentIndex: root,
      recipient: kernelAddress,
      callKey: deriveInternalMessageCallKey(kernelFunctionName),
      budget: kernelBudget,
      feeParams: encodeInternalMessageFeeParams(kernelEstimate.distribution),
    });
    allocations.push({ ...estimatedChild, parentIndex: kernelNodeIndex });
  }

  const topLevelMessageFees = allocations
    .filter((allocation) => BigInt(allocation.parentIndex) === root)
    .reduce((sum, allocation) => sum + BigInt(allocation.budget), 0n);
  return { allocations, topLevelMessageFees };
}
