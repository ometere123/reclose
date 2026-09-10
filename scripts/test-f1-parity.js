#!/usr/bin/env node
// Deterministic F1 parity check: catches JSON Schema <-> TypeScript field-name/required drift
// (A0-T2 area). This script covers field NAMES and required/optional only - it does NOT prove
// full method-signature parity (return/input shape, nested structure). That was A0-U03 (owner
// external finding): a prior version of this file called itself "full SDK parity" while
// mechanically checking only method NAMES plus three hand-written regex signatures, which is
// not what it claimed. The actual full-signature parity proof for all 14 frozen SDK methods is
// packages/protocol-sdk/src/__typetests__/sdk-parity.ts, a compile-time bidirectional
// assignability check enforced by `npm run typecheck` (part of `npm run verify`). This script
// remains a fast secondary check for schema/type field-set drift; treat sdk-parity.ts as the
// primary SDK-signature proof, not this file's method-name check below.

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const REPO_ROOT = path.join(__dirname, "..");
const SCHEMAS_DIR = path.join(REPO_ROOT, "schemas");

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

function loadSchema(relPath) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, relPath), "utf8"));
}

function schemaFieldSet(schema) {
  return new Set(Object.keys(schema.properties || {}));
}

function schemaRequiredSet(schema) {
  return new Set(schema.required || []);
}

// Extract the field set of a TypeScript interface from packages/protocol-sdk/dist/*.d.ts by
// reading the SOURCE .ts (types are erased in .js, so we parse src/types.ts directly - this is
// intentionally simple text-based extraction, not a full TS parse, since it only needs to catch
// gross field drift, not subtle type-shape bugs already covered by tsc/compile-time fixtures).
const typesSource = fs.readFileSync(path.join(REPO_ROOT, "packages/protocol-sdk/src/types.ts"), "utf8");

