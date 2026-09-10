# Security Findings

This document operationalizes `docs/security/Threat Model & Security Assurance Plan.md` per S0 (Master Plan
Section 11-ish security baseline requirement, CLAUDE.md Section 7A). It records concrete findings, evidence, and
residual-risk state - it does not weaken or reinterpret the locked threat catalogue.

**Revision note (A0 remediation, 2026-09-10):** this document was corrected after external A0 review (finding
A0-002) identified that the original catalogue-severity summary below was wrong (it stated 33 CRITICAL where the
actual locked catalogue contains 25 CRITICAL / 47 HIGH / 10 MEDIUM = 82 total) and that it claimed 4 concrete
`MITIGATED / VERIFIED` findings while only describing 3. Both are fixed below. `docs/security/Threat Status.csv`
was independently regenerated from the locked catalogue and its severity counts are authoritative; this document's
counts are cross-checked against it and must always agree.

## S0 summary (corrected 2026-09-10)

- **Total threats catalogued:** 82 (`TM-AUTH-*` 12, `TM-EVID-*` 14, `TM-LIFE-*` 12, `TM-REC-*` 8, `TM-ECON-*` 8,
  `TM-INF-*` 12, `TM-UX-*` 10, `TM-REL-*` 6).
- **Catalogue severity totals (verified against `docs/security/Threat Model & Security Assurance Plan.md` Section
  11 and cross-checked by regenerating `Threat Status.csv` directly from that section): CRITICAL = 25, HIGH = 47,
  MEDIUM = 10.** (The previous version of this document incorrectly stated 33 CRITICAL; that number did not match
  the catalogue and has been removed.)
- **MITIGATED / VERIFIED (concrete evidence exists now):** 3 - `TM-INF-001`, `TM-INF-003`, `TM-INF-006`, all
  `TM-INF-*` (infrastructure/toolchain), because G0 and F0 produced real, checkable evidence for exactly these
  threats before any product code exists. (The previous version of this document said "4" but only described 3
  findings below; this was an internal inconsistency, now fixed - see F-INF-001, F-INF-003, F-INF-006 below, and
  no fourth finding.) Note also that `TM-INF-001`'s `MITIGATED / VERIFIED` status covers only the
  toolchain/deployment-layer half of its required control (network lock); the SDK/frontend runtime-guard half of
  the same control does not exist yet and remains tracked as open work under `TM-UX-002`.
- **MITIGATED / UNVERIFIED (a control exists but is not yet fully automated/tested):** 2 (`TM-INF-004`,
  `TM-INF-011`) - corrected from the previously used non-enum status value
  `CONTROL IN PLACE - VERIFICATION PARTIAL`, which is not one of the seven statuses allowed by
  `docs/security/Threat Model & Security Assurance Plan.md` Section 15
  (`OPEN`, `IN PROGRESS`, `MITIGATED / UNVERIFIED`, `MITIGATED / VERIFIED`, `ACCEPTED RESIDUAL RISK`,
  `REMOVED FROM SCOPE`, `BLOCKED`).
- **OPEN (baseline, unimplemented):** 77 - the overwhelming majority, because no AssuranceKernel, Policy, Judge,
  Evidence pipeline, Vault, or frontend implementation exists yet (C1-D4 scope). Per CLAUDE.md Section 7A rule 1,
  none of these may be marked `MITIGATED` merely because a future control is *described* in documentation - and
  none are.
