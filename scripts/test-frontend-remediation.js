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

  const total = 12;
  console.log(`\n${total - failures}/${total} frontend A3-remediation checks passed.`);
  if (failures) process.exit(1);
}

main();
