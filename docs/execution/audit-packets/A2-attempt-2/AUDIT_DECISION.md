# A2 Attempt 2 - Independent External Audit Decision

**Decision:** PASS WITH CONDITIONS  
**Next-phase authorisation:** D1, D2, D3, I1, I2 and D4 MAY START.  
**E1/R1 closure:** NOT authorised by this decision.  
**Audit target:** `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5`  
**Reviewed branch:** `claude/a2-remediation-integration`  
**Reviewer:** independent ChatGPT review performed against the immutable GitHub target, current source, GitHub Actions evidence and recorded Studio-dev evidence.

This decision does not overwrite the first A2 packet. `docs/execution/audit-packets/A2/` remains the historical first submission against `ae3a5083e1db805c3fa6692a11661d06e6679ec7`.

## Basis for PASS WITH CONDITIONS

The A2 security-critical implementation is materially present and internally coherent at the audit target:

- the Judge deterministically binds the EAP to target, policy, rule, Reporter and canonical artifact hash;
- source authority comes from the immutable source registry, not from a Reporter-provided trust label;
- non-snapshot public sources are independently fetched, and fetch failure contributes uncertainty rather than substituting Reporter text;
- leader/validator consensus uses the pinned `run_nondet_default` API and validators independently re-evaluate the enforcement-bearing outcome;
- CONFIRMED, REJECTED and UNDETERMINED remain distinct;
- provisional execution is gated by policy opt-in and the exact provisional-safe action set;
- Kernel policy/judge/version/hash binding, replay handling, multi-incident restrictions, remediation and recovery are covered by the current contract suite;
- Vault Reporter identity, policy-derived bond/bounty economics, once-only settlement/payout submission and no ordinary truth-slashing are implemented;
- the exact target passed clean GitHub CI using Node 24.16.0, npm 11.13.0 and Python 3.14.4, including `npm run verify`, 43/43 schema fixtures and 197/197 Python tests;
- a fresh Studio-dev 61997 deployment, wiring, canonical APM compile/readback and timelocked activation are recorded, and the Judge-side real web/LLM path executed live.

The unresolved live failure is narrow and explicitly evidenced: the Judge's triggered Kernel child still fails on Studio-dev with `fee no_matching_allocation # internal`, including when using estimator-discovered allocation data. The repository does not disguise that failure as a successful Kernel decision.

## Conditions

### A2-C01 - live child fee routing remains an E1 blocker

The Studio-dev Judge -> Kernel triggered child must execute successfully before E1 may be declared complete. Until then, no live claim may state that the canonical Judge -> Kernel -> Target, remediation/recovery or Vault settlement path is proven end to end.

This condition does not block D1-D4/I1-I2 because those phases can represent the known failure truthfully and can be built/tested against the verified protocol interfaces and synthetic fixtures.

### A2-C02 - fee profile is coverage-only, not a completed profile

`release-evidence/r1/c3/fee-profile-input.json` still contains placeholder addresses/arguments for required branches. Refresh it against the final deployment and generate actual fee-profile output before A3 closes and before E1 begins. If a branch cannot be estimated because of the same external child-routing limitation, record it as blocked rather than substituting a fabricated number.

### A2-C03 - action trace receipt needs protocol-truth completion

`DirectRecloseClient.trackActionTrace()` currently produces an incomplete product-facing `ExecutionReceipt`: `targetId` is empty, pre/post-state hashes are absent, `expectedPostStateRequired` is always false, and `executionTime` is generated from the reader's wall clock. Complete the trace/read-model plumbing so these fields are protocol-derived or explicitly unavailable under a governed representation. Do not manufacture certainty. This condition must close during I2 before A3.

### A2-C04 - execution ledgers and the first A2 packet are stale

`Current Phase.md` and the first A2 packet still reference the earlier `claude/r1-tooling` / `ae3a508...` state. Preserve the first packet, create this attempt-2 record, update the current phase and append the audit register. Requirements/Threat ledgers may advance only where current evidence supports them.

## Non-blocking observations carried into product work

- The SDK currently maps Kernel CLOSED incidents too coarsely for product display. Where the final outcome is REJECTED or UNDETERMINED, product-facing status must preserve that distinction instead of reducing both to generic CLOSED.
- `AssuranceStateSummary.asOfBlock` must not remain a fabricated zero in real integration. I2 must obtain a real chain height or change the governed interface through the Interface Change Log.
- The deployed policy is zero-bond. A non-zero bond path is Direct-Mode proven but still lacks a dedicated live Studio-dev proof.
- Duplicate-delivery and restart/resume logic are automated-test proven but still lack dedicated live proof on the fresh deployment.

## Gate effect

A2 is accepted with the conditions above. Product implementation D1 -> D2 -> D3 -> I1 -> I2 -> D4 is authorised immediately. A3 may be prepared after those phases, but A3 cannot PASS until A2-C02, A2-C03 and A2-C04 are closed and product runtime/accessibility evidence exists. A2-C01 may remain an externally blocked platform issue through product development, but it blocks successful E1 closure and therefore blocks R1/S1 release closure unless the governing release decision explicitly changes.
