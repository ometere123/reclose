import assert from "node:assert/strict";
import { extractDeploymentFeeProfile } from "./deployment-fee-evidence.mjs";

const tx = `0x${"a".repeat(64)}`;
const address = `0x${"b".repeat(40)}`;
const logText = `Fee deposit: 100000000000010352 wei (~0.1 GEN)\n\nfees: {\n  distribution: {\n    leaderTimeunitsAllocation: '100',\n    validatorTimeunitsAllocation: '200',\n    appealRounds: '0',\n    executionBudgetPerRound: '25000000000000000',\n    executionConsumed: '0',\n    totalMessageFees: '0',\n    rotations: [ '3' ],\n    maxPriceGenPerTimeUnit: '2',\n    storageFeeMaxGasPrice: '300000000',\n    receiptFeeMaxGasPrice: '300000000'\n  },\n  feeValue: '100000000000010352'\n}\n\nDeployment Transaction Hash:\n${tx}\nResult:\n{ 'Contract Address': '${address}' }\npaid_fee_value: '100000000000010352'\nuser_value: 0\n`;
const contract = {
  address,
  deployTxHash: tx,
  constructorArgs: [1, 60],
  lifecycle: "FINALIZED",
  executionResult: "FINISHED_WITH_RETURN",
};
const profile = extractDeploymentFeeProfile({
  id: "kernel-deploy",
  name: "Kernel deploy",
  generation: "generation-a",
  contract,
  sourceFile: "contracts/assurance_kernel.py",
  evidenceRef: "deployment/deploy.txt",
  logText,
});
assert.equal(profile.status, "ESTIMATED");
assert.equal(profile.feeValue, "100000000000010352");
assert.equal(profile.distribution.executionBudgetPerRound, "25000000000000000");
assert.deepEqual(profile.args, [1, 60]);
assert.equal(profile.liveResult.transactionHash, tx);

assert.throws(() => extractDeploymentFeeProfile({
  id: "kernel-deploy", name: "Kernel deploy", generation: "generation-a",
  contract: { ...contract, deployTxHash: `0x${"c".repeat(64)}` },
  sourceFile: "contracts/assurance_kernel.py", evidenceRef: "deployment/deploy.txt", logText,
}), /log transaction hash differs/);
assert.throws(() => extractDeploymentFeeProfile({
  id: "kernel-deploy", name: "Kernel deploy", generation: "generation-a",
  contract: { ...contract, executionResult: "FINISHED_WITH_ERROR" },
  sourceFile: "contracts/assurance_kernel.py", evidenceRef: "deployment/deploy.txt", logText,
}), /does not prove finalized successful/);

console.log("Deployment fee evidence parser: 3/3 passed");
