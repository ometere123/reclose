# Evidence Index (A1)

| File | Contents |
|---|---|
| `README.md` | Top-level packet guide |
| `scope.md` | Override context, commit history for this phase, what did/didn't change |
| `deployment-evidence.md` | Live Studio-dev deployment summary, addresses, tx hashes, proven flows |
| `commands-and-results.md` | Every verification command and its result, including CI run links |
| `requirements.csv` | 156 locked RTM IDs at the audit target commit |
| `threat-status.csv` | 82 locked TM-* IDs at the audit target commit |
| `known-limitations.md` | Honest list of what remains unverified or out of scope |
| `file-manifest.txt` | Full tracked-file listing at the audit target commit |

## Referenced repository evidence (outside this packet)

| Path | Purpose |
|---|---|
| `contracts/assurance_kernel.py`, `reference_agent_protocol.py`, `provider_stub_a.py`, `provider_stub_b.py` | C1 contract source |
| `tests/kernel/`, `tests/reference-agent/`, `tests/providers/` | 31 Direct Mode tests |
| `deployment/61997/c1-manifest.json` | Machine-readable deployment manifest |
| `release-evidence/r1/c1/deploy-log.md` | Full deployment narrative and evidence |
| `docs/execution/Requirements Status.csv` | RTM ledger, current state |
| `docs/security/Threat Status.csv` | Threat ledger, current state |
| `docs/execution/Audit Register.md` | Full A0 history + the owner's execution-schedule override note |
| `docs/execution/audit-packets/A0/` | The (not yet externally decided) A0 packet this C1 work builds on |
