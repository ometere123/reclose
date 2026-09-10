# A1 - External Core Architecture / Security Audit Packet (first submission)

**Status: AWAITING EXTERNAL REVIEW.** This packet was prepared by Claude Code under an explicit
repository-owner execution-schedule override (see `docs/execution/Audit Register.md`) authorizing
C1 implementation to proceed before an external decision on the A0 remediation submission was
received. This override does NOT constitute an A0 or A1 PASS - only the repository owner (or an
independent reviewer they designate) may render either decision, per CLAUDE.md Sections 41-42.

## What A1 is auditing

C1 - Kernel + Policy + Reference Target, building on the (not yet externally decided) A0-remediated
F0/F1/S0 foundation.

## Exact commit submitted for review

```text
82421aab595acfda4351c54f6542a071633152ad
```

on branch `claude/r1-core`, branched from the A0-remediated foundation checkpoint
`70a688924923ec3f81d82e19c727502ac57329bb` (the same commit `Current Phase.md` on
`claude/r1-foundation` records as that checkpoint's full SHA - confirmed identical via
`git merge-base claude/r1-foundation claude/r1-core`).

## What was implemented

- `contracts/assurance_kernel.py` - AssuranceKernel (Implementation Specification Sections 16-29)
- `contracts/reference_agent_protocol.py` - ReferenceAgentProtocol (Sections 45-49)
- `contracts/provider_stub_a.py`, `contracts/provider_stub_b.py` - minimal provider stubs

## What was NOT implemented (explicitly out of C1 scope)

IncidentJudge, IncentiveVault, Sentinel, frontend/product features (C2+ scope per the Master Plan).

## Verification performed

- 31 executable Direct Mode tests (genlayer-test 0.30.0rc2), 31/31 passing, independently confirmed
  on real GitHub Actions Linux CI (not just local WSL) - see `commands-and-results.md`.
- All 4 contracts pass genvm-lint's AST-based safety lint (informational only for one specific
  confirmed-stale rule - see `known-limitations.md`).
- **Live deployment to Studio-dev (chain 61997)**: all four contracts deployed and FINALIZED; the
  Master Plan's stated C1 minimum ("at least one real target registration and active-policy flow on
  61997") is proven on-chain - see `deployment-evidence.md`.

## Packet contents

```text
docs/execution/audit-packets/A1/
├── README.md                    (this file)
├── scope.md                     (what changed since A0, and the override context)
├── commands-and-results.md      (verification commands and their results)
├── deployment-evidence.md       (live Studio-dev deployment summary + addresses/tx hashes)
├── requirements.csv             (156 locked RTM IDs, snapshot at the audit target commit)
├── threat-status.csv            (82 locked TM-* IDs, snapshot at the audit target commit)
├── known-limitations.md         (honest list of what remains unverified or out of scope)
├── evidence-index.md            (map of every evidence artifact this packet relies on)
└── file-manifest.txt            (full tracked-file listing at the audit target commit)
```
