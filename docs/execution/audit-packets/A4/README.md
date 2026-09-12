# A4 External Pre-Release Audit Packet

**Audit ID:** A4  
**Status:** NOT READY FOR EXTERNAL REVIEW  
**Reason:** A3 external review, browser evidence, final fee profile and E1 canonical live evidence are not yet complete.

This directory exists to make the final release boundary explicit. Its presence does **not** mean A4 has been reached or passed.

## Entry conditions

Do not change this packet to `AWAITING EXTERNAL REVIEW` until all of the following are true:

- A3 has an acceptable external decision against an immutable commit;
- browser/accessibility evidence is attached;
- H1 benchmark/security hardening is current at the release candidate;
- `npm run fee-profile:final-check` passes against final live data;
- `npm run e1:evidence:check` passes with two independent clean 61997 runs;
- canonical Requirements Status, Threat Status, Gate Verification Status and Security Findings are reconciled to the candidate;
- intended submission claims match `docs/execution/R1 Release Claim Matrix.md`;
- no release-critical finding remains unresolved.

## A4 packet contents required at entry

When entry conditions are satisfied, prepare the full immutable packet required by the Master Plan:

- `commit.txt`
- `scope.md`
- `files-changed.txt`
- `requirements.csv`
- `tests.md`
- `security-self-review.md`
- `threat-status.csv`
- `threat-delta.md`
- `security-findings.md`
- `compatibility-findings.md`
- `architecture-deviations.md`
- `known-limitations.md`
- `open-questions.md`
- `evidence-index.md`
- browser screenshot/recording index
- deployment addresses and transaction evidence
- canonical E1 run index
- benchmark report
- final fee profile
- exact intended public/submission claims

## Reviewer question

The A4 reviewer must be able to answer:

> If this repository were submitted now, what can still cause Reclose to be incorrect, misleading, unsafe, unverifiable or incomplete?

The implementation agent must not self-issue A4 PASS.
