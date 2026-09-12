#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const skill = fs.readFileSync(path.join(ROOT, "skill.md"), "utf8");
let failures = 0;
function test(name, fn) {
  try { fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.message}`); }
}

test("skill locks the R1 chain to 61997", () => {
  assert.match(skill, /chain ID 61997/i);
});

test("skill exposes canonical safe SDK reads", () => {
  for (const method of ["getTarget", "getAssuranceState", "getActivePolicy", "getIncident", "getDecision", "getDecisionView", "getEffectiveProviderStatus", "trackTransaction", "trackActionTrace"]) {
    assert.ok(skill.includes(`\`${method}`), `missing safe read ${method}`);
  }
});

test("skill permits report preparation without custody", () => {
  assert.match(skill, /buildIncidentReport/);
  assert.match(skill, /buildRecoveryReport/);
  assert.match(skill, /does not custody the caller private key/i);
});

test("skill explicitly forbids authority expansion and owner/judge mutation", () => {
  for (const phrase of ["activate or replace policy", "change target ownership", "install or replace a Judge module", "expand delegated authority", "arbitrary calldata"]) {
    assert.ok(skill.includes(phrase), `missing forbidden authority clause: ${phrase}`);
  }
});

test("skill preserves lifecycle, decision and execution truth separation", () => {
  assert.match(skill, /ACCEPTED.*not final/i);
  assert.match(skill, /FINALIZED.*does not.*prove successful execution/i);
  assert.match(skill, /child transaction fails/i);
  assert.match(skill, /post-state verification/i);
});

test("skill documents the unresolved live child limitation", () => {
  assert.match(skill, /fee no_matching_allocation # internal/);
  assert.match(skill, /do not claim.*end-to-end live-proven/i);
});

console.log(`\n${6 - failures}/6 agent-skill checks passed.`);
if (failures) process.exit(1);
