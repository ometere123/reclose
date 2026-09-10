# Commands and Results

All commands below were run in an isolated `git worktree add <path> <sha>` checked out at audit target
commit `fef26f2c754e401008a7a0342b5b1bd4a1c0b8ff`, never from the ambient working directory, so the
results reflect exactly that commit's tree. Full raw output: `verification-results.txt` in this
directory. The worktree was removed after capture.

| # | Command | Result |
|---|---|---|
| 1 | `npm ci` | reproducible, lockfile-strict install (A0-R5: no longer `npm install`); 0 vulnerabilities |
| 2 | `npm run verify` (= lint + typecheck + test + schema:validate + truth-model:test + contracts:lint + contracts:lint:selftest + verify:py) | PASS - 40/40 fixtures valid across 19 schema files; 7/7 executable transaction-truth semantic tests pass (A0-R6); 0 contract-discovery violations; 8/8 discovery-boundary self-tests; Python conditional gate reports explicit SKIPPED for both genvm-lint and pytest halves (nothing exists yet to check) |
| 3 | `npm audit` | 0 vulnerabilities |
| 4 | `grep -rlniE "BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY\|-----BEGIN" . --exclude-dir=.git` | clean - the single hit is this packet's own `commands-and-results.md` describing the scan pattern, not a secret |
| 5 | `git ls-files \| grep -iE "node_modules\|\.env$\|keystore\|\.venv\|__pycache__"` | empty - no secret-shaped files are git-tracked |
| 6 | `git diff main -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md" toolchain/` | 0 lines - governance and toolchain locks byte-identical to the G0-accepted baseline |

## Additional cross-checks (via `git show <sha>:<path>` reads at the audit target commit, not the ambient working directory)

| # | Check | Result |
|---|---|---|
| 7 | `docs/execution/Requirements Status.csv` at the audit target contains all 156 locked RTM IDs, no duplicates, no extras | PASS |
| 8 | `docs/security/Threat Status.csv` at the audit target contains all 82 locked TM-* IDs, no duplicates, no extras | PASS (severity counts CRITICAL=25/HIGH=47/MEDIUM=10 match exactly) |
| 9 | Every CRITICAL/HIGH threat in `Threat Status.csv` has non-empty `implementation_refs` AND `test_refs` | PASS - 72/72 (A0-R1; was 4/72 at the prior submission) |
| 10 | No threat marked `MITIGATED / VERIFIED` has an acknowledged-missing required control | PASS - `TM-INF-001` corrected to `IN PROGRESS` (A0-R2); the 2 remaining `MITIGATED / VERIFIED` rows (`TM-INF-003`, `TM-INF-006`) have their full required control satisfied |
| 11 | `Requirements Status.csv` and `Threat Status.csv` use only their respective allowed status enums | PASS (0 rows with a disallowed status value) |
| 12 | No CRITICAL threat is `ACCEPTED RESIDUAL RISK` | PASS (0 rows) |
| 13 | `DecisionRecord.schema.json` requires `reporter` (non-null) | PASS (A0-R3) |
| 14 | `docs/execution/Gate Verification Status.csv` F1 rows reference the commit that actually contains the corresponding fix | PASS (A0-R4) - see `gate-verification-status-snapshot.csv` |
| 15 | CI (`.github/workflows/ci.yml`) contains no `\|\| true` failure-swallowing | PASS |
| 16 | CI installs dependencies via `npm ci`, not `npm install` | PASS (A0-R5) |
| 17 | CI's Python version matches `toolchain/versions.lock`'s G0-pinned baseline (3.14.4) | PASS (A0-R5) |
| 18 | Canonical verification (`npm run verify`) includes the Python conditional gate | PASS (A0-R5) - `verify:py` is the last step in the `verify` script chain |
