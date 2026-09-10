# Frontend Contract Review (A0, F1-v3)

Independent cross-check of `docs/execution/Frontend Contract v1.md` (now version F1-v3) against
governance, addressing finding A0-R3 (the remaining findings from the second review, A0-003/A0-004/
A0-005/A0-008, were accepted as closed and are not re-litigated here).

## A0-R3: DecisionRecord.reporter made canonical/required

**Before (F1-v2):** `reporter: `0x${string}` | null` - optional and nullable, with a comment claiming
"null for decisions with no originating Reporter (e.g. a system-initiated recovery validation check)".

**Finding:** Master Design Package Section 21 lists the canonical DecisionRecord field set as:

```text
schemaVersion, incidentId, targetId, policyHash, policyVersion, ruleId, affectedResource,
evidenceHash, reporter, outcome, conditionCode, reasonCodes, judgeModule, judgeVersion,
decisionStage, generatedAt
```

`reporter` appears as a plain field with no null/optional annotation anywhere in that list, and no
other locked governance document (ADR, Implementation Specification) documents a system-initiated
exception. The F1-v2 nullable treatment was Claude's own invented convenience, not a governed
decision - exactly the class of error the reviewer flagged.

**After (F1-v3):** `schemas/incident/DecisionRecord.schema.json` now requires `reporter` and types it
as `{ "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" }` (no `null` in the type union, and `reporter`
added to the `required` array). The Frontend Contract's TypeScript projection matches:
`reporter: `0x${string}`;` with no `| null`. Every governed rule family, including
`RECOVERY_VALIDATED_V1`, is now modeled as always having a submitting Reporter address (which may be
the target owner/operator acting as their own Reporter for a remediation/recovery submission).

**Fixture impact:** none required. All four `decision-*.json` fixtures and all three
`decision-view-*.json` fixtures already used a concrete, non-null `reporter` address
(`0x5555555555555555555555555555555555555555`) - re-validated with `npm run schema:validate` (40/40
still pass) after the schema tightened, confirming no fixture was relying on the now-removed null case.

## Verification

- `git show fef26f2:schemas/incident/DecisionRecord.schema.json` - `reporter` present in `required`,
  typed as a plain (non-null) string.
- `git show fef26f2:"docs/execution/Frontend Contract v1.md"` Section 1.6 - TypeScript projection
  matches.
- `docs/execution/Interface Change Log.md` - F1-v2 -> F1-v3 entry present with rationale and commit
  reference.
