# Claude External Execution Prompt

> **Superseded checkpoint prompt.** Its branch, deployment addresses, policy, and `fee no_matching_allocation` diagnosis below refer to an older generation. Do not execute these steps verbatim. The current source of truth is `docs/execution/HANDOFF.md`, `docs/execution/Current Phase.md`, and `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`. The isolated typed-address `emit_decided` simulation has passed; Run A remains unverified because the active immutable Kernel/Judge source predates that correction.

Copy the text below verbatim into Claude Code after checking out the latest `chatgpt/r1-product-release` branch. This is the remaining environment-dependent work only. Do not redo the architecture or product implementation unless one of these checks proves a defect.

---

You are finishing the external-evidence portion of Reclose R1. The repository source/product/release-tooling work has already been implemented and audited as far as the GitHub-only environment permits. Your job is to execute only the steps that require the local browser, unlocked Studio-dev signer, live GenLayer RPC, or local deployment tooling, fix concrete defects you reproduce, and return a final evidence report.

## Immutable context

Project: Reclose, runtime assurance for autonomous protocols.

Core rule: GenLayer judges evidence; deterministic policy limits exactly what the system may do.

Canonical network:

- Studio-dev
- chain ID 61997
- RPC `https://studio-dev.genlayer.com/api`
- never substitute 61999

Pinned compatibility set:

- Node 24.16.0
- npm 11.13.0
- Python 3.14.4
- genlayer-js 2.0.0-rc.1
- genlayer-py 0.19.0rc2
- genlayer-test 0.30.0rc2
- genvm-linter 0.11.1rc2

Final recorded deployment before the two clean E1 runs:

- ProviderStubA `0x088430851fBFD581DA329A262FD9C0aEd7b4AD2E`
- ProviderStubB `0x4b55607312E045FcAd21b836702247F6d65844A8`
- AssuranceKernel `0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621`
- ReferenceAgentProtocol `0x7B423D9787aeACC303467dE82A2D193D77155f0f`
- IncidentJudgeV1 `0x7D9a32BDA22B7C4c1C487Cc2983A816A6f75FFc0`
- IncentiveVault `0xB3476a8881e8866a6d92c8252a840a08004d02c3`
- target `reclose-target-003`
- policy `policy-r1-004`

Known live blocker from the current evidence:

`fee no_matching_allocation # internal`

on the triggered Judge -> Kernel child, reproduced even with estimator-discovered message allocation data.

Do not claim this is fixed until you execute and verify the child plus target post-state live.

## Before doing anything

1. Checkout/pull `chatgpt/r1-product-release` without rewriting history.
2. Confirm the current branch tip and record the full SHA.
3. Run from a clean install:

```bash
npm ci
pip install -r requirements.txt
npm run verify
```

If normal verification is not green, stop external evidence work, diagnose the exact regression, fix only the proven defect, rerun the full gate, commit/push the fix, and record the new SHA.

Do not edit locked governance merely to make tests pass.

## Task 1: browser/product evidence for A3

Use `docs/execution/audit-packets/A3/screenshots-recordings-index.md` as the exact capture list.

Run the frontend in a real browser and capture every required state at the exact source SHA you are reviewing. Verify:

- dashboard/overview;
- targets and target detail;
- policy viewer and authority review/diff;
- incidents and full five-band Incident Explorer;
- report incident + fee/bond preview;
- recovery;
- onboarding;
- benchmark;
- system/deployment status;
- wrong-network state;
- persisted pending-transaction/resume state;
- successful judgment + failed child execution shown as distinct facts;
- responsive mobile/tablet/desktop behaviour;
- keyboard-only operation;
- visible logical focus;
- reduced-motion mode;
- labels/contrast/accessibility inspection;
- malicious evidence rendered as inert text, never executable HTML.

Store only non-secret evidence. Update the screenshots/recordings index with actual artifact paths and results. Do not mark a failed check PASS.

If the browser exposes a product defect, fix it, add/extend automated regression coverage where possible, run `npm run verify`, commit/push, then treat the new product commit as a new A3 audit target. Preserve the previous A3 target/history.

## Task 2: final fee profile

Open:

`release-evidence/r1/c3/fee-profile-input.json`

The final addresses are already bound. Dynamic arguments are intentionally empty because they must come from fresh live state.

Generate real arguments for every live branch from the clean scenario/deployment. Do not reuse stale nonce, incident ID, action ID or claim data.

Generate the final live profile using the repository fee tooling and write:

`release-evidence/r1/c3/fee-profile-report.json`

For a branch that genuinely cannot be estimated because of the known runtime limitation, retain the exact `ESTIMATION_FAILED` error. Do not invent a fee.

Then run:

```bash
npm run fee-profile:coverage
npm run fee-profile:final-check
```

The final check must PASS before you call the fee profile complete.

## Task 3: resolve or re-evaluate Judge -> Kernel triggered-child fee routing

Reproduce the current canonical incident path against Studio-dev 61997 using the authoritative estimator-derived fee allocation.

Known historical result:

- Judge deterministic/canonical prechecks worked;
- governed source fetch worked;
- real LLM/GenLayer judgment worked;
- Judge state persisted;
- triggered Kernel child failed with `fee no_matching_allocation # internal`.

Investigate the current pinned runtime/CLI/SDK rather than hand-inventing fee arithmetic.

