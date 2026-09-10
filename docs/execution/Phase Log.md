# Phase Log

## 2026-09-10 - G0 Toolchain Conformance (first session)

Authorized phase: G0 Toolchain Conformance plus the minimum repository foundation required to verify and record G0.
Phase status: PARTIAL / EXTERNAL BLOCKER.
Branch: none (no git repository initialized).
Commit(s): none.
Files changed:
  - moved `Studio-dev Toolchain & Network Compatibility Record.md` to `docs/execution/` (R0 structural compliance)
  - updated `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` (status, CF-006..CF-009, Section 25/25.1)
  - created `toolchain/versions.lock`, `toolchain/runner.lock`, `toolchain/network.lock.json`
  - created `release-evidence/r1/g0/` (preflight.md, install-log.txt, version-report.txt, network-verification.json,
    smoke-contract.py, smoke-schema.json, smoke-test-report.txt, compatibility-evidence-index.md)
  - created `docs/execution/Current Phase.md`, `docs/execution/Open Blockers.md`, `docs/execution/Requirements Status.csv`
Requirements addressed: G0-NET-01..05, G0-TOOL-01..07, G0-RUN-01..03, G0-LINT-01..04, G0-TEST-01, G0-DEP-01..05, G0-FEE-01..02
Requirements moved to VERIFIED: G0-NET-01..05, G0-TOOL-01..07, G0-RUN-01..03, G0-LINT-01..04, G0-DEP-02, G0-DEP-03, G0-DEP-04
Tests/checks run: raw JSON-RPC eth_chainId; CLI network info; JS/Python SDK chain-object import; genvm-lint
  lint/check/schema/typecheck; gltest live smoke deploy attempt
Evidence produced: see release-evidence/r1/g0/ (full list above)
Compatibility record/findings: CF-006 (Windows console encoding), CF-007 (Pyright Annotated false positive),
  CF-008 (Windows long-path pip failure), CF-009 (FeesDistributionMissing, no funded account)
Security/invariant findings: none identified that contradict a locked invariant; CF-009 corroborates the existing
  architecture rule that finality/lifecycle must be checked separately from execution result (Section 9.10/CF-005)
Threat IDs addressed/reopened: none (S0 has not started; TM-* baseline work is out of G0 scope)
Threat status changes: none
Residual-risk decisions: none made by Claude; OB-001 and OB-002 are proposed for repository-owner acceptance or
  resolution before G0 is treated as fully PASS
Architecture deviations: none (no C2 finding)
Known limitations: no funded Studio-dev account; no local Docker simulator; no git repository yet
Blockers: OB-001, OB-002, OB-003 (see docs/execution/Open Blockers.md)
External audit required next?: no (A0 occurs after F0/F1, not after G0); however G0's residual blockers should be
  explicitly accepted or resolved before F0 begins per Master Plan Section 11.3
Exact next phase authorized if gate passes: F0 - Repository Foundation (only after repository owner accepts or
  resolves the G0 external blockers)
Work deliberately not attempted because out of scope: any Reclose product feature, contract beyond the smoke
  contract, SDK package implementation, Sentinel implementation, frontend implementation

## 2026-09-10 - G0 Toolchain Conformance (funded follow-up session)

Authorized phase: G0 only (resume and close external blockers from the first G0 session). F0/product implementation
explicitly out of scope for this session.
Phase status: G0 VERIFIED EXECUTION BASELINE, with one residual non-blocking item (G0-TEST-01; see compatibility
record Section 25.2).
Branch: none (no git repository initialized - OB-003 still open, deferred to F0).
Commit(s): none.
Files changed:
  - created CLI account `reclose-deployer` (0x24fAe7cD031Ed702Be63BDeA8912141805B996bd), dedicated to Reclose
  - updated `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md` (header promoted to
    "G0 VERIFIED EXECUTION BASELINE"; added CF-010, CF-011, CF-012; rewrote Section 25/25.1; added Section 25.2
    analysis of G0-TEST-01 sufficiency)
  - updated `docs/execution/Current Phase.md`, `docs/execution/Open Blockers.md` (OB-001 resolved, OB-002 reassessed
    as non-blocking/open, OB-003 unchanged), `docs/execution/Requirements Status.csv` (G0-DEP-01/04/05,
    G0-FEE-01/02 moved BLOCKED -> VERIFIED)
  - appended Session 2 to `release-evidence/r1/g0/smoke-test-report.txt` (original Session 1 content preserved
    unmodified)
  - created `release-evidence/r1/g0/smoke-deployment.json`, `smoke-receipt.json`,
    `deploy_reverted_history_note.md`, and `release-evidence/r1/g0/deploy-success/` (receipts, fee profile, deployed
    contract source)
