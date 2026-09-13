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
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwnerAbc", 0, "policy-1", 0, 0, false, false];
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "10", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const revoke = await client.buildRevokeAuthority({ targetId: "target-1" });
    assert.strictEqual(revoke.report.functionName, "revoke_authority");
    assert.deepStrictEqual(revoke.report.args, ["target-1"]);
    assert.strictEqual(revoke.report.expectedSigner, "0xOwnerAbc", "the expected signer must be the target's real cached owner, not omitted");
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

  await test("FINAL_REMEDIATION.md Section 3 (sequential state machine): construction steps are compiled as a plan and built ONE AT A TIME, never pre-built/pre-estimated all at once", async () => {
    const adapterSource = read("frontend/lib/adapters.js");
    assert.match(adapterSource, /policyCompiler/);
    assert.match(adapterSource, /compileCanonicalApm/);
    assert.match(adapterSource, /compilePolicyConstruction/);
    assert.match(adapterSource, /buildPolicyConstructionStep/);
    assert.match(adapterSource, /buildPolicyActivationWrite/);
    assert.match(adapterSource, /getPolicyHeaderReadback/);
    const { pathToFileURL } = require("node:url");
    const { SdkProductAdapter } = await import(pathToFileURL(path.join(ROOT, "frontend", "lib", "adapters.js")).href);
    const calls = [
      { functionName: "begin_policy", args: ["target-1", "policy-2", "0xhash"], description: "Begin policy" },
      { functionName: "add_policy_rule", args: ["policy-2", "R1", "0xJudge", 1, 1, true, "0", "0"], description: "Register rule R1" },
      { functionName: "seal_policy", args: ["policy-2"], description: "Seal policy" },
    ];
    let preparedWriteForCallCount = 0;
    const fakeSdk = {
      async buildPreparedWriteForCall(call) { preparedWriteForCallCount++; return { report: { ...call, reviewHash: "0x" + "1".repeat(64) }, feePreview: { network: "studio-dev", chainId: 61997, estimatedFeeValueWei: "1", isEstimate: true } }; },
      async buildPolicyActivationWrite() { return { report: { functionName: "activate_policy", args: ["policy-2"], reviewHash: "0x" + "2".repeat(64) }, feePreview: { network: "studio-dev", chainId: 61997, estimatedFeeValueWei: "1", isEstimate: true }, authorityExpands: true, diff: { changes: [] } }; },
      async getPolicyByKey() { return { summary: { sealed: true, version: 1, manifestHash: "0xdeadbeef" } }; },
    };
    const fakeCompiler = { compileCanonicalApm(apm) { assert.strictEqual(apm.policyId, "policy-2"); return { manifestHash: "0xdeadbeef", calls }; } };
    const adapter = new SdkProductAdapter(fakeSdk, null, null, fakeCompiler);

    const plan = await adapter.compilePolicyConstruction({ policyId: "policy-2" });
    assert.strictEqual(plan.calls.length, 3);
    assert.strictEqual(preparedWriteForCallCount, 0, "compiling the plan must NOT pre-build any step's PreparedRecloseWrite");

    const step0 = await adapter.buildPolicyConstructionStep(plan.calls[0]);
    assert.strictEqual(step0.draft.functionName, "begin_policy");
    assert.strictEqual(preparedWriteForCallCount, 1, "exactly one step must be built at a time, on demand");

    const readback = await adapter.getPolicyHeaderReadback("policy-2");
    assert.strictEqual(readback.sealed, true, "on-chain readback must be used to confirm seal, not assumed");

    const activation = await adapter.buildPolicyActivation("target-1", "policy-2", { policyId: "policy-2" });
    assert.strictEqual(activation.draft.functionName, "activate_policy");
    assert.strictEqual(activation.authorityExpands, true);

    const adapterWithoutBridge = new SdkProductAdapter(fakeSdk, null, null, null);
    await assert.rejects(() => adapterWithoutBridge.compilePolicyConstruction({}), /no policy-compiler bridge/i);
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

  await test("WALLET CORRECTION: the browser write path uses the pinned genlayer-js@2.0.0-rc.1 createClient/writeContract directly - no Snap, no custom signer, no fake throwing writer", () => {
    const writerSource = read("frontend/lib/genlayerWriter.js");
    assert.match(writerSource, /from ["']\.\.\/vendor\/genlayer-client\.js["']/, "must import the real pinned genlayer-js bundle, not reimplement it");
    assert.match(writerSource, /createClient\(/);
    assert.match(writerSource, /writeContract\(/);
    assert.doesNotMatch(writerSource, /wallet_invokeSnap|wallet_requestSnaps|snapId/i, "must not implement an actual MetaMask Snap integration");
    const entrySource = read("scripts/genlayer-vendor-entry.mjs");
    assert.match(entrySource, /from "genlayer-js"/);
    assert.match(entrySource, /from "genlayer-js\/chains"/);
    const appSource = read("frontend/app.js");
    assert.doesNotMatch(appSource, /no GenLayer-aware signer is wired/, "the old throwing-stub writer must be gone");
    assert.match(appSource, /createGenLayerWriter/, "connecting a wallet must create a real writer, not a stub");
  });

  await test("WALLET CORRECTION: disconnected browsing works - no wallet is required to read any page", () => {
    const appSource = read("frontend/app.js");
    // every read route must remain reachable without state.wallet - spot-check that no read
    // render function references state.wallet as a precondition.
    assert.doesNotMatch(appSource, /async function renderOverview[\s\S]{0,400}state\.wallet/, "Overview must not require a wallet");
    assert.doesNotMatch(appSource, /async function renderTargets[\s\S]{0,400}state\.wallet/, "Targets must not require a wallet");
  });

  await test("independent-audit fix: submitWrite requires the writer's signing account to equal the draft's expectedSigner immediately before every signature", async () => {
    const { pathToFileURL } = require("node:url");
    const { SdkProductAdapter } = await import(pathToFileURL(path.join(ROOT, "frontend", "lib", "adapters.js")).href);
    const writerNoAccount = { async getConnectedChainId() { return 61997; }, async submitIncident(p) { return { txId: "0x1", payload: p }; } };
    const adapterNoAccount = new SdkProductAdapter({}, writerNoAccount);
    await assert.rejects(
      () => adapterNoAccount.submitWrite("incident", { args: [1], reviewHash: "0xabc", expectedSigner: "0xReporter" }),
      /cannot report its signing account/i
    );

    const writerWrongAccount = { async getConnectedChainId() { return 61997; }, async getConnectedAccount() { return "0xWrongAccount"; }, async submitIncident(p) { return { txId: "0x1", payload: p }; } };
    const adapterWrongAccount = new SdkProductAdapter({}, writerWrongAccount);
    await assert.rejects(
      () => adapterWrongAccount.submitWrite("incident", { args: [1], reviewHash: "0xabc", expectedSigner: "0xReporter" }),
      /signer mismatch/i
    );

    const writerCorrectAccount = { async getConnectedChainId() { return 61997; }, async getConnectedAccount() { return "0xReporter"; }, async submitIncident(p) { return { txId: "0x1", payload: p }; } };
    const adapterCorrectAccount = new SdkProductAdapter({}, writerCorrectAccount);
    const result = await adapterCorrectAccount.submitWrite("incident", { args: [1], reviewHash: "0xabc", expectedSigner: "0xReporter" });
    assert.strictEqual(result.txId, "0x1");

    // A draft with no expectedSigner at all (e.g. a policy-construction step) must not require
    // getConnectedAccount - there is no single identity to bind against.
    const result2 = await adapterCorrectAccount.submitWrite("incident", { args: [1], reviewHash: "0xabc" });
    assert.strictEqual(result2.txId, "0x1");
  });

  await test("independent-audit fix: buildRevokeAuthority/buildDisableAction/buildDisableResource bind expectedSigner to the target's real cached owner", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xRealOwner", 0, "policy-1", 0, 0, false, false];
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "10", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const revoke = await client.buildRevokeAuthority({ targetId: "target-1" });
    assert.strictEqual(revoke.report.expectedSigner, "0xRealOwner");
  });

  await (async () => {
    const domain = await importPure("frontend/lib/domain.js");
    await test("independent-audit fix: draftRegistry.clearAll() invalidates every draft including dynamic policy-step keys", () => {
      const registry = domain.createDraftRegistry();
      registry.registerDraft("incident", { args: [1], reviewHash: "0xa" });
      registry.registerDraft("policyStep:0", { args: [2], reviewHash: "0xb" });
      registry.registerDraft("policyStep:1", { args: [3], reviewHash: "0xc" });
      registry.clearAll();
      assert.strictEqual(registry.getDraft("incident"), null);
      assert.strictEqual(registry.getDraft("policyStep:0"), null);
      assert.strictEqual(registry.getDraft("policyStep:1"), null);
    });
    const app = read("frontend/app.js");
    await test("independent-audit fix: wallet accountsChanged/chainChanged events are wired to clear all drafts and force reconnection", () => {
      assert.match(app, /wireWalletEvents/);
      assert.match(app, /accountsChanged/);
      assert.match(app, /chainChanged/);
      assert.match(app, /draftRegistry\.clearAll\(\)/);
    });
  })();

  await test("independent-audit fix: PolicyRule preserves judgeVersion end to end (read path + diff)", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const transport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, false, false];
        if (functionName === "get_policy_header") return [1, "0x" + "a".repeat(64), true, true, false];
        if (functionName === "get_policy_counts") return [1, 0, 0];
        if (functionName === "get_policy_rule_id_at") return "PROVIDER_COMPROMISE_V1";
        if (functionName === "get_policy_rule") return ["0xJudge", 7, 1, true, true];
        if (functionName === "get_policy_rule_economics") return ["0", "0"];
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const policy = await client.getActivePolicy("target-1");
    assert.strictEqual(policy.rules[0].judgeVersion, 7, "judgeVersion must be read from get_policy_rule tuple index 1, not dropped");

    const bumped = JSON.parse(JSON.stringify(policy));
    bumped.rules[0].judgeVersion = 8;
    const diff = sdk.diffCanonicalApm(policy, bumped);
    assert.strictEqual(diff.authorityExpands, true, "a judge-version bump on an otherwise-identical rule must be visible to the diff as a new rule identity");
  });

  await test("independent-audit fix: getEffectiveProviderStatus distinguishes AUTHORITY_REVOKED from a real active restriction, never conflating Reclose authority loss with provider unavailability", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const revokedTransport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, true, false];
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
    };
    const revokedClient = sdk.createRecloseClient({ transport: revokedTransport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const revokedStatus = await revokedClient.getEffectiveProviderStatus("target-1", "provider_a");
    assert.strictEqual(revokedStatus.reason.code, "AUTHORITY_REVOKED", "authority-revoked must use its own distinct reason code, never the generic restriction-count UNKNOWN code");

    const restrictedTransport = {
      async getChainId() { return 61997; },
      async getBlockNumber() { return 0; },
      async readContract({ functionName }) {
        if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, false, false];
        if (functionName === "get_resource_restriction_count") return 2;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
    };
    const restrictedClient = sdk.createRecloseClient({ transport: restrictedTransport, addresses: { kernel: "0xKernel", judge: "0xJudge" } });
    const restrictedStatus = await restrictedClient.getEffectiveProviderStatus("target-1", "provider_a");
    assert.strictEqual(restrictedStatus.reason.code, "UNKNOWN");
    assert.strictEqual(restrictedStatus.available, false);
  });

  await test("FINAL_REMEDIATION.md Section 5: buildOpenBond prepares IncentiveVault.open_bond bound to the exact predicted incident identity and real policy economics; buildIncidentReport refuses a non-zero-bond rule without a bondId", async () => {
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
        if (functionName === "get_policy_rule_economics") return ["500", "0"];
        if (functionName === "get_policy_resource_at") return "provider_a";
        if (functionName === "get_policy_effect_at") return ["PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1, true];
        if (functionName === "get_reporter_nonce") return 3;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      async getTransaction() { throw new Error("not used"); },
      async getTriggeredTransactionIds() { return []; },
      async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
    };
    const client = sdk.createRecloseClient({ transport, addresses: { kernel: "0xKernel", judge: "0xJudge", vault: "0xVault" } });
    const reporterAddress = "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd";
    const bond = await client.buildOpenBond({ targetId: "target-001", ruleId: "PROVIDER_COMPROMISE_V1", reporterAddress });
    assert.strictEqual(bond.report.functionName, "open_bond");
    assert.strictEqual(bond.report.contractAddress, "0xVault");
    assert.strictEqual(bond.report.valueWei, "500");
    assert.strictEqual(bond.report.args[0], bond.bondId);
    assert.strictEqual(bond.report.args[6], `target-001:${reporterAddress.toLowerCase()}:3`, "open_bond's incident_id arg must equal the exact predicted incident identity");

    await assert.rejects(
      () => client.buildIncidentReport({
        targetId: "target-001", ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a", reporterAddress,
        evidenceSources: [{ sourceId: "s1", url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", fetchedAt: "2026-01-01T00:00:00.000Z", availability: "AVAILABLE" }],
      }),
      /requires a non-zero bond/i,
      "a non-zero-bond rule must never be submittable without a verified bondId"
    );

    const withBond = await client.buildIncidentReport({
      targetId: "target-001", ruleId: "PROVIDER_COMPROMISE_V1", resourceId: "provider_a", reporterAddress, bondId: bond.bondId,
      evidenceSources: [{ sourceId: "s1", url: "https://example.com/a", sourceClass: "INDEPENDENT_PUBLIC", fetchedAt: "2026-01-01T00:00:00.000Z", availability: "AVAILABLE" }],
    });
    assert.strictEqual(withBond.report.args[7], bond.bondId);
  });

  await test("FINAL_REMEDIATION.md Section 5: the report form never presents a bonded report as signable without a confirmed open bond", () => {
    const app = read("frontend/app.js");
    assert.match(app, /renderBondGate/);
    assert.match(app, /Open reporter bond/);
    assert.match(app, /state\.openedBond\?\.ruleId !== input\.ruleId/);
  });

  await test("FINAL_REMEDIATION.md Section 6: an optional indexer.resolveIncidentLineage adapter closes the remediation/recovery-validation chain read-gap, read back against authoritative protocol state rather than trusted as-is", () => {
    const adapterSource = read("frontend/lib/adapters.js");
    assert.match(adapterSource, /resolveIncidentLineage/);
    assert.match(adapterSource, /remediation\.targetId === incident\.targetId/, "an indexer-supplied lineage id must be cross-checked against real protocol state (targetId match), never trusted blindly");
  });

  await test("Owner-directed remediation item 2: buildOpenBond derives a collision-resistant bondId (Keccak-256 over the full identity tuple) instead of truncating raw concatenation to 96 chars", async () => {
    const sdkDist = path.join(ROOT, "packages", "protocol-sdk", "dist", "index.js");
    const sdk = require(sdkDist);
    const longTargetId = "t".repeat(90); // near the 96-char target_id bound - the old truncation bug zone.
    function makeTransport(nonce) {
      return {
        async getChainId() { return 61997; },
        async getBlockNumber() { return 0; },
        async readContract({ functionName }) {
          if (functionName === "get_target_details") return ["0xTargetAddr", "0xOwner", 0, "policy-1", 0, 0, false, false];
          if (functionName === "get_policy_header") return [1, "0x" + "a".repeat(64), true, true, false];
          if (functionName === "get_policy_counts") return [1, 1, 1];
          if (functionName === "get_policy_rule_id_at") return "PROVIDER_COMPROMISE_V1";
          if (functionName === "get_policy_rule") return ["0xJudge", 1, 1, true, true];
          if (functionName === "get_policy_rule_economics") return ["500", "0"];
          if (functionName === "get_policy_resource_at") return "provider_a";
          if (functionName === "get_policy_effect_at") return ["PROVIDER_COMPROMISE_V1", 3, "provider_a", "0", "", 1, true];
          if (functionName === "get_reporter_nonce") return nonce;
          throw new Error(`unexpected readContract ${functionName}`);
        },
        async getTransaction() { throw new Error("not used"); },
        async getTriggeredTransactionIds() { return []; },
        async estimateTransactionFeesForWrite() { return { feeValue: "1", distribution: null }; },
      };
    }
    const reporterA = "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd";
    const reporterB = "0x0000000000000000000000000000000000000001";

    const clientLongId1 = sdk.createRecloseClient({ transport: makeTransport(3), addresses: { kernel: "0xKernel", judge: "0xJudge", vault: "0xVault" } });
    const bondLongId1 = await clientLongId1.buildOpenBond({ targetId: longTargetId, ruleId: "PROVIDER_COMPROMISE_V1", reporterAddress: reporterA });
    assert.ok(bondLongId1.bondId.length <= 96, "bondId must stay within the Vault's 96-char bound");
    assert.match(bondLongId1.bondId, /^bond:0x[0-9a-f]{64}$/, "bondId should be a fixed-width Keccak-256 digest, not raw truncated concatenation");

    // Different reporter, same target/nonce -> must NOT collide.
    const clientDiffReporter = sdk.createRecloseClient({ transport: makeTransport(3), addresses: { kernel: "0xKernel", judge: "0xJudge", vault: "0xVault" } });
    const bondDiffReporter = await clientDiffReporter.buildOpenBond({ targetId: longTargetId, ruleId: "PROVIDER_COMPROMISE_V1", reporterAddress: reporterB });
    assert.notStrictEqual(bondLongId1.bondId, bondDiffReporter.bondId, "different reporters must produce distinct bondIds");

    // Different nonce, same target/reporter -> must NOT collide.
    const clientDiffNonce = sdk.createRecloseClient({ transport: makeTransport(7), addresses: { kernel: "0xKernel", judge: "0xJudge", vault: "0xVault" } });
    const bondDiffNonce = await clientDiffNonce.buildOpenBond({ targetId: longTargetId, ruleId: "PROVIDER_COMPROMISE_V1", reporterAddress: reporterA });
    assert.notStrictEqual(bondLongId1.bondId, bondDiffNonce.bondId, "different nonces must produce distinct bondIds");

    // Same inputs -> deterministic (idempotent preview, same bondId every time).
    const clientRepeat = sdk.createRecloseClient({ transport: makeTransport(3), addresses: { kernel: "0xKernel", judge: "0xJudge", vault: "0xVault" } });
    const bondRepeat = await clientRepeat.buildOpenBond({ targetId: longTargetId, ruleId: "PROVIDER_COMPROMISE_V1", reporterAddress: reporterA });
    assert.strictEqual(bondLongId1.bondId, bondRepeat.bondId, "the same logical bond must always derive the same bondId");

    // Two near-identical long target_ids differing only in their last character (the part a naive
    // head-truncation to 96 chars after a "bond:" prefix would have discarded) must still differ.
    const longTargetIdVariant = "t".repeat(89) + "u";
    const clientVariant = sdk.createRecloseClient({ transport: makeTransport(3), addresses: { kernel: "0xKernel", judge: "0xJudge", vault: "0xVault" } });
    const bondVariant = await clientVariant.buildOpenBond({ targetId: longTargetIdVariant, ruleId: "PROVIDER_COMPROMISE_V1", reporterAddress: reporterA });
    assert.notStrictEqual(bondLongId1.bondId, bondVariant.bondId, "target_ids differing only in a tail character must not collide");
  });

  const total = 51;
  console.log(`\n${total - failures}/${total} frontend A3-remediation checks passed.`);
  if (failures) process.exit(1);
}

main();