Check for a verified GenLayer runtime/CLI change if necessary. If a toolchain change is required, record the exact compatibility finding and do not silently update locked versions.

Success requires all of these:

1. parent semantic decision is correct;
2. triggered Kernel child reaches successful execution, not merely parent finality;
3. Kernel accepts the bound target/policy/rule/Judge/version decision;
4. target action executes;
5. expected target post-state is observed;
6. parent/child IDs and execution results are recorded.

Do not work around the problem by directly mutating the target, manually invoking the Kernel as if that proved Judge dispatch, substituting Direct Mode for live E1, or omitting the failed child from evidence.

If this remains a platform/runtime blocker after a disciplined reproduction, preserve it exactly and report the minimal reproduction. Do not fabricate E1 completion.

## Task 4: perform E1 twice from independent clean deployments

Only after the required child path succeeds, read:

- `release-evidence/r1/e1/README.md`
- `release-evidence/r1/e1/run-template.json`
- `scripts/check-e1-evidence.mjs`

Perform the entire canonical scenario twice from two independent clean deployments.

Each run must prove:

1. deploy/verify;
2. register target;
3. activate reference policy after required timelock;
4. fund ReferenceAgentProtocol;
5. purchase through Provider A with real test GEN;
6. submit canonical compromise report;
7. observe raw GenLayer lifecycle;
8. provisional containment only if the live RC path supports it;
9. final CONFIRMED decision;
10. successful Judge -> Kernel child plus Provider A restricted and target SAFE_MODE;
11. AUTO purchase through Provider B with real test GEN;
12. remediation evidence;
13. RECOVERY;
14. recovery validation;
15. Provider A restored and target NORMAL;
16. final AUTO purchase with real test GEN;
17. complete causal trace.

Write real run artifacts as:

`release-evidence/r1/e1/run-<unique-id>.json`

with separate deployment manifests/evidence paths.

Then run:

```bash
npm run e1:evidence:check
```

It must PASS without modifying/weakening the checker.

## Task 5: live proof gaps beyond the canonical happy path

Against the final release deployment, execute and record where feasible:

- a real non-zero report-bond/settlement/claim path;
- duplicate-delivery/idempotency live proof;
- restart/resume transaction-tracking proof.

If any remains blocked, state exactly why and leave its benchmark/release status incomplete.

## Task 6: reconcile canonical ledgers only from evidence

After the browser, fee and E1 evidence exists, update:

- `docs/execution/Requirements Status.csv`
- `docs/security/Threat Status.csv`
- `docs/execution/Gate Verification Status.csv`
- `docs/security/Security Findings.csv`

Rules:

- do not mass-mark rows VERIFIED from implementation alone;
- cite exact implementation/test/live evidence;
- critical threats cannot be accepted residual risk for R1;
- preserve BLOCKED/UNVERIFIED where evidence is incomplete;
- do not rewrite historical audit decisions.

## Task 7: A3/A4 discipline

A3 already has a frozen historical candidate. If your browser/live-product checks required a product code change, create a new A3 attempt packet and request independent review of the new immutable target. Do not overwrite the old target.

A4 at `docs/execution/audit-packets/A4/README.md` is deliberately `NOT READY FOR EXTERNAL REVIEW`.

Only promote A4 to `AWAITING EXTERNAL REVIEW` when:

- A3 has an acceptable external decision;
- browser/accessibility evidence is complete;
- H1 is current;
- final fee profile passes;
- E1 checker passes on two clean runs;
- canonical ledgers are reconciled;
- no release-critical finding remains;
- intended public claims match `docs/execution/R1 Release Claim Matrix.md`.

Never self-author A3 or A4 PASS.

## Task 8: final verification and secrets scan

At the final candidate:

```bash
npm run verify
npm run fee-profile:coverage
npm run fee-profile:final-check
npm run e1:evidence:check
```

Run the repository secret/tracked-artifact checks and confirm no private key, seed phrase, keystore password, token, node_modules, cache or local wallet file is tracked.

## Return only this final report

Return:

- `FINAL_BRANCH`
- `FINAL_SHA`
- `FINAL_CI_RUN_ID` and result
- `A3_BROWSER_EVIDENCE`: COMPLETE / INCOMPLETE
- `FINAL_FEE_PROFILE`: PASS / FAIL with exact blocker
- `JUDGE_KERNEL_CHILD`: PASS / FAIL with exact parent/child tx IDs and execution result
- `E1_RUN_1`: PASS / NOT RUN / FAIL with manifest path
- `E1_RUN_2`: PASS / NOT RUN / FAIL with manifest path
- `E1_EVIDENCE_CHECK`: PASS / FAIL
- `NON_ZERO_BOND_LIVE_PROOF`: PASS / NOT RUN / FAIL
- `DUPLICATE_DELIVERY_LIVE_PROOF`: PASS / NOT RUN / FAIL
- `RESTART_RESUME_LIVE_PROOF`: PASS / NOT RUN / FAIL
- `CANONICAL_LEDGERS_RECONCILED`: YES / NO
- `A3_EXTERNAL_DECISION`: decision if supplied by an independent reviewer, otherwise AWAITING
- `A4_STATUS`: NOT READY / AWAITING EXTERNAL REVIEW / external decision if actually supplied
- exact remaining blockers
- exact files/transactions/evidence produced

Do not return a narrative that implies a gate passed if its required evidence is absent.

---
