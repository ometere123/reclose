# R1 Release Readiness Checklist

This is the single release-close checklist. A checked item must point to real evidence; absence of evidence means the item remains open.

## Foundation / architecture

- [x] locked architecture/governance documents exist
- [x] Studio-dev chain 61997/toolchain lock exists
- [x] canonical schemas and compiled SDK parity checks exist
- [x] finite ActionEnvelope and lifecycle/execution truth checks exist
- [x] A2 independent decision recorded as PASS WITH CONDITIONS

## Protocol / security source verification

- [x] Kernel policy/action boundaries implemented and covered by automated tests
- [x] Judge EAP/source-registry/equivalence path implemented and covered by automated tests
- [x] Vault economics/identity/once-only paths implemented and covered by automated tests
- [x] Sentinel duplicate/restart behaviour covered by automated tests
- [x] multi-incident and recovery safety covered by automated tests
- [x] clean repository CI verifies current source candidate

## Product / machine interfaces

- [x] D1 product system and information architecture implemented
- [x] D2 core read surfaces implemented
- [x] D3 write/recovery flows implemented in product source
- [x] I1 fixture integration implemented without fixture write authority
- [x] I2 real SDK adapter boundary implemented
- [x] D4 responsive/accessibility/reduced-motion foundations implemented
- [x] SDK product-truth gaps corrected and regression-tested
- [x] bounded agent `skill.md` published and guarded
- [x] A3 packet prepared
- [ ] browser screenshots/recordings captured against frozen A3 SHA
- [ ] keyboard/focus/contrast/reduced-motion browser evidence complete
- [ ] external A3 decision acceptable

## Benchmark / hardening

- [x] >=50 scenario benchmark corpus exists
- [x] threat IDs and evidence paths machine-validated
- [x] hard release targets fixed at zero
- [x] blocked/not-run live cases remain explicit rather than counted as passes
- [ ] all release-required live benchmark cases executed or validly dispositioned by release decision
- [ ] dependency/security review refreshed at final release SHA

## Fees

- [x] fee-profile coverage IDs declared
- [x] fee-profile template rebound to final R1 contract addresses
- [x] final-profile evidence gate implemented
- [ ] dynamic arguments generated from fresh final run
- [ ] fresh final fee profile generated
- [ ] `npm run fee-profile:final-check` passes

## E1 canonical Studio-dev scenario

- [x] E1 evidence contract/template/checker implemented
- [ ] Judge -> Kernel child fee-routing blocker resolved/retested successfully
- [ ] clean run 1 completes all canonical steps with successful required child execution/post-state
- [ ] clean run 2 completes all canonical steps independently
- [ ] real GEN Provider A purchase captured
- [ ] final CONFIRMED compromise captured
- [ ] Provider A restriction + safe mode captured
- [ ] Provider B fallback purchase captured
- [ ] remediation and RECOVERY captured
- [ ] recovery validation and restoration captured
- [ ] final purchase captured
- [ ] `npm run e1:evidence:check` passes

## Ledger / audit closure

- [ ] canonical Requirements Status reconciled to final evidence
- [ ] canonical Threat Status reconciled to final evidence
- [ ] Gate Verification Status reconciled to final evidence
- [ ] Security Findings reconciled and residual risks explicitly decided
- [ ] A4 packet built against immutable final candidate
- [ ] external A4 decision PASS or acceptable PASS WITH CONDITIONS
- [ ] all release-critical A4 conditions closed

## Submission integrity

- [x] release claim matrix exists
- [ ] final submission claims reviewed against `R1 Release Claim Matrix.md`
- [ ] deployment manifest points only to current/final addresses
- [ ] README/docs do not imply live E1 success before evidence exists
- [ ] no private keys, seed phrases, keystore passwords or tokens tracked
- [ ] final clean CI success recorded
- [ ] R1 marked closed only after all P0/R1 release conditions are satisfied

## Current hard blocker

`fee no_matching_allocation # internal` on the live Studio-dev Judge -> Kernel triggered child.

This checklist must not be edited to remove a requirement merely because the current environment cannot satisfy it. Resolve the blocker, produce the evidence, or record an explicit governing release decision.
