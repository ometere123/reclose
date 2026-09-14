# A3 attempt 2 candidate refresh

**Immutable source candidate:** `7d308374cb6c634660b0e70ca389618198496503`
**Exact-target CI:** run `34798352450`, SUCCESS (`npm ci`, `npm run verify`)
**Branch:** `claude/r1-product-final`
**Review disposition:** **AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE**. This is not a self-issued PASS and does not authorize release or submission.

This refresh supersedes the packet's previous candidate `98b98cc6ddc3d36292914e79c8fe4c8bc0d48209`. The old A3 requirement map is preserved as `requirements-at-98b98cc.csv`; `requirements.csv` now mirrors the canonical 156-row ledger, including implementation, test, evidence, commit, status, and open-gap fields. Attempt 1 remains unchanged at `../A3/AUDIT_DECISION.md` with its FAIL decision.

## H01-H12 disposition

| Finding | Current disposition at this candidate | Evidence boundary |
|---|---|---|
| H01 review-to-sign integrity | CLOSED in source and tests | Prepared writes bind the reviewed payload; real live wallet submission is not proven by the synthetic browser pass. |
| H02 onboarding and policy writes | CLOSED in source/tests | Registration and sequential policy construction/activation have real prepared-write paths. Current-candidate live browser signing evidence is not captured. |
| H03 signing-network guard | CLOSED in source/tests | Network and signer checks are in the pre-sign path. A connected-wallet mismatch capture against this candidate is absent. |
| H04 causal execution trace | CODE-COMPLETE; LIVE-PROOF BLOCKED | Judge→Kernel→Target trace resolution and lineage views exist. The accepted Judge→Kernel child simulation fails under OB-014, so the full live trace cannot be shown. |
| H05 canonical EAP and evidence authority | CLOSED in source/tests | The SDK constructs and hashes canonical EAPs; Judge snapshot evidence is independently fetched and content-bound. Current browser capture is absent. |
| H06 exact fee preview | CLOSED in source/tests; release fee profile OPEN | The SDK estimates the complete Judge call. Eight final live lifecycle profiles still lack real state/arguments; see the current C3 report. |
| H07 target and owner controls | CLOSED in source/tests; wallet execution unverified | Bounded authority-reducing owner writes use the reviewed signing pipeline. No live owner-signed control transaction is claimed. |
| H08 policy and audit surfaces | PARTIALLY CLOSED | Per-incident export and policy lifecycle surfaces exist; policy-level and cross-incident export coverage remains open. |
| H09 requirement/status mapping | CLOSED FOR TRACEABILITY | The canonical map now joins all 156 requirements and records explicit statuses/gaps; the 106 NOT STARTED rows remain open product work. |
| H10 unknown assurance state | CLOSED in source/tests | Unknown values render as UNKNOWN rather than NORMAL. This is unit/source evidence, not a live unknown-state capture. |
| H11 governed report selection | CLOSED in source/tests | Report choices are constrained by active governed rules/resources; no live submission is claimed. |
| H12 incident identity persistence | CLOSED in source/tests; live casing check unverified | Predicted IDs use the contract derivation and persist with the draft/transaction; exact live casing comparison remains open. |

The full per-finding history and tests remain in `findings-closure.md`. Statuses distinguish source closure from live proof.

## Candidate evidence and release state

- The active Run A generation is `r1-lifecycle-split-run-a` on Studio-dev / 61997: Kernel `0x5A271CB03b4833aA485ff13035844ba500c4E536`, Judge `0x43c6061FEde8372a3e4c3AB513D32abcfA956e89`, Vault `0x10451Cd05cDeD4CE0f40983f4f87FFE42968E701`, ReferenceAgent/target `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353`, target ID `reclose-target-007`, active policy `policy-r1-009`. Full transaction/readback details are in `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`.
- Treasury readback proves `0.20 GEN` at the current ReferenceAgent. The funding transaction hash remains null in the active manifest because the supplied screenshot's ID was truncated; no hash is inferred. The readback is `release-evidence/r1/diagnostics/run-a-treasury-readback.json`.
- The exact current Studio-dev limitation is OB-014: the minimal explicitly allocated accepted Parent→Child message fails with `SystemError: 2: inval`; the finalized control succeeds. Preserve the exact reproduction at `release-evidence/r1/diagnostics/accepted-message-repro/`. No Run A incident or Reporter nonce exists. Run B and H1 live cases are NOT RUN, not passes.
- Fee evidence contains four actual current-generation deployment profiles and the retained accepted-stage failure. Eight write profiles remain unavailable pending lifecycle state; `npm run fee-profile:final-check` is NOT READY.
- Requirements status is 156 total: 10 VERIFIED, 27 IN PROGRESS, 13 IMPLEMENTED / UNVERIFIED, 106 NOT STARTED. All 82 threats have control, implementation, test, evidence, residual-risk, and commit fields; this completeness does not close open threats or accept critical/high residual risks.
- Exact CI run `34798352450` passed full repository verification for this source candidate. The 78-scenario H1 corpus is not a completed live benchmark; blocked/not-run cases remain open.

## Browser and wallet proof boundary

The previously recorded interactive browser captures belong to older candidate SHAs and are retained only as history. They are not reused as evidence for this candidate. On 2026-09-14 the available local Reclose browser page showed `MockProductAdapter` fixture mode, a wrong-network wallet on chain 61999, and stale target `reclose-target-004`; this is unsuitable as current live-product or wallet-signing proof. `browser-evidence-index.md` marks the current-candidate capture set NOT CAPTURED. No production-deployed browser session or connected-wallet A3 walkthrough is claimed.

## Remaining release gates

E1 Run A/B, complete live causal trace, final fee-profile check, H1 measured results, current-candidate browser/accessibility captures, A4, and the final release candidate remain incomplete. OB-014 is the external prerequisite for the canonical incident flow. The owner-directed A3 review state is recorded above without declaring PASS; the reviewer must assess the open evidence and residual risks directly.
