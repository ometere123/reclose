# A3 External Product & Integration Audit Packet

**Audit ID:** A3  
**Audit status:** AWAITING EXTERNAL REVIEW  
**Branch:** `chatgpt/r1-product-release`  
**Audit target:** freeze the exact substantive branch SHA only after its GitHub Actions run is green; record it in `commit.txt` in a packet-only follow-up commit.  
**Previous audit:** A2 attempt 2, target `6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5`, PASS WITH CONDITIONS.

## Scope

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

## What this packet does not claim

- no A3 PASS is self-issued;
- no browser screenshot/recording, manual keyboard result, Lighthouse score or accessibility audit is fabricated;
- no live hosted frontend deployment is claimed from GitHub source alone;
- the unresolved Studio-dev Judge -> Kernel child `fee no_matching_allocation # internal` remains open and is rendered as downstream execution failure;
- the final live fee profile is not claimed complete while dynamic arguments/output remain absent;
- E1 is not complete;
- BLOCKED_EXTERNAL/NOT_RUN benchmark cases are not counted as live passes.

## Review questions

1. Does the product preserve raw GenLayer lifecycle, Reclose DecisionOutcome, DecisionStage, execution result and target state as separate concepts?
2. Can any fixture/indexer/API value masquerade as protocol source-of-truth state?
3. Are child execution failures visible without rewriting a successful semantic judgment into a failed judgment?
4. Is policy authority expansion sufficiently explicit before signing?
5. Is malicious evidence rendered only as escaped/inert text?
6. Are pending transaction IDs persisted before polling, with no blind resubmission on timeout/error?
7. Does the real SDK adapter avoid duplicating Judge/policy semantics in the frontend?
8. Are accessibility, responsive and reduced-motion requirements adequately implemented after real browser inspection?
9. What still prevents this product from being accurate, usable or safe enough to proceed to E1 once the external Studio-dev child blocker is resolved?

## Packet contents

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
- `commit.txt` after the substantive candidate is frozen on a green CI run

## Gate boundary

A3 cannot be externally closed on source inspection alone because the Master Plan requires browser/product evidence. The screenshot/recording index deliberately records those checks as NOT RUN until an external browser-capable execution environment supplies them.

A successful A3 decision does not close E1. E1 separately requires two successful clean Studio-dev 61997 canonical runs and successful required child execution/post-state evidence.
