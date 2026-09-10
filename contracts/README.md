# contracts/

This directory contains **only** deployable GenLayer Intelligent Contracts for Reclose R1.

Rules (enforced by `scripts/list-deployable-contracts.js`, run via `npm run contracts:lint`):

- Every `.py` file directly under `contracts/` (or a first-level subdirectory naming a contract group) is treated
  as a deployable contract candidate and must carry a valid `# { "Depends": ... }` runner header
  (see `toolchain/runner.lock` for the accepted pin).
- Test helpers, fixtures, `conftest.py`, mocks, and any non-deployable Python file **must never** live under
  `contracts/`. They belong under `tests/`.
- No file named `conftest.py`, `test_*.py`, `*_test.py`, or `__init__.py` is permitted under `contracts/`.

This boundary exists because GenVM contract discovery can otherwise mistake a test helper for a deployable
Intelligent Contract (see `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` Section 13 /
the Master Plan's F0 checklist).

No product contracts exist yet as of F0 - the AssuranceKernel, Policy, Judge, Vault, and ReferenceAgentProtocol
contracts are C1/C2/C3 scope, not F0 scope. The G0 toolchain-verification smoke contract lives only under
`release-evidence/r1/g0/` (evidence), never here - it was never a Reclose product contract.
