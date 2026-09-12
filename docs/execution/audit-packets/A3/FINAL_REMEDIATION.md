# A3 Final Remediation Instruction

This is the single consolidated implementation instruction for the failed A3 target `264c14af8f83cbd2bcf0176c87d9950baf0b275a`.

Do not ask for another source review until all items below are complete, a new substantive candidate is frozen, exact-target CI is green, and browser evidence has been captured against that same candidate.

## 0. Preserve governance and audit history

- Do not rewrite the six locked governance documents to make the current implementation look compliant.
- Preserve A3 attempt 1 as FAIL.
- Do not weaken protocol-truth, evidence, authority, transaction, recovery or security invariants.
- Do not start E1 as a release-closing gate or A4 external review before A3 passes.
- A2-C01 remains open independently: the Studio-dev Judge -> Kernel triggered child must eventually execute successfully for E1/R1 closure.

## 1. Fix review-to-sign integrity first

Current defect: report/recovery preview state is discarded and live submission calls the writer with `{}`.

Implement one canonical prepared-write object per write flow. The object that is reviewed must be exactly the object given to the writer.

Requirements:

1. preview creates a concrete immutable/bounded signing draft;
2. the draft includes all fields required by the real contract call;
3. the UI displays the security-relevant fields from that exact draft;
4. any edit to reviewed input invalidates the draft and requires a new preview;
5. submission passes the exact prepared draft to the writer;
6. writer must not accept arbitrary caller-invented action/calldata outside its bounded method contract;
7. tests prove preview payload === submission payload;
8. tests prove mutation after preview cannot be signed;
9. tests prove fixture mode cannot write.

Apply this to incident, remediation/recovery, registration and policy activation flows.

## 2. Make target onboarding a real governed write flow

The existing onboarding screen is not sufficient.

Implement:

- wallet connection only when the owner elects to write;
- connected wallet chain check for 61997;
- protocol-derived/validated target ID + target address inputs;
- explicit owner/controller/Kernel handshake explanation;
- exact pre-sign review;
- bounded `registerTarget` writer call;
- immediate persistence of returned transaction ID;
- lifecycle resume after navigation/reload;
- final readback of target registration and handshake state;
- stable error presentation for rejected handshake/wrong owner/wrong controller/wrong network.

Do not fake success from writer return alone. Verify the resulting target state.

## 3. Make policy author/review/activation functional

Replace the presentation-only `Validate & diff` behaviour with real canonical tooling.

Required path:

1. construct or accept the complete R1 APM;
2. validate using the canonical policy compiler/SDK;
3. canonicalize and hash deterministically;
4. calculate security diff against active policy;
5. show authority additions/removals, Judge changes, human-override changes, bounds and activation delay;
6. block invalid manifests;
7. produce the exact governed policy construction/activation write plan;
8. show exact signing consequences;
9. submit through bounded owner writer operations;
10. track every transaction;
11. verify policy readback, sealing, timelock and activation state from protocol truth;
12. expose raw canonical manifest and manifest hash for audit.

Do not implement a second frontend policy engine.

## 4. Enforce wrong-network safety at the actual signing boundary

A static 61997 label is not a write guard.

For every live write:

- read the connected wallet/writer network;
- block signing unless chain ID is exactly 61997;
- show observed chain ID/network;
- show a clear correction state;
- re-check immediately before submission;
- fail closed if network cannot be determined;
- never silently switch to fixture/mock success.

Add browser/integration tests for mismatch, corrected network and stale-network-change-before-submit.

## 5. Use the canonical evidence builder in the product flow

The browser must not implement weaker source validation than the canonical evidence package.

Integrate the existing evidence-builder so report/remediation/recovery preparation performs:

- source count bounds;
- governed source classes;
- source authority/source ID handling;
- HTTPS-only validation;
- private/local host rejection;
- userinfo rejection;
- non-443 port rejection;
- IPv6 conservative rejection according to R1 policy;
- extracted-text bounds;
- content hashes;
- snapshot refs;
- canonical EAP construction;
- canonical artifact hash;
- maximum EAP byte-size enforcement;
- reporter/target/policy/rule binding.

The exact EAP JSON + artifact hash that will be submitted must be part of the reviewed signing draft.

Do not claim snapshots prove original-source provenance.

## 6. Make SDK transaction builders produce real contract-call drafts

Keep the frozen public 14-method RecloseSDK boundary unless a genuine governance contradiction is discovered.

