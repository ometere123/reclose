# A3 Tests

Canonical gate: `npm run verify` on the immutable A3 candidate.

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
  - generic AI/Web3 visual language guard.
- `npm run benchmark:check`
  - 50+ adversarial cases;
  - threat mapping;
  - evidence references;
  - explicit live BLOCKED/NOT_RUN statuses;
  - zero hard-release targets.

Existing root verification also covers schemas, lifecycle truth, network guard, F1 parity, action envelope, canonical hashes, policy compiler, evidence builder, transaction tracker, CLI, Sentinel, contract discovery, GenVM-lint wrapper and Python Direct Mode tests.

Browser-run accessibility, keyboard walkthrough, responsive screenshots and a deployed live frontend must be added as external/manual evidence. They are not claimed by static source tests.
