# G0 Compatibility Evidence Index

| Evidence file | Proves |
|---|---|
| preflight.md | overall G0 pass/fail/blocked summary per target |
| install-log.txt | exact install commands and outcomes for CLI/JS/Python packages |
| version-report.txt | exact installed tool/runtime versions |
| network-verification.json | cross-source (raw RPC, CLI, JS SDK, Python SDK, browser UI) chain-identity agreement |
| smoke-contract.py | the smallest valid deterministic Intelligent Contract used for G0 |
| smoke-schema.json | ABI schema extracted from the smoke contract via genvm-lint |
| smoke-test-report.txt | lint/validate/schema/typecheck/gltest results, including the FeesDistributionMissing finding |

Runner hashes and network identity were independently corroborated across four sources: raw JSON-RPC, the
GenLayer CLI, `genlayer-js`, and `genlayer-py`, plus a live in-app browser check of the Studio-dev UI
(v0.123.0-rc.6, matching the compatibility record's candidate baseline).

## Follow-up (funded session, 2026-09-10)

| Evidence file | Proves |
|---|---|
| smoke-deployment.json | deployer, tx hash, contract address, fee derivation method, lifecycle/execution-result summary |
| smoke-receipt.json | structured deploy+write+post-state summary, including refund evidence |
| deploy-success/smoke-deployment-receipt.txt | full `genlayer receipt` output for the successful deploy tx |
| deploy-success/smoke-write-receipt.txt | full `genlayer receipt` output for the successful write tx, including fee_accounting refund fields |
| deploy-success/fee-profile.json | the fee-profile file used to trigger SDK-derived fee estimation (no hand-derived FeesDistribution) |
| deploy-success/smoke-contract-deployed.py | exact source deployed (identical to the original smoke contract) |
| deploy_reverted_history_note.md | explains why the original reverted transaction is kept and how it relates to the later success |

The original reverted transaction (`0x90140b97d71bd1904ad263085399c6b494fae259680a22f4f054dd59a33b9d2a`,
`FeesDistributionMissing`) was deliberately preserved, not deleted, in `smoke-test-report.txt` Session 1 - it
remains valid evidence of the network's fee-enforcement boundary on an unfunded account.

## External-review closure (2026-09-10)

| Evidence file | Proves |
|---|---|
| direct-mode-report.md | GenLayer Test Direct Mode command, PASS result, and the Windows-native bug (CF-013) worked around via WSL |
| direct-mode-test-output.txt | raw pytest output for the passing Direct Mode run (WSL/Linux) |
| deploy-success-pinned/smoke-contract-pinned.py | the smoke contract with its dependency header changed from the floating `:test` tag to the exact accepted hash |
| deploy-success-pinned/fee-profile.json | fee profile used for the pinned-hash deploy/write (identical SDK-derivation method as the floating-tag deploy) |
| deploy-success-pinned/smoke-deployment-receipt.txt | full receipt for the pinned-hash deploy tx (Finalized . Accepted, FINISHED_WITH_RETURN) |
| deploy-success-pinned/smoke-write-receipt.txt | full receipt for the pinned-hash write tx, including refund fields |
| deploy-success-pinned/test_direct_smoke.py | the exact Direct Mode test that was run |

Both the floating-tag successful deployment (`deploy-success/`) and the pinned-hash successful deployment
(`deploy-success-pinned/`) are preserved side by side, alongside the original reverted transaction - nothing was
deleted or overwritten across any of the three sessions that produced this evidence pack.