`buildIncidentReport` and `buildRecoveryReport` must return a concrete non-custodial signing draft that is sufficient for the caller/writer to submit the exact Judge method.

For incident submission, the real contract call requires:

- target_id
- policy_key
- rule_id
- resource_id
- evidence_hash
- evidence_json
- reporter_nonce
- bond_id

For remediation/recovery validation, use the exact deployed method arguments required by the Judge.

The builder must obtain/derive every required field from canonical sources:

- active policy identity;
- canonical EAP/artifact hash;
- reporter identity supplied by the caller/runtime where required;
- current reporter nonce from protocol state;
- bond identity/value when policy economics requires it;
- exact write value;
- exact method name and argument list.

Fee estimation must run over the exact same method/args/value that will be signed. No shortened placeholder calldata.

Add executable contract-shape parity tests so a deployed Judge signature change breaks CI instead of silently producing wrong fee previews.

## 7. Complete the live Incident Explorer trace

Do not return `trace: []` unconditionally in live mode.

Integrate the real index/transaction resolver so the product can reconstruct, when evidence exists:

- report/Judge parent transaction;
- provisional child, if applicable;
- final Judge -> Kernel child;
- Kernel -> Target child;
- raw lifecycle for each;
- execution result for each;
- requested bounded policy action;
- action ID / decision reference;
- target state before/after;
- required post-state proof;
- recovery/remediation/recovery-validation chain.

If any link is missing, render explicit unknown/unavailable evidence. Never replace missing trace data with inferred success.

The existing Studio-dev `fee no_matching_allocation # internal` failure must remain visible as downstream execution failure without rewriting semantic judgment.

## 8. Complete target detail and owner controls

Target detail must satisfy the P0 product contract rather than only show identity fields.

Add protocol-backed views for:

- assurance state;
- active policy/version/hash;
- protected resources;
- effective capabilities;
- active restrictions with incident reason;
- active/recent incidents;
- recent assurance actions where the index/trace layer can prove them;
- autonomy mode;
- authority revoked state;
- human override configuration;
- Kernel/controller identity.

Implement bounded owner controls where supported:

- immediate authority revocation;
- human emergency pause only when configured;
- explicit `HUMAN_OVERRIDE` actor/type;
- exact pre-sign review;
- transaction tracking + post-state verification.

Do not label a human override as GenLayer judgment.

## 9. Complete recovery as a protocol-derived lifecycle

The recovery screen must read and display the actual current recovery state, not only provide a generic evidence form.

Show:

- parent incident;
- current target state;
- current active restrictions;
- which restrictions release at remediation;
- which remain until recovery validation;
- pending rule/evidence requirements;
- remediation transaction and decision;
- RECOVERY state;
- recovery-validation transaction and decision;
- remaining conflicting incident restrictions;
- restoration availability/execution;
- human override distinction where applicable.

A failed or UNDETERMINED remediation/recovery decision must never show restored authority.

## 10. Complete policy and audit surfaces

Policy pages must expose:

- draft/proposed/timelocked/active/superseded lifecycle as applicable;
- activation-not-before;
- protected resources;
- rules/Judges/version;
- provisional permission;
- finite effects;
- recovery release rules;
- human override;
- economics;
- restrictive overlays/effective reductions;
- raw canonical manifest;
- manifest hash.

Audit export must include enough identifiers to reconstruct:

claim -> EAP/artifact -> DecisionRecord -> policy/rule/effect -> parent/child transaction trace -> ExecutionReceipt/post-state -> recovery.

Do not export an incomplete object and call it a complete autonomous-action audit trace.

## 11. Fail closed on unknown protocol truth

Fix display helpers and all adapters so unknown/unrecognised values never become safe defaults.

Specifically:

- unknown assurance state must not render as NORMAL;
- unknown decision outcome/stage must render unknown/error;
- unknown action/result/lifecycle values must not be coerced to a known success state;
- missing post-state proof must not be SUCCESS when proof is required;
- missing transaction mapping must remain unavailable.

Add negative tests for each class.

## 12. Constrain reporter choices to governed protocol state

The report flow should not rely on arbitrary free-text target/rule/resource input for the ordinary path.

Use protocol-derived selections:

- registered target;
- active policy;
- enabled incident rule;
- protected resource;
- admissible source authority/class.

If an expert/direct-ID path remains, verify every ID against protocol state before preparing or signing the transaction.

Reporter still never selects the resulting protocol action.

## 13. Persist both transaction identity and report/incident identity

After a write is submitted, persist the transaction ID immediately.

