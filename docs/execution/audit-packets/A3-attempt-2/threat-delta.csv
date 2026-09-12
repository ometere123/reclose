# A3 threat delta

A3 does not mass-promote canonical `Threat Status.csv` rows to VERIFIED. Product/source evidence and browser/live evidence are deliberately separated.

## Threats materially addressed by D1-D4 / I1-I2

| Threat | Product control added | Evidence | Current A3 interpretation |
|---|---|---|---|
| TM-UX-001 | policy authority/diff review remains explicit before signing | frontend policy review + product tests | implemented, browser verification pending |
| TM-UX-002 | accessible semantic shell, keyboard/focus and reduced-motion foundations | `frontend/index.html`, `frontend/styles.css`, product tests | implemented, browser/a11y verification pending |
| TM-UX-003 | target/onboarding information exposes authority context | frontend onboarding/target surfaces | implemented, browser verification pending |
| TM-UX-004 | report flow separates evidence, fee/bond and signing | frontend report surface + product tests | implemented, live wallet verification pending |
| TM-UX-005 | incident/transaction stages remain visibly distinct | five-band Incident Explorer + lifecycle helpers | implemented, browser/live trace pending |
| TM-UX-006 | CONFIRMED/REJECTED/UNDETERMINED are not collapsed | SDK product-truth tests + product domain helpers | automated verification present |
| TM-UX-007 | external evidence is escaped/untrusted text, not executable instructions | `frontend/lib/domain.js` + malicious evidence test | automated verification present |
| TM-UX-008 | long-running transaction ID persists before polling; no blind resubmission | persistence helper + tracker tests | automated verification present, browser reload proof pending |
| TM-UX-009 | downstream execution failure is distinct from judgment/finality | action receipt truth + Incident Explorer | automated verification present, canonical live success blocked |
| TM-INF-001 | runtime chain identity guard remains 61997 | SDK network guard tests | unit/source verified; full live integration remains evidence-bound |
| TM-LIFE-002 | finality cannot masquerade as execution success | lifecycle/action receipt/product tests | automated verification present |
| TM-LIFE-003 | raw GenLayer UNDETERMINED remains distinct from Reclose UNDETERMINED | transaction truth tests | automated verification present |

## Threats reopened or newly created

No new security threat was discovered by the product implementation itself.

The existing live infrastructure limitation remains open: Studio-dev Judge -> Kernel triggered-child fee allocation fails with `fee no_matching_allocation # internal`. It is not reclassified as a product/UI defect and is not hidden by product state.

## Verification boundary

A3 external review should not mark browser-dependent TM-UX controls VERIFIED solely from source inspection. Final verification requires the browser evidence listed in `screenshots-recordings-index.md`. Likewise, live downstream execution claims remain blocked until E1 records real successful child execution and post-state.
