# Evidence Index (A0)

Every evidence artifact this packet relies on, and where to find it.

## This packet (`docs/execution/audit-packets/A0/`)

| File | Contents |
|---|---|
| `README.md` | Top-level packet guide and independent-verification checklist |
| `scope.md` | What this packet audits and what changed since the first (FAILED) submission |
| `commit.txt` | Audit target commit identity, verification summary, audit-packet-commit lookup instructions |
| `files-changed.txt` | Full file-level diff since the first A0 submission's audit target (`69204d5`) |
| `requirements.csv` | Copy of `Requirements Status.csv` (156 locked RTM IDs) at the audit target commit |
| `requirements-status-snapshot.csv` | Identical content to `requirements.csv` (kept for continuity with the first packet's naming) |
| `threat-status.csv` | Copy of `Threat Status.csv` (82 locked TM-* IDs) at the audit target commit |
| `threat-status-snapshot.csv` | Identical content to `threat-status.csv` (kept for continuity with the first packet's naming) |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit (136 files) |
| `content-hashes.txt` | Git blob SHA + SHA-256 of 12 key frozen/security files, computed independently of any commit's own hash |
| `commands-and-results.md` | Table of every verification command run and its result |
| `verification-results.txt` | Full raw output of those commands, captured in an isolated worktree |
| `compatibility-findings.md` | G0 lock preservation and the one real compatibility event (CF-010) |
| `frontend-contract-review.md` | Independent review of F1-v2 against governance (A0-003/004/005/008) |
| `threat-model-review.md` | Independent review of threat traceability (A0-002) |
| `known-limitations.md` | Honest list of what remains unverified or out of scope |

## Referenced repository evidence (outside this packet, at the audit target commit)

| Path | Purpose |
|---|---|
| `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` | G0 compatibility record (CF-001..CF-013), header "G0 VERIFIED EXECUTION BASELINE" |
| `release-evidence/r1/g0/` | Full G0 evidence pack (network verification, version reports, smoke deploy/write receipts, Direct Mode test report) |
| `toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` | G0-verified pins, unchanged since G0 acceptance |
| `docs/execution/Gate Verification Status.csv` | G0/F0/F1 operational execution-gate checks (separate from the RTM ledger, per A0-001) |
| `docs/execution/Requirements Status.csv` | The 156-ID RTM execution ledger (A0-001) |
| `docs/security/Threat Status.csv` | The 82-ID threat traceability ledger (A0-002) |
| `docs/security/Security Findings.md` | Concrete S0 findings with corrected severity totals (A0-002) |
| `docs/execution/Frontend Contract v1.md` (F1-v2) | Frozen type/SDK/transaction-truth-model contract (A0-003/004/005/008) |
| `docs/execution/Interface Change Log.md` | F1-v1 -> F1-v2 change entry |
| `tests/frontend-fixtures/` + `manifest.json` | 40 fixtures, all schema-valid |
| `schemas/` | 19 JSON Schema files (source of truth for all F1 types) |
| `scripts/list-deployable-contracts.js` + `scripts/test-list-deployable-contracts.js` | Strengthened contract-discovery boundary + its own automated tests (A0-007) |
| `scripts/py-verify.sh` | Conditional Python verification gate replacing `\|\| true` (A0-006) |
| `.github/workflows/ci.yml`, `Makefile` | CI/build entry points using the above (A0-006) |
| `docs/execution/Current Phase.md` | Execution-state record |
| `docs/execution/Phase Log.md` | Full phase history, including this remediation |
| `docs/execution/Open Blockers.md` | OB-001/002/003 status |
