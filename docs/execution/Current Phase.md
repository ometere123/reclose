Current phase: **A3 PRODUCT & INTEGRATION CANDIDATE PREPARED / AWAITING EXTERNAL REVIEW.**

Independent A2 attempt-2 review was performed against immutable target
`6dc88f9393a2c8f94deae37d5c53af8bbcf9e9f5` on `claude/a2-remediation-integration`.
Decision: **PASS WITH CONDITIONS**. The exact decision and conditions are preserved at
`docs/execution/audit-packets/A2-attempt-2/AUDIT_DECISION.md`.

The historical first A2 packet at `docs/execution/audit-packets/A2/` remains unchanged.

## Source-side product work now implemented

D1, D2, D3, I1, I2 and D4 source work is present on `chatgpt/r1-product-release`:

- product shell, dashboard, target, policy, incident, benchmark and system/deployment surfaces;
- flagship five-band Incident Explorer separating evidence, GenLayer judgment, policy consequence,
  actual execution and recovery;
- target onboarding, policy review, incident-report, fee/bond preview and recovery flows;
- fixture adapter that is explicitly synthetic/read-only for writes;
- live adapter that delegates protocol semantics to the RecloseSDK boundary;
- immediate transaction-ID persistence/resume behaviour without blind resubmission;
- escaped/untrusted evidence rendering;
- responsive/accessibility/reduced-motion foundations;
- product-level distinction between provisional/final, CONFIRMED/REJECTED/UNDETERMINED,
  transaction finality, child execution and target post-state;
- bounded R1 autonomous-agent `skill.md`.

The product work has executable source-level checks under `scripts/test-frontend-product.js`,
`scripts/test-sdk-product-truth.js` and `scripts/test-agent-skill.js`. Real browser evidence remains
external and is explicitly indexed as NOT RUN rather than fabricated.

## A2 condition status

- **A2-C01 OPEN / E1 BLOCKER:** Judge -> Kernel triggered child still fails live with
  `fee no_matching_allocation # internal`. This remains an external Studio-dev/runtime limitation
  on the current evidence and blocks canonical E1 closure.
- **A2-C02 PARTIALLY CLOSED:** the fee-profile input is now bound to the final R1 addresses and a
  strict `npm run fee-profile:final-check` evidence gate exists. Fresh dynamic call arguments and a
  final live profile still require Studio-dev execution.
- **A2-C03 CLOSED IN SOURCE:** SDK action receipts no longer fabricate target ID, execution time,
  block height or required post-state truth. CLOSED incidents preserve final REJECTED vs
  UNDETERMINED. Six executable SDK product-truth checks cover the correction.
- **A2-C04 SUBSTANTIALLY CLOSED FOR AUDIT HISTORY:** A2 attempt-2 decision and current phase are
  recorded without rewriting historical packets. Canonical requirements/threat/gate ledgers still
  require final release reconciliation as evidence arrives; A3 contains its own truthful delta.

## H1 status

H1 preparation is materially implemented:

- threat-linked benchmark corpus: 78 scenarios;
- 70 automated/evidence-mapped scenarios;
- 8 live/evidence-bound scenarios explicitly marked BLOCKED_EXTERNAL or NOT_RUN where appropriate;
- hard release targets remain exactly zero;
- benchmark structure/evidence references are machine-checked in normal CI.

This does **not** mean every live benchmark scenario has passed.

## A3 status

`docs/execution/audit-packets/A3/` is prepared as **AWAITING EXTERNAL REVIEW** and includes scope,
requirements mapping, tests, security self-review, threat delta, compatibility findings, architecture
deviation status, known limitations, open questions and a browser-evidence index.

A3 is not self-certified. Browser screenshots/recordings, keyboard/accessibility evidence and any
findings from that real review must be attached before an external reviewer can close the gate.

## E1 status

E1 is prepared but **NOT COMPLETE**. The repository contains:

- `release-evidence/r1/e1/run-template.json`;
- `release-evidence/r1/e1/README.md`;
- `scripts/check-e1-evidence.mjs`;
- `npm run e1:evidence:check`.

The evidence gate requires two independent clean 61997 runs and successful required child execution
plus post-state. It must continue to fail until those real artifacts exist.

## Next evidence-dependent sequence

1. freeze the final substantive A3 candidate after clean GitHub CI;
2. capture real browser/accessibility evidence against that exact SHA;
3. obtain an external A3 decision;
4. complete the final live fee profile;
5. resolve/retest the Judge -> Kernel child path;
6. execute two clean E1 runs and pass `npm run e1:evidence:check`;
7. reconcile canonical requirements/threat/gate ledgers;
8. prepare A4 for independent review;
9. close R1/S1 only on real evidence.

`docs/execution/External Execution Handoff.md` is the exact operator handoff for steps requiring a
browser, unlocked signer or live Studio-dev execution.
