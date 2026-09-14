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

## OB-012 - E1 Run A explicit fee preflight [CLOSED - superseded by OB-014]

**Opened:** 2026-09-13
**Phase:** E1 Run A
**Network:** Studio-dev / chain 61997
**Current target:** `reclose-target-007` / ReferenceAgent `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353`
**Current Judge:** `0x43c6061FEde8372a3e4c3AB513D32abcfA956e89`
**Current policy:** `policy-r1-009`, v1, active, hash `0xb5ac60c955e3bc052531e07b9c351738e7c27d80fb286b702f1f6e2e8ee83953`

The former accepted/finalized Kernel call-key collision is fixed in source and present in this newly deployed stack. The Judge now emits accepted messages to `receive_provisional_decision` and finalized messages to `receive_final_decision`. Repeated same-key Target effects use one cumulative allocation only after both occurrences simulate under the same estimator-produced fee profile. The Studio tagged fee source rules and regression coverage are documented in `release-evidence/r1/e1/studio-fee-semantics-verification.json` and the protocol commit. Do not repeat the superseded open-bucket preflight.

The complete Run A deployment, wiring, policy construction, item readbacks, timelock and activation are verified in `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`. The user funded the target; a fresh balance read returned 0.20 GEN. No incident submission or Reporter nonce read has occurred on this generation. See OB-014 for the proven accepted-message simulation limitation.

**Funding closed:** the live treasury balance is `200000000000000000` wei. The screenshot transaction ID was truncated; see `release-evidence/r1/diagnostics/run-a-treasury-readback.json`. No hash is inferred.

**Resolution:** the throttled read-only preflight was run and all checks through child-profile simulation passed. The accepted Kernel estimate failed with `SystemError: 2: inval`; the independent minimal reproduction confirms this is a current Studio-dev accepted-message simulation limitation. No incident write was submitted. Track the platform blocker under OB-014; do not rerun the same preflight until supported platform behavior changes.

The earlier shared-call-key diagnostics are historical; the lifecycle-specific call-key correction remains deployed and tested. The new minimal evidence that establishes OB-014 is at `release-evidence/r1/diagnostics/accepted-message-repro/`.

### OB-013 - Fresh Run A target treasury needs wallet funding [CLOSED]

The new isolated Run A ReferenceAgent was funded with 0.20 GEN; the exact live readback is `release-evidence/r1/diagnostics/run-a-treasury-readback.json`. The screenshot tx hash was truncated and is intentionally unavailable.

## Current critical path

`Run A explicit accepted-message simulation supported by Studio -> Run A incident/recovery/trace -> independent Run B full run -> H1 -> A3/A4 -> requirements/threat reconciliation -> final docs/package -> fresh candidate verification`

No blocker authorizes weakening policy, fee-allocation, evidence-authority, or lifecycle semantics.

## Historical 2026-09-14 snapshot: Run A funding verified; accepted-message simulator limitation reproduced (superseded below)

This addendum supersedes the earlier OB-012/OB-013 funding instructions above. The new Run A treasury is funded: a serialized live read returned 0.20 GEN for ReferenceAgent `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353` on chain 61997. The transaction ID visible in the user's screenshot was truncated, so no transaction hash is recorded or inferred. Readback: `release-evidence/r1/diagnostics/run-a-treasury-readback.json`. Funding is no longer a human blocker.

**OB-014 historical opening state — superseded by the closure below.** The exact pinned Python stdlib API permits `on="decided"` or `on="finalized"` and forwards that value unchanged. The matching executor v0.3 ABI accepts those values and rejects `accepted`. The captured provisional Parent→Child request used `accepted`, while the otherwise matched finalized request used `finalized` and succeeded. This identified the source-level Reclose/toolchain wire-compatibility defect; the hosted backend's exact build remains unexposed.

