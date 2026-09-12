# A3 External Product & Integration Audit Packet

**Audit ID:** A3  
**Audit status:** AWAITING EXTERNAL REVIEW  
**Branch:** `chatgpt/r1-product-release`  
**Audit target:** freeze the exact branch SHA only after GitHub Actions is green; `commit.txt` remains intentionally absent until that point.  
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
- accessibility/responsive/error/loading states;
- malicious evidence rendering protection;
- transaction/decision/execution truth separation.

## What this packet does not claim

- no A3 PASS is self-issued;
- no browser screenshot/recording has been fabricated;
- no live hosted frontend deployment is claimed from GitHub source alone;
- the unresolved Studio-dev Judge -> Kernel child `fee no_matching_allocation # internal` remains open and is rendered as downstream execution failure;
- E1 is not complete.

## Review questions

1. Does the product preserve raw GenLayer lifecycle, Reclose DecisionOutcome, DecisionStage, execution result and target state as separate concepts?
2. Can any fixture/indexer/API value masquerade as protocol source-of-truth state?
3. Are child execution failures visible without rewriting a successful semantic judgment into a failed judgment?
4. Is policy authority expansion sufficiently explicit before signing?
5. Is malicious evidence rendered only as escaped text?
6. Are pending transaction IDs persisted before polling, with no blind resubmission on timeout/error?
7. Does the real SDK adapter avoid duplicating Judge/policy semantics in the frontend?
8. Are accessibility, responsive and reduced-motion requirements adequately implemented, pending browser-run evidence?
9. What still prevents this product from being accurate, usable or safe enough to proceed to E1?

## Packet contents

- `scope.md`
- `tests.md`
- `security-self-review.md`
- `known-limitations.md`
- `open-questions.md`
- `evidence-index.md`
- `screenshots-recordings-index.md`

The immutable `commit.txt` must be created only after the final A3 candidate is CI-green.