function extractInterfaceBody(interfaceName) {
  const re = new RegExp(`export interface ${interfaceName}(?:\\s+extends\\s+[\\w<>,\\s]+)?\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const m = typesSource.match(re);
  if (!m) throw new Error(`interface ${interfaceName} not found in types.ts`);
  return m[1];
}

function extractFields(body) {
  const fields = new Map(); // name -> { optional }
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    const m = trimmed.match(/^([A-Za-z0-9_]+)(\?)?\s*:/);
    if (m) fields.set(m[1], { optional: !!m[2] });
  }
  return fields;
}

function checkInterfaceMatchesSchema(interfaceName, schemaPath, opts = {}) {
  const schema = loadSchema(schemaPath);
  const schemaFields = schemaFieldSet(schema);
  const requiredFields = schemaRequiredSet(schema);
  const tsFields = extractFields(extractInterfaceBody(interfaceName));
  const ignore = new Set(opts.ignore || []);

  const missingInTs = [...schemaFields].filter((f) => !ignore.has(f) && !tsFields.has(f));
  const extraInTs = [...tsFields.keys()].filter((f) => !ignore.has(f) && !schemaFields.has(f));
  assert(missingInTs.length === 0, `fields in schema but missing from TS interface ${interfaceName}: ${missingInTs.join(", ")}`);
  assert(extraInTs.length === 0, `fields in TS interface ${interfaceName} but not in schema: ${extraInTs.join(", ")}`);

  for (const f of requiredFields) {
    if (ignore.has(f)) continue;
    const tsField = tsFields.get(f);
    assert(tsField, `required schema field '${f}' missing from TS interface ${interfaceName}`);
    assert(!tsField.optional, `schema field '${f}' is required but TS interface ${interfaceName} marks it optional (?)`);
  }
}

test("Target: TypeScript matches schemas/core/Target.schema.json", () => {
  checkInterfaceMatchesSchema("Target", "core/Target.schema.json");
});

test("AssuranceStateSummary: TypeScript matches schemas/core/AssuranceState.schema.json", () => {
  checkInterfaceMatchesSchema("AssuranceStateSummary", "core/AssuranceState.schema.json");
});

test("PolicySummary: TypeScript matches schemas/policy/PolicySummary.schema.json", () => {
  checkInterfaceMatchesSchema("PolicySummary", "policy/PolicySummary.schema.json");
});

test("PolicyDetail: TypeScript matches schemas/policy/PolicyDetail.schema.json", () => {
  checkInterfaceMatchesSchema("PolicyDetail", "policy/PolicyDetail.schema.json");
});

test("PolicySecurityDiff: TypeScript matches schemas/policy/PolicySecurityDiff.schema.json", () => {
  checkInterfaceMatchesSchema("PolicySecurityDiff", "policy/PolicySecurityDiff.schema.json");
});

test("Incident: TypeScript matches schemas/incident/Incident.schema.json", () => {
  checkInterfaceMatchesSchema("Incident", "incident/Incident.schema.json");
});

test("EvidenceSource: TypeScript matches schemas/evidence/EvidenceSource.schema.json", () => {
  checkInterfaceMatchesSchema("EvidenceSource", "evidence/EvidenceSource.schema.json");
});

test("DecisionRecord: TypeScript matches schemas/incident/DecisionRecord.schema.json", () => {
  checkInterfaceMatchesSchema("DecisionRecord", "incident/DecisionRecord.schema.json");
});

test("GenLayerTransactionLifecycle: TypeScript matches schemas/transaction/GenLayerTransactionLifecycle.schema.json", () => {
  checkInterfaceMatchesSchema("GenLayerTransactionLifecycle", "transaction/GenLayerTransactionLifecycle.schema.json");
});

test("ActionEnvelope: TypeScript matches schemas/transaction/ActionEnvelope.schema.json", () => {
  checkInterfaceMatchesSchema("ActionEnvelope", "transaction/ActionEnvelope.schema.json");
});

test("ExecutionReceipt: TypeScript matches schemas/transaction/ExecutionReceipt.schema.json", () => {
  checkInterfaceMatchesSchema("ExecutionReceipt", "transaction/ExecutionReceipt.schema.json");
});

test("RecoveryState: TypeScript matches schemas/recovery/RecoveryState.schema.json", () => {
  checkInterfaceMatchesSchema("RecoveryState", "recovery/RecoveryState.schema.json");
});

test("ErrorEnvelope: TypeScript matches schemas/core/ErrorEnvelope.schema.json", () => {
  checkInterfaceMatchesSchema("ErrorEnvelope", "core/ErrorEnvelope.schema.json");
});

test("FeeTransactionPreview: TypeScript matches schemas/transaction/FeeTransactionPreview.schema.json", () => {
  checkInterfaceMatchesSchema("FeeTransactionPreview", "transaction/FeeTransactionPreview.schema.json");
});

test("ActionEnvelope.boundedParameters is the canonical closed bounded-parameter container (C1R/A0-U01)", () => {
  const schema = loadSchema("transaction/ActionEnvelope.schema.json");
  assert(schema.properties.boundedParameters, "canonical boundedParameters field missing from ActionEnvelope schema");
  assert(!schema.properties.paramU256, "paramU256 must not exist as a top-level ActionEnvelope field (A0-U01)");
  assert(!schema.properties.paramStr, "paramStr must not exist as a top-level ActionEnvelope field (A0-U01)");
  const bp = schema.properties.boundedParameters;
  assert(bp.properties.paramU256, "boundedParameters.paramU256 missing");
  assert(bp.properties.paramStr, "boundedParameters.paramStr missing");
  assert(bp.additionalProperties === false, "boundedParameters must be closed (additionalProperties: false)");
  assert(schema.additionalProperties === false, "ActionEnvelope must not allow additionalProperties (closed shape)");
});

test("RecloseSDK: compiled interface contains exactly the 14 frozen method names (fast secondary check - see __typetests__/sdk-parity.ts for the real signature proof)", () => {
  const sdkSource = fs.readFileSync(path.join(REPO_ROOT, "packages/protocol-sdk/src/sdk.ts"), "utf8");
  const namesMatch = sdkSource.match(/RECLOSE_SDK_METHOD_NAMES\s*=\s*\[([\s\S]*?)\]/);
  assert(namesMatch, "RECLOSE_SDK_METHOD_NAMES constant not found in sdk.ts");
  const names = [...namesMatch[1].matchAll(/"([a-zA-Z0-9]+)"/g)].map((m) => m[1]);
  const expected = [
    "getTarget", "getAssuranceState", "getActivePolicy", "getIncident", "getDecision",
    "getDecisionView", "getEffectiveProviderStatus", "buildIncidentReport", "buildRecoveryReport",
    "validateAPM", "hashAPM", "diffAPM", "trackTransaction", "trackActionTrace",
  ];
  assert.strictEqual(names.length, 14, `expected exactly 14 SDK methods, found ${names.length}`);
  const missing = expected.filter((n) => !names.includes(n));
  const extra = names.filter((n) => !expected.includes(n));
  assert(missing.length === 0, `missing frozen SDK methods: ${missing.join(", ")}`);
  assert(extra.length === 0, `unexpected extra SDK methods: ${extra.join(", ")}`);
});

test("__typetests__/sdk-parity.ts exists and declares the bidirectional ExpectedRecloseSDK contract", () => {
  const parityTestPath = path.join(REPO_ROOT, "packages/protocol-sdk/src/__typetests__/sdk-parity.ts");
  assert(fs.existsSync(parityTestPath), "sdk-parity.ts compile-time parity test is missing");
  const src = fs.readFileSync(parityTestPath, "utf8");
  assert(/interface ExpectedRecloseSDK/.test(src), "ExpectedRecloseSDK contract not declared");
  assert(/_expectedIsAssignableToReal/.test(src) && /_realIsAssignableToExpected/.test(src),
    "bidirectional assignability assertions not present - one-way checks are not full parity");
});

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
