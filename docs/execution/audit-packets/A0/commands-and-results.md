# Commands and Results

All commands below were run in an isolated `git worktree add <path> HEAD` checked out at audit target
commit `82b0d7ce50ad3db62aaa34b677bd6d8927dd7b25`, never from the ambient working directory, so the
results reflect exactly that commit's tree. Full raw output: `verification-results.txt` in this
directory. The worktree was removed after capture.

| # | Command | Result |
|---|---|---|
| 1 | `npm install` | up to date, 0 vulnerabilities reported by the installer |
| 2 | `npm run verify` (= lint + typecheck + test + schema:validate + contracts:lint + contracts:lint:selftest) | PASS - 40/40 fixtures valid across 19 schema files; 0 contract-discovery violations; 8/8 discovery-boundary self-tests pass |
| 3 | `bash scripts/py-verify.sh` | PASS - explicit SKIPPED for genvm-lint and pytest gates (no deployable contracts or Python tests exist yet); no `\|\| true` failure-swallowing present |
| 4 | `npm audit` | 0 vulnerabilities |
| 5 | `grep -rlniE "BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY\|-----BEGIN" . --exclude-dir=.git` | clean - the single hit is `docs/execution/audit-packets/A0/README.md`'s own prose describing the scan pattern, not a secret |
| 6 | `git ls-files \| grep -iE "node_modules\|\.env$\|keystore\|\.venv\|__pycache__"` | empty - no secret-shaped files are git-tracked |
| 7 | `git diff main -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md" toolchain/` | 0 lines - governance and toolchain locks byte-identical to the G0-accepted baseline |

## Additional cross-checks (run against the working tree after the audit target commit, using `git show <sha>:<path>` reads - not from the ambient working directory)

| # | Check | Result |
|---|---|---|
| 8 | `docs/execution/Requirements Status.csv` at the audit target contains all 156 locked RTM IDs, no duplicates, no extras | PASS (verified by diffing the ID set against `docs/governance/Requirements Traceability Matrix.md`'s own table) |
| 9 | `docs/security/Threat Status.csv` at the audit target contains all 82 locked TM-* IDs, no duplicates, no extras | PASS (verified against `docs/security/Threat Model & Security Assurance Plan.md` Section 11's own tables; severity counts CRITICAL=25/HIGH=47/MEDIUM=10 match exactly) |
| 10 | Every CRITICAL/HIGH threat in `Threat Status.csv` has a non-empty `requirement_refs` | PASS (0 missing) |
| 11 | `Requirements Status.csv` and `Threat Status.csv` use only their respective allowed status enums | PASS (0 rows with a disallowed status value) |
| 12 | No CRITICAL threat is `ACCEPTED RESIDUAL RISK` | PASS (0 rows) |
