# Evidence Index (A1 Attempt 2)

| File | Contents |
|---|---|
| `README.md` | Top-level packet guide |
| `scope.md` | Authorization, branch/commit history, what did/didn't change |
| `findings-closure.md` | A1-H01..A1-H12 finding-by-finding closure |
| `commands-and-results.md` | Every verification command and its result, including CI run links |
| `deployment-evidence.md` | Live Studio-dev deployment summary |
| `security-invariant-matrix.md` | CLAUDE.md Section 7 invariants mapped to enforcement/tests |
| `model-test-evidence.md` | Independent reference model coverage and the two bugs it found |
| `requirements.csv` | RTM snapshot at the audit target commit |
| `threat-status.csv` | Threat ledger snapshot at the audit target commit |
| `known-limitations.md` | Honest list of what remains unverified or out of scope |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit |

## Referenced repository evidence (outside this packet)

| Path | Purpose |
|---|---|
| `contracts/assurance_kernel.py`, `reference_agent_protocol.py`, `provider_stub_a.py`, `provider_stub_b.py` | C1R contract source |
| `tests/kernel/`, `tests/reference-agent/`, `tests/providers/`, `tests/model/` | 73 Direct Mode + model tests |
| `deployment/61997/c1r-manifest.json` | Machine-readable C1R deployment manifest |
| `release-evidence/r1/c1r/deploy-log.md` | Full C1R deployment narrative and fee-allocation investigation |
| `docs/execution/Requirements Status.csv` | RTM ledger, current state |
| `docs/security/Threat Status.csv` | Threat ledger, current state |
| `docs/execution/Audit Register.md` | Full A0/A1 history, owner-supplied findings |
| `docs/execution/audit-packets/A0-attempt-6/` | The (not yet externally decided) A0 packet this A1 pass builds on |
| `docs/execution/audit-packets/A1/` | A1 attempt 1 (rejected) - preserved historical evidence |
