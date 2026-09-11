"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const sdk = require(path.join(__dirname, "..", "packages", "protocol-sdk", "dist", "index.js"));

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

// Ethereum/Keccak canonical vectors. These distinguish Keccak-256 from FIPS SHA3-256.
test("keccak256 empty vector", () => {
  assert.equal(sdk.keccak256Hex(""), "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
});

test("keccak256 abc vector", () => {
  assert.equal(sdk.keccak256Hex("abc"), "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
});

test("JCS object key order is stable", () => {
  const a = { z: 1, a: { y: true, x: "v" } };
  const b = { a: { x: "v", y: true }, z: 1 };
  assert.equal(sdk.jcsCanonicalize(a), sdk.jcsCanonicalize(b));
  assert.equal(sdk.canonicalKeccak256(a), sdk.canonicalKeccak256(b));
});

test("JCS array order remains significant", () => {
  assert.notEqual(sdk.canonicalKeccak256([1, 2]), sdk.canonicalKeccak256([2, 1]));
});

test("JCS rejects non-finite numbers", () => {
  assert.throws(() => sdk.jcsCanonicalize({ n: Infinity }));
});

test("JCS preserves Unicode strings deterministically", () => {
  const value = { text: "assurance ✓ 日本語" };
  assert.equal(sdk.jcsCanonicalize(value), JSON.stringify(value));
});

console.log(`\n${passed}/6 canonical hashing tests passed`);
