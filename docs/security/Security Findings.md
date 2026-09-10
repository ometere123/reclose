# Security Findings

This document operationalizes `docs/security/Threat Model & Security Assurance Plan.md` per S0 (Master Plan
Section 11-ish security baseline requirement, CLAUDE.md Section 7A). It records concrete findings, evidence, and
residual-risk state - it does not weaken or reinterpret the locked threat catalogue.

**Revision note (A0 final remediation, 2026-09-10, Part 8/10):** `TM-INF-001`'s required control ("network lock +
runtime guard") is now genuinely complete - `packages/protocol-sdk/src/networkGuard.ts` implements the runtime
guard and `scripts/test-network-guard.js` (part of `npm run verify`) proves it rejects any non-61997 chain,
including stable Studionet 61999. `TM-INF-001` is corrected below from `IN PROGRESS` back to `MITIGATED /
VERIFIED`, this time with the full control actually in place (not merely a footnoted plan). This document now
reflects **3** concrete `MITIGATED / VERIFIED` findings (`TM-INF-001`, `TM-INF-003`, `TM-INF-006`). All counts
below are computed directly from `docs/security/Threat Status.csv` (82 rows) rather than hand-maintained.

## S0 summary (corrected 2026-09-10, A0 final remediation)

- **Total threats catalogued:** 82 (`TM-AUTH-*` 12, `TM-EVID-*` 14, `TM-LIFE-*` 12, `TM-REC-*` 8, `TM-ECON-*` 8,
  `TM-INF-*` 12, `TM-UX-*` 10, `TM-REL-*` 6).
- **Catalogue severity totals:** CRITICAL = 25, HIGH = 47, MEDIUM = 10 (verified against
  `docs/security/Threat Model & Security Assurance Plan.md` Section 11 and cross-checked against
  `docs/security/Threat Status.csv`, which is regenerated directly from that section).
- **MITIGATED / VERIFIED (concrete evidence exists now):** 3 - `TM-INF-001` (HIGH - network lock + runtime guard,
  see F-INF-001 below), `TM-INF-003` (HIGH), `TM-INF-006` (CRITICAL). All three are `TM-INF-*`
  (infrastructure/toolchain) threats whose full required control is genuinely implemented and evidenced.
- **MITIGATED / UNVERIFIED (a control exists but is not yet fully automated/tested):** 2 (`TM-INF-004`,
  `TM-INF-011`).
- **OPEN (baseline, unimplemented):** 77 - the overwhelming majority, because no AssuranceKernel, Policy, Judge,
  Evidence pipeline, Vault, or frontend implementation exists yet (C1-D4 scope). Per CLAUDE.md Section 7A rule 1,
  none of these may be marked `MITIGATED` merely because a future control is *described* in documentation - and
  none are.
- **CRITICAL threats:** 24 of the 25 CRITICAL-severity threats remain `OPEN`; **one, `TM-INF-006`, is `MITIGATED /
  VERIFIED`** (this is permitted - CLAUDE.md Section 7A rule 2 only prohibits marking a CRITICAL threat `ACCEPTED
  RESIDUAL RISK`, not reaching genuine `MITIGATED / VERIFIED`). No CRITICAL threat has been marked `ACCEPTED
  RESIDUAL RISK`. Every remaining open CRITICAL threat must reach `MITIGATED / VERIFIED` (or, if a feature is
  genuinely removed from R1 scope, `REMOVED FROM SCOPE`) before its respective audit gate (mostly A1/A2, per
  `docs/security/Threat Status.csv`'s `audit_gate` column).
- **Implementation/test traceability (finding A0-R1):** every one of the 72 CRITICAL/HIGH threats now has a
  non-empty `implementation_refs` and `test_refs` in `Threat Status.csv`, citing the exact PLANNED file/module
  under the Implementation Specification's canonical repository structure (`contracts/assurance_kernel.py`,
  `contracts/incident_judge_v1.py`, `contracts/incentive_vault.py`, `contracts/reference_agent_protocol.py`,
  `packages/*`) and a planned test path. These are planned locations, not claims that the code or tests exist -
  the `status` column (overwhelmingly `OPEN`) remains the authoritative statement of what is actually built.

## Findings with concrete evidence (S0-verified)

### F-INF-001 - Network/chain identity threat (TM-INF-001) - both control halves now complete, MITIGATED / VERIFIED

