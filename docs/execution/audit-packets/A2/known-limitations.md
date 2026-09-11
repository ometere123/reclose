# Known Limitations (A2)

1. **A0/A1 have not received an external PASS.** This C2/C3 work proceeded under the same
   repository-owner execution-schedule override A1 proceeded under, not because A0/A1 were
   resolved. All of A0, A1, and this A2 packet await external review.
2. **Judge -> Kernel `receive_decision` dispatch's triggered child transaction fails live with a
   specific fee-allocation-routing error (`fee no_matching_allocation # internal`).** This is a
   narrower, more precise finding than this session's first writeup (which saw only a generic
   `SystemError: 2: inval`) - see `docs/execution/C2 Live Proof Evidence.md` Finding 2 and its
   update for the full live evidence. The Judge's OWN logic (deterministic precheck, real web
   fetch, real `eq_principle` LLM judgment, state persistence) is now live-proven end-to-end; only
   the Kernel-side effect of a CONFIRMED/FINAL decision remains unproven live. Direct Mode proves
   the Kernel-side logic itself (185/185 passing). Not worked around by weakening the contract's
   real cross-contract call.
3. **The same class of limitation from A1 (`AllocationTreeMalformed` on the Kernel -> Target hop)
   remains open** and is a DIFFERENT specific manifestation of the same underlying GenVM fee-
   allocation-routing gap now also seen at the Judge -> Kernel hop (item 2). Both are documented,
   neither is fabricated as resolved.
4. **Two of three representative branches in this session's first fee-profiling run
   (`Kernel.begin_policy`, `IncentiveVault.fund_target_pool`) returned `ESTIMATION_FAILED` with a
   generic "Missing or invalid parameters" RPC error.** Not yet root-caused - recorded honestly,
   not silently retried until success nor omitted from the report
   (`release-evidence/r1/c3/fee-profile-report.json`).
5. **Judge validator-disagreement test still cannot run** (`genlayer-test`'s `spawn_sandbox`
   requires the optional `cloudpickle` package, not installed in this environment) - unchanged
   from C2, documented in `tests/judge/test_incident_judge_v1.py`.
6. **No standing Sentinel service exists.** `@reclose/sentinel`'s `SentinelMonitor` class is
   implemented and tested; a cron/daemon wrapper running it continuously is not yet built -
   tracked as future C3/E1 work in `docs/execution/Operations Runbook.md` Section 6.
7. **No frontend exists yet** (D1-D4/I1-I2 scope, not yet started).
8. **CLI `tx track`'s live network path is not covered by an automated live-network test** (by
   design - it is the one command that makes a real RPC call, and the test suite must run without
   network access). Its pure polling/formatting logic IS covered via a fake client
   (`scripts/test-cli.js`); the genlayer-js wiring in `bin/reclose.js` itself was exercised
   manually this session (see `commands-and-results.md`'s live verification section) but has no
   CI-enforced live-network regression test.
9. **`Requirements Status.csv`/`Threat Status.csv` upgrades for C2/C3 are narrowly scoped** to the
   exact claims the evidence in this packet supports (PRD-INC-002/PRD-INC-009 remain `IN PROGRESS`,
   not `VERIFIED`, per item 2's open finding) - not to every requirement these packages eventually
   touch.
