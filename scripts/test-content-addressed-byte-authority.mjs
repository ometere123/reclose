import assert from "node:assert/strict";
import { buildEap } from "../packages/protocol-sdk/dist/evidence.js";
import { keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";
import { hashAuthoritativeBytes, normalizedFixtureMatches } from "./content-addressed-snapshot.mjs";

const lf = "condition: REMEDIATION_VERIFIED\nresult: CONFIRMED\n";
const crlf = lf.replace(/\n/g, "\r\n");
assert.notEqual(keccak256Hex(lf), keccak256Hex(crlf), "LF and CRLF must have distinct byte hashes");

const remoteBytes = new TextEncoder().encode(lf);
const remoteHash = hashAuthoritativeBytes(remoteBytes);
assert.equal(normalizedFixtureMatches(crlf, lf), true, "newline-only checkout differences are comparable");
assert.notEqual(keccak256Hex(crlf), remoteHash, "local CRLF bytes must not become the authority");

const eap = JSON.parse(buildEap({
  targetId: "test-target",
  policyHash: "0x" + "11".repeat(32),
  ruleId: "REMEDIATION_CONFIRMED_V1",
  subject: "byte authority regression",
  reporter: "0x0000000000000000000000000000000000000001",
  observedAt: "2026-01-01T00:00:00.000Z",
  retrievedAt: "2026-01-01T00:00:00.000Z",
  sources: [{
    sourceId: "snapshot",
    url: "https://example.invalid/snapshot",
    sourceClass: "CONTENT_ADDRESSED_SNAPSHOT",
    extractedText: new TextDecoder().decode(remoteBytes),
    snapshotRef: "https://example.invalid/snapshot",
    retrievedAt: "2026-01-01T00:00:00.000Z",
  }],
}));
assert.equal(eap.sources[0].contentHash, remoteHash, "EAP must bind fetched bytes");
assert.equal(eap.contentHashes[0], remoteHash, "artifact content hash must bind fetched bytes");
console.log("content-addressed byte authority regression: ok");