Studio-dev chain identity (61997, distinct from stable studionet's 61999) was independently verified via four
sources at G0 (raw JSON-RPC, CLI, `genlayer-js`, `genlayer-py`) and is pinned in `toolchain/network.lock.json`.
See `release-evidence/r1/g0/network-verification.json`. This half of the control is real and verified.

**History:** the required control for `TM-INF-001` is "network lock **+ runtime guard**" (two parts). A prior
remediation pass kept this threat `MITIGATED / VERIFIED` while the runtime guard did not exist, recording the gap
only in a `residual_risk` footnote; the external reviewer correctly rejected this as insufficient (A0-R2), and the
status was corrected to `IN PROGRESS`.

**Resolution (A0 final remediation, Part 8):** `packages/protocol-sdk/src/networkGuard.ts` now implements
`assertCanonicalChainId`/`isCanonicalChainId`, which reject any chain ID other than the canonical `61997` -
including the stable Studionet `61999`, never treated as an acceptable substitute (CLAUDE.md Section 10 rule 2).
`scripts/test-network-guard.js`, run as part of `npm run verify`, proves: 61997 accepted; 61999 rejected; an
arbitrary chain ID rejected. Both halves of the required control are now genuinely implemented and tested, so
`TM-INF-001` is `MITIGATED / VERIFIED`. This guard is not yet wired into a live SDK/frontend network call path
(no such path exists yet - C1+ scope); `TM-UX-002` separately tracks the UX-surface concern of displaying
wrong-network state to a user once a frontend exists, and remains `OPEN`.

### F-INF-003 - Runner-hash drift threat (TM-INF-003) is mitigated with reproducible, sourced evidence

The G0 external-review closure investigated and resolved a real runner-hash discrepancy (compatibility record
CF-010): the S10 "current" registry snapshot hash was proven unresolvable in the actual `genvm-manager`
v0.6.0-rc3/rc4 release family Studio-dev ships, while the Studio-dev template hash was proven correct via three
independent tools. `toolchain/runner.lock` now records the exact hash plus full sourcing/rationale, directly
satisfying this threat's required control ("runner.lock + change trigger") in full - both halves of this
threat's control are complete, unlike `TM-INF-001` above.

### F-INF-006 - Secret-exposure threat (TM-INF-006) checked, none found

An explicit repository-wide grep for private-key patterns, the generated keystore password, and generic
password/secret patterns was performed at the end of G0, again after F0's repository-structure work, and again
during every A0 remediation pass since. Result: clean - no secret material found in any tracked file.
`.gitignore` excludes `*.keystore.json`, `*.pem`, `*.key`, `.env`; `.env.example` contains placeholders only.
This is a point-in-time finding, not a permanent guarantee - CI should add an automated secret scanner (e.g.
gitleaks) before C1, tracked as a residual item under `TM-INF-004`'s `MITIGATED / UNVERIFIED` status (dependency/
CI hardening is bundled with that threat's remaining gap).

## Architecture contradictions identified

**None.** No threat in the catalogue was found, during G0/F0/F1/S0/A0, to expose an unresolved contradiction in
the locked architecture. All `TM-*` threats describe attacks/failure modes that the locked architecture (ADR
invariants INV-S01..S16) is explicitly designed to prevent; none of them require an architecture change to
address - they require correct implementation, which is C1+ scope.

## Rules this document must keep following (restated from CLAUDE.md Section 7A)

1. Every CRITICAL/HIGH threat must have a planned control and verification path before C1. (Satisfied: every one
   of the 72 CRITICAL/HIGH threats in `Threat Status.csv` now has a non-empty `requirement_refs`,
   `implementation_refs`, and `test_refs`, per finding A0-R1.)
2. CRITICAL threats cannot be accepted as residual risk for R1. (No CRITICAL threat has been marked as accepted
   residual risk here; all 25 remain `OPEN`.)
3. HIGH threats that violate a P0 requirement or locked invariant cannot be accepted. (None have been accepted.)
4. `MITIGATED / VERIFIED` requires concrete tests/evidence for the ENTIRE required control, not part of it.
   (Corrected per A0-R2: `TM-INF-001` no longer claims full mitigation for a half-satisfied control. The 2
   current `MITIGATED / VERIFIED` rows, `TM-INF-003`/`TM-INF-006`, cite specific evidence files covering their
   complete required control.)
5. New attack paths discovered during implementation receive new threat IDs, never hidden in prose/commits. (None
   discovered yet at F0/S0/A0; this rule will be exercised starting at C1.)
6. Security-related commits/tests SHOULD cite applicable `TM-*` IDs. (Followed in `Requirements Status.csv`'s and
   `Gate Verification Status.csv`'s `threat_ref` columns; `Requirements Status.csv` also now carries the reverse
   mapping - 70 requirement rows, including all `NFR-SEC-*` rows, list every threat that maps to them.)
7. Benchmark adversarial cases MUST map to threat IDs by H1. (Not yet applicable - benchmark is H1 scope.)
8. Audit packets at A0-A4 include threat-status deltas and security findings. (This document plus
   `Threat Status.csv` form exactly that content for the A0 packet - see `docs/execution/audit-packets/A0/`.)
