#!/usr/bin/env node
// Runtime unit tests for @reclose/policy-compiler (C3). One test deliberately reproduces the
// exact live policy-c2-002 manifest built by hand on Studio-dev during this session's C2 close
// (docs/execution/C2 Live Proof Evidence.md) to prove the compiler produces the identical call
// sequence a human operator typed manually - this is the package whose existence retires that
// manual process.

const assert = require("assert");
const path = require("path");

const { compilePolicyManifest, hashPolicyManifest, PolicyCompileError } = require(
  path.join(__dirname, "..", "packages", "policy-compiler", "dist", "index.js")
);

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

const JUDGE = "0x0A519837D3983272A14710d5b6b2108bC27D2D96";

test("compiles the exact live policy-c2-002 call sequence (3 rules, 2 resources, 4 effects)", () => {
  const manifest = {
    targetId: "reclose-target-002",
    policyKey: "policy-c2-002",
    resources: ["provider_a", "provider_b"],
    rules: [
      { ruleId: "PROVIDER_COMPROMISE_V1", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true },
      { ruleId: "REMEDIATION_CONFIRMED_V1", judge: JUDGE, judgeVersion: 1, ruleKind: "REMEDIATION", provisionalAllowed: true },
      { ruleId: "RECOVERY_VALIDATED_V1", judge: JUDGE, judgeVersion: 1, ruleKind: "RECOVERY_VALIDATION", provisionalAllowed: true },
    ],
    effects: [
      { ruleId: "PROVIDER_COMPROMISE_V1", actionType: "RESTRICT", resourceId: "provider_a", releasePhase: "REMEDIATION_CONFIRMED" },
      { ruleId: "PROVIDER_COMPROMISE_V1", actionType: "ENTER_SAFE_MODE", resourceId: "", releasePhase: "REMEDIATION_CONFIRMED" },
      { ruleId: "REMEDIATION_CONFIRMED_V1", actionType: "ENTER_RECOVERY", resourceId: "", releasePhase: "REMEDIATION_CONFIRMED" },
      { ruleId: "RECOVERY_VALIDATED_V1", actionType: "RESTORE", resourceId: "", releasePhase: "RECOVERY_VALIDATED" },
    ],
  };

  const compiled = compilePolicyManifest(manifest);
  assert.match(compiled.manifestHash, /^0x[0-9a-f]{64}$/);

  const names = compiled.calls.map((c) => c.functionName);
  assert.deepStrictEqual(names, [
    "begin_policy",
    "add_policy_resource",
    "add_policy_resource",
    "add_policy_rule",
    "add_policy_rule",
    "add_policy_rule",
    "add_policy_effect",
    "add_policy_effect",
    "add_policy_effect",
    "add_policy_effect",
    "seal_policy",
  ]);

  const begin = compiled.calls[0];
  assert.deepStrictEqual(begin.args, ["reclose-target-002", "policy-c2-002", compiled.manifestHash]);

  const restrictEffect = compiled.calls[6];
  assert.deepStrictEqual(restrictEffect.args, ["policy-c2-002", "PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1]);

  const restoreEffect = compiled.calls[9];
  assert.deepStrictEqual(restoreEffect.args, ["policy-c2-002", "RECOVERY_VALIDATED_V1", 10, "", "0", "", 2]);

  const seal = compiled.calls[compiled.calls.length - 1];
  assert.deepStrictEqual(seal.args, ["policy-c2-002"]);
});

test("manifest hash is deterministic regardless of object key order", () => {
  const a = { targetId: "t1", policyKey: "p1", resources: [], rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }], effects: [] };
  const b = { policyKey: "p1", effects: [], rules: [{ judgeVersion: 1, ruleId: "R", provisionalAllowed: true, judge: JUDGE, ruleKind: "INCIDENT" }], resources: [], targetId: "t1" };
  assert.strictEqual(hashPolicyManifest(a), hashPolicyManifest(b));
});

test("rejects an effect referencing an undeclared rule_id", () => {
  assert.throws(
    () => compilePolicyManifest({ targetId: "t1", policyKey: "p1", resources: [], rules: [], effects: [{ ruleId: "GHOST", actionType: "MONITOR", resourceId: "", releasePhase: "REMEDIATION_CONFIRMED" }] }),
    PolicyCompileError
  );
});

test("rejects a RESOURCE_SCOPED_ACTIONS effect with empty resourceId (E_KRN_013 RESOURCE_REQUIRED)", () => {
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: ["r1"],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [{ ruleId: "R", actionType: "RESTRICT", resourceId: "", releasePhase: "REMEDIATION_CONFIRMED" }],
    }),
    /resourceId is required/
  );
});

test("rejects a RESOURCE_SCOPED_ACTIONS effect referencing an undeclared resource (E_KRN_013 UNREGISTERED_RESOURCE)", () => {
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: ["r1"],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [{ ruleId: "R", actionType: "RESTRICT", resourceId: "not-declared", releasePhase: "REMEDIATION_CONFIRMED" }],
    }),
    /is not declared/
  );
});

test("rejects a TARGET_WIDE_ACTIONS effect with a non-empty resourceId", () => {
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: ["r1"],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [{ ruleId: "R", actionType: "PAUSE", resourceId: "r1", releasePhase: "REMEDIATION_CONFIRMED" }],
    }),
    /resourceId must be empty/
  );
});

test("rejects more than MAX_EFFECTS_PER_DECISION (4) enabled effects for one rule (E_KRN_005 TOO_MANY_EFFECTS)", () => {
  const effects = [];
  for (let i = 0; i < 5; i++) {
    effects.push({ ruleId: "R", actionType: "MONITOR", resourceId: "", releasePhase: "REMEDIATION_CONFIRMED" });
  }
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: [],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects,
    }),
    /MAX_EFFECTS_PER_DECISION/
  );
});

test("rejects a duplicate rule_id (E_KRN_005 DUPLICATE_RULE_ID)", () => {
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: [],
      rules: [
        { ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true },
        { ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true },
      ],
      effects: [],
    }),
    /DUPLICATE_RULE_ID/
  );
});

test("rejects judgeVersion=0 (E_KRN_005 INVALID_JUDGE_VERSION)", () => {
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: [],
      rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 0, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [],
    }),
    /judgeVersion must be a positive/
  );
});

test("rejects a malformed judge address", () => {
  assert.throws(
    () => compilePolicyManifest({
      targetId: "t1", policyKey: "p1", resources: [],
      rules: [{ ruleId: "R", judge: "not-an-address", judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
      effects: [],
    }),
    /judge must be/
  );
});

test("reportBond/confirmedBounty default to '0' and are stringified as decimal u256", () => {
  const compiled = compilePolicyManifest({
    targetId: "t1", policyKey: "p1", resources: [],
    rules: [{ ruleId: "R", judge: JUDGE, judgeVersion: 1, ruleKind: "INCIDENT", provisionalAllowed: true }],
    effects: [],
  });
  const ruleCall = compiled.calls.find((c) => c.functionName === "add_policy_rule");
  assert.strictEqual(ruleCall.args[6], "0");
  assert.strictEqual(ruleCall.args[7], "0");
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll policy-compiler tests passed.");
}
