# Commands and Results (A1)

| # | Command | Result |
|---|---|---|
| 1 | `npm run verify` (JS/schema side, includes `scripts/a0-integrity-check.js`) | PASS - 156/156 RTM IDs, 82/82 TM IDs, severity totals correct, governance/toolchain byte-identical to G0 baseline |
| 2 | `genvm-lint lint <each contract>` | 3/4 contracts "Lint passed (3 checks)"; 1 (assurance_kernel.py) flags a confirmed-stale rule (see known-limitations) - informational only, does not block the build |
| 3 | `python3 -m pytest tests -v` (genlayer-test 0.30.0rc2 Direct Mode) | **31/31 PASSED**, independently confirmed on real GitHub Actions Linux CI: [run 34489866914](https://github.com/ometere123/reclose/actions/runs/34489866914) |
| 4 | Full `npm run verify` (JS + Python gate combined) on GitHub Actions | **SUCCESS** on commit `74122cb`: [run 34489866914](https://github.com/ometere123/reclose/actions/runs/34489866914); reconfirmed on `82421aa`: [run 34508366967](https://github.com/ometere123/reclose/actions/runs/34508366967) |
| 5 | `git diff main -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md"` | 0 lines - unchanged |
| 6 | Live deploy x4 (`genlayer deploy`) | All 4 contracts FINALIZED / FINISHED_WITH_RETURN on studio-dev (61997) - see `deployment-evidence.md` |
| 7 | Live `register_target` + `set_assurance_controller` | Both ACCEPTED; live cross-contract handshake succeeded |
| 8 | Live policy lifecycle (`begin_policy`/`add_policy_rule`/`add_policy_effect`/`seal_policy`/`activate_policy`) | All ACCEPTED; `get_active_policy_key` view confirms `policy-v1` active |
| 9 | Live `receive_decision` (2 attempts, different `--fees.messageAllocations` guesses) | FAILED - `AllocationTreeMalformed` (undocumented on-chain fee-allocation structure) - honestly recorded as unresolved, not worked around |

Secret scan: repeated the same pattern used throughout A0 remediation
(`grep -rniE "BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|-----BEGIN"`) against this packet's own new files
(`deployment/61997/c1-manifest.json`, `release-evidence/r1/c1/deploy-log.md`, this packet) - clean,
no secret-shaped content (addresses and transaction hashes only, no private keys).