A disposable Parent→Child `noop()` reproduction uses the Child's real SDK fee estimate and a correctly encoded explicit mode-2 allocation. Its saved `on="accepted"` emitter fails with `SystemError: 2: inval`; the otherwise matched `on="finalized"` emitter succeeds. Exact runner stdlib and executor source inspection shows the old string is outside the ABI. Judge and Kernel provisional emits now use `decided`; local phase-ABI and lifecycle regressions pass. Evidence and redacted responses remain in `release-evidence/r1/diagnostics/accepted-message-repro/`. The displayed Studio version is `v0.123.0-rc.6`; the exact deployed backend SHA is not exposed.

No Run A incident transaction or Reporter nonce exists. Corrected source has not been deployed; the old immutable Parent cannot validate it. No write or live simulation was made. Do not repeat the old-code simulation, guess fees, or submit an incident. After corrected reproduction code is deployed through an authorized operation, perform one read-only accepted simulation. If it still returns `SystemError: 2: inval`, request the server trace naming the rejected field/rule, `gl_call` diagnostic, backend build SHA and runner identity. E1 A/B, H1 and live fee coverage remain blocked/not run until this succeeds. The previous OB-012/OB-013 funding directions are closed by readback.

## OB-014 current disposition (2026-09-14 — CLOSED for isolated live phase-emission validation)

The source-level cause remains: the pinned Runner API phase spelling is `decided`, not `accepted`; it forwards the value unchanged, and the executor ABI has no `accepted` variant. Judge and Kernel use `decided` for provisional messages and `finalized` for final messages.

The corrected one-time read-only simulation succeeded on Studio-dev chain 61997 against existing Parent `0xbd7a6BcFaa8Ab8505e7C62C8Dcfff1Ae40fcA5de` and Child `0x763289C8d65316032e3717C32A84b33c8DaB5020`, using `emit_decided`, typed `CalldataAddress` calldata, and the saved accepted allocation. `release-evidence/r1/diagnostics/accepted-message-repro/typed-address-existing-parent/result.json` records `SIMULATION_SUCCEEDED` and `transactionSubmitted: false`; the returned fee is an estimate, not a charge. Its SHA-256 is `C90F5262BCBC689A048E9D7F84027A0C9C9EDD7BEFA2FCD6DE0591DD279138D6`.

The earlier corrected-code attempt failed because the harness supplied Child as a plain string; its captured calldata and trace show argument decoding failed before any message emission. It is not evidence against the `decided` phase. Closure is limited to this isolated phase-emission simulation. The complete Reclose lifecycle, E1 Run A/B, H1, and final live fee coverage remain blocked/not run. No incident write or Reporter nonce exists. Full source comparison and evidence are in `docs/execution/OB-014 Root Cause Report.md`.
# Current release blockers (2026-09-14)

- **OB-014 isolated phase simulation: CLOSED.** The typed-address `emit_decided` read-only simulation passed on chain 61997 against the existing Parent with the saved allocation. The result records `transactionSubmitted: false`; the fee is an estimate, not a charge. The earlier `accepted` failure is superseded, and the later string-address failure was calldata decoding before emission. It does not verify Judge→Kernel→Target or the full lifecycle. See `docs/execution/OB-014 Root Cause Report.md`.
- **Source parity / live signing: BLOCKED.** The active Run A manifest binds immutable Kernel/Judge sources from before the lifecycle-specific `decided` fix. The frontend correctly refuses to sign this mismatched generation. A new production stack and policy require a measured, reviewed write plan and separate approval before each transaction.
- **Public live frontend: BLOCKED on hosting setup.** Local live-default build and Transaction Kit/React adapter integration exist, but there is no `.vercel` link or Vercel CLI in this checkout. No public URL or Chrome+wallet proof exists.
- **E1 Run A/B, H1 and final fee coverage: NOT RUN / INCOMPLETE.** No full incident/recovery run has been submitted on a source-matched stack. Do not treat the isolated message simulation, CI, or a fixture as lifecycle proof.
- Preserve `.claude/settings.local.json`, the saved OB-014 evidence, and pre-existing local changes. Do not deploy or submit a transaction until the exact recipient/value/fee plan has been presented and individually approved.

The sections below are chronological blocker records. Any older statement that the accepted-message failure is current is superseded by the OB-014 closure above; the underlying evidence is retained as history.
