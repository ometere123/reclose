# Evidence Index (A0)

Every evidence artifact this packet relies on, and where to find it.

## This packet (`docs/execution/audit-packets/A0/`)

| File | Contents |
|---|---|
| `README.md` | Top-level packet guide and independent-verification checklist |
| `scope.md` | What this packet audits and the full three-submission audit history |
| `commit.txt` | Audit target commit identity, verification summary, audit-packet-commit lookup instructions |
| `files-changed.txt` | Full file-level diff since the second (also FAILED) submission's audit target |
| `requirements.csv` | Copy of `Requirements Status.csv` (156 locked RTM IDs) at the audit target commit |
| `requirements-status-snapshot.csv` | Identical content to `requirements.csv` (kept for naming continuity) |
| `threat-status.csv` | Copy of `Threat Status.csv` (82 locked TM-* IDs, now with implementation_refs/test_refs) at the audit target commit |
| `threat-status-snapshot.csv` | Identical content to `threat-status.csv` (kept for naming continuity) |
| `gate-verification-status-snapshot.csv` | Copy of `Gate Verification Status.csv` (refreshed G0/F0/F1 operational checks) at the audit target commit |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit (147 files) |
| `content-hashes.txt` | Git blob SHA + SHA-256 of 14 key frozen/security/CI files, computed independently of any commit's own hash |
| `commands-and-results.md` | Table of every verification command run and its result, including the 18-item cross-check table |
| `verification-results.txt` | Full raw output of those commands, captured in an isolated worktree |
| `compatibility-findings.md` | G0 lock preservation, the CI Python-version alignment fix, and the CF-010 event |
| `frontend-contract-review.md` | Independent review of the F1-v3 reporter fix (A0-R3) |
| `threat-model-review.md` | Independent review of threat implementation/test traceability (A0-R1) and the TM-INF-001 correction (A0-R2) |
| `known-limitations.md` | Honest list of what remains unverified or out of scope |

## Referenced repository evidence (outside this packet, at the audit target commit)

| Path | Purpose |
|---|---|
| `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` | G0 compatibility record (CF-001..CF-013), header "G0 VERIFIED EXECUTION BASELINE" |
| `release-evidence/r1/g0/` | Full G0 evidence pack |
| `toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` | G0-verified pins, unchanged since G0 acceptance; `versions.lock`'s `python: 3.14.4` now matches CI exactly |
| `docs/execution/Gate Verification Status.csv` | G0/F0/F1 operational execution-gate checks, refreshed per A0-R4 to point at the commits that actually contain each fix |
| `docs/execution/Requirements Status.csv` | The 156-ID RTM execution ledger, with `threat_ref` reverse-mapping for 70 requirement rows (A0-R1) |
| `docs/security/Threat Status.csv` | The 82-ID threat traceability ledger; all 72 CRITICAL/HIGH threats now have `implementation_refs`+`test_refs` (A0-R1); `TM-INF-001` corrected to `IN PROGRESS` (A0-R2) |
| `docs/security/Security Findings.md` | Concrete S0 findings, corrected to 2 `MITIGATED / VERIFIED` findings |
| `docs/execution/Frontend Contract v1.md` (F1-v3) | Frozen type/SDK/transaction-truth-model contract; `DecisionRecord.reporter` now required (A0-R3) |
| `docs/execution/Interface Change Log.md` | F1-v1 -> F1-v2 and F1-v2 -> F1-v3 change entries |
| `tests/frontend-fixtures/` + `manifest.json` | 40 fixtures, all schema-valid |
| `schemas/` | 19 JSON Schema files; `GenLayerTransactionLifecycle.schema.json` now enforces `derived.isFinal`/`rawStatus` consistency via `allOf`/`if`/`then` (A0-R6) |
| `scripts/test-transaction-truth-model.js` | 7 executable semantic tests proving the transaction truth model's cross-field invariants (A0-R6) |
| `scripts/list-deployable-contracts.js` + `scripts/test-list-deployable-contracts.js` | Contract-discovery boundary + its own automated tests |
| `scripts/py-verify.sh` | Conditional Python verification gate, now wired into the single canonical `npm run verify` via the `verify:py` script (A0-R5) |
| `.github/workflows/ci.yml`, `Makefile` | CI/build entry points - `npm ci`, Python 3.14.4, one canonical `verify` job (A0-R5) |
| `docs/execution/Current Phase.md` | Execution-state record |
| `docs/execution/Phase Log.md` | Full phase history, including both remediation passes |
| `docs/execution/Open Blockers.md` | OB-001/002/003 status |