- **CRITICAL threats:** all 25 CRITICAL-severity threats in the catalogue remain `OPEN`; none are closed. Per
  CLAUDE.md Section 7A rule 2 and Threat Model Section 15 rule 1, **no CRITICAL threat may ever be marked
  `ACCEPTED RESIDUAL RISK` for R1** - every one must reach `MITIGATED / VERIFIED` (or, if a feature is genuinely
  removed from R1 scope, `REMOVED FROM SCOPE`) before its respective audit gate (mostly A1/A2, per
  `docs/security/Threat Status.csv`'s `audit_gate` column).

## Findings with concrete evidence (S0-verified)

### F-INF-001 - Network/chain identity threat (TM-INF-001) is partially mitigated with reproducible evidence

Studio-dev chain identity (61997, distinct from stable studionet's 61999) was independently verified via four
sources at G0 (raw JSON-RPC, CLI, `genlayer-js`, `genlayer-py`) and is pinned in `toolchain/network.lock.json`.
See `release-evidence/r1/g0/network-verification.json`.

**Correction (A0-002):** the required control for `TM-INF-001` is "network lock **+ runtime guard**" (two parts).
Only the network lock exists. No runtime guard code exists yet to *enforce* this at the SDK/frontend layer (that
is C3+/D-phase scope) - the current mitigation covers only the toolchain/deployment layer, not a running-application
guard. This finding's status column in `Threat Status.csv` is `MITIGATED / VERIFIED` for the lock half only, with
an explicit `residual_risk` note recording that the runtime-guard half is still open and is tracked under
`TM-UX-002` (frontend wrong-network detection), which remains fully `OPEN`. Do not treat this finding as covering
the eventual frontend "wrong network" UX.

### F-INF-003 - Runner-hash drift threat (TM-INF-003) is mitigated with reproducible, sourced evidence

The G0 external-review closure investigated and resolved a real runner-hash discrepancy (compatibility record
CF-010): the S10 "current" registry snapshot hash was proven unresolvable in the actual `genvm-manager`
v0.6.0-rc3/rc4 release family Studio-dev ships, while the Studio-dev template hash was proven correct via three
independent tools. `toolchain/runner.lock` now records the exact hash plus full sourcing/rationale, directly
satisfying this threat's required control ("runner.lock + change trigger").

### F-INF-006 - Secret-exposure threat (TM-INF-006) checked, none found

An explicit repository-wide grep for private-key patterns, the generated keystore password, and generic
password/secret patterns was performed at the end of G0, again after F0's repository-structure work, and again
during this A0 remediation pass. Result: clean - no secret material found in any tracked file. `.gitignore`
excludes `*.keystore.json`, `*.pem`, `*.key`, `.env`; `.env.example` contains placeholders only. This is a
point-in-time finding, not a permanent guarantee - CI should add an automated secret scanner (e.g. gitleaks)
before C1, tracked as a residual item under `TM-INF-004`'s `MITIGATED / UNVERIFIED` status (dependency/CI
hardening is bundled with that threat's remaining gap).

## Architecture contradictions identified

**None.** No threat in the catalogue was found, during G0/F0/F1/S0/A0, to expose an unresolved contradiction in
the locked architecture. All `TM-*` threats describe attacks/failure modes that the locked architecture (ADR
invariants INV-S01..S16) is explicitly designed to prevent; none of them require an architecture change to
address - they require correct implementation, which is C1+ scope.

## Rules this document must keep following (restated from CLAUDE.md Section 7A)

1. Every CRITICAL/HIGH threat must have a planned control and verification path before C1. (Satisfied: the
   catalogue itself, inherited unchanged from the locked Threat Model document, already specifies a control and
   verification path for every threat; `Threat Status.csv` now also carries an explicit `requirement_refs` mapping
   from every threat to at least one locked RTM/PRD ID, per A0-002.)
2. CRITICAL threats cannot be accepted as residual risk for R1. (No CRITICAL threat has been marked as accepted
   residual risk here; all 25 remain `OPEN`, or `MITIGATED / VERIFIED` with real evidence for the 3 above.)
3. HIGH threats that violate a P0 requirement or locked invariant cannot be accepted. (None have been accepted.)
4. `MITIGATED / VERIFIED` requires concrete tests/evidence. (All 3 current `MITIGATED / VERIFIED` rows cite
   specific evidence files; none are marked from documentation alone.)
5. New attack paths discovered during implementation receive new threat IDs, never hidden in prose/commits. (None
   discovered yet at F0/S0/A0; this rule will be exercised starting at C1.)
6. Security-related commits/tests SHOULD cite applicable `TM-*` IDs. (Followed in `Requirements Status.csv`'s and
   `Gate Verification Status.csv`'s `threat_ref` columns.)
7. Benchmark adversarial cases MUST map to threat IDs by H1. (Not yet applicable - benchmark is H1 scope.)
8. Audit packets at A0-A4 include threat-status deltas and security findings. (This document plus
   `Threat Status.csv` form exactly that content for the A0 packet - see `docs/execution/audit-packets/A0/`.)
