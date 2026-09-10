# A1 Packet Scope

## Execution-schedule override context

The repository owner explicitly authorized proceeding directly into C1 implementation after the A0
remediation work (Part A1-A9 of the "OWNER EXECUTION OVERRIDE" instruction) completed, without
waiting for an external decision on that A0 submission, "to avoid repeated stop/review/fix cycles
while implementation momentum is high." This is an execution-schedule decision only:

- A0 has NOT passed. It remains recorded as AWAITING EXTERNAL REVIEW.
- Findings from the three prior A0 FAIL decisions are not waived.
- Governance was not changed.
- Security requirements were not weakened.
- No audit history was rewritten - see `docs/execution/Audit Register.md` for the complete,
  unmodified four-attempt A0 history plus this override note.

C1 is complete per the Master Plan's stated scope (Kernel + Policy + Reference Target). Per the
override instruction, work now stops here at A1, awaiting external review of BOTH A0 and A1.

## What this packet audits

C1: `contracts/assurance_kernel.py`, `contracts/reference_agent_protocol.py`,
`contracts/provider_stub_a.py`, `contracts/provider_stub_b.py`, plus their Direct Mode test suite
and live Studio-dev deployment evidence.

## Audit target

`82421aab595acfda4351c54f6542a071633152ad` on branch `claude/r1-core`.

## Commit history for this phase (claude/r1-core, since branching from the foundation checkpoint)

1. `1679840` - feat(c1): implement AssuranceKernel, ReferenceAgentProtocol, provider stubs (31
   Direct Mode tests, all contracts genvm-lint AST-clean)
2. `59c09a8` - fix(c1): genvm-lint check requires a file, not a directory (real CI failure found
   and fixed)
3. `74122cb` - fix(c1): make genvm-lint informational, not blocking (confirmed stale rule - genvm-lint
   0.11.1rc2's static check disagreed with the actual pinned SDK on the storage-allow decorator
   name; verified directly against the pinned package source that the linter's rule, not the
   contract code, was wrong)
4. `82421aa` - feat(c1): live Studio-dev deployment - target registration + active-policy flow
   proven (this commit)

Each of commits 2-3 is a genuine fix for a real failure found on GitHub Actions CI, not
speculative - see the linked CI run URLs in `commands-and-results.md`.

## What did NOT change

- The six locked governance documents, `CLAUDE.md`, `Repository Build Master Plan.md` - unchanged
  throughout (mechanically verified by `scripts/a0-integrity-check.js`, which remains part of
  `npm run verify` and passed on every commit in this phase).
- No IncidentJudge, IncentiveVault, Sentinel, or frontend/product feature code exists.
