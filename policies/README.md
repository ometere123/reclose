# policies/

Versioned, sealed Reclose policy artifacts (explicit, immutable-once-sealed; see CLAUDE.md Section 13 and
Implementation Specification). Each policy version is stored as its own file; no edit-in-place after sealing.

Schemas for policy documents and policy security diffs live under `schemas/policy/` and are consumed by
`docs/execution/Frontend Contract v1.md`'s `PolicySummary`/`PolicyDetail`/`PolicySecurityDiff` types.

No policy artifacts exist yet as of F0/F1 - policy authoring is C1 scope. F1 defines the stable shape only.
