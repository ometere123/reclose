# R1 Claim to Evidence Matrix

| Claim | Current evidence | Limit |
|---|---|---|
| R1 lifecycle-specific Kernel wrappers are implemented and tested | `contracts/assurance_kernel.py`, `tests/kernel/`, exact-target CI run `34791729354` | Direct Mode/CI do not prove a live accepted message. |
| Current Studio-dev policy is active and bound to the current Judge | `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`, including finalized writes and readbacks | Policy activation does not prove incident execution. |
| Registry hash matches current registry and deployed Judge | deployment manifest and Judge readback | Applies to this recorded generation. |
| Immutable evidence authority requires independently fetched, hash-bound snapshots | Judge implementation, evidence hardening tests, frozen synthetic fixtures under `release-evidence/r1/` | No E1 judgment was submitted on current deployment. |
| Isolated Studio-dev `emit_decided` internal-message simulation succeeds | `release-evidence/r1/diagnostics/accepted-message-repro/typed-address-existing-parent/result.json` | Existing Parent/Child, typed `CalldataAddress`, saved allocation; read-only (`transactionSubmitted: false`); fee is an estimate, not a charge. This does not prove the production Judge→Kernel→Target lifecycle. |
| Historical `accepted` failure and malformed-string retry are retained as superseded diagnostics | `release-evidence/r1/diagnostics/accepted-message-repro/` | The old phase failure is superseded; the later string-address request failed decoding before emission. Neither is the current live blocker. |
| 78-scenario corpus structure is valid | `benchmark/r1-scenarios.json`, `npm run benchmark:check` | No full H1 execution or aggregate metrics. |
| Exact branch CI passed | GitHub Actions run `34791729354` | Does not close live E1/H1. |
| Current wallet funding reached ReferenceAgent treasury | `release-evidence/r1/diagnostics/run-a-treasury-readback.json` | User screenshot's displayed tx hash was truncated and is recorded unavailable. |
| E1 A+B and end-to-end recovery | No passing evidence artifact | Not achieved; blocked/not run. |
| A3/A4 external review | Audit packet status files | Awaiting external review; no self-authored PASS. |

The row-level authoritative ledgers are `docs/execution/Requirements Status.csv` (156 requirements) and `docs/security/Threat Status.csv` (82 threats). Their evidence completeness remains in progress; a valid repository-integrity check is not equivalent to full row-level reconciliation.

The current generated reconciliation records 10 VERIFIED, 27 IN PROGRESS, 13 IMPLEMENTED / UNVERIFIED and 106 NOT STARTED requirements; all 82 threat rows have required fields but remain 2 MITIGATED / VERIFIED, 16 MITIGATED / UNVERIFIED and 64 OPEN. These are ledger classifications, not live proof or security pass rates. Nine rows explicitly document partial implementation or missing targeted tests, and the cited CI evidence is a repository test record rather than live evidence for every control.
