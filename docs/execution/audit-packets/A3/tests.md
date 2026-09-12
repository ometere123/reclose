# A3 Tests

Canonical source gate: `npm run verify` on the immutable A3 candidate.

Product-specific checks wired into the root gate:

- `npm run sdk-product-truth:test`
  - real transport block height, never fabricated `0`;
  - CLOSED + REJECTED -> FINAL_REJECTED;
  - CLOSED + UNDETERMINED -> FINAL_UNDETERMINED;
  - action receipt uses index/protocol target ID, execution time and state proof;
  - required post-state mismatch cannot be SUCCESS;
  - missing protocol execution time is rejected.
- `npm run frontend:test`
  - semantic shell and navigation;
  - all D2 core read routes;
  - all D3 write/recovery routes;
  - fixture mode cannot submit;
  - live adapter delegates to frozen SDK;
  - tx ID persists before tracking;
  - focus/reduced-motion/non-colour status baseline;
  - malicious evidence is escaped;
  - ACCEPTED-as-final and execution-failure-as-success contradictions are rejected;
  - generic AI/Web3 visual-language guard.
- `npm run agent-skill:test`
  - chain 61997 lock;
  - safe read surface;
  - non-custodial report preparation;
  - explicit authority-expansion/owner/Judge mutation prohibitions;
  - lifecycle/decision/execution truth separation;
  - current live child limitation disclosure.
- `npm run cli-report:test`
  - incident preparation delegates to the canonical SDK builder exactly once;
  - recovery preparation delegates to the canonical SDK builder exactly once;
  - builder/fee failure returns non-zero without hidden retry/resubmission.
- `npm run benchmark:check`
  - >=50 adversarial cases;
  - threat mapping;
  - evidence references;
  - explicit live BLOCKED_EXTERNAL/NOT_RUN statuses;
  - zero hard-release targets.

Existing root verification also covers schemas, lifecycle truth, network guard, F1 parity, action envelope, canonical hashes, policy compiler, evidence builder, transaction tracker, existing CLI flows, Sentinel, contract discovery, GenVM-lint wrapper and Python Direct Mode tests.

## Post-A3 release-tooling self-tests

The release evidence checkers are hardened and tested without pretending live evidence exists:

- `npm run e1-checker:selftest`
  - accepts two complete independent synthetic run records;
  - rejects failed Judge -> Kernel child execution;
  - rejects PASS steps with empty evidence;
  - rejects deployment-manifest reuse;
  - rejects placeholder/non-SHA source commits.
- `npm run fee-profile-checker:selftest`
  - accepts structurally complete final-address evidence;
  - rejects empty live arguments;
  - rejects placeholders;
  - rejects wrong final addresses;
  - rejects failed estimates without exact error evidence.

These checker self-tests are included in normal `npm run verify`. Their green release-tooling baseline is separately frozen in `docs/execution/Release Tooling Baseline.md` so the A3 product target remains immutable.

## Evidence-only release gates

The following live gates are intentionally **not** part of ordinary source CI because they must fail until external/live evidence exists:

- `npm run fee-profile:final-check`
- `npm run e1:evidence:check`

A failing release-evidence gate is not fixed by weakening the checker or adding placeholders.

Browser-run accessibility, keyboard walkthrough, responsive screenshots and any hosted/deployed frontend evidence must be added externally. They are not claimed by source tests.
