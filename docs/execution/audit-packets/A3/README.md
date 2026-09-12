# A3 External Product & Integration Audit Packet

**Audit ID:** A3  
**Attempt:** 1  
**Audit status:** **FAIL - independent review complete**  
**Branch:** `chatgpt/r1-product-release`  
**Audited substantive target:** `264c14af8f83cbd2bcf0176c87d9950baf0b275a`  
**Exact target CI:** GitHub Actions run `34682294856` - **SUCCESS**  
**Previous audit:** A2 attempt 2, target `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5`, PASS WITH CONDITIONS.  
**Independent decision:** `AUDIT_DECISION.md`  
**One-shot remediation:** `FINAL_REMEDIATION.md`

## Decision

A3 attempt 1 failed on source/integration correctness before browser evidence was considered.

The critical finding is a broken review-to-sign boundary: report/recovery inputs are previewed, then the live submission path discards the reviewed object and calls the wallet writer with an empty payload. Additional findings cover presentation-only owner write flows, missing wallet-network enforcement at signing, incomplete live child/action trace reconstruction, browser evidence preparation not using the canonical EAP builder, shortened fee-estimation calldata, incomplete target/recovery/policy/audit surfaces, incomplete requirement mapping and fail-open rendering of unknown assurance state as `NORMAL`.

See `AUDIT_DECISION.md` for findings `A3-H01` through `A3-H12` and gate consequences.

See `FINAL_REMEDIATION.md` for the single consolidated implementation instruction for A3 attempt 2.

## Scope reviewed

D1, D2, D3, I1, I2 and D4 product work:

- visual/information architecture;
- core read surfaces;
- five-band Incident Explorer;
- onboarding, policy review, incident and recovery write flows;
- validated fixture adapter;
- real RecloseSDK adapter boundary;
- transaction persistence/resume boundary;
- real block-height and action-receipt truth hardening;
- accessibility/responsive/error/loading foundations;
- malicious evidence rendering protection;
- transaction/decision/execution/post-state truth separation;
- bounded autonomous-agent `skill.md`;
- product-linked H1 benchmark preparation.

## Positive controls accepted

The exact-target CI success and these source controls remain valid evidence unless the remediation regresses them:

- fixture mode is visibly synthetic and refuses writes;
- transaction IDs are persisted before polling;
- polling failure does not cause blind resubmission;
- evidence rendering uses escaping helpers;
- the Incident Explorer structurally separates evidence, judgment, policy consequence, execution and recovery;
- SDK assurance reads use real transport block height;
- final REJECTED and final UNDETERMINED remain distinct;
- required target post-state mismatch cannot be reported as SUCCESS;
- the frozen 14-method SDK type boundary remains present;
- bounded `skill.md` and benchmark preparation are useful source-side work.

## Browser evidence

Browser screenshots/recordings, manual keyboard review, accessibility inspection and responsive evidence remain **NOT RUN** for attempt 1.

Do not capture a full browser evidence set against this failed substantive target and reuse it for a different candidate. After all A3-H01..H12 remediation is complete, freeze one new substantive attempt-2 SHA and capture the complete browser evidence set against exactly that SHA.

## External/live blockers that remain separate from A3 source remediation

- Studio-dev Judge -> Kernel triggered child still fails with `fee no_matching_allocation # internal` on current evidence. This is A2-C01 and independently blocks E1/R1 closure.
- The final live fee profile still requires real final-deployment arguments/output.
- E1 still requires two clean successful 61997 canonical runs with real test GEN behaviour, successful child execution and target post-state evidence.

## Packet contents

- `commit.txt` - immutable failed attempt-1 substantive target and exact CI run
- `AUDIT_DECISION.md` - independent A3 attempt-1 decision and findings
- `FINAL_REMEDIATION.md` - one-shot implementation instruction
- `scope.md`
- `files-changed.txt`
- `requirements.csv`
- `tests.md`
- `security-self-review.md`
- `threat-delta.md`
- `compatibility-findings.md`
- `architecture-deviations.md`
- `known-limitations.md`
- `open-questions.md`
- `evidence-index.md`
- `screenshots-recordings-index.md`

## Gate consequence

**A3 ATTEMPT 1: FAIL**

- Product/integration remediation is required before another A3 submission.
- E1 is not authorised as a release-closing gate.
- A4 is not ready for external review.
- R1/S1 closure is not authorised.
- A2-C01 remains independently open.

The next submission should be one complete A3 attempt 2, not a sequence of piecemeal reviews. No ZIP is required; GitHub is the canonical audit surface.