Also persist the associated report identity/incident identity as soon as it is deterministically known or returned by the protocol. The user must be able to leave and return without losing either identity and without resubmitting.

For writes that trigger child transactions, persist the causal mapping needed to resume trace reconstruction.

## 14. Expand automated product testing substantially

The existing frontend test script is useful but too static for the final A3 gate.

Add executable tests for at least:

- reviewed payload === submitted payload;
- editing after preview invalidates signing draft;
- wrong network blocks signing;
- network switch after preview blocks submission;
- canonical EAP rejects local/private/userinfo/non-443/oversized inputs;
- exact Judge method argument parity;
- exact fee-estimate calldata/value parity;
- target registration writer call;
- policy validate/hash/diff/activation wiring;
- incident and recovery real writer payloads;
- persisted tx + incident IDs;
- no blind resubmission;
- live trace mapping;
- child execution failure stays failure;
- missing trace/post-state stays unknown;
- unknown assurance state never becomes NORMAL;
- HUMAN_OVERRIDE remains distinct;
- policy authority expansion is pre-sign prominent;
- malicious evidence is inert;
- accessibility DOM primitives.

Prefer behavioural integration tests over source-string regex tests wherever practical.

## 15. Capture real browser/product evidence against the new candidate

Only after the source remediation is complete and the new candidate is frozen, run the required browser review on that same commit.

Capture the full A3 set including:

- overview desktop/mobile;
- targets list;
- target detail NORMAL + restricted/safe-mode;
- policy viewer/review with expansion and reduction;
- incidents list;
- five-band Incident Explorer;
- successful semantic judgment + failed child execution;
- report flow + canonical EAP/fee/bond review;
- recovery flow;
- target onboarding;
- wrong-network block;
- pending/resumed transaction;
- benchmark;
- system/deployment;
- keyboard journey;
- focus order/visibility;
- reduced motion;
- labels/contrast/accessibility inspection;
- 360px / 768px / 1440px responsive checks.

Record exact commit SHA, browser/version, viewport, command/tool and result. Fix material defects before re-submission.

## 16. Reconcile the A3 requirement and threat scope honestly

The current A3 requirements mapping is incomplete.

For the next packet, include every R1 requirement materially affected by D1-D4/I1/I2, including at minimum relevant rows from:

- PRD-ACC-*
- PRD-TGT-*
- PRD-POL-*
- PRD-REP-*
- PRD-INC-*
- PRD-REC-*
- PRD-EXP-*
- PRD-DEV-*
- PRD-BEN-*
- NFR-SEC-*
- NFR-REL-*
- NFR-UX-*

Use only the allowed status values from the Master Plan. A visible screen stub is NOT STARTED/IN PROGRESS, not IMPLEMENTED, when the required live protocol function is absent.

Update TM-UX and relevant INF/EVID/LIFE/AUTH/REC threat rows only to the level actually demonstrated by code/tests/browser/live evidence.

## 17. Do not overclaim fee profile, E1, A4 or R1

The final live fee profile remains evidence-bound. Run it with the final deployed addresses and real branch arguments. If a branch cannot be estimated/executed because of the Studio-dev runtime limitation, preserve that as blocked evidence.

E1 remains NOT COMPLETE until:

- A3 passes;
- the Judge -> Kernel child path succeeds live;
- the canonical scenario succeeds from a clean deployment twice;
- real test GEN behaviour changes as required;
- remediation/recovery/restoration succeed;
- full causal trace and post-state evidence exist;
- `npm run e1:evidence:check` passes on real artifacts.

A4 remains NOT READY until its entry conditions are real.

## 18. Next A3 submission protocol

When everything above is complete:

1. run the full canonical verification suite locally where supported;
2. push substantive remediation;
3. require exact-target GitHub Actions SUCCESS;
4. freeze that substantive commit as the new `AUDIT_TARGET_SHA`;
5. capture browser evidence against exactly that SHA;
6. refresh A3 packet and complete requirements/threat mapping;
7. preserve attempt 1 FAIL and add attempt 2 as AWAITING EXTERNAL REVIEW;
8. do not modify substantive source after the frozen target unless you create a new attempt;
9. return only:
   - `AUDIT_TARGET_SHA`
   - `CI_RUN_ID` + result
   - browser evidence index status
   - A3 requirement row count/status summary
   - open external blockers
   - short statement that A3 attempt 2 is ready for independent review.

No ZIP is required. GitHub is the canonical audit surface.
