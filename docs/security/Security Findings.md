# Security Findings

This document operationalizes `docs/security/Threat Model & Security Assurance Plan.md` per S0 (Master Plan
Section 11-ish security baseline requirement, CLAUDE.md Section 7A). It records concrete findings, evidence, and
residual-risk state - it does not weaken or reinterpret the locked threat catalogue.

**Revision note (A0 final remediation, 2026-09-10, Part A7):** external review correctly rejected calling
`TM-INF-001` `MITIGATED / VERIFIED` merely because the runtime-guard helper function exists and passes a unit
test - a unit test proves the function is correct in isolation, not that it is actually invoked on every live
network call once an integrated SDK/E2E path exists (none does yet, C1+ scope). `TM-INF-001` is corrected below
from `MITIGATED / VERIFIED` to `MITIGATED / UNVERIFIED`. The narrower `NFR-CMP-001` requirement, whose own
acceptance criterion ("network preflight fails if chain ID != 61997") is satisfied by the unit-level guard+test
alone, correctly remains `VERIFIED` - the two are not the same claim. This document now reflects **2** concrete
`MITIGATED / VERIFIED` findings (`TM-INF-003`, `TM-INF-006`) and **3** `MITIGATED / UNVERIFIED` findings
(`TM-INF-001`, `TM-INF-004`, `TM-INF-011`). All counts below are computed directly from
`docs/security/Threat Status.csv` (82 rows) rather than hand-maintained.

## S0 summary (corrected 2026-09-10, A0 final remediation)

- **Total threats catalogued:** 82 (`TM-AUTH-*` 12, `TM-EVID-*` 14, `TM-LIFE-*` 12, `TM-REC-*` 8, `TM-ECON-*` 8,
  `TM-INF-*` 12, `TM-UX-*` 10, `TM-REL-*` 6).
- **Catalogue severity totals:** CRITICAL = 25, HIGH = 47, MEDIUM = 10 (verified against
  `docs/security/Threat Model & Security Assurance Plan.md` Section 11 and cross-checked against
  `docs/security/Threat Status.csv`, which is regenerated directly from that section).
- **MITIGATED / VERIFIED (concrete evidence exists now):** 2 - `TM-INF-003` (HIGH), `TM-INF-006` (CRITICAL). Both
  are `TM-INF-*` (infrastructure/toolchain) threats whose full required control is genuinely implemented,
  evidenced, AND exercised in the actual verification/CI path they claim to protect.
- **MITIGATED / UNVERIFIED (a control exists but is not yet fully integration/E2E-proven or automated in the
  path it protects):** 3 - `TM-INF-001` (unit-tested runtime guard, not yet exercised in an integrated SDK/E2E
  network call - see F-INF-001 below), `TM-INF-004`, `TM-INF-011`.
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

### F-INF-001 - Network/chain identity threat (TM-INF-001) - MITIGATED / UNVERIFIED (unit-proven, not integration-proven)

Studio-dev chain identity (61997, distinct from stable studionet's 61999) was independently verified via four
sources at G0 (raw JSON-RPC, CLI, `genlayer-js`, `genlayer-py`) and is pinned in `toolchain/network.lock.json`.
See `release-evidence/r1/g0/network-verification.json`. This half of the control is real and verified.

**History:** the required control for `TM-INF-001` is "network lock **+ runtime guard**" (two parts). Two prior
remediation passes each overclaimed this threat - first `MITIGATED / VERIFIED` while the runtime guard did not
exist at all (corrected to `IN PROGRESS`, A0-R2), then `MITIGATED / VERIFIED` again once a unit-tested guard
function existed (`packages/protocol-sdk/src/networkGuard.ts` + `scripts/test-network-guard.js`) - which external
review also rejected: a helper function passing a unit test in isolation does not prove the guard is actually
invoked on every live network call, because no integrated SDK/E2E network path exists yet to invoke it on (C1+
scope). "The complete threat is fully verified merely because the helper exists" is exactly the overclaim pattern
this finding now documents and corrects.

**Current status (A0 final remediation, Part A7):** `TM-INF-001` is `MITIGATED / UNVERIFIED`. The guard's logic
is implemented and unit-tested; what remains unverified is its integration into an actual call path. This will
move to `MITIGATED / VERIFIED` only once a C1+ SDK/E2E flow exercises the guard against a real (or realistically
simulated) wrong-network condition. The narrower `NFR-CMP-001` requirement, whose own acceptance criterion is
satisfied by the unit-level guard+test alone, correctly remains `VERIFIED` in `Requirements Status.csv` - it is a
narrower, already-satisfied claim, not the same claim as the broader threat's full mitigation. `TM-UX-002`
separately tracks the UX-surface concern of displaying wrong-network state to a user once a frontend exists, and
remains `OPEN`.

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
