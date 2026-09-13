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

OB-008 closure: the CLI account query reported `reclose-deployer` unlocked from the existing OS keychain despite the explicit `unlock` password-decryption error. `begin_policy` subsequently signed and finalized successfully; no further human credential action is required.

## OB-009 - Deployed Judge snapshot authority does not admit immutable synthetic evidence [CLOSED]

The live Judge source authority for `reclose-reference-evidence` returned `/genlayerlabs/genlayer-project-boilerplate/main/`, while the required synthetic E1 evidence must use immutable commit-pinned URLs. The fetched boilerplate README is unrelated to the demo. Policy `policy-r1-007` is sealed but deliberately left inactive. The corrected registry now constrains the snapshot source to the immutable fixture commit path and has hash `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`.

Closure evidence: corrected Judge deployed with the new hash; `get_source_registry_hash` and `get_source_authority` match; synthetic fixtures independently fetch with byte-identical content hashes; a new policy bound to that Judge is activated after its actual timelock.

## OB-010 - E1 Run A ReferenceAgent treasury is unfunded [CLOSED]

**Opened:** 2026-09-13
**Phase:** E1 Run A
**Network:** Studio-dev / chain 61997
**Contract:** ReferenceAgentProtocol 0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2

Closed by the real user-authorized payable transfer. Transaction `0x89f42b16fea6f065607c25b9d68c7663a955a4f56f4878d891fa4e9aeb04dc62` is FINALIZED / FINISHED_WITH_RETURN; Explorer and SDK readback show `200000000000000000` wei (0.20 GEN) in the ReferenceAgent treasury.

## OB-011 - E1 Run A initial purchase needs the registered owner signer [CLOSED]

**Opened:** 2026-09-13  
**Phase:** E1 Run A  
**Network:** Studio-dev / chain 61997  
**Target:** `0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2`

Closed by the owner-signed initial purchase. Parent transaction `0x1414c3021e901bc7400521c07be271f16bcf19faa81cb19e723013a40db59550` and Provider A child `0x77708bab52d63943ffc867c24d6a7fe22e685e02fbd85f1865af74cecd673a2a` are both FINALIZED / FINISHED_WITH_RETURN. Provider A fulfilled the request and received 0.05 GEN; its total increased from 1.00 to 1.05 GEN; ReferenceAgent treasury reads 0.15 GEN and Provider A remains selected.

## OB-012 - E1 Run A compromise report fee preflight is not yet executable [OPEN / LIVE SIMULATION]

**Opened:** 2026-09-13
**Phase:** E1 Run A compromise
**Network:** Studio-dev / chain 61997
**Judge:** `0x05f9E58B5ce635FCEd8076c9dAA714b19c287028`

The initial Run A purchase is closed under OB-011. The read-only report-preparation helper validates the active policy, current registry hash and authority, target state/provider, treasury, immutable synthetic fixture, and current reporter nonce before constructing the canonical EAP. No report transaction has been submitted.

The read-only fee simulator has not produced a usable complete Judge→Kernel→Target preset. The earlier open-bucket accepted-stage `SystemError: 2: inval` and finalized-stage estimate are retained in `release-evidence/r1/e1/incident-fee-preflight-failure.json`, but that attempt is superseded for diagnosis: it did not use explicit mode-2 allocations and does not establish a Studio limitation. The corrected explicit-allocation preflight independently estimated both accepted Target effects, then stopped before Kernel simulation because `RESTRICT provider_a` and `ENTER_SAFE_MODE` produced different SDK-encoded `feeParams` (their `executionBudgetPerRound` values differ by 300,000,000). Studio allocation matching requires exact fee params, while duplicate sibling keys for the same parent/type/recipient/call key are rejected. Exact estimates and encodings are retained in `release-evidence/r1/e1/accepted-target-fee-allocation-mismatch.json`. No incident transaction was submitted and no incident state or Reporter nonce was consumed.

All future Studio-dev requests in the guarded preflight/CLI path share a FIFO request queue, minimum 2600ms spacing, bounded transient retries with exponential backoff, and increasing delays for consecutive receipt/status polls. Do not repeat the old open-bucket preflight. Do not combine the differing Target profiles or create duplicate-key allocations. Inspect and verify the exact Studio-dev pinned repeated-emission semantics, then construct a supported read-only accepted and finalized path and complete root preset. No incident write is permitted before that succeeds. Do not interpret simulator failure or UNDETERMINED as success.

**Current diagnosis update (2026-09-13):** this is not yet classified as an external Studio-dev block. A first corrected run needed a local JSON formatter fix after completing both read-only Target estimates; the next throttled run captured the exact differing profiles. Neither run estimated `Kernel.receive_decision`, and neither submitted a transaction. Seven explicit-allocation regression cases pass; the existing nine A2-C01 nested-allocation tests still pass, preserving the live-verified final-only behavior. Source inspection confirms key resolution, exact phase/fee-param checks, and duplicate sibling rejection in upstream Studio code at commit `c94072951e483510329670aa427fba3fa6944f45`; the exact correspondence of that source SHA to the deployed Studio-dev build remains to be established.

**Correction (2026-09-13):** source verification resolved at the release-version level. Studio-dev UI evidence identifies `v0.123.0-rc.6`; official release tag peeled commit `6551995be232d093144f2c32b6775757a010ab3c` confirms the fee rules above. The service does not expose its exact backend source SHA, so exact SHA correspondence remains explicitly unverified. See `release-evidence/r1/e1/studio-fee-semantics-verification.json`.

The Reclose-side call-key conflict is addressed in uncommitted source. Kernel exposes fixed-stage `receive_provisional_decision` and `receive_final_decision` wrappers over one shared implementation, and the Judge uses those distinct method names for accepted and finalized messages. Repeated same-phase Target actions now select one common fee profile only when all non-execution-budget distribution fields match, re-simulate every action using that estimator-produced profile, and derive one cumulative bucket from those successful simulations. The fresh deployment must include the interface change; do not use the old active stack for incident submission. No new fee preflight or incident write has been made.

Verification update: explicit-allocation suite 9/9, A2-C01 nested-allocation suite 9/9, SDK/tracker typechecks, full JS verification, Kernel Direct Mode 85/85, Judge Direct Mode 51/51, and full canonical Python suite 219/219 passed. The first full Python run found stale fake Judge→Kernel proxies (19 failures, 200 passes); updating those proxies cleared all failures. Exact-target CI remains outstanding.
