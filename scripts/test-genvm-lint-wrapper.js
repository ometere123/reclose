#!/usr/bin/env node
// Self-tests for the narrow genvm-lint waiver wrapper (C1R A1-H10).
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runNarrowLint } = require("./genvm-lint-wrapper");

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

function tmpFileWithContent(content) {
  const p = path.join(os.tmpdir(), `genvm-lint-wrapper-test-${Date.now()}-${Math.random()}.py`);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

test("a passing lint (status 0) is ok with no waivers", () => {
  const f = tmpFileWithContent("# irrelevant\n");
  const runner = () => ({ stdout: "Lint passed (3 checks)", status: 0 });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.waived.length, 0);
  fs.unlinkSync(f);
});

test("the confirmed-stale @allow_storage diagnostic IS waived when the class has @gl.storage.allow", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass TargetRecord:\n    x: int\n");
  const runner = () => ({ stdout: "  line 202: Class 'TargetRecord' used in storage needs @allow_storage decorator", status: 1 });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.waived.length, 1);
  fs.unlinkSync(f);
});

test("the same diagnostic is NOT waived if the class does NOT actually have @gl.storage.allow", () => {
  const f = tmpFileWithContent("class TargetRecord:\n    x: int\n");
  const runner = () => ({ stdout: "  line 202: Class 'TargetRecord' used in storage needs @allow_storage decorator", status: 1 });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, false);
  fs.unlinkSync(f);
});

test("a syntax error is NEVER waived", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass TargetRecord:\n    x: int\n");
  const runner = () => ({ stdout: "  line 4: SyntaxError: invalid syntax", status: 1 });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, false);
  fs.unlinkSync(f);
});

test("an unsupported-import diagnostic is NEVER waived", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass TargetRecord:\n    x: int\n");
  const runner = () => ({ stdout: "  line 1: Unsupported import: os.system", status: 1 });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, false);
  fs.unlinkSync(f);
});

test("genvm-lint's own header/summary lines (e.g. '\u2717 Lint failed') are never treated as an unwaived diagnostic on their own", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass TargetRecord:\n    x: int\n");
  const runner = () => ({
    stdout: "\u2717 Lint failed\n  line 170: Class 'TargetRecord' used in storage needs @allow_storage decorator\n",
    status: 1,
  });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, true, "header/summary chrome must not be misread as an unrelated failure");
  fs.unlinkSync(f);
});

test("multiple real files' worth of waived diagnostics with only header noise between them still pass", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass A:\n    x: int\n\n@gl.storage.allow\nclass B:\n    y: int\n");
  const runner = () => ({
    stdout: [
      "\u2717 Lint failed",
      "  line 2: Class 'A' used in storage needs @allow_storage decorator",
      "",
      "  line 6: Class 'B' used in storage needs @allow_storage decorator",
    ].join("\n"),
    status: 1,
  });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.waived.length, 2);
  fs.unlinkSync(f);
});

test("a DIFFERENT class's @allow_storage diagnostic is not waived by an unrelated class's decorator", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass OtherRecord:\n    x: int\n\nclass TargetRecord:\n    y: int\n");
  const runner = () => ({ stdout: "  line 202: Class 'TargetRecord' used in storage needs @allow_storage decorator", status: 1 });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, false);
  fs.unlinkSync(f);
});

test("mixed output: one waived diagnostic plus one unrelated failure still fails the build", () => {
  const f = tmpFileWithContent("@gl.storage.allow\nclass TargetRecord:\n    x: int\n");
  const runner = () => ({
    stdout: "  line 2: Class 'TargetRecord' used in storage needs @allow_storage decorator\n  line 9: Unknown API: gl.vm.UserError",
    status: 1,
  });
  const result = runNarrowLint(f, runner);
  assert.strictEqual(result.ok, false);
  fs.unlinkSync(f);
});

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
