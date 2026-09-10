#!/usr/bin/env node
// Automated negative tests for scripts/list-deployable-contracts.js, added per external A0 review
// finding A0-007. Proves the discovery boundary actually rejects a bad helper file, a forbidden
// test-shaped filename, and a wrong/missing runner header - not merely that its README claims to.

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const { checkContractsDir, readPinnedRunnerHash } = require("./list-deployable-contracts.js");

const REPO_ROOT = path.join(__dirname, "..");
const RUNNER_LOCK_PATH = path.join(REPO_ROOT, "toolchain", "runner.lock");
const PINNED_HASH = readPinnedRunnerHash(RUNNER_LOCK_PATH);

function withTempContractsDir(setup, assertions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reclose-contracts-test-"));
  try {
    setup(dir);
    const result = checkContractsDir(dir, PINNED_HASH);
    assertions(result);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

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

test("a valid contract with the exact pinned header is accepted", () => {
  withTempContractsDir(
    (dir) => {
      fs.writeFileSync(
        path.join(dir, "good_contract.py"),
        `# { "Depends": "py-genlayer:${PINNED_HASH}" }\n\nclass GoodContract:\n    pass\n`
      );
    },
    (result) => {
      assert.strictEqual(result.violations.length, 0);
      assert.strictEqual(result.candidates.length, 1);
    }
  );
});

test("a generic helper.py with no runner header is rejected", () => {
  withTempContractsDir(
    (dir) => {
      fs.writeFileSync(path.join(dir, "helper.py"), "def helper():\n    return 1\n");
    },
    (result) => {
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.missingOrWrongHeaderViolations.length, 1);
      assert.ok(result.missingOrWrongHeaderViolations[0].endsWith("helper.py"));
    }
  );
});

test("a .py file with the WRONG runner hash is rejected, not silently accepted", () => {
  withTempContractsDir(
    (dir) => {
      fs.writeFileSync(
        path.join(dir, "stale_contract.py"),
        '# { "Depends": "py-genlayer:someUnpinnedOrStaleHash0000000000000000000" }\n\nclass StaleContract:\n    pass\n'
      );
    },
    (result) => {
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.missingOrWrongHeaderViolations.length, 1);
    }
  );
});

test("conftest.py under contracts/ is rejected regardless of header", () => {
  withTempContractsDir(
    (dir) => {
      fs.writeFileSync(
        path.join(dir, "conftest.py"),
        `# { "Depends": "py-genlayer:${PINNED_HASH}" }\nimport pytest\n`
      );
    },
    (result) => {
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.forbiddenNameViolations.length, 1);
    }
  );
});

test("test_*.py and *_test.py under contracts/ are rejected", () => {
  withTempContractsDir(
    (dir) => {
      fs.writeFileSync(path.join(dir, "test_something.py"), "def test_x():\n    assert True\n");
      fs.writeFileSync(path.join(dir, "something_test.py"), "def test_y():\n    assert True\n");
    },
    (result) => {
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.forbiddenNameViolations.length, 2);
    }
  );
});

test("__init__.py under contracts/ is rejected", () => {
  withTempContractsDir(
    (dir) => {
      fs.writeFileSync(path.join(dir, "__init__.py"), "");
    },
    (result) => {
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.forbiddenNameViolations.length, 1);
    }
  );
});

test("a first-level subdirectory contract group is still discovered and validated", () => {
  withTempContractsDir(
    (dir) => {
      const group = path.join(dir, "assurance_kernel");
      fs.mkdirSync(group);
      fs.writeFileSync(
        path.join(group, "kernel.py"),
        `# { "Depends": "py-genlayer:${PINNED_HASH}" }\n\nclass Kernel:\n    pass\n`
      );
      fs.writeFileSync(path.join(group, "helper.py"), "def helper():\n    return 1\n");
    },
    (result) => {
      assert.strictEqual(result.candidates.length, 1);
      assert.strictEqual(result.missingOrWrongHeaderViolations.length, 1);
    }
  );
});

test("an empty/nonexistent contracts/ directory produces zero candidates and zero violations", () => {
  withTempContractsDir(
    () => {},
    (result) => {
      assert.strictEqual(result.candidates.length, 0);
      assert.strictEqual(result.violations.length, 0);
    }
  );
});

console.log("");
if (failures > 0) {
  console.error(`${failures} contract-discovery boundary test(s) FAILED.`);
  process.exitCode = 1;
} else {
  console.log("All contract-discovery boundary tests passed.");
}
