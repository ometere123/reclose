# A3 Independent Product & Integration Audit Decision

**Audit:** A3 - External Product & Integration Audit  
**Decision:** **FAIL**  
**Reviewer:** ChatGPT, acting as the repository owner's designated independent reviewer  
**Audit target:** `264c14af8f83cbd2bcf0176c87d9950baf0b275a`  
**Branch:** `chatgpt/r1-product-release`  
**Exact target CI:** GitHub Actions run `34682294856` - **SUCCESS**  
**Previous accepted gate:** A2 attempt 2, `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5` - **PASS WITH CONDITIONS**

## Decision summary

The target is materially stronger than the A2 product baseline. It has a coherent five-band Incident Explorer, explicit fixture/live-adapter separation, escaped evidence rendering, persisted transaction IDs, SDK product-truth hardening, a bounded agent skill, benchmark preparation and a green exact-target CI run.

A3 nevertheless **fails on source and integration correctness before browser evidence is considered**. Several P0/R1 flows are present as screens but are not wired to the transaction or protocol objects that the user reviewed. The most serious defect is a review-to-sign integrity break: incident and recovery forms preview one payload, then the live submit path discards that payload and invokes the wallet writer with an empty object. Other blockers include non-functional owner onboarding/policy write flows, absent wallet-network gating, missing live child/action trace composition, incomplete EAP construction, SDK fee estimates that do not use the real Judge calldata shape, and incomplete A3 requirement mapping.

The absence of browser screenshots/accessibility recordings remains a separate A3 evidence gap, but it is **not the reason this decision is FAIL**. The source defects below are sufficient to fail the gate.

A2-C01 also remains open. Even after A3 source remediation, E1 cannot close until the Studio-dev Judge -> Kernel child path executes successfully and two complete clean 61997 runs are captured.

## Findings

### A3-H01 - CRITICAL - reviewed write payload is discarded before signing

`handleIncidentSubmit` and `handleRecoverySubmit` correctly collect and preview user input. However, the actual live submission path calls `adapter.submitWrite(kind, {})`. The reviewed draft is not retained and the wallet writer receives an empty object.

This breaks the fundamental pre-sign invariant: **the payload that is signed must be the payload that was reviewed**. It affects both incident and recovery writes and makes the current write UX unsuitable for release.

**Required closure:** retain a canonical prepared transaction/write draft from preview, bind it to the review state, invalidate it when any reviewed input changes, and pass that exact bounded draft to the writer. Add executable tests proving mutation-after-preview cannot be signed and that the writer receives exactly the reviewed payload.

### A3-H02 - HIGH - target onboarding and policy author/activation are presentation-only

The target onboarding form does not invoke `registerTarget`; its live handler only emits a message. The policy author/review route does not validate the entered APM, hash it, compute the actual diff, or submit the governed policy/activation flow. The button labelled `Validate & diff` only emits a status message.

This means key P0 owner journeys exist visually but are not functional protocol integrations.

**Required closure:** wire target registration through the bounded wallet writer and exact handshake inputs; wire policy validation, canonical hashing and security diff to the canonical compiler/SDK; show the exact reviewed authority; and wire the real governed policy construction/activation path without introducing frontend policy semantics.

### A3-H03 - HIGH - wrong-network write blocking is not wired to the wallet submission boundary

The product displays Studio-dev / 61997 and the SDK protects protocol reads, but the browser write path does not verify the connected writer/wallet chain immediately before enabling or executing a signature. There is no functional wrong-network correction state around the live writer.

**Required closure:** require a wallet/runtime network preflight at the write boundary, block all signing when the connected chain is not 61997, display the observed network and correction action, and re-check at submission time to prevent a stale preflight.

### A3-H04 - HIGH - live Incident Explorer cannot reconstruct Judge -> Kernel -> Target execution

The live `SdkProductAdapter.getIncident` returns `trace: []` unconditionally. Although the SDK exposes transaction/action-trace primitives, the live product adapter does not resolve the causal child transaction chain or target post-state for the Incident Explorer.

A fixture can therefore demonstrate the desired five-band UI while the live path cannot satisfy the corresponding P0 audit requirements.

**Required closure:** integrate the index/trace resolver so the live Incident Explorer can show parent/child transaction identities, raw lifecycle, execution result, requested action, resulting target state and post-state proof. Missing trace evidence must render as unknown/unavailable, never as successful execution.

### A3-H05 - HIGH - report/recovery product flow does not construct the canonical EAP or enforce the full source-input policy

The repository has a substantially correct `@reclose/evidence-builder`, including canonical EAP construction, content hashes, artifact hash, byte bounds and strict source URL checks. The browser flow does not use it. It validates only that the URL has the `https:` scheme and then passes a reduced `EvidenceSource` object into the SDK draft builder.

The product therefore does not yet prove PRD-REP-003/006 at the user-facing integration boundary. Local/private hosts, userinfo, non-443 ports and other inputs rejected by the canonical builder are not rejected by the form before preview.

**Required closure:** use one shared canonical evidence-building/validation implementation; produce the exact EAP JSON and artifact hash bound to the report; enforce the same URL/input constraints before fee estimation/signing; and surface validation errors without duplicating Judge semantics in the UI.

### A3-H06 - HIGH - SDK report fee preview does not estimate the actual Judge call

`buildIncidentReport` estimates `submit_incident` using four arguments, while the deployed contract requires eight: target ID, policy key, rule ID, resource ID, evidence hash, evidence JSON, reporter nonce and bond ID. `buildRecoveryReport` estimates `submit_recovery_validation` using two arguments, while the contract requires six.

