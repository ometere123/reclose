const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const FEE_FIELDS = [
  "leaderTimeunitsAllocation",
  "validatorTimeunitsAllocation",
  "appealRounds",
  "executionBudgetPerRound",
  "executionConsumed",
  "totalMessageFees",
  "maxPriceGenPerTimeUnit",
  "storageFeeMaxGasPrice",
  "receiptFeeMaxGasPrice",
];

function matchOne(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`deployment evidence is missing ${label}`);
  return match[1];
}

export function extractDeploymentFeeProfile({ id, name, generation, contract, sourceFile, evidenceRef, logText }) {
  if (!contract || !ADDRESS.test(String(contract.address ?? ""))) throw new Error(`${id}: manifest contract address is invalid`);
  if (!TX_HASH.test(String(contract.deployTxHash ?? ""))) throw new Error(`${id}: manifest deployment transaction hash is invalid`);
  if (!Array.isArray(contract.constructorArgs) || contract.constructorArgs.length === 0) throw new Error(`${id}: real constructor arguments are required`);
  if (contract.lifecycle !== "FINALIZED" || !String(contract.executionResult ?? "").includes("FINISHED_WITH_RETURN")) {
    throw new Error(`${id}: manifest does not prove finalized successful deployment execution`);
  }

  const txHash = matchOne(logText, /Deployment Transaction Hash:\s*\r?\n\s*(0x[0-9a-fA-F]{64})/, "deployment transaction hash");
  if (txHash.toLowerCase() !== contract.deployTxHash.toLowerCase()) throw new Error(`${id}: log transaction hash differs from the active manifest`);
  const loggedAddress = matchOne(logText, /'Contract Address':\s*'(0x[0-9a-fA-F]{40})'/, "deployed contract address");
  if (loggedAddress.toLowerCase() !== contract.address.toLowerCase()) throw new Error(`${id}: log contract address differs from the active manifest`);

  const feeMatch = logText.match(/fees:\s*\{\s*distribution:\s*\{([\s\S]*?)\r?\n\s*\},\s*feeValue:\s*'([0-9]+)'\s*\}/);
  if (!feeMatch) throw new Error(`${id}: deployment evidence is missing the SDK-derived fee distribution`);
  const [, distributionText, parsedFeeValue] = feeMatch;
  if (!distributionText || !parsedFeeValue) throw new Error(`${id}: fee preset could not be parsed`);

  const distribution = {};
  for (const field of FEE_FIELDS) {
    distribution[field] = matchOne(distributionText, new RegExp(`\\b${field}:\\s*'([^']+)'`), `distribution.${field}`);
  }
  const rotations = distributionText.match(/\brotations:\s*\[\s*'([^']+)'\s*\]/);
  if (!rotations) throw new Error(`${id}: distribution.rotations is missing`);
  distribution.rotations = [rotations[1]];

  const deposit = matchOne(logText, /Fee deposit:\s*([0-9]+)\s+wei/, "fee deposit");
  if (deposit !== parsedFeeValue) throw new Error(`${id}: displayed deposit differs from the SDK feeValue`);
  const paidValue = matchOne(logText, /paid_fee_value:\s*'([0-9]+)'/, "receipt paid_fee_value");
  if (paidValue !== parsedFeeValue) throw new Error(`${id}: receipt paid_fee_value differs from the SDK feeValue`);
  const userValue = matchOne(logText, /user_value:\s*([0-9]+)/, "deployment user value");
  if (userValue !== "0") throw new Error(`${id}: expected a zero-value deployment, found ${userValue}`);

  return {
    id,
    name,
    address: contract.address,
    functionName: "deploy",
    args: contract.constructorArgs,
    value: userValue,
    deploymentGeneration: generation,
    sourceFile,
    deploymentTxHash: contract.deployTxHash,
    evidenceRef: evidenceRef.replaceAll("\\", "/"),
    status: "ESTIMATED",
    estimationMethod: "pinned GenLayer CLI deploy fee resolution; SDK-derived FeesDistribution captured in the successful deployment log",
    feeValue: parsedFeeValue,
    distribution,
    messageAllocations: [],
    liveResult: {
      transactionHash: contract.deployTxHash,
      lifecycle: contract.lifecycle,
      executionResult: contract.executionResult,
    },
  };
}
