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
assert.match(validateFeeProfileInputs([{ ...base, args: [] }], "run-a")[0], /real non-empty args/);
assert.match(validateFeeProfileInputs([base], "run-b")[0], /does not match/);
assert.match(validateFeeProfileInputs([{ ...base, id: "kernel-deploy" }], "run-a")[0], /deployment fee estimation is not supported/);
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

console.log("Fee-profile input guard: 6/6 passed");