The resulting preview is not an estimate of the transaction that will actually be submitted. The returned `report` is also a descriptive draft, not yet a complete signing request containing the canonical EAP/hash, nonce and bond identity required by the contract.

**Required closure:** keep the frozen public SDK method boundary unless governance is explicitly reopened, but make its returned `report` a concrete bounded signing draft/request that includes every Judge argument and value required for the real call. Fee estimation must run on the exact same calldata/value branch that the writer will sign. Add parity tests against the deployed contract method shape.

### A3-H07 - HIGH - several P0 owner/target/recovery product surfaces are incomplete

The current target detail omits important governed information and controls required for R1, including a complete protected-resource/current-incident/recent-action view. Immediate authority revocation and human emergency override are not implemented as functional owner controls. Autonomy mode is not surfaced. The recovery experience does not expose protocol-derived remaining restrictions and outstanding recovery conditions in the live path.

**Required closure:** implement the missing P0 target and owner-control surfaces through bounded protocol methods, label `HUMAN_OVERRIDE` distinctly from GenLayer judgment, expose autonomy mode, and make recovery state/remaining restrictions protocol-derived and first-class.

### A3-H08 - HIGH - policy and audit surfaces are incomplete for R1 reconstruction

The policy route does not yet provide the full governed lifecycle/activation timing, restrictive overlays, recovery rules or raw canonical manifest inspection expected by the R1 PRD. The CLI audit export currently aggregates target, assurance, policy and incident objects but does not reconstruct the complete evidence -> decision -> policy effect -> execution -> recovery chain required for consequential autonomous actions.

**Required closure:** complete the policy truth surfaces and make the audit export include the canonical identifiers necessary to reconstruct decision/evidence/action/transaction/post-state/recovery causality. Missing data must remain explicit, not inferred.

### A3-H09 - HIGH - A3 requirement coverage is incomplete and some statuses are overstated

The A3 `requirements.csv` maps only ACC, EXP and DEV rows. The Master Plan's A3 scope also directly covers target, policy, reporting/evidence, incident lifecycle, recovery, UX/accessibility and relevant reliability requirements. Several current rows are marked `IMPLEMENTED / UNVERIFIED` although the corresponding live function is absent, for example wrong-network write blocking, functional onboarding, live child traces and human-override presentation.

**Required closure:** expand the A3 mapping to every R1 requirement materially exercised by D1-D4/I1-I2 and reconcile each status against actual source/test/evidence. A screen stub is not `IMPLEMENTED` when the required protocol action is not wired.

### A3-H10 - HIGH - unknown assurance state fails open visually as NORMAL

`stateMarker(state)` maps any unknown/unrecognised value to `NORMAL`. A malformed, future or unsupported protocol state can therefore be rendered as the safest state.

This violates the product principle that the frontend must never be more certain than protocol truth.

**Required closure:** unknown values must render as explicit `UNKNOWN`/unsupported/error state and should never become NORMAL. Add negative tests for unknown values at all protocol-truth display boundaries.

### A3-H11 - MEDIUM - report selection is not constrained to the active governed target/rule/resource set

The report form uses free-text target and resource inputs plus a static rule selector. The SDK confirms the rule is active but does not currently fail early on an unregistered resource before constructing the draft.

**Required closure:** populate/select from protocol-derived active target/policy/rule/resource data, validate the resource before preparing the report, and still retain a safe expert/direct-ID path only if it is verified against protocol state before signing.

### A3-H12 - MEDIUM - incident ID is not persisted with the submitted transaction identity

The write path requires only `result.txId`, persists `{ txId, kind }`, and routes to the pending queue. It does not capture and retain the incident/report identity expected by the Reporter journey.

**Required closure:** once the protocol supplies/derives the incident ID, persist it with the original transaction ID before long-running tracking and surface both identities on resume without resubmission.

## Evidence and positive controls accepted in this review

The following do not need to be re-litigated unless remediation changes them:

- exact A3 target CI run `34682294856` is green;
- fixture mode is clearly labelled and refuses writes;
- transaction IDs are persisted before polling;
- polling failure does not trigger blind resubmission;
- external evidence text is escaped in the current render helpers;
- the five causal concepts are visually separated in the Incident Explorer structure;
- the SDK uses real transport block height rather than fabricating `asOfBlock = 0`;
- final REJECTED and final UNDETERMINED incident semantics are preserved by the SDK correction;
- action receipt construction rejects absent protocol-derived execution time and does not report required post-state mismatch as SUCCESS;
- the frozen 14-method SDK type surface remains present;
- bounded agent `skill.md` and benchmark preparation are useful source-side additions.

These accepted points remain subject to regression testing after the H01-H12 remediation delta.

## Browser evidence status

The A3 browser/accessibility evidence index remains truthfully NOT RUN. After H01-H12 are remediated and a new substantive candidate is frozen, the browser run must cover the full primary-flow/error-state capture set required by the Master Plan. Do not capture browser evidence against the failed target and then reuse it as proof for a different substantive candidate.

## Gate consequence

**A3 ATTEMPT 1: FAIL**

- D1-D4/I1-I2 remediation is required.
- E1 is **not authorised as a release-closing gate**.
- A4 is **not ready for external review**.
- R1/S1 closure is not authorised.
- A2-C01 remains an independent live Studio-dev blocker even after A3 source remediation.

A single consolidated implementation instruction is preserved in `FINAL_REMEDIATION.md`. The next A3 submission should be one new immutable substantive target, one green exact-target CI run, one complete requirements/threat delta and one browser/product evidence set. No piecemeal re-review is required before that submission unless the implementation agent encounters a genuine governance contradiction.
