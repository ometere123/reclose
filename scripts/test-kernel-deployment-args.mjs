#!/usr/bin/env node
import assert from "node:assert/strict";

// Pinned GenLayer CLI 0.40.0-rc.3 parses --args values directly. Type words such as
// `int` are help-text labels, not prefixes; passing them creates literal constructor values.
function parseScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}
function serializeDeploymentArgs(argv) {
  return argv.map(parseScalar);
}

const corrected = serializeDeploymentArgs(["1", "60"]);
assert.deepEqual(corrected, [1, 60]);
const readable = JSON.stringify({ args: corrected });
assert.equal(readable, '{"args":[1,60]}');
assert.ok(!readable.includes('"int"'), "serialized calldata must not contain literal type markers");

const historicalBug = serializeDeploymentArgs(["int", "1", "int", "60"]);
assert.deepEqual(historicalBug, ["int", 1, "int", 60]);
assert.notDeepEqual(historicalBug, [1, 60]);

console.log("PASS corrected AssuranceKernel deployment args serialize as [1,60] with no type markers");
