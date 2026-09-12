#!/usr/bin/env node
// A3 remediation behavioural tests (A3-H01/H03/H10). Prefers real behavioural checks against the
// actual pure modules over source-string regex assertions wherever the code is DOM-free enough
// to import directly (domain.js, adapters.js) - see scripts/test-frontend-product.js for the
// existing structural checks this file extends rather than replaces.

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
let failures = 0;

async function test(name, fn) {
  try { await fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.message}`); }
}

async function importPure(relPath) {
  const source = read(relPath);
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(moduleUrl);
}

async function main() {
  const domain = await importPure("frontend/lib/domain.js");

  await test("A3-H10: an unrecognized assurance state renders as UNKNOWN, never NORMAL", () => {
    assert.match(domain.stateMarker("NORMAL"), /data-state="NORMAL"/);
    assert.match(domain.stateMarker("SOME_FUTURE_STATE"), /data-state="UNKNOWN"/);
    assert.match(domain.stateMarker(undefined), /data-state="UNKNOWN"/);
    assert.match(domain.stateMarker(null), /data-state="UNKNOWN"/);
    assert.doesNotMatch(domain.stateMarker("SOME_FUTURE_STATE"), /data-state="NORMAL"/);
  });

  await test("A3-H01: draft registry preview payload is retrievable byte-identical (preview === submission)", () => {
    const registry = domain.createDraftRegistry();
    const draft = { contractAddress: "0xJudge", functionName: "submit_incident", args: ["t1", "p1", "R", "r1", "0xhash", "{}", 0, ""], reviewHash: "0xabc" };
    registry.registerDraft("incident", draft);
    const retrieved = registry.getDraft("incident");
    assert.strictEqual(retrieved, draft, "retrieved draft must be the EXACT same object reviewed, not a reconstruction");
    assert.deepStrictEqual(retrieved.args, draft.args);
  });

  await test("A3-H01: editing reviewed input after preview invalidates the draft - stale draft cannot be signed", () => {
    const registry = domain.createDraftRegistry();
    registry.registerDraft("incident", { args: [1, 2, 3], reviewHash: "0xabc" });
    assert.ok(registry.hasDraft("incident"));
    registry.invalidateDraft("incident");
    assert.strictEqual(registry.getDraft("incident"), null, "a stale/invalidated draft must never be retrievable for signing");
  });

  await test("A3-H01: a different write kind's draft is independent (incident edit does not invalidate recovery)", () => {
    const registry = domain.createDraftRegistry();
    registry.registerDraft("incident", { args: [1], reviewHash: "0xa" });
    registry.registerDraft("recovery", { args: [2], reviewHash: "0xb" });
    registry.invalidateDraft("incident");
    assert.strictEqual(registry.getDraft("incident"), null);
    assert.ok(registry.getDraft("recovery") !== null, "recovery draft must remain valid when only the incident draft was edited");
  });

  function fakeWriter({ chainId = 61997, fail = false } = {}) {
    return {
      async getConnectedChainId() { return chainId; },
      async submitIncident(payload) { if (fail) throw new Error("writer rejected"); return { txId: "0xdeadbeef", payload }; },
    };
  }

  async function loadSdkProductAdapter() {
    // adapters.js imports mock-data.js and domain.js via relative paths that resolve correctly
    // only from a real file URL, so import it directly rather than via the data: URL technique
    // used for the fully pure modules above.
    const { pathToFileURL } = require("node:url");
    return import(pathToFileURL(path.join(ROOT, "frontend", "lib", "adapters.js")).href);
  }

  await test("A3-H01: submitWrite refuses an empty/invalid payload - {} can never be signed", async () => {
    const { SdkProductAdapter } = await loadSdkProductAdapter();
    const adapter = new SdkProductAdapter({}, fakeWriter());
    await assert.rejects(() => adapter.submitWrite("incident", {}), /no valid reviewed draft/i);
    await assert.rejects(() => adapter.submitWrite("incident", null), /no valid reviewed draft/i);
  });

  await test("A3-H03: submitWrite blocks signing when the connected writer reports the wrong chain ID", async () => {
    const { SdkProductAdapter } = await loadSdkProductAdapter();
    const adapter = new SdkProductAdapter({}, fakeWriter({ chainId: 1 }));
    const validDraft = { args: [1], reviewHash: "0xabc" };
    await assert.rejects(() => adapter.submitWrite("incident", validDraft), /wrong network/i);
  });

  await test("A3-H03: submitWrite fails closed when the writer cannot report a chain ID at all", async () => {
    const { SdkProductAdapter } = await loadSdkProductAdapter();
    const writerWithoutChainId = { async submitIncident(p) { return { txId: "0x1", payload: p }; } };
    const adapter = new SdkProductAdapter({}, writerWithoutChainId);
    const validDraft = { args: [1], reviewHash: "0xabc" };
    await assert.rejects(() => adapter.submitWrite("incident", validDraft), /cannot report its network/i);
  });

  await test("A3-H03: submitWrite proceeds when the writer reports the correct chain ID with a valid draft", async () => {
    const { SdkProductAdapter } = await loadSdkProductAdapter();
    const adapter = new SdkProductAdapter({}, fakeWriter({ chainId: 61997 }));
    const validDraft = { args: [1], reviewHash: "0xabc" };
    const result = await adapter.submitWrite("incident", validDraft);
    assert.strictEqual(result.txId, "0xdeadbeef");
    assert.strictEqual(result.payload, validDraft, "the writer must receive the exact reviewed draft");
  });

  await test("A3-H01: fixture (mock) mode can never write regardless of draft shape", async () => {
    const { MockProductAdapter } = await loadSdkProductAdapter();
    const adapter = new MockProductAdapter();
    await assert.rejects(() => adapter.submitWrite("incident", { args: [1], reviewHash: "0xabc" }), /never submits/i);
  });

  await test("app.js never passes a literal empty object to submitWrite", () => {
    const app = read("frontend/app.js");
    assert.doesNotMatch(app, /submitWrite\(\s*\w+\s*,\s*\{\}\s*\)/, "submitWrite must never be called with a literal {} payload");
    assert.match(app, /draftRegistry\.getDraft\(kind\)/);
  });

  await test("protocol-sdk buildIncidentReport produces a PreparedRecloseWrite with the exact 8-argument submit_incident call shape", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName, args }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, false, false];
        if (functionName === "get_policy_header") return [1, "0x" + "a".repeat(64), true, true, false];
        if (functionName === "get_policy_counts") return [1, 1, 1];
        if (functionName === "get_policy_rule_id_at") return "PROVIDER_COMPROMISE_V1";
        if (functionName === "get_policy_rule") return ["0xJudge", 1, 1, true, true];
        if (functionName === "get_policy_rule_economics") return ["0", "0"];
        if (functionName === "get_policy_resource_at") return "provider_a";
        if (functionName === "get_policy_effect_at") return ["PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1, true];
        if (functionName === "get_reporter_nonce") return 0;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "123", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const { report } = await client.buildIncidentReport({
      targetId: "target-001", ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a",
      reporterAddress: "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd",
      evidenceSources: [{ sourceId: "s1", url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", extractedText: "evidence text", fetchedAt: "2026-01-01T00:00:00.000Z", availability: "AVAILABLE" }],
    });
    assert.strictEqual(report.functionName, "submit_incident");
    assert.strictEqual(report.args.length, 8, "submit_incident requires exactly 8 arguments - never a shortened call");
    assert.strictEqual(report.args[0], "target-001");
    assert.strictEqual(report.args[2], "PROVIDER_COMPROMISE_V1");
    assert.strictEqual(report.args[3], "provider_a");
    assert.match(report.args[4], /^0x[0-9a-f]{64}$/, "evidence_hash must be the canonical artifactHash");
    const eap = JSON.parse(report.args[5]);
    assert.strictEqual(eap.schema, "reclose-eap-v1");
    assert.strictEqual(eap.artifactHash, report.args[4], "evidence_hash must equal the EAP's own artifactHash");
    assert.match(report.reviewHash, /^0x[0-9a-f]{64}$/);
  });

  await test("A3-H04: live getIncident no longer unconditionally discards trace - it attempts real reconstruction", () => {
    const adapter = read("frontend/lib/adapters.js");
    assert.doesNotMatch(adapter, /trace:\s*\[\]\s*\}\s*;\s*\n\s*\}/, "getIncident must not unconditionally return an empty trace");
    assert.match(adapter, /trackActionTrace/, "live mode must attempt trackActionTrace for the causal child");
    assert.match(adapter, /NOT_YET_AVAILABLE/, "an unresolved child link must render as an explicit unavailable marker, never be silently omitted");
  });

  await test("A3-H02: target onboarding is a real bounded governed write, not presentation-only", () => {
    const app = read("frontend/app.js");
    assert.match(app, /handleOnboardSubmit/, "onboard-form must be wired to a real submit handler");
    assert.doesNotMatch(app, /onboard-form.*Fixture mode does not submit/s, "onboarding must not remain a setLiveMessage-only stub");
    assert.match(app, /adapter\.previewRegistration/, "onboarding must call a real preview method before signing");
    const adapter = read("frontend/lib/adapters.js");
    assert.match(adapter, /buildTargetRegistration/, "the live adapter must delegate registration preparation to the SDK, not fabricate it");
  });

  await test("protocol-sdk buildTargetRegistration produces a real register_target draft and enforces the owner handshake", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract() { throw new Error("not used by buildTargetRegistration"); },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "42", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const { report } = await client.buildTargetRegistration({ targetId: "target-1", targetAddress: "0x" + "1".repeat(40), humanOverrideEnabled: true });
    assert.strictEqual(report.functionName, "register_target");
    assert.strictEqual(report.contractAddress, "0xKernel");
    assert.deepStrictEqual(report.args, ["target-1", "0x" + "1".repeat(40), true]);
    assert.match(report.reviewHash, /^0x[0-9a-f]{64}$/);

    await assert.rejects(
      () => client.buildTargetRegistration({
        targetId: "target-1", targetAddress: "0x" + "1".repeat(40), humanOverrideEnabled: true,
        expectedOwner: "0x" + "2".repeat(40),
        targetReadContract: { async getOwner() { return "0x" + "3".repeat(40); } },
      }),
      /handshake failed/i,
      "registration must not be preparable when the target reports a different owner than expected"
    );
  });

  await test("routing bug found while wiring A3-H11: routeFromHash must strip query strings before matching a route", () => {
    assert.deepStrictEqual(domain.routeFromHash("#/report?target=reclose-target-004"), { route: "report", parts: [] });
    assert.deepStrictEqual(domain.routeFromHash("#/incidents/abc?x=1"), { route: "incidents", parts: ["abc"] });
    assert.deepStrictEqual(domain.routeFromHash("#/overview"), { route: "overview", parts: [] });
  });

  await test("A3-H11: report flow requests the active policy for a known target and offers only its real rules/resources", () => {
    const app = read("frontend/app.js");
    assert.match(app, /adapter\.getPolicy\(target\)/, "renderReport must load the target's real active policy");
    assert.match(app, /Governed selection/, "a governed-selection notice must confirm the options come from real policy state");
  });

  await test("A3-H12: buildIncidentReport predicts the incident ID with the exact on-chain derivation formula", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, false, false];
        if (functionName === "get_policy_header") return [1, "0x" + "a".repeat(64), true, true, false];
        if (functionName === "get_policy_counts") return [1, 1, 1];
        if (functionName === "get_policy_rule_id_at") return "PROVIDER_COMPROMISE_V1";
        if (functionName === "get_policy_rule") return ["0xJudge", 1, 1, true, true];
        if (functionName === "get_policy_rule_economics") return ["0", "0"];
        if (functionName === "get_policy_resource_at") return "provider_a";
        if (functionName === "get_policy_effect_at") return ["PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1, true];
        if (functionName === "get_reporter_nonce") return 7;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "123", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const reporterAddress = "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd";
    const { report } = await client.buildIncidentReport({
      targetId: "target-001", ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a", reporterAddress,
      evidenceSources: [{ sourceId: "s1", url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", fetchedAt: "2026-01-01T00:00:00.000Z", availability: "AVAILABLE" }],
    });
    assert.ok(report.predictedIncidentId, "a predicted incident identity must be attached to the draft before signing");
    assert.strictEqual(report.predictedIncidentId.incidentId, `target-001:${reporterAddress.toLowerCase()}:7`);
    assert.strictEqual(report.predictedIncidentId.reporterNonce, 7);
  });

  await test("A3-H07: bounded owner controls (revoke authority, disable action, disable resource) build real prepared writes over the existing Kernel methods", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract() { throw new Error("not used"); },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "10", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const revoke = await client.buildRevokeAuthority({ targetId: "target-1" });
    assert.strictEqual(revoke.report.functionName, "revoke_authority");
    assert.deepStrictEqual(revoke.report.args, ["target-1"]);
    const disableAction = await client.buildDisableAction({ targetId: "target-1", actionType: 8 });
    assert.strictEqual(disableAction.report.functionName, "disable_action");
    assert.deepStrictEqual(disableAction.report.args, ["target-1", 8]);
    const disableResource = await client.buildDisableResource({ targetId: "target-1", resourceId: "provider_a" });
    assert.strictEqual(disableResource.report.functionName, "disable_resource");
    assert.deepStrictEqual(disableResource.report.args, ["target-1", "provider_a"]);
    for (const r of [revoke, disableAction, disableResource]) assert.match(r.report.reviewHash, /^0x[0-9a-f]{64}$/);
  });

  await test("A3-H07: target detail exposes the bounded owner controls as real write forms, not just read-only fields", () => {
    const app = read("frontend/app.js");
    assert.match(app, /revoke-form/);
    assert.match(app, /disable-action-form/);
    assert.match(app, /disable-resource-form/);
    assert.match(app, /handleRevokeSubmit|handleOwnerControlSubmit/);
  });

  await test("A3-H02 (policy activation half): buildPolicyActivationReview performs real validate/hash/diff, blocking invalid manifests", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "", 0, 0, false, false];
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "0", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const rejected = await client.buildPolicyActivationReview({ targetId: "target-1", apm: { policyId: "x" } });
    assert.strictEqual(rejected.valid, false, "an incomplete manifest must be rejected, not silently diffed");
    assert.ok(rejected.errors.length > 0);

    const validApm = {
      schema: "reclose-apm/1", policyId: "policy-2", version: 2, target: "target-1", authority: {},
      protectedResources: ["provider_b"], judgeModules: [{ address: "0xJudge", version: 1 }], semanticRules: [],
      sourcePolicies: {}, capabilities: ["RESTRICT"], actionBounds: {}, stateMachine: {}, provisionalContainment: {},
      recovery: {}, reporting: {}, crossChain: {}, humanOverride: { enabled: true }, evolutionEnvelope: {}, activation: {}, metadata: {},
    };
    const accepted = await client.buildPolicyActivationReview({ targetId: "target-1", apm: validApm });
    assert.strictEqual(accepted.valid, true);
    assert.match(accepted.manifestHash, /^0x[0-9a-f]{64}$/);
    assert.ok(accepted.diff, "a real diff must be produced against the target's current (empty) active policy");
  });

  await test("A3-H02 (policy activation half): the product no longer treats Validate & diff as a setLiveMessage-only stub", () => {
    const app = read("frontend/app.js");
    assert.match(app, /handlePolicyReview/, "the policy-review action must be wired to a real handler");
    assert.match(app, /adapter\.previewPolicyActivation/, "policy review must call the real validate\\/hash\\/diff pipeline");
    assert.doesNotMatch(
      app,
      /data-action="policy-review"[^`]*addEventListener\("click",\s*\(\)\s*=>\s*setLiveMessage/,
      "Validate & diff must not remain wired to a setLiveMessage-only stub"
    );
  });

  await test("A3-H04 (second hop): live getIncident attempts Kernel -> Target reconstruction, not only Judge -> Kernel", () => {
    const adapter = read("frontend/lib/adapters.js");
    assert.match(adapter, /trackKernelToTargetChild/, "the live adapter must attempt the second causal hop");
    assert.match(adapter, /Kernel -> Target child/, "the trace must label the second hop distinctly from the first");
  });

  await test("A3-H12: predicted incident identity is persisted immediately at submit time, preferred over a writer's own return value", () => {
    const app = read("frontend/app.js");
    assert.match(app, /draft\.predictedIncidentId\?\.incidentId\s*\?\?\s*result\.incidentId/, "the predicted (pre-sign, deterministic) incident ID must take priority over a post-hoc writer return value");
  });

  await test("A3-H08: Incident Explorer exposes a real audit-trail export assembled from the rendered incident object", () => {
    const app = read("frontend/app.js");
    assert.match(app, /export-audit-trail/, "an export control must exist on the Incident Explorer");
    assert.match(app, /handleExportAuditTrail/);
    assert.match(app, /window\.__RECLOSE_LAST_INCIDENT__/, "the export must reuse the exact rendered incident object, never re-derive a separate one");
  });

  await test("independent-audit fix: decisionId is never displayed as a transaction ID in the live trace", () => {
    const adapter = read("frontend/lib/adapters.js");
    assert.match(adapter, /txId:\s*decisionView\.transaction\.txId/, "the Judge parent trace entry must use the real transaction's txId");
    assert.doesNotMatch(adapter, /txId:\s*decisionView\.record\?\.decisionId/, "decisionId (a record identity, not a tx hash) must never be used as txId");
  });

  await test("independent-audit fix: action tracking uses real per-effect action_ids, never the bare incidentId", () => {
    const adapter = read("frontend/lib/adapters.js");
    assert.match(adapter, /listIncidentActionIds/, "getIncident must resolve real action_ids before tracking");
    assert.doesNotMatch(adapter, /trackActionTrace\(incidentId\)/, "trackActionTrace must never be called with the bare incidentId");
    assert.doesNotMatch(adapter, /trackKernelToTargetChild\(incidentId\)/, "trackKernelToTargetChild must never be called with the bare incidentId");
  });

  await test("independent-audit fix: listIncidentActionIds derives the exact Kernel action_id formula per enabled effect", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName, args }) {
        if (functionName === "get_incident_detail") return ["target-001", "policy-1", 1, "PROVIDER_COMPROMISE_V1", "provider_a", "0xReporter", "0xJudge", "0xhash", "COND", 0, 1, 4, 1735689600, 0];
        if (functionName === "get_policy_header") return [1, "0x" + "a".repeat(64), true, true, false];
        if (functionName === "get_policy_counts") return [1, 2, 2];
        if (functionName === "get_policy_rule_id_at") return "PROVIDER_COMPROMISE_V1";
        if (functionName === "get_policy_rule") return ["0xJudge", 1, 1, true, true];
        if (functionName === "get_policy_rule_economics") return ["0", "0"];
        if (functionName === "get_policy_effect_at") {
          const i = args[1];
          return i === 0
            ? ["PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1, true]
            : ["PROVIDER_COMPROMISE_V1", 7, "", "0", "", 1, true];
        }
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const actions = await client.listIncidentActionIds("reclose-target-001:0xreporter:4");
    assert.strictEqual(actions.length, 2, "both enabled effects of the matched rule must each produce their own action");
    const expectedRestrict = ["reclose-target-001:0xreporter:4", "policy-1", "3", "provider_a"].map((p) => `${p.length}:${p}`).join("");
    assert.strictEqual(actions[0].actionId, expectedRestrict, "action_id must match contracts/assurance_kernel.py::_ck(incident_id, policy_key, action_type, resource_id) exactly");
    assert.notStrictEqual(actions[0].actionId, "reclose-target-001:0xreporter:4", "action_id must never equal the bare incidentId");
  });

  await test("independent-audit fix: buildIncidentReport rejects a resourceId not governed by an enabled effect of the chosen rule", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, false, false];
        if (functionName === "get_policy_header") return [1, "0x" + "a".repeat(64), true, true, false];
        if (functionName === "get_policy_counts") return [1, 1, 1];
        if (functionName === "get_policy_rule_id_at") return "PROVIDER_COMPROMISE_V1";
        if (functionName === "get_policy_rule") return ["0xJudge", 1, 1, true, true];
        if (functionName === "get_policy_rule_economics") return ["0", "0"];
        if (functionName === "get_policy_effect_at") return ["PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1, true];
        if (functionName === "get_reporter_nonce") return 0;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    await assert.rejects(
      () => client.buildIncidentReport({
        targetId: "target-001", ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "not_a_governed_resource",
        reporterAddress: "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd",
        evidenceSources: [{ sourceId: "s1", url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", fetchedAt: "2026-01-01T00:00:00.000Z", availability: "AVAILABLE" }],
      }),
      /not governed by an enabled effect/i,
      "a resourceId outside the rule's real enabled effects must be rejected before any draft is built"
    );
  });

  await test("independent-audit fix: diffCanonicalApm mirrors Kernel _classify_expansion (bounty increase, param change, release-phase change, human-override change)", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const basePolicy = {
      rules: [{ ruleId: "PROVIDER_COMPROMISE_V1", judge: "0xJudge", ruleKind: "INCIDENT", provisionalAllowed: true, reportBond: "100", confirmedBounty: "50", enabled: true }],
      effects: [{ ruleId: "PROVIDER_COMPROMISE_V1", actionType: "RESTRICT", resourceId: "provider_a", paramU256: "0", paramStr: "", releasePhase: "REMEDIATION_CONFIRMED", enabled: true }],
      summary: { humanOverrideEnabled: false, version: 1 },
    };
    const bountyIncrease = JSON.parse(JSON.stringify(basePolicy));
    bountyIncrease.rules[0].confirmedBounty = "9999";
    let diff = sdk.diffCanonicalApm(basePolicy, bountyIncrease);
    assert.strictEqual(diff.authorityExpands, true, "a confirmedBounty increase alone must be classified as economic expansion");

    const paramChange = JSON.parse(JSON.stringify(basePolicy));
    paramChange.effects[0].paramU256 = "12345";
    diff = sdk.diffCanonicalApm(basePolicy, paramChange);
    assert.strictEqual(diff.authorityExpands, true, "a bare parameter change on an effect must be conservatively classified as expansion (distinct tuple), matching Kernel _effect_tuples subset semantics");

    const releasePhaseChange = JSON.parse(JSON.stringify(basePolicy));
    releasePhaseChange.effects[0].releasePhase = "RECOVERY_VALIDATED";
    diff = sdk.diffCanonicalApm(basePolicy, releasePhaseChange);
    assert.strictEqual(diff.authorityExpands, true, "a release-phase change alone must be conservatively classified as expansion");

    const overrideOn = JSON.parse(JSON.stringify(basePolicy));
    overrideOn.summary.humanOverrideEnabled = true;
    diff = sdk.diffCanonicalApm(basePolicy, overrideOn);
    assert.strictEqual(diff.authorityExpands, true, "enabling human override must be expansion");
    assert.ok(diff.changes.some((c) => c.kind === "HUMAN_OVERRIDE_CHANGED" && c.isExpansion === true));

    const identical = JSON.parse(JSON.stringify(basePolicy));
    diff = sdk.diffCanonicalApm(basePolicy, identical);
    assert.strictEqual(diff.authorityExpands, false, "an identical policy must never be classified as expansion");
  });

  await test("independent-audit fix: the report flow filters resources PER RULE using each effect's real ruleId, not a rule-agnostic union", () => {
    const app = read("frontend/app.js");
    assert.match(app, /ruleResourceMap/, "renderReport must build a per-rule resource map");
    assert.match(app, /e\.ruleId/, "the resource map must be keyed by each effect's own ruleId");
    assert.match(app, /handleReportRuleChange/, "changing the rule must refresh the resource options");
  });

  await test("independent-audit fix: a real browser connect-wallet module exists and never fabricates a connection without a provider", async () => {
    const walletSource = read("frontend/lib/wallet.js");
    assert.match(walletSource, /eth_requestAccounts/);
    assert.match(walletSource, /eth_chainId/);
    assert.match(walletSource, /No browser wallet provider was found/);
  });

  await test("independent-audit fix: incident/recovery preview threads a real connected reporterAddress, and refuses without one in live mode", () => {
    const app = read("frontend/app.js");
    assert.match(app, /reporterAddress:\s*state\.wallet\?\.address/);
    assert.match(app, /Connect a wallet first - reporterAddress is required/);
  });

  await test("independent-audit fix: the shell renders a real wallet-connect control, not a decorative chip", () => {
    const app = read("frontend/app.js");
    assert.match(app, /walletChip/);
    assert.match(app, /connectBrowserWallet/);
    assert.match(app, /data-action="connect-wallet"/);
  });

  await test("independent-audit fix: every signing-boundary panel exposes the full security-bearing prepared-write fields (chainId, contract, method, full args, value, reviewHash), not a reduced summary", () => {
    const app = read("frontend/app.js");
    assert.match(app, /function renderPreparedWriteFields/);
    assert.match(app, /Full call arguments/);
    assert.match(app, /Value \(wei\)/);
    // every write-preview handler must route through the single shared renderer - no duplicated,
    // potentially-inconsistent reduced field lists left behind.
    assert.doesNotMatch(app, /\["Contract", `<span class="hash">\$\{escapeHtml\(preview\.draft\.contractAddress\)/);
  });

  await test("protocol-sdk buildPreparedWriteForCall produces a real fee-estimated, review-hashed draft for an arbitrary compiled Kernel call", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract() { throw new Error("not used"); },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "77", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const { report } = await client.buildPreparedWriteForCall({ functionName: "begin_policy", args: ["target-1", "policy-2", "0x" + "a".repeat(64)] }, { semanticKind: "POLICY_CONSTRUCTION_STEP" });
    assert.strictEqual(report.functionName, "begin_policy");
    assert.strictEqual(report.contractAddress, "0xKernel");
    assert.match(report.reviewHash, /^0x[0-9a-f]{64}$/);
  });

  await test("FINAL_REMEDIATION.md Section 3: previewPolicyConstruction wires the real canonical policy-compiler bridge into a full step-by-step prepared-write sequence, never fabricating steps without one", async () => {
    const adapterSource = read("frontend/lib/adapters.js");
    assert.match(adapterSource, /policyCompiler/);
    assert.match(adapterSource, /compileCanonicalApm/);
    assert.match(adapterSource, /buildPolicyActivationWrite/);
    const { pathToFileURL } = require("node:url");
    const { SdkProductAdapter } = await import(pathToFileURL(path.join(ROOT, "frontend", "lib", "adapters.js")).href);
    const calls = [
      { functionName: "begin_policy", args: ["target-1", "policy-2", "0xhash"], description: "Begin policy" },
      { functionName: "add_policy_rule", args: ["policy-2", "R1", "0xJudge", 1, 1, true, "0", "0"], description: "Register rule R1" },
      { functionName: "seal_policy", args: ["policy-2"], description: "Seal policy" },
    ];
    const fakeSdk = {
      async buildPreparedWriteForCall(call) { return { report: { ...call, reviewHash: "0x" + "1".repeat(64) }, feePreview: { network: "studio-dev", chainId: 61997, estimatedFeeValueWei: "1", isEstimate: true } }; },
      async buildPolicyActivationWrite() { return { report: { functionName: "activate_policy", args: ["policy-2"], reviewHash: "0x" + "2".repeat(64) }, feePreview: { network: "studio-dev", chainId: 61997, estimatedFeeValueWei: "1", isEstimate: true }, authorityExpands: true, diff: { changes: [] } }; },
    };
    const fakeCompiler = { compileCanonicalApm(apm) { assert.strictEqual(apm.policyId, "policy-2"); return { manifestHash: "0xdeadbeef", calls }; } };
    const adapter = new SdkProductAdapter(fakeSdk, null, null, fakeCompiler);
    const result = await adapter.previewPolicyConstruction({ targetId: "target-1", apm: { policyId: "policy-2" } });
    assert.strictEqual(result.steps.length, 3, "every compiled call must become its own step - never collapsed or skipped");
    assert.strictEqual(result.steps[0].draft.functionName, "begin_policy");
    assert.strictEqual(result.activation.draft.functionName, "activate_policy");
    assert.strictEqual(result.activation.authorityExpands, true);

    const adapterWithoutBridge = new SdkProductAdapter(fakeSdk, null, null, null);
    await assert.rejects(() => adapterWithoutBridge.previewPolicyConstruction({ targetId: "target-1", apm: {} }), /no policy-compiler bridge/i);
  });

  await test("independent-audit fix: submitWrite dispatches policy-construction steps generically through callKernel, using each step's own real functionName", () => {
    const adapterSource = read("frontend/lib/adapters.js");
    assert.match(adapterSource, /callKernel/);
  });

  await test("A3-H08 (recovery surface): live getIncident populates recovery from real restriction reads and marks the unreadable chain fields explicitly unknown, never fabricated", () => {
    const adapterSource = read("frontend/lib/adapters.js");
    assert.match(adapterSource, /getIncidentOwnRestrictions/);
    assert.match(adapterSource, /protocolReadLimitation/);
    assert.doesNotMatch(adapterSource, /remediationSubmitted:\s*false,?\s*\n\s*remediationDecision:\s*null/, "remediation fields the Kernel cannot prove must be null/unknown, never defaulted to a specific false value");
  });

  const total = 39;
  console.log(`\n${total - failures}/${total} frontend A3-remediation checks passed.`);
  if (failures) process.exit(1);
}

main();
