# Known Limitations (A1 Attempt 2)

1. **A0 has not received an external PASS.** Both A0 (now at attempt 6) and A1 (this, attempt 2)
   await external review.
2. **The live `receive_decision` -> Kernel -> Target cross-contract dispatch is not proven
   successful**, though it is now proven structurally reachable and its allocation tree
   structurally valid (`InsufficientFees`, not `AllocationTreeMalformed`). See
   `findings-closure.md` A1-H08 and `release-evidence/r1/c1r/deploy-log.md` section D for the
   full nine-transaction investigation. Every threat/requirement whose control depends on this
   path (the full `receive_decision` decision->effect chain, remediation/recovery release
   semantics live, multi-incident composition live) remains `MITIGATED / UNVERIFIED`, not
   upgraded, per Section 27's explicit rule.
3. **The independent reference model does not cover every scenario in Section 20's list** - see
   `model-test-evidence.md` for the exact coverage gap (roughly 17 of ~30 listed scenarios have a
   dedicated model trace; the remainder are proven only via the real Direct Mode contract
   directly).
4. **`judge_version` cross-validation against a live Judge module's own reported version remains
   deferred to C2** (IncidentJudgeV1 does not exist). The primary control - exact-sender match
   plus stored `judge_version` equality on the Kernel side - is fully enforced.
5. **The reference-agent economic proof (Section 24) was not revisited this pass.**
   `ReferenceAgentProtocol.purchase_service` still forwards caller-supplied payable value rather
   than demonstrably spending from its own prefunded treasury; this remains explicitly marked as
   a C3 requirement, not something this pass claims to have resolved, consistent with the prior
   A1 packet's honesty on this point.
6. **`genvm-lint` 0.11.1rc2's static `lint` check has one confirmed-stale rule** (expects
   `@allow_storage`; the pinned SDK only exports `@allow`), narrowly waived per A1-H10's closure -
   see `scripts/genvm-lint-wrapper.js` and its 9 self-tests.
7. **The stand-in Judge used in all live/Direct-Mode tests is the deployer's own address**, not
   IncidentJudgeV1 (C2 scope) - a valid, narrow test of the Kernel's exact-sender check, not of
   any real Judge semantic-adjudication logic.
8. **No IncentiveVault, Sentinel, or frontend/product feature exists** - explicitly out of C1R
   scope, per the instruction's Section 29.
9. **Two intermediate live Kernel deployments occurred this session before the final one used for
   all proof** (an initial deploy predating the CLI-arg-encoding fixes, and one predating the
   `_normalize_str_arg` fix specifically) - both are noted in `deployment/61997/c1r-manifest.json`
   and neither carries any completed policy lifecycle; they are not separate deployment attempts
   requiring their own evidence.
10. **`Requirements Status.csv`/`Threat Status.csv` were deliberately left unchanged this pass** -
    this session's live evidence adds proof for target/controller registration and policy
    lifecycle (already reflected in the existing `TM-AUTH-007` entry from the prior A1 packet) but
    does not add new evidence strong enough to upgrade any `MITIGATED / UNVERIFIED` entry to
    `VERIFIED`, since the cross-contract decision->effect path (item 2) remains unproven live.
