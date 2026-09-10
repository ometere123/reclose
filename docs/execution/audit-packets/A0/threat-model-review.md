# Threat Model Review (A0, second remediation pass)

Independent cross-check of `docs/security/Threat Status.csv` and `docs/security/Security Findings.md`
addressing findings A0-R1 and A0-R2 (A0-002's column/enum/severity-count work from the first
remediation pass was accepted as closed and is not re-litigated here).

## A0-R1: implementation/test traceability completeness

At the second submission, `Threat Status.csv` had correct IDs and `requirement_refs` mappings, but 68
of the 72 CRITICAL/HIGH threats had blank `implementation_refs` and `test_refs`. The Master Plan
requires every CRITICAL/HIGH threat to have a planned control, implementation location, verification
path, audit gate, and requirement mapping - "planned" explicitly meaning these are S0-stage plans, not
claims that code or tests exist yet.

**Fix:** every one of the 72 CRITICAL/HIGH threats now has both fields populated, citing:

- an `implementation_refs` location under the Implementation Specification's canonical repository
  structure (Section 7: `contracts/assurance_kernel.py`, `contracts/incident_judge_v1.py`,
  `contracts/incentive_vault.py`, `contracts/reference_agent_protocol.py`, `packages/policy-compiler/`,
  `packages/evidence-builder/`, `packages/protocol-sdk/`, `packages/transaction-tracker/`, or - for
  already-G0-verified infrastructure threats - the actual existing `toolchain/`/`.github/` files);
- a `test_refs` planned path under a consistent test-tree convention (`tests/kernel/`, `tests/judge/`,
  `tests/vault/`, `tests/lifecycle/`, `tests/recovery/`, `tests/economics/`, `tests/infra/`,
  `tests/frontend/`) - this convention is Claude's own reasonable choice, since the Implementation
  Specification names `contracts/` modules but does not itself enumerate `tests/` subdirectories; it is
  consistent with the test categories CLAUDE.md Section 36 requires.

Verified programmatically: 72/72 CRITICAL/HIGH threats have non-empty `implementation_refs` AND
`test_refs` (0 missing) - see `commands-and-results.md` item 9.

**Reverse mapping:** `docs/execution/Requirements Status.csv`'s `threat_ref` column now carries the
reverse mapping for every requirement referenced by at least one threat - 70 requirement rows,
including all `NFR-SEC-*` rows, so traceability works in both directions as required.

## A0-R2: TM-INF-001 status correction

At the second submission, `TM-INF-001` was `MITIGATED / VERIFIED` with a `residual_risk` note
explaining that the required control's runtime-guard half was missing. The reviewer correctly rejected
this: `TM-INF-001`'s locked required control is "network lock + runtime guard" (two parts) - a threat
whose own required control is half-missing cannot be `MITIGATED / VERIFIED` regardless of how clearly
a footnote records the gap.

**Fix:** `TM-INF-001` is now `IN PROGRESS`. Its `control_refs` field explicitly marks the lock half
DONE and the guard half NOT DONE; its `implementation_refs`/`test_refs` describe the still-missing
planned runtime guard (`packages/protocol-sdk/` / `tests/frontend/test_network_guard.py`, tracked
jointly with `TM-UX-002`, which remains fully `OPEN`). `docs/security/Security Findings.md` was
updated to match: 2 concrete `MITIGATED / VERIFIED` findings now (`TM-INF-003`, `TM-INF-006`), not 3.

Verified programmatically: `TM-INF-001.status === "IN PROGRESS"`; the `MITIGATED / VERIFIED` set is
exactly `{TM-INF-003, TM-INF-006}` - see `commands-and-results.md` item 10.

## Unchanged from the first remediation pass (accepted as closed)

- Column completeness (`control_refs`, `requirement_refs`, `implementation_refs`, `test_refs`,
  `evidence_refs`, `residual_risk`, `owner`, `commit`, `last_updated` plus permitted extras).
- Status enum compliance (only the seven allowed values).
- Severity totals (CRITICAL=25, HIGH=47, MEDIUM=10, matching the locked catalogue exactly).
- 0 CRITICAL threats marked `ACCEPTED RESIDUAL RISK`.
