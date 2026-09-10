# Security Findings

This document operationalizes `docs/security/Threat Model & Security Assurance Plan.md` per S0 (Master Plan
Section 11-ish security baseline requirement, CLAUDE.md Section 7A). It records concrete findings, evidence, and
residual-risk state - it does not weaken or reinterpret the locked threat catalogue.

**Revision note (A0 re-audit remediation, 2026-09-10, finding A0-R2):** the external A0 re-audit rejected
tracking `TM-INF-001`'s missing runtime-guard control under a `residual_risk` footnote while still marking the
threat itself `MITIGATED / VERIFIED`. `TM-INF-001` is corrected below to `IN PROGRESS`. This document now reflects
**2** concrete `MITIGATED / VERIFIED` findings (`TM-INF-003`, `TM-INF-006`), not 3. Catalogue severity totals
(25 CRITICAL / 47 HIGH / 10 MEDIUM = 82 total) were already corrected in the prior remediation pass (finding
A0-002) and remain unchanged and correct.

## S0 summary (corrected 2026-09-10, A0-R2)

- **Total threats catalogued:** 82 (`TM-AUTH-*` 12, `TM-EVID-*` 14, `TM-LIFE-*` 12, `TM-REC-*` 8, `TM-ECON-*` 8,
  `TM-INF-*` 12, `TM-UX-*` 10, `TM-REL-*` 6).
- **Catalogue severity totals:** CRITICAL = 25, HIGH = 47, MEDIUM = 10 (verified against
  `docs/security/Threat Model & Security Assurance Plan.md` Section 11 and cross-checked against
  `docs/security/Threat Status.csv`, which is regenerated directly from that section).
- **MITIGATED / VERIFIED (concrete evidence exists now):** 2 - `TM-INF-003`, `TM-INF-006`. Both are `TM-INF-*`
  (infrastructure/toolchain) threats whose full required control is genuinely implemented and evidenced.
- **IN PROGRESS (partial control, correctly not claimed as mitigated):** 1 - `TM-INF-001`. Its required control
  has two parts ("network lock + runtime guard" per `docs/security/Threat Model & Security Assurance Plan.md`
  Section 11.6); only the network-lock half exists. See F-INF-001 below.
- **MITIGATED / UNVERIFIED (a control exists but is not yet fully automated/tested):** 2 (`TM-INF-004`,
  `TM-INF-011`).
- **OPEN (baseline, unimplemented):** 77 - the overwhelming majority, because no AssuranceKernel, Policy, Judge,
  Evidence pipeline, Vault, or frontend implementation exists yet (C1-D4 scope). Per CLAUDE.md Section 7A rule 1,
  none of these may be marked `MITIGATED` merely because a future control is *described* in documentation - and
  none are.
- **CRITICAL threats:** all 25 CRITICAL-severity threats in the catalogue remain `OPEN`; none are closed. Per
  CLAUDE.md Section 7A rule 2 and Threat Model Section 15 rule 1, **no CRITICAL threat may ever be marked
  `ACCEPTED RESIDUAL RISK` for R1** - every one must reach `MITIGATED / VERIFIED` (or, if a feature is genuinely
  removed from R1 scope, `REMOVED FROM SCOPE`) before its respective audit gate (mostly A1/A2, per
  `docs/security/Threat Status.csv`'s `audit_gate` column).
- **Implementation/test traceability (finding A0-R1):** every one of the 72 CRITICAL/HIGH threats now has a
  non-empty `implementation_refs` and `test_refs` in `Threat Status.csv`, citing the exact PLANNED file/module
  under the Implementation Specification's canonical repository structure (`contracts/assurance_kernel.py`,
  `contracts/incident_judge_v1.py`, `contracts/incentive_vault.py`, `contracts/reference_agent_protocol.py`,
  `packages/*`) and a planned test path. These are planned locations, not claims that the code or tests exist -
  the `status` column (overwhelmingly `OPEN`) remains the authoritative statement of what is actually built.

## Findings with concrete evidence (S0-verified)

### F-INF-001 - Network/chain identity threat (TM-INF-001) is only partially mitigated - status corrected to IN PROGRESS

Studio-dev chain identity (61997, distinct from stable studionet's 61999) was independently verified via four
sources at G0 (raw JSON-RPC, CLI, `genlayer-js`, `genlayer-py`) and is pinned in `toolchain/network.lock.json`.
See `release-evidence/r1/g0/network-verification.json`. This half of the control is real and verified.

**Correction (A0-R2, supersedes the A0-002 correction):** the required control for `TM-INF-001` is "network lock
**+ runtime guard**" (two parts). Only the network lock exists; no SDK/frontend code has been written at all, so
there is no runtime guard to enforce this at the application layer. A prior remediation pass kept this threat's
status as `MITIGATED / VERIFIED` and recorded the gap only in a `residual_risk` footnote - the external reviewer
correctly rejected this as insufficient: a threat whose own required control is half-missing is not
`MITIGATED / VERIFIED`, regardless of how clearly the gap is footnoted. `Threat Status.csv`'s `TM-INF-001` row is
now `IN PROGRESS`, with `control_refs` explicitly marking the lock half DONE and the guard half NOT DONE, and a
planned `implementation_refs`/`test_refs` entry for the still-missing runtime guard
(`packages/protocol-sdk/` / `tests/frontend/test_network_guard.py`, tracked jointly with `TM-UX-002`, which
remains fully `OPEN`). This threat will move to `MITIGATED / VERIFIED` only once both halves of its control are
implemented and tested.

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
