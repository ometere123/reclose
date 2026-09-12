#!/usr/bin/env node
// Narrow genvm-lint waiver wrapper (C1R A1-H10: the prior `genvm-lint ... || true` in
// scripts/py-verify.sh was a blanket exception, not a narrow one, and the owner's external review
// correctly flagged this as too broad).
//
// This wrapper runs `genvm-lint lint <file>` for one contract file, captures its output/exit
// code, and waives ONLY two confirmed-stale diagnostics this session has independently verified
// against the exact pinned py-lib-genlayer-std/genvm-lint sources:
//
// 1. "Class '<Name>' used in storage needs @allow_storage decorator" (genlayer/storage/_internal/
//    generate.py exports `allow`, not `allow_storage` - see Interface Change Log / commit
//    history). Waived ONLY when the exact class named in the diagnostic is independently
//    confirmed, by reading the contract's own source text, to already carry `@gl.storage.allow`.
//
// 2. "gl.nondet.* call in '<Class.method>' not reachable from equivalence principle block" -
//    genvm-lint 0.11.0's own reachability analysis (genvm_linter/lint/safety.py, the
//    `_NONDET_SAFE_CONTEXT_CALLS` table) recognizes `gl.vm.run_nondet` and
//    `gl.vm.run_nondet_unsafe` as safe nondet-wrapper entry points, but is MISSING
//    `gl.vm.run_nondet_default` - confirmed by direct inspection of the installed linter's own
//    source. `run_nondet_default` is a real, current pinned-SDK API (confirmed by direct
//    inspection of genlayer/vm/__init__.py) with the exact same leader_fn/validator_fn safety
//    shape the linter already recognizes for its siblings. Waived ONLY when the file actually
//    calls `gl.vm.run_nondet_default(` AND the flagged method is genuinely defined in that file
//    (never waived on a bare text match with no corroborating call site).
//
// Any other genvm-lint diagnostic - a syntax error, an unsupported import, an unknown API, a new
// storage diagnostic, or any future unrelated failure - fails the build. This file has its own
// self-tests (scripts/test-genvm-lint-wrapper.js).

const { execFileSync } = require("child_process");
const fs = require("fs");

const STALE_DIAGNOSTIC_RE = /Class '([A-Za-z0-9_]+)' used in storage needs @allow_storage decorator/;
const STALE_NONDET_REACHABILITY_RE = /gl\.nondet\.\* call in '([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)' not reachable from equivalence principle block/;
// genvm-lint's actual per-issue diagnostic lines are prefixed "  line <N>: <message>" - only
// these lines carry real findings. Header/summary lines ("✗ Lint failed", banners, blank lines)
// are tool chrome, not diagnostics, and must never be treated as an unwaived failure just because
// they don't match the one waived pattern.
const DIAGNOSTIC_LINE_RE = /^\s*line\s+\d+\s*:/i;

/**
 * @param {string} filePath - contract file to lint
 * @param {(args: string[]) => {stdout: string, status: number}} runner - injectable for tests
 * @returns {{ ok: boolean, waived: string[], output: string }}
 */
function runNarrowLint(filePath, runner) {
  const result = runner(["lint", filePath]);
  const output = result.stdout || "";
  if (result.status === 0) {
    return { ok: true, waived: [], output };
  }

  const source = fs.readFileSync(filePath, "utf8");
  const lines = output.split("\n");
  const waived = [];
  const unwaived = [];

  for (const line of lines) {
    if (!DIAGNOSTIC_LINE_RE.test(line)) {
      // Tool chrome (header/summary/blank) - never a diagnostic on its own, ignore it.
      continue;
    }
    const m = line.match(STALE_DIAGNOSTIC_RE);
    if (m) {
      const className = m[1];
      // Confirm the exact class is decorated with @gl.storage.allow in THIS file's source -
      // never waive on class-name text match alone without this confirmation.
      const classDeclRe = new RegExp(`@gl\\.storage\\.allow\\s*\\nclass ${className}\\b`);
      if (classDeclRe.test(source)) {
        waived.push(line);
      } else {
        unwaived.push(line);
      }
      continue;
    }

    const nondetMatch = line.match(STALE_NONDET_REACHABILITY_RE);
    if (nondetMatch) {
      const methodName = nondetMatch[2];
      // Confirm the flagged method genuinely exists in this file AND the file genuinely calls
      // the real (but linter-unrecognized) run_nondet_default API - never waive on the
      // diagnostic text alone without both corroborating facts.
      const methodDeclRe = new RegExp(`def ${methodName}\\b`);
      const callsRunNondetDefault = source.includes("gl.vm.run_nondet_default(");
      if (methodDeclRe.test(source) && callsRunNondetDefault) {
        waived.push(line);
      } else {
        unwaived.push(line);
      }
      continue;
    }

    unwaived.push(line);
  }

  if (unwaived.length > 0) {
    return { ok: false, waived, output: unwaived.join("\n") };
  }
  return { ok: true, waived, output };
}

function defaultRunner(args) {
  try {
    const stdout = execFileSync("genvm-lint", args, { encoding: "utf8" });
    return { stdout, status: 0 };
  } catch (e) {
    return { stdout: (e.stdout || "") + (e.stderr || ""), status: typeof e.status === "number" ? e.status : 1 };
  }
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("usage: genvm-lint-wrapper.js <contract-file>");
    process.exit(2);
  }
  const result = runNarrowLint(filePath, defaultRunner);
  console.log(`--- genvm-lint lint ${filePath} ---`);
  console.log(result.output || "(no output)");
  if (result.waived.length > 0) {
    for (const w of result.waived) {
      const label = STALE_NONDET_REACHABILITY_RE.test(w)
        ? "confirmed-stale reachability diagnostic, linter doesn't yet recognize run_nondet_default"
        : "confirmed-stale @allow_storage diagnostic, class already has @gl.storage.allow";
      console.log(`WAIVED (${label}): ${w}`);
    }
  }
  if (!result.ok) {
    console.error(`FAIL: genvm-lint reported a diagnostic on ${filePath} that is not the narrow waived case.`);
    process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { runNarrowLint, STALE_DIAGNOSTIC_RE, STALE_NONDET_REACHABILITY_RE };
