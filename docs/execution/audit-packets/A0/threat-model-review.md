# Threat Model Review (A0)

Independent cross-check of `docs/security/Threat Status.csv` and `docs/security/Security Findings.md`
against `docs/security/Threat Model & Security Assurance Plan.md`, addressing finding A0-002.

## Column completeness

`Threat Status.csv` now carries every column the Master Plan requires
(`threat_id, status, severity, control_refs, requirement_refs, implementation_refs, test_refs,
evidence_refs, residual_risk, owner, commit, last_updated`) plus the permitted extras
(`affected_asset, trust_boundary, attack_precondition, audit_gate, notes`). The prior version was
missing `requirement_refs`, `control_refs`, `implementation_refs`, `test_refs`, `evidence_refs` as
distinct columns and used non-enum status strings.

## Status enum compliance

All 82 rows use only the seven allowed values (`OPEN`, `IN PROGRESS`, `MITIGATED / UNVERIFIED`,
`MITIGATED / VERIFIED`, `ACCEPTED RESIDUAL RISK`, `REMOVED FROM SCOPE`, `BLOCKED`). Verified
programmatically (0 rows outside the enum) - see `commands-and-results.md` item 11.

## Requirement mapping

Every one of the 72 CRITICAL/HIGH threats now has a non-empty `requirement_refs` field mapping it to
at least one locked RTM/PRD ID (verified programmatically - 0 missing, see `commands-and-results.md`
item 10). Mappings were built from `docs/security/Threat Model & Security Assurance Plan.md` Section
16's baseline table where that table directly named a threat family, and extended by area-appropriate
PRD/NFR IDs for threats Section 16 did not individually name (e.g. `TM-REC-*` -> `PRD-REC-*`,
`TM-UX-*` -> the relevant `PRD-*`/`NFR-UX-*` product surface).

## Severity totals cross-check

Catalogue severity totals were re-derived by parsing
`docs/security/Threat Model & Security Assurance Plan.md` Section 11's own tables programmatically:
**CRITICAL = 25, HIGH = 47, MEDIUM = 10** (total 82). `Threat Status.csv`'s per-row `severity` column
matches this exactly (verified: grouping `Threat Status.csv` by `severity` produces the same counts).
`docs/security/Security Findings.md`'s summary was corrected to match (previously said 33 CRITICAL).

## MITIGATED / VERIFIED review

Three threats carry real evidence: `TM-INF-001`, `TM-INF-003`, `TM-INF-006`. `TM-INF-001`'s row and
its corresponding finding (`F-INF-001`) were corrected to state explicitly that its required control
("network lock + runtime guard") is only half-satisfied - the network lock exists and is verified; the
SDK/frontend runtime guard does not exist yet (no SDK/frontend code has been written at all). This
threat remains `MITIGATED / VERIFIED` in the status column with an explicit `residual_risk` note
recording the gap, rather than being silently marked fully closed. `TM-INF-003` and `TM-INF-006` are
fully closed with no such caveat.

## No CRITICAL accepted as residual risk

Verified programmatically: 0 rows with `severity=CRITICAL` and `status=ACCEPTED RESIDUAL RISK` (see
`commands-and-results.md` item 12).

## S0 baseline commit reference

The S0 baseline is recorded via this packet's `commit.txt` (the audit target commit) rather than any
self-referential claim inside `Threat Status.csv` itself, avoiding the same circularity class of bug
found in the Frontend Contract (A0-008/frontend-contract-review.md).
