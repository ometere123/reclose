#!/usr/bin/env node
// Narrow genvm-lint waiver wrapper (C1R A1-H10: the prior `genvm-lint ... || true` in
// scripts/py-verify.sh was a blanket exception, not a narrow one, and the owner's external review
// correctly flagged this as too broad).
//
// This wrapper runs `genvm-lint lint <file>` for one contract file, captures its output/exit
// code, and waives ONLY the single confirmed-stale diagnostic this session has independently
// verified against the exact pinned py-lib-genlayer-std source (genlayer/storage/_internal/
// generate.py exports `allow`, not `allow_storage` - see Interface Change Log / commit history):
//
//   "Class '<Name>' used in storage needs @allow_storage decorator"
//
// It is waived ONLY when the exact class named in the diagnostic is independently confirmed, by
// reading the contract's own source text, to already carry `@gl.storage.allow`. Any other
// genvm-lint diagnostic - a syntax error, an unsupported import, an unknown API, a new storage
// diagnostic, or any future unrelated failure - fails the build. This file has its own self-tests
// (scripts/test-genvm-lint-wrapper.js).

const { execFileSync } = require("child_process");
const fs = require("fs");

const STALE_DIAGNOSTIC_RE = /Class '([A-Za-z0-9_]+)' used in storage needs @allow_storage decorator/;

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
    const m = line.match(STALE_DIAGNOSTIC_RE);
    if (!m) {
      if (line.trim().length > 0) unwaived.push(line);
      continue;
    }
    const className = m[1];
    // Confirm the exact class is decorated with @gl.storage.allow in THIS file's source - never
    // waive on class-name text match alone without this confirmation.
    const classDeclRe = new RegExp(`@gl\\.storage\\.allow\\s*\\nclass ${className}\\b`);
    if (classDeclRe.test(source)) {
      waived.push(line);
    } else {
      unwaived.push(line);
    }
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
      console.log(`WAIVED (confirmed-stale @allow_storage diagnostic, class already has @gl.storage.allow): ${w}`);
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

module.exports = { runNarrowLint, STALE_DIAGNOSTIC_RE };
