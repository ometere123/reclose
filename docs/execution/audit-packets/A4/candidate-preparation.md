# A4 candidate preparation — not ready for external review

**Candidate snapshot:** `7d308374cb6c634660b0e70ca389618198496503` (`claude/r1-product-final`)
**Exact-target CI:** GitHub Actions run `34798352450`, SUCCESS
**A4 disposition:** **NOT READY FOR EXTERNAL REVIEW**

This file binds the current A4 preparation to an exact verified candidate. It is not an A4 review
packet and does not claim PASS. The candidate includes the corrected 156-row requirements map and
full 82-row threat ledger reconciliation. The canonical status counts are 10 VERIFIED, 27 IN
PROGRESS, 13 IMPLEMENTED / UNVERIFIED, and 106 NOT STARTED. Critical/high threat residual risk is
not accepted by this status.

## Entry gates still open

- A3 attempt 2 is awaiting external review under the owner execution override; no external decision
  or PASS has been supplied.
- Current-candidate deployed-product, connected-wallet, accessibility, keyboard, and responsive
  browser evidence is not captured. The old fixture-mode captures are historical only.
- E1 Run A was not submitted because OB-014 reproduces `SystemError: 2: inval` for an explicitly
  allocated accepted internal message. Run B is not run. No Reporter nonce or successful incident
  lineage exists for this generation.
- H1's 78-row corpus is not a completed benchmark. Live-blocked and NOT_RUN scenarios remain open;
  no performance/security gate is reported as passing from those rows.
- `npm run fee-profile:final-check` is NOT READY: four deployment fee profiles are evidence-backed,
  the accepted-stage failure is retained, and eight live write profiles lack valid current
  lifecycle state/arguments.
- The release candidate branch, clean fresh-checkout full verification, remote release-gate
  reconciliation, and final package freeze have not been completed.

## Required next A4 packet material

Before A4 can move beyond NOT READY, attach the external A3 decision; current-candidate browser and
wallet evidence; successful E1 Runs A and B; measured H1 results; passing final fee and evidence
checkers; complete review of the 156 requirements and 82 threats against actual implementation and
evidence; the exact final manifest/transactions; and submission claims reconciled with the claim
matrix. The final A4 packet must include the complete file set enumerated in `README.md` and must
preserve open residual risks without self-accepting CRITICAL/HIGH items.
