# Commands and Results

All commands below were run in an isolated `git worktree add <path> <sha>` checked out at audit target
commit `c7ace037f63029dccff708cde1ac52372c3f642d`, never from the ambient working directory, so the
results reflect exactly that commit's tree. Full raw output: `verification-results.txt` in this
directory. The worktree was removed after capture.

| # | Command | Result |
|---|---|---|
| 1 | `npm ci` | reproducible, lockfile-strict install; 0 vulnerabilities. (This caught a real defect during packaging: the lockfile committed in `c125fe4` predated the new `packages/protocol-sdk` workspace and `npm ci` failed with `EUSAGE`. Fixed by regenerating the lockfile in `c7ace03`, which is the final audit target - see `commit.txt`.) |
| 2 | `npm run verify` (= lint + typecheck + build + test + schema:validate + truth-model:test + network-guard:test + contracts:lint + contracts:lint:selftest + a0-integrity + verify:py) | PASS - real `tsc --noEmit` and `tsc` build of `packages/protocol-sdk` both succeed (A0-T1); 40/40 fixtures valid across 19 schema files; 7/7 executable transaction-truth semantic tests pass; 4/4 network-guard tests pass (A0-T4); 6/6 DecisionRecord negative tests pass (A0-T3); 0 contract-discovery violations; 8/8 discovery-boundary self-tests; 12/12 a0-integrity-check structural/traceability assertions pass; Python conditional gate reports explicit SKIPPED for both genvm-lint and pytest halves (nothing exists yet to check) |
| 3 | `npm audit` | 0 vulnerabilities |
| 4 | `grep -rlniE "BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY\|-----BEGIN" . --exclude-dir=.git` | clean - the single hit is this packet's own `commands-and-results.md` describing the scan pattern, not a secret |
| 5 | `git ls-files \| grep -iE "node_modules\|\.env$\|keystore\|\.venv\|__pycache__"` | empty - no secret-shaped files are git-tracked |
| 6 | `git diff main -- docs/governance/ CLAUDE.md "Repository Build Master Plan.md" toolchain/` | 0 lines - governance and toolchain locks byte-identical to the G0-accepted baseline |

## Additional cross-checks (via `git show <sha>:<path>` reads at the audit target commit, not the ambient working directory)

| # | Check | Result |
|---|---|---|
| 7 | `docs/execution/Requirements Status.csv` at the audit target contains all 156 locked RTM IDs, no duplicates, no extras | PASS (also mechanically re-verified by `scripts/a0-integrity-check.js`, wired into `npm run verify`) |
| 8 | `docs/security/Threat Status.csv` at the audit target contains all 82 locked TM-* IDs, no duplicates, no extras | PASS (severity counts CRITICAL=25/HIGH=47/MEDIUM=10 match exactly) |
| 9 | Every CRITICAL/HIGH threat in `Threat Status.csv` has non-empty `implementation_refs` AND `test_refs` | PASS - 72/72 |
| 10 | No threat marked `MITIGATED / VERIFIED` has an acknowledged-missing required control | PASS - `TM-INF-001` is back to `MITIGATED / VERIFIED`, this time with both control halves (lock + runtime guard) genuinely implemented and tested (A0-T4); `control_refs` no longer says "NOT DONE" for any `MITIGATED / VERIFIED` row (mechanically checked) |
| 11 | `Requirements Status.csv` and `Threat Status.csv` use only their respective allowed status enums | PASS (0 rows with a disallowed status value) |
| 12 | No CRITICAL threat is `ACCEPTED RESIDUAL RISK` | PASS (0 rows) |
| 13 | `DecisionRecord.schema.json` requires `reporter` (non-null) AND prohibits `outcome`/`decisionStage` = `NONE` | PASS (A0-T3) - `scripts/test-decision-record-negative.js` (6/6) and `packages/protocol-sdk/src/__typetests__/decisionRecord.test-d.ts` (compile-time) both prove this |
| 14 | `docs/execution/Gate Verification Status.csv` F1 rows reference the commit that actually contains the corresponding fix | PASS - `F1-TYPES-01`, `F1-SDK-01`, `F1-FREEZE-01`, `F1-GUARD-01`, `F1-NEGATIVE-01`, `F0-A0INTEGRITY-01` all point at `c125fe4` (the commit that introduced the underlying content), not a self-referential later commit |
| 15 | CI (`.github/workflows/ci.yml`) contains no `\|\| true` failure-swallowing | PASS |
| 16 | CI installs dependencies via `npm ci`, not `npm install` | PASS |
| 17 | CI's Node/npm/Python versions match the G0-accepted exact baseline (Node 24.16.0, npm 11.13.0, Python 3.14.4) | PASS - previously CI pinned a floating `"24"` for Node with no explicit npm pin; now pins both exactly (Part 12 of the A0 final remediation instruction) |
| 18 | Canonical verification (`npm run verify`) includes the Python conditional gate | PASS - `verify:py` is the last step in the `verify` script chain |
| 19 | `packages/protocol-sdk` compiles with pinned `typescript@5.9.3` | PASS (A0-T1) - `npm run typecheck` (`tsc --noEmit`) and `npm run build` (`tsc`, emitting real `.d.ts`/`.js`) both succeed |
| 20 | `ActionEnvelope`/`ExecutionReceipt` canonical shape matches the MDP formal model, not the prior reduced projection | PASS (A0-T2) - `schemas/transaction/ActionEnvelope.schema.json` and `ExecutionReceipt.schema.json` rebuilt; all 3 affected fixtures re-validated |
| 21 | `NFR-CMP-001` wrong-network preflight guard exists and is tested, not merely coincidentally true | PASS (A0-T4) - `packages/protocol-sdk/src/networkGuard.ts` + `scripts/test-network-guard.js` (4/4: accepts 61997, rejects 61999, rejects an arbitrary chain ID) |
| 22 | New `scripts/a0-integrity-check.js` gate mechanically derives locked RTM/TM ID sets from governance sources rather than a hand-maintained list | PASS (A0-T5 support) - 12/12 checks pass, wired into `npm run verify` |
