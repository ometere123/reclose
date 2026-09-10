#!/usr/bin/env node
// Enforces the contract-discovery boundary described in contracts/README.md.
// Strengthened per external A0 review finding A0-007: this no longer only rejects a handful of
// test-shaped filenames - every .py file under contracts/ must carry the EXACT pinned
// `# { "Depends": "py-genlayer:<hash>" }` runner header from toolchain/runner.lock to be accepted
// as a deployable contract candidate. A .py file with a missing/wrong header (e.g. a generic
// "helper.py") is now a hard boundary violation, not silently ignored.

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const CONTRACTS_DIR = path.join(REPO_ROOT, "contracts");
const RUNNER_LOCK_PATH = path.join(REPO_ROOT, "toolchain", "runner.lock");

const FORBIDDEN_NAME_PATTERNS = [/^conftest\.py$/, /^test_.*\.py$/, /.*_test\.py$/, /^__init__\.py$/];
const DEPENDS_HEADER_RE = /^#\s*\{\s*"Depends"\s*:\s*"py-genlayer:([a-z0-9]+)"\s*\}\s*$/m;

function readPinnedRunnerHash(runnerLockPath) {
  const text = fs.readFileSync(runnerLockPath, "utf8");
  const m = text.match(/^runner_hash:\s*(\S+)\s*$/m);
  if (!m) {
    throw new Error(`could not find runner_hash in ${runnerLockPath}`);
  }
  return m[1];
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.name.endsWith(".py")) {
      out.push(full);
    }
  }
  return out;
}

// Exported for use by scripts/test-list-deployable-contracts.js negative tests.
function checkContractsDir(contractsDir, pinnedHash) {
  const result = { violations: [], candidates: [], forbiddenNameViolations: [], missingOrWrongHeaderViolations: [] };

  if (!fs.existsSync(contractsDir)) {
    return result;
  }

  const pyFiles = walk(contractsDir);

  for (const f of pyFiles) {
    const base = path.basename(f);

    if (FORBIDDEN_NAME_PATTERNS.some((re) => re.test(base))) {
      result.forbiddenNameViolations.push(f);
      continue;
    }

    const content = fs.readFileSync(f, "utf8");
    const m = content.match(DEPENDS_HEADER_RE);
    if (!m || m[1] !== pinnedHash) {
      result.missingOrWrongHeaderViolations.push(f);
      continue;
    }

    result.candidates.push(f);
  }

  result.violations = [...result.forbiddenNameViolations, ...result.missingOrWrongHeaderViolations];
  return result;
}

function main() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.log("contracts/ does not exist - nothing to check.");
    return 0;
  }

  let pinnedHash;
  try {
    pinnedHash = readPinnedRunnerHash(RUNNER_LOCK_PATH);
  } catch (e) {
    console.error("FAIL: could not read pinned runner hash from toolchain/runner.lock: " + e.message);
    process.exitCode = 1;
    return 1;
  }

  const result = checkContractsDir(CONTRACTS_DIR, pinnedHash);

  if (result.forbiddenNameViolations.length > 0) {
    console.error("Contract-discovery boundary violation - test/helper-named files found under contracts/:");
    for (const v of result.forbiddenNameViolations) console.error("  " + path.relative(process.cwd(), v));
  }

  if (result.missingOrWrongHeaderViolations.length > 0) {
    console.error(
      `Contract-discovery boundary violation - .py file(s) under contracts/ missing the exact pinned runner header ` +
        `(# { "Depends": "py-genlayer:${pinnedHash}" } from toolchain/runner.lock) - these look like helper/utility ` +
        `files, not deployable contracts, and must move under tests/ or gain the correct header:`
    );
    for (const v of result.missingOrWrongHeaderViolations) console.error("  " + path.relative(process.cwd(), v));
  }

  if (result.violations.length > 0) {
    process.exitCode = 1;
    return 1;
  }

  console.log(`contracts/ contains ${result.candidates.length} deployable-contract candidate file(s):`);
  for (const f of result.candidates) console.log("  " + path.relative(process.cwd(), f));
  console.log("No test/helper files found under contracts/. Boundary OK.");
  return 0;
}

if (require.main === module) {
  main();
}

module.exports = { checkContractsDir, readPinnedRunnerHash, FORBIDDEN_NAME_PATTERNS, DEPENDS_HEADER_RE };
