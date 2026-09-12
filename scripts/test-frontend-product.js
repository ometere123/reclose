#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
let failures = 0;

async function test(name, fn) {
  try { await fn(); console.log(`PASS  ${name}`); }
  catch (error) { failures++; console.error(`FAIL  ${name}\n  ${error.message}`); }
}

async function main() {
  await test("D1 product shell has semantic main/nav and skip link", () => {
    const html = read("frontend/index.html");
    const app = read("frontend/app.js");
    assert.match(html, /class="skip-link"/);
    assert.match(app, /<nav class="nav">/);
    assert.match(app, /<main id="main"/);
  });

  await test("D2 exposes all required core read surfaces", () => {
    const app = read("frontend/app.js");
    for (const route of ["overview", "targets", "incidents", "policies", "benchmark", "system"]) {
      assert.ok(app.includes(`case "${route}"`), `missing route ${route}`);
    }
    assert.match(app, /incident explorer/i);
    for (const band of ["claim & evidence", "GenLayer judgment", "policy consequence", "actual execution", "recovery"]) {
      assert.ok(app.includes(band), `missing causal band ${band}`);
    }
  });

  await test("D3 exposes onboarding, report, policy review and recovery flows", () => {
    const app = read("frontend/app.js");
    for (const route of ["report", "recover", "onboard", "policy-author"]) {
      assert.ok(app.includes(`case "${route}"`), `missing write route ${route}`);
    }
    assert.match(app, /Preview fee & bond/);
    assert.match(app, /Authority review/);
  });

  await test("I1 mock mode explicitly refuses writes", () => {
    const adapter = read("frontend/lib/adapters.js");
    assert.match(adapter, /Fixture mode never submits transactions/);
    assert.match(adapter, /synthetic: true/);
  });

  await test("I2 real adapter delegates protocol reads to the frozen SDK", () => {
    const adapter = read("frontend/lib/adapters.js");
    for (const method of ["getTarget", "getAssuranceState", "getActivePolicy", "getIncident", "getDecision", "getDecisionView", "buildIncidentReport", "buildRecoveryReport"]) {
      assert.ok(adapter.includes(`this.sdk.${method}`), `SDK method not used: ${method}`);
    }
    assert.doesNotMatch(adapter, /function\s+judge|class\s+PolicyEngine|evaluateEvidence/);
  });

  await test("I2 persists a tx ID before tracking and never resubmits on polling failure", () => {
    const persistence = read("frontend/lib/persistence.js");
    const save = persistence.indexOf("store.save(txRecord)");
    const track = persistence.indexOf("await tracker(txRecord.txId)");
    assert.ok(save >= 0 && track > save, "tracking occurs before persistence");
    assert.match(persistence, /catch \(error\)/);
    assert.doesNotMatch(persistence, /resubmit|submitWrite/);
  });

  await test("D4 provides visible focus, reduced-motion and non-colour state markers", () => {
    const css = read("frontend/styles.css");
    const domain = read("frontend/lib/domain.js");
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(domain, /state-marker/);
    assert.match(domain, /SAFE_MODE/);
  });

  await test("malicious evidence cannot be rendered as HTML by the product helpers", () => {
    const source = read("frontend/lib/domain.js");
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    const domain = await import(moduleUrl);
    const payload = '<img src=x onerror="globalThis.pwned=1">';
    const escaped = domain.escapeHtml(payload);
    assert.ok(!escaped.includes("<img"));
    assert.ok(escaped.includes("&lt;img"));
  });

  await test("truth helper refuses ACCEPTED-as-final and FINALIZED execution failure as success", async () => {
    const source = read("frontend/lib/domain.js");
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    const domain = await import(moduleUrl);
    assert.throws(() => domain.assertTruthSeparation({ rawStatus: "ACCEPTED", derived: { isFinal: true } }));
    assert.throws(() => domain.assertTruthSeparation({ rawStatus: "FINALIZED", executionResult: "FINISHED_WITH_ERROR", displaySuccess: true }));
    assert.strictEqual(domain.executionFinalStatus("FINISHED_WITH_ERROR"), "FAILURE");
  });

  await test("no forbidden generic AI/Web3 visual language is present", () => {
    const combined = [read("frontend/index.html"), read("frontend/styles.css"), read("frontend/app.js")].join("\n").toLowerCase();
    for (const forbidden of ["ai brain", "robot mascot", "cyberpunk circuitry", "glassmorphism", "purple gradient"]) {
      assert.ok(!combined.includes(forbidden), `forbidden visual language present: ${forbidden}`);
    }
  });

  console.log(`\n${10 - failures}/10 frontend product checks passed.`);
  if (failures) process.exit(1);
}

main();
