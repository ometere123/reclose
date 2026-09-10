# Security Findings

This document operationalizes `docs/security/Threat Model & Security Assurance Plan.md` per S0 (Master Plan
Section 11-ish security baseline requirement, CLAUDE.md Section 7A). It records concrete findings, evidence, and
residual-risk state - it does not weaken or reinterpret the locked threat catalogue.

## S0 summary (2026-09-10)

- **Total threats catalogued:** 82 (`TM-AUTH-*` 12, `TM-EVID-*` 14, `TM-LIFE-*` 12, `TM-REC-*` 8, `TM-ECON-*` 8,
  `TM-INF-*` 12, `TM-UX-*` 10, `TM-REL-*` 6).
- **MITIGATED / VERIFIED (concrete evidence exists now):** 4 - all `TM-INF-*` (infrastructure/toolchain), because
  G0 and F0 produced real, checkable evidence for exactly these threats before any product code exists.
- **CONTROL IN PLACE - VERIFICATION PARTIAL:** 2 (`TM-INF-004`, `TM-INF-011`) - a control exists but is not yet
  fully automated/documented.
- **OPEN - VERIFY DURING IMPLEMENTATION (baseline, unimplemented):** 76 - the overwhelming majority, because no
  AssuranceKernel, Policy, Judge, Evidence pipeline, Vault, or frontend implementation exists yet (C1-D4 scope).
  Per CLAUDE.md Section 7A rule 1, none of these may be marked `MITIGATED` merely because a future control is
  *described* in documentation - and none are.
- **CRITICAL threats:** all remain `OPEN - VERIFY DURING IMPLEMENTATION` except none are closed; per CLAUDE.md
  Section 7A rule 2, **no CRITICAL threat may ever be accepted as residual risk for R1** - all 33 CRITICAL-severity
  threats in the catalogue must reach `MITIGATED / VERIFIED` before their respective audit gate (mostly A1/A2).

## Findings with concrete evidence (S0-verified)

### F-INF-001 - Network/chain identity threat (TM-INF-001) is mitigated with reproducible evidence

Studio-dev chain identity (61997, distinct from stable studionet's 61999) was independently verified via four
sources at G0 (raw JSON-RPC, CLI, `genlayer-js`, `genlayer-py`) and is pinned in `toolchain/network.lock.json`.
See `release-evidence/r1/g0/network-verification.json`. No runtime guard code exists yet to *enforce* this at the
SDK/frontend layer (that is C3+/D-phase scope) - the current mitigation covers the toolchain/deployment layer, not
yet a running-application guard. **Residual note:** re-verify TM-INF-001 status once an SDK-level network guard is
implemented; do not assume this finding covers the eventual frontend "wrong network" UX (that is `TM-UX-002`,
still `OPEN`).

### F-INF-003 - Runner-hash drift threat (TM-INF-003) is mitigated with reproducible, sourced evidence

The G0 external-review closure investigated and resolved a real runner-hash discrepancy (compatibility record
CF-010): the S10 "current" registry snapshot hash was proven unresolvable in the actual `genvm-manager`
v0.6.0-rc3/rc4 release family Studio-dev ships, while the Studio-dev template hash was proven correct via three
independent tools. `toolchain/runner.lock` now records the exact hash plus full sourcing/rationale, directly
satisfying this threat's required control ("runner.lock + change trigger").

### F-INF-006 - Secret-exposure threat (TM-INF-006) checked, none found

An explicit repository-wide grep for private-key patterns, the generated keystore password, and generic
password/secret patterns was performed at the end of G0 and again after F0's repository-structure work. Result:
clean - no secret material found in any tracked file. `.gitignore` excludes `*.keystore.json`, `*.pem`, `*.key`,
`.env`; `.env.example` contains placeholders only. This is a point-in-time finding, not a permanent guarantee -
CI should add an automated secret scanner (e.g. gitleaks) before C1, tracked as a residual item under
`TM-INF-004`'s "CONTROL IN PLACE - VERIFICATION PARTIAL" status (dependency/CI hardening is bundled with that
threat's remaining gap).

## Architecture contradictions identified

**None.** No threat in the catalogue was found, during G0/F0/F1/S0, to expose an unresolved contradiction in the
locked architecture. All `TM-*` threats describe attacks/failure modes that the locked architecture (ADR
invariants INV-S01..S16) is explicitly designed to prevent; none of them require an architecture change to
address - they require correct implementation, which is C1+ scope.

## Rules this document must keep following (restated from CLAUDE.md Section 7A)

1. Every CRITICAL/HIGH threat must have a planned control and verification path before C1. (Satisfied: the
   catalogue itself, inherited unchanged from the locked Threat Model document, already specifies a control and
   verification path for every threat; `Threat Status.csv` tracks baseline status against that plan.)
2. CRITICAL threats cannot be accepted as residual risk for R1. (No CRITICAL threat has been marked as accepted
   residual risk here; all remain `OPEN` pending implementation, or `MITIGATED / VERIFIED` with real evidence.)
3. HIGH threats that violate a P0 requirement or locked invariant cannot be accepted. (None have been accepted.)
4. `MITIGATED / VERIFIED` requires concrete tests/evidence. (All four current `MITIGATED / VERIFIED` rows cite
   specific evidence files; none are marked from documentation alone.)
5. New attack paths discovered during implementation receive new threat IDs, never hidden in prose/commits. (None
   discovered yet at F0/S0; this rule will be exercised starting at C1.)
6. Security-related commits/tests SHOULD cite applicable `TM-*` IDs. (Followed in `Requirements Status.csv`'s
   `threat_ref` column for F0 rows touching `TM-AUTH-009` and `TM-INF-006`/`TM-INF-010`.)
7. Benchmark adversarial cases MUST map to threat IDs by H1. (Not yet applicable - benchmark is H1 scope.)
8. Audit packets at A0-A4 include threat-status deltas and security findings. (This document plus
   `Threat Status.csv` form exactly that content for the A0 packet - see `docs/execution/audit-packets/A0/`.)
