# contracts/

This directory contains **only** deployable GenLayer Intelligent Contracts for Reclose R1.

Rules (enforced by `scripts/list-deployable-contracts.js`, run via `npm run contracts:lint`; the enforcement
itself is proven by automated negative tests in `scripts/test-list-deployable-contracts.js`, run via
`npm run contracts:lint:selftest` - both run as part of `npm run verify`):

- Every `.py` file directly under `contracts/` (or a first-level subdirectory naming a contract group) is treated
  as a deployable contract candidate **only if** it carries the *exact* pinned
  `# { "Depends": "py-genlayer:<hash>" }` header, where `<hash>` matches `runner_hash` in
  `toolchain/runner.lock` verbatim. A `.py` file with a missing or mismatched header is a **boundary violation**,
  not a silently-ignored file - this is what actually distinguishes a deployable contract from a generic helper
  module (strengthened per external A0 review finding A0-007; the previous version of this document claimed this
  enforcement existed when the script only checked filenames).
- Test helpers, fixtures, `conftest.py`, mocks, and any non-deployable Python file **must never** live under
  `contracts/`. They belong under `tests/`.
- No file named `conftest.py`, `test_*.py`, `*_test.py`, or `__init__.py` is permitted under `contracts/`,
  regardless of whether it happens to carry a runner header.

This boundary exists because GenVM contract discovery can otherwise mistake a test helper for a deployable
Intelligent Contract (see `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` Section 13 /
the Master Plan's F0 checklist), and because a stray `helper.py`-style file with no header is exactly the failure
mode a filename-only check cannot catch.

No product contracts exist yet as of F0/A0 - the AssuranceKernel, Policy, Judge, Vault, and ReferenceAgentProtocol
contracts are C1/C2/C3 scope, not F0 scope. The G0 toolchain-verification smoke contract lives only under
`release-evidence/r1/g0/` (evidence), never here - it was never a Reclose product contract.
