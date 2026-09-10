# Evidence Index (A0)

Every evidence artifact this packet relies on, and where to find it.

## This packet (`docs/execution/audit-packets/A0/`)

| File | Contents |
|---|---|
| `README.md` | Top-level packet guide and independent-verification checklist |
| `scope.md` | What this packet audits and the full four-submission audit history |
| `commit.txt` | Audit target commit identity, verification summary, audit-packet-commit lookup instructions |
| `files-changed.txt` | Full file-level diff since the third (also FAILED) submission's audit target |
| `requirements.csv` | Copy of `Requirements Status.csv` (156 locked RTM IDs) at the audit target commit |
| `requirements-status-snapshot.csv` | Identical content to `requirements.csv` (kept for naming continuity) |
| `threat-status.csv` | Copy of `Threat Status.csv` (82 locked TM-* IDs, all CRITICAL/HIGH with implementation_refs/test_refs) at the audit target commit |
| `threat-status-snapshot.csv` | Identical content to `threat-status.csv` (kept for naming continuity) |
| `gate-verification-status-snapshot.csv` | Copy of `Gate Verification Status.csv` (refreshed G0/F0/F1 operational checks) at the audit target commit |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit |
| `content-hashes.txt` | Git blob SHA + SHA-256 of key frozen/security/CI/package files, computed independently of any commit's own hash |
| `commands-and-results.md` | Table of every verification command run and its result, including the 22-item cross-check table |
| `verification-results.txt` | Full raw output of those commands, captured in an isolated worktree |
| `compatibility-findings.md` | G0 lock preservation and the CI Python-version alignment |
| `frontend-contract-review.md` | Independent review of F1-v4 (A0-T1: compiled types, A0-T2: ActionEnvelope/ExecutionReceipt, A0-T3: NONE prohibition) |
| `threat-model-review.md` | Independent review of the TM-INF-001/NFR-CMP-001 runtime-guard closure (A0-T4) |
| `known-limitations.md` | Honest list of what remains unverified or out of scope |

## Referenced repository evidence (outside this packet, at the audit target commit)

| Path | Purpose |
|---|---|
| `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` | G0 compatibility record (CF-001..CF-013), header "G0 VERIFIED EXECUTION BASELINE" |
| `release-evidence/r1/g0/` | Full G0 evidence pack |
| `toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json` | G0-verified pins, unchanged since G0 acceptance |
| `docs/execution/Gate Verification Status.csv` | G0/F0/F1 operational execution-gate checks, refreshed with three new rows (`F1-GUARD-01`, `F1-NEGATIVE-01`, `F0-A0INTEGRITY-01`) and corrected `F1-TYPES-01`/`F1-SDK-01`/`F1-FREEZE-01` evidence |
| `docs/execution/Requirements Status.csv` | The 156-ID RTM execution ledger; `NFR-CMP-001` now cites the real guard implementation/test |
| `docs/security/Threat Status.csv` | The 82-ID threat traceability ledger; `TM-INF-001` corrected back to `MITIGATED / VERIFIED` with both control halves genuinely complete (A0-T4) |
| `docs/security/Security Findings.md` | Concrete S0 findings, now 3 `MITIGATED / VERIFIED` findings (`TM-INF-001`, `TM-INF-003`, `TM-INF-006`) |
| `docs/execution/Frontend Contract v1.md` (F1-v4) | Frozen type/SDK/transaction-truth-model contract; `ActionEnvelope`/`ExecutionReceipt` rebuilt, `DecisionRecord` NONE-prohibition documented |
| `docs/execution/Interface Change Log.md` | All F1 change entries, including the new F1-v3 -> F1-v4 entry |
| `docs/execution/Audit Register.md` | Preserved four-attempt A0 external audit history |
| `packages/protocol-sdk/` | Real compiled TypeScript package: `src/types.ts`, `src/sdk.ts`, `src/networkGuard.ts`, `src/__typetests__/` (A0-T1, A0-T4) |
| `tests/frontend-fixtures/` + `manifest.json` | 40 fixtures, all schema-valid |
| `schemas/` | 19 JSON Schema files; `ActionEnvelope`/`ExecutionReceipt` rebuilt (A0-T2); `DecisionRecord` NONE-prohibited (A0-T3) |
| `scripts/test-transaction-truth-model.js` | 7 executable semantic tests for the transaction truth model |
| `scripts/test-decision-record-negative.js` | 6 executable negative tests proving NONE/missing-reporter rejection (A0-T3) |
| `scripts/test-network-guard.js` | 4 executable tests proving the wrong-network guard rejects 61999 and other chains (A0-T4) |
| `scripts/a0-integrity-check.js` | 12-check automated audit-integrity gate, mechanically deriving locked ID sets from governance sources |
| `scripts/list-deployable-contracts.js` + `scripts/test-list-deployable-contracts.js` | Contract-discovery boundary + its own automated tests |
| `scripts/py-verify.sh` | Conditional Python verification gate, wired into the single canonical `npm run verify` |
| `.github/workflows/ci.yml`, `Makefile` | CI/build entry points - `npm ci`, exact Node 24.16.0/npm 11.13.0/Python 3.14.4 pins |
| `docs/execution/Current Phase.md` | Execution-state record |
| `docs/execution/Phase Log.md` | Full phase history, including all remediation passes |
| `docs/execution/Open Blockers.md` | OB-001/002/003 status |
