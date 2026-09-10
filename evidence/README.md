# evidence/

Evidence Artifact Package (EAP) schemas, builders, and fixtures for Reporter/Sentinel evidence submission.
Evidence is always treated as hostile/untrusted data (CLAUDE.md Section 15). Schemas live under
`schemas/evidence/` and are consumed by `docs/execution/Frontend Contract v1.md`'s evidence/source representation
types.

No evidence-builder implementation exists yet as of F0/F1 - that is C2 scope (Judge + Evidence). F1 defines the
stable shape only.
