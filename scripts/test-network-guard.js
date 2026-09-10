#!/usr/bin/env node
// Executable tests for the foundation wrong-network preflight guard (A0-T4, NFR-CMP-001,
// TM-INF-001). Runs against the compiled @reclose/protocol-sdk output, so it also proves
// the shared package actually builds/executes, not just type-checks.

const path = require("path");
const assert = require("assert");

const distIndex = path.join(__dirname, "..", "packages", "protocol-sdk", "dist", "index.js");
let mod;
try {
  mod = require(distIndex);
} catch (e) {
  console.error(`FAIL  could not load compiled @reclose/protocol-sdk at ${distIndex} - run "npm run build -w @reclose/protocol-sdk" first`);
  console.error("  " + e.message);
  process.exit(1);
}

const { assertCanonicalChainId, isCanonicalChainId, WrongNetworkError, RECLOSE_CANONICAL_CHAIN_ID } = mod;

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    console.error(`FAIL  ${name}`);
    console.error("  " + e.message);
    failures++;
  }
}

test("canonical chain ID constant is 61997", () => {
  assert.strictEqual(RECLOSE_CANONICAL_CHAIN_ID, 61997);
});

test("accepts 61997", () => {
  assert.doesNotThrow(() => assertCanonicalChainId(61997));
  assert.strictEqual(isCanonicalChainId(61997), true);
});

test("rejects stable Studionet 61999 (CLAUDE.md Section 10 rule 2 - never substitute stable network)", () => {
  assert.throws(() => assertCanonicalChainId(61999), WrongNetworkError);
  assert.strictEqual(isCanonicalChainId(61999), false);
});

test("rejects an arbitrary incorrect chain ID", () => {
  assert.throws(() => assertCanonicalChainId(1), WrongNetworkError);
  assert.strictEqual(isCanonicalChainId(1), false);
});

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
