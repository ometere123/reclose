# Commands and Results (A1 Attempt 2)

| # | Command | Result |
|---|---|---|
| 1 | `npm run verify` (JS/schema side) | PASS |
| 2 | `python3 -m pytest tests -q` (genlayer-test 0.30.0rc2 Direct Mode, WSL) | **73/73 PASSED** |
| 3 | `genvm-lint lint <each contract>` via the narrow waiver wrapper | 3/4 contracts clean; `assurance_kernel.py` waives only the confirmed-stale `@allow_storage` diagnostic (6 occurrences, all verified against the source having `@gl.storage.allow`) |
| 4 | Full `npm run verify` on GitHub Actions | commit `3519db0`: [run 34522087339](https://github.com/ometere123/reclose/actions/runs/34522087339) SUCCESS; commit `4fc2599`: [run 34534943290](https://github.com/ometere123/reclose/actions/runs/34534943290) SUCCESS |
| 5 | `git diff main -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md"` | 0 lines outside the narrowly-authorised interface corrections tracked in `docs/execution/Interface Change Log.md` |
| 6 | Live deploy x4 fresh contracts (`genlayer deploy`, fee via `genlayer estimate-fees`) | All 4 FINALIZED / FINISHED_WITH_RETURN on studio-dev (61997) - see `deployment-evidence.md` |
| 7 | Live `set_assurance_controller` + `register_target` | Both ACCEPTED; live cross-contract owner/controller handshake succeeded |
| 8 | Live policy lifecycle (`begin_policy`/`add_policy_resource`/`add_policy_rule` x3/`add_policy_effect`/`seal_policy`/`activate_policy`) | All ACCEPTED; `seal_policy` independently confirmed FINALIZED via `genlayer receipt`; `get_active_policy_key` view confirms `policy-v1` active |
| 9 | Live `receive_decision` (fee-allocation investigation, 9 attempts) | Progressed from `AllocationTreeMalformed` to `InsufficientFees` (structurally valid tree, underfunded) - not yet successful; see `release-evidence/r1/c1r/deploy-log.md` section D for all 9 tx hashes |
| 10 | `scripts/test-genvm-lint-wrapper.js` | 9/9 PASS (includes 2 new regression tests for a real CI-caught bug) |
| 11 | `scripts/test-f1-parity.js` | 17/17 PASS (schema/type field parity; full 14-method signature parity is separately proven by the compile-time `__typetests__/sdk-parity.ts` bidirectional assignability check) |
| 12 | `npm run typecheck` (`tsc --noEmit`, includes `sdk-parity.ts`) | PASS |
| 13 | `scripts/test-action-envelope-negative.js` | 24/24 PASS (closed `boundedParameters` container, including 7 new nested-field rejection tests) |

Secret scan: `grep -rniE "BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|-----BEGIN|keystore password=|keystore file path="` against all new packet/evidence files - clean (addresses and transaction hashes only).
