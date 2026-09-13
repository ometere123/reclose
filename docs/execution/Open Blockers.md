# Open Blockers

## OB-001 - No funded Studio-dev credential for deploy/fee verification [RESOLVED 2026-09-10]

**Opened:** 2026-09-10  
**Resolved:** 2026-09-10  
**Phase:** G0

The repository owner funded the Reclose-dedicated Studio-dev account `reclose-deployer` (`0x24fAe7cD031Ed702Be63BDeA8912141805B996bd`) with 100 GEN. Successful fee-funded deployment/write/read evidence was subsequently captured. The original unfunded revert remains historical evidence. Pre-existing unrelated-project CLI accounts were not used for Reclose.

## OB-002 - GenLayer Test Direct Mode not yet exercised for G0-TEST-01 [RESOLVED 2026-09-10]

**Opened:** 2026-09-10  
**Resolved:** 2026-09-10  
**Phase:** G0

The original Docker/localnet framing was corrected. `genlayer-test==0.30.0rc2` Direct Mode was exercised successfully under WSL/Linux using the pinned smoke contract. See the compatibility record and G0 Direct Mode evidence.

## OB-003 - No git repository initialized [RESOLVED 2026-09-10]

**Opened:** 2026-09-10  
**Resolved:** 2026-09-10  
**Phase:** F0

Git was initialized, historical audited commits were preserved, and the controlled branch/audit process was established.

## OB-004 - Runner-hash discrepancy between registry snapshot and live Studio-dev runner family [RESOLVED 2026-09-10]

**Opened:** 2026-09-10  
**Resolved:** 2026-09-10  
**Phase:** G0

The accepted R1 `py-genlayer` runner hash is `5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`, with stdlib hash `kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`. The pinned baseline was re-linted, Direct-Mode-tested and live-deployed.

## OB-005 - Studio-dev Judge -> Kernel triggered child fails live [OPEN / RELEASE BLOCKER]

**Opened:** 2026-09-11  
**Phase:** A2 / E1  
**External audit reference:** A2-C01

The current fresh R1 deployment proves Judge-side deterministic precheck, public-source fetch, LLM judgment and Judge state persistence, but the required Judge -> Kernel triggered child still fails live with:

`fee no_matching_allocation # internal`

This has reproduced on fresh deployment/evidence and is currently treated as a Studio-dev/runtime limitation rather than silently blamed on application semantics.

**Release consequence:**

- E1 cannot close.
- The canonical compromise -> Kernel consequence -> target restriction/safe-mode -> fallback -> remediation -> RECOVERY -> validation -> restoration sequence is not yet live-proven end to end.
- Direct Mode proof does not substitute for the required live E1 child-execution evidence.
- A final R1 release claim must not state that this path works live until it does.

**Closure evidence required:** successful live child execution on the current/final stack, target post-state verification and inclusion in two clean E1 runs.

## OB-006 - A3 product/integration attempt 1 failed [OPEN / NEXT IMPLEMENTATION BLOCKER]

**Opened:** 2026-09-12  
**Phase:** A3  
**Audit target:** `264c14af8f83cbd2bcf0176c87d9950baf0b275a`  
**Exact target CI:** `34682294856` - SUCCESS

Independent A3 review found source/integration defects `A3-H01` through `A3-H12`. The gate decision is preserved at:

`docs/execution/audit-packets/A3/AUDIT_DECISION.md`

The single consolidated remediation instruction is preserved at:

`docs/execution/audit-packets/A3/FINAL_REMEDIATION.md`

The critical defect is the review-to-sign integrity break in the current report/recovery path: reviewed form data is previewed, then the live submission path discards the reviewed object and invokes the wallet writer with an empty payload. Other blockers include presentation-only owner write flows, no wallet-network check at the actual signing boundary, no complete live child/action trace in the Incident Explorer, browser flows not using the canonical EAP builder, fee previews that do not estimate the exact deployed Judge call, incomplete P0 target/recovery/policy/audit surfaces, incomplete A3 requirement mapping and fail-open handling of unknown assurance state.

**Closure evidence required:** one consolidated remediation pass, new immutable substantive A3 target, exact-target green CI, complete browser/accessibility evidence captured against the same SHA, and an evidence-backed A3 attempt-2 packet.

## OB-007 - Final live fee profile incomplete [OPEN / A3-E1 RELEASE BLOCKER]

**Opened:** 2026-09-12  
**Phase:** A3 / E1 / R1  
**External audit reference:** A2-C02

Coverage tooling and final-address templates exist, but the final release fee profile is not yet complete. The current SDK product audit also found that incident/recovery fee-preview builders estimate shortened argument lists rather than the exact deployed Judge call shape.

**Closure evidence required:**

- product/SDK builders produce exact real-call signing drafts;
- fee estimation uses exactly the method, arguments and value that will be signed;
- final deployment addresses and real branch arguments are profiled;
- blocked runtime branches remain explicitly blocked rather than receiving fabricated values;
- final fee evidence passes the repository's release checks.

## Current critical path

`A3-H01..H12 remediation -> exact-target CI -> browser evidence -> A3 attempt 2 -> final live fee profile -> OB-005 retest -> two clean E1 runs -> canonical ledger reconciliation -> A4 -> R1/S1`

No blocker in this file authorises weakening the locked architecture, product requirements or security invariants to make the demo easier.


## OB-008 - Fresh final policy signing requires deployer keystore unlock [OPEN / HUMAN CREDENTIAL]

**Opened:** 2026-09-13<br>
**Phase:** C1 / E1<br>
**Deployment:** `r1-final-working`, Studio-dev chain 61997<br>
**Policy:** `policy-r1-007`, target `reclose-target-006`, hash `0x078ee18645dd95b5a7268b1c12e314c5046d018866d5dd244727f02eceee855c`

Pinned CLI 0.40.0-rc.3 is configured for Studio-dev; active `reclose-deployer` matches target owner. The authoritative `begin_policy` fee estimate succeeded. Signing then prompted for the keystore password and returned `Invalid password`; no transaction hash was returned and no chain write was submitted. Unlock the CLI account or provide its keystore password.

**Exact next operation:** re-run the canonical `begin_policy` fee estimate, submit through the pinned CLI, require transaction `FINALIZED` and execution `FINISHED_WITH_RETURN`, then read back the pending policy before the next compiled call. Continue per-item readback, seal, genuine timelock, fresh activation, and live verification.

This does not reopen A2-C01 or the old missing-`snapshotRef` investigation.
