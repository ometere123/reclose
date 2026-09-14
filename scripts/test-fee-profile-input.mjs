import assert from "node:assert/strict";
import { validateFeeProfileInputs } from "./fee-profile-input.mjs";

const base = {
  id: "kernel-call",
  name: "Kernel call",
  address: `0x${"1".repeat(40)}`,
  functionName: "receive_final_decision",
  args: ["incident-1"],
  value: "0",
  deploymentGeneration: "run-a",
};

assert.deepEqual(validateFeeProfileInputs([base], "run-a"), []);
assert.match(validateFeeProfileInputs([{ ...base, deploymentGeneration: undefined }], undefined)[0], /active deployment generation is required/);
assert.match(validateFeeProfileInputs([{ ...base, args: [] }], "run-a")[0], /real non-empty args/);
assert.match(validateFeeProfileInputs([base], "run-b")[0], /does not match/);
const deploymentProfile = {
  ...base,
  id: "kernel-deploy",
  kind: "deployment",
  functionName: "deploy",
  deploymentTxHash: `0x${"a".repeat(64)}`,
  evidenceRef: "deployment/deploy.txt",
  deploymentEvidenceReport: "release-evidence/r1/c3/fee-profile-report.json",
};
assert.deepEqual(validateFeeProfileInputs([deploymentProfile], "run-a"), []);
assert.match(validateFeeProfileInputs([{ ...deploymentProfile, deploymentTxHash: undefined }], "run-a")[0], /actual deployment tx hash is required/);
assert.match(validateFeeProfileInputs([{ ...deploymentProfile, deploymentEvidenceReport: "" }], "run-a")[0], /evidence report references are required/);
assert.deepEqual(validateFeeProfileInputs([{
  ...base,
  id: "known-accepted-failure",
  knownFailure: {
    status: "ESTIMATION_FAILED",
    error: "SystemError: 2: inval",
    evidenceRef: "diagnostic.json",
  },
}], "run-a"), []);
assert.match(validateFeeProfileInputs([{
  ...base,
  args: ["REPLACE_WITH_REAL_INCIDENT"],
}], "run-a")[0], /placeholder argument is forbidden/);

console.log("Fee-profile input guard: 9/9 passed");