Requirements addressed: G0-TEST-01 (re-evaluated), G0-DEP-01, G0-DEP-04, G0-DEP-05, G0-FEE-01, G0-FEE-02
Requirements moved to VERIFIED: G0-DEP-01, G0-DEP-04, G0-DEP-05, G0-FEE-01, G0-FEE-02
Tests/checks run: pre-submission network/account/balance confirmation (genlayer network info, account show);
  `genlayer deploy` (three attempts: no fees -> FeeValueMustBeNonZero; hand-written distribution only ->
  FeeValueMustBeNonZero; `--fee-profile` -> SUCCESS); `genlayer call get_counter` (before write); `genlayer write
  increment --fee-profile` (SUCCESS); `genlayer call get_counter` (after write, proves post-state); `genlayer
  receipt` for both transactions (lifecycle + execution result); `genlayer account show` (balance trail
  corroboration)
Evidence produced: see release-evidence/r1/g0/ (smoke-deployment.json, smoke-receipt.json, deploy-success/*,
  deploy_reverted_history_note.md, updated smoke-test-report.txt)
Compatibility record/findings: CF-010 (Studio-dev browser template runner-hash vs S10 registry hash, C0,
  informational only - the `:test` tag deployed successfully), CF-011 (FeeValueMustBeNonZero distinct from
  FeesDistributionMissing; correct path is `--fee-profile` -> `estimateTransactionFees()`, C1), CF-012 (fee
  deposits are conservative and mostly refunded on finalization, C0, corroborates existing Section 9.7 rule)
Security/invariant findings: none contradict a locked invariant. The deploy/write sequence reinforces existing
  rules: finality checked separately from execution result (CF-005), fee deposits are not the real charge and
  refunds must be read from the receipt (Section 9.7/CF-012), and no FeesDistribution was ever hand-derived or
  fabricated (Section 9.3/CF-011).
Threat IDs addressed/reopened: none (S0 has not started; out of G0 scope)
Threat status changes: none
Residual-risk decisions: none finalized by Claude. G0-TEST-01/OB-002 is presented with an explicit recommendation
  (treat as non-blocking) but left for the repository owner to ratify at A0, per Master Plan Section 11.3.
Architecture deviations: none (no C2 finding; CF-010/CF-011/CF-012 are C0/C1)
Known limitations: no local Docker "localnet" simulator exercised; no git repository yet (OB-003)
Blockers: OB-002 (non-blocking, open), OB-003 (open, deferred to F0). OB-001 resolved.
External audit required next?: no (A0 occurs after F0/F1). G0-TEST-01's residual status should be noted in the
  eventual A0 packet.
Exact next phase authorized if gate passes: F0 - Repository Foundation. NOT started in this session per explicit
  instruction; stopping after G0 for repository-owner review.
Work deliberately not attempted because out of scope: F0 repository foundation, git initialization, any Reclose
  product feature, SDK package implementation, Sentinel implementation, frontend implementation, starting a local
  Docker simulator

## 2026-09-10 - G0 Toolchain Conformance (external-review closure session)

Authorized phase: G0 only, to close two items raised by external review: (1) correctly resolve G0-TEST-01 via
GenLayer Test Direct Mode, and (2) resolve the runner-hash pin discrepancy (CF-010). F0/product implementation
explicitly out of scope.
Phase status: G0 VERIFIED EXECUTION BASELINE - all G0 verification targets now PASS with real evidence.
Branch: none (no git repository initialized - OB-003 still open, deferred to F0).
Commit(s): none.
Files changed:
  - secrets scan performed across docs/toolchain/release-evidence: no password, private key, or seed material found
  - `toolchain/runner.lock` fully rewritten with the correct `genvm-manager` v0.6.0-rc3/rc4 hash family
  - updated `docs/execution/Studio-dev Toolchain & Network Compatibility Record.md`: CF-010 resolved with full
    investigation/rationale, CF-013 added (Windows Direct Mode bug), Section 25/25.1 rewritten (G0-TEST-01 and
    G0-RUN-01/02 corrected to PASS with pinned-hash tx evidence), Section 25.2 replaced with a correction note
  - updated `docs/execution/Open Blockers.md` (OB-002 corrected and resolved; new OB-004 opened and resolved for
    the runner-hash discrepancy; OB-003 unchanged)
  - updated `docs/execution/Current Phase.md`, `docs/execution/Requirements Status.csv` (G0-TEST-01, G0-RUN-01/02,
    G0-LINT-01..04, G0-DEP-01..05, G0-FEE-01/02 all now point at pinned-hash evidence)
  - created `release-evidence/r1/g0/direct-mode-report.md`, `direct-mode-test-output.txt`,
    `release-evidence/r1/g0/deploy-success-pinned/` (pinned contract, fee profile, both receipts)
  - created a throwaway pinned-hash lint-comparison contract in the local scratch workspace (not committed to the
    repository) solely to reproduce and disprove the S10 hash's resolvability - not part of the evidence pack
    beyond what is described in CF-010
Requirements addressed: G0-TEST-01, G0-RUN-01, G0-RUN-02, G0-RUN-03, G0-LINT-01..04 (re-run against pinned hash),
  G0-DEP-01..05, G0-FEE-01/02 (re-run against pinned hash)
Requirements moved to VERIFIED: G0-TEST-01 (was BLOCKED)
Tests/checks run:
  - secret scan (grep for password/private-key/seed patterns and the literal generated password) across
    docs/toolchain/release-evidence - clean
  - `genvm-lint check` against both candidate runner hashes (Studio-dev template hash: PASS; S10 snapshot hash:
    FAILS "runner not found") using the identical local genvm-manager v0.6.0-rc3/rc4 bundles
  - local bundle-index inspection confirming the Studio-dev template hash is the only current-layout py-genlayer
    entry in both cached genvm-manager releases, and reading its runner.json for the exact stdlib/cpython/
    cloudpickle dependency hashes
  - cross-check against gltest's own separate Direct Mode runner cache (third independent confirmation)
  - `pytest` with the `direct_deploy` fixture (GenLayer Test Direct Mode) against the exact pinned contract:
    failed on native Windows (CF-013, PermissionError in gltest's own temp-file handling), then PASSED under WSL
    (Ubuntu, Python 3.12.3) with the identical pinned genlayer-test==0.30.0rc2 package
  - `genlayer deploy --contract smoke_contract.py --fee-profile fee-profile.json` (pinned hash) -> SUCCESS
  - `genlayer call get_counter` (before write) -> 0
  - `genlayer write increment --fee-profile fee-profile.json` (pinned hash) -> SUCCESS
  - `genlayer call get_counter` (after write) -> 1
  - `genlayer receipt` for both pinned transactions: Finalized . Accepted, FINISHED_WITH_RETURN
  - `genlayer account show`: balance trail corroboration
Evidence produced: release-evidence/r1/g0/direct-mode-report.md, direct-mode-test-output.txt,
  deploy-success-pinned/{smoke-contract-pinned.py, fee-profile.json, smoke-deployment-receipt.txt,
  smoke-write-receipt.txt, test_direct_smoke.py}
Compatibility record/findings: CF-010 resolved (exact accepted hash determined and justified with source/
  rationale, not chosen merely for being newer); CF-013 added (Windows-native Direct Mode bug, worked around via
  WSL, not patched inside Reclose or GenLayer code)
Security/invariant findings: none contradict a locked invariant. Confirmed no deployer password, private key, or
  secret was written into any repository file, log, or evidence pack (explicit secret scan performed this
  session).
Threat IDs addressed/reopened: none (S0 has not started; out of G0 scope)
Threat status changes: none
Residual-risk decisions: none required - both external-review items were fully closed with reproducible evidence,
  not accepted as residual risk.
Architecture deviations: none (no C2 finding; CF-010 and CF-013 are both C1)
Known limitations: repository still has no git history (OB-003, deferred to F0); Direct Mode is not usable
  natively on Windows until upstream fixes CF-013 (WSL/Linux/macOS required for that specific test path)
Blockers: OB-003 only (open, deferred to F0). OB-001, OB-002, OB-004 all resolved.
External audit required next?: no (A0 occurs after F0/F1). This closure directly answers the external G0 review
  that prompted this session.
Exact next phase authorized if gate passes: F0 - Repository Foundation. NOT started in this session per explicit
  instruction; stopping after G0 for repository-owner review.
Work deliberately not attempted because out of scope: F0 repository foundation, git initialization, any Reclose
  product feature, SDK package implementation, Sentinel implementation, frontend implementation, starting a local
  Docker/Studio-Mode simulator (not required once Direct Mode was correctly identified as the applicable local
  test mode)
