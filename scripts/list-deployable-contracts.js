#!/usr/bin/env node
// Enforces the contract-discovery boundary described in contracts/README.md.
// Fails if any test/helper-shaped file lives under contracts/, and lists every
// file that WOULD be treated as a deployable Intelligent Contract candidate.

const fs = require("fs");
const path = require("path");

const CONTRACTS_DIR = path.join(__dirname, "..", "contracts");
const FORBIDDEN_PATTERNS = [/^conftest\.py$/, /^test_.*\.py$/, /.*_test\.py$/, /^__init__\.py$/];

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

function main() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.log("contracts/ does not exist - nothing to check.");
    return 0;
  }

  const pyFiles = walk(CONTRACTS_DIR);
  const violations = pyFiles.filter((f) =>
    FORBIDDEN_PATTERNS.some((re) => re.test(path.basename(f)))
  );

  if (violations.length > 0) {
    console.error("Contract-discovery boundary violation - test/helper files found under contracts/:");
    for (const v of violations) console.error("  " + path.relative(process.cwd(), v));
    process.exitCode = 1;
    return 1;
  }

  console.log(`contracts/ contains ${pyFiles.length} deployable-contract candidate file(s):`);
  for (const f of pyFiles) console.log("  " + path.relative(process.cwd(), f));
  console.log("No test/helper files found under contracts/. Boundary OK.");
  return 0;
}

main();
