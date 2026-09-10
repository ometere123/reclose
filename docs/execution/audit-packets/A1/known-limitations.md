# Known Limitations (A1)

1. **A0 has not received an external PASS.** This C1 work proceeded under an explicit
   repository-owner execution-schedule override, not because A0 was resolved. Both A0 (fourth/fifth
   submission history) and A1 (this packet) await external review.
2. **`receive_decision`'s cross-contract effect dispatch is not proven live.** See
   `deployment-evidence.md` for the exact `AllocationTreeMalformed` failure and why it was not
   worked around by further guessing. The underlying logic is proven via Direct Mode (31/31 tests).
3. **Fee handling for this deployment was hand-supplied, not derived via `--fee-profile`.**
   `gltest --fee-profile` generation requires the deployer's raw private key in a local
   `gltest.config.yaml`; this session's safety classifier correctly declined to decrypt the
   provided keystore to obtain it. The repository owner chose (of three offered options) to have
   Claude empirically probe `--fees`/`--fee-value` instead. This worked for all four deploys and
   the policy-construction write sequence, but is not the intended repeatable C3 tooling path
   (documented in CF-010/CF-011) and should not be assumed to generalize to arbitrary future calls
   without re-probing.
4. **Only one Contract subclass may be loaded per Direct Mode test function** (a genlayer-test
   0.30.0rc2 limitation, confirmed by direct experimentation - see `tests/kernel/conftest.py`).
   Kernel<->Target cross-contract logic is unit-tested via a monkeypatched proxy in Direct Mode;
   the LIVE deployment in this packet is what actually proves real cross-contract wire behavior for
   the registration/policy paths (see item 2 for the one path still unproven).
5. **`genvm-lint` 0.11.1rc2's static `lint` check has a confirmed-stale rule** (expects
   `@allow_storage`; the real pinned SDK only exports `@allow`) and is treated as informational, not
   blocking - see the detailed comment in `scripts/py-verify.sh` and commit `74122cb`.
6. **No IncidentJudge exists.** `rule.judge` in these tests/deployment is the deployer's own
   address acting as a stand-in Judge (a valid, narrow test of the Kernel's exact-sender check,
   TM-AUTH-008) - it does not exercise any real Judge semantic-adjudication logic, which is C2 scope.
7. **`judge_version` cross-validation against the Judge module's own reported version is deferred
   to C2** (documented in `contracts/assurance_kernel.py::receive_decision`) - the primary TM-AUTH-008
   control (exact sender match) is fully enforced now.
8. **No IncentiveVault, Sentinel, or frontend/product feature exists** - explicitly out of C1 scope.
9. **`ReferenceAgentProtocol`'s cross-contract value-forwarding to a provider's `fulfill()`** uses a
   plain method call (`provider_contract.fulfill(request_ref)`) without confirmed value-forwarding
   syntax from the genvm-linter stub surface - documented inline in the contract source as a known
   limitation requiring live verification before being treated as VERIFIED for economic-transfer
   correctness (this was not part of the live-deployment test scope; `purchase_service` was tested
   only via Direct Mode, not live).
10. **`Requirements Status.csv`/`Threat Status.csv` upgrades in this phase are narrowly scoped** to
    the exact claims the live evidence supports (target registration handshake, active-policy
    lifecycle, live owner/controller authentication) - not to `receive_decision`'s full decision ->
    effect chain, which remains `MITIGATED / UNVERIFIED` pending item 2's resolution.
