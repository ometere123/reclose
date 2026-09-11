# A2 - External C2/C3 Audit Packet (first submission)

**Status: AWAITING EXTERNAL REVIEW.** This packet was prepared by Claude Code continuing
autonomously under the repository owner's explicit "Reclose R1 Master Execution Directive"
("keep going, don't stop for permission" between implementation phases). Per that same directive
and CLAUDE.md Sections 41-42, reaching the A2 gate itself is a genuine, designated stop: only the
repository owner (or an independent reviewer they designate) may render a PASS/FAIL/CONDITIONS
decision for A2. This README and the rest of the packet do not claim one.

## What A2 is auditing

C2 (IncidentJudgeV1, IncentiveVault, live Studio-dev proof) and C3 (protocol-sdk real
implementation, policy-compiler, evidence-builder, transaction-tracker, CLI, Sentinel,
fee-profiling automation, deployment automation, operations runbook), building on the C1-FINAL
foundation that A1 covered.

## Exact commit submitted for review

```text
ae3a5083e1db805c3fa6692a11661d06e6679ec7
```

on branch `claude/r1-tooling`, branched from `claude/r1-consensus` at commit `205dff3` (C2 close).

## What was implemented

**C2** (`contracts/incident_judge_v1.py`, `contracts/incentive_vault.py`, plus new Kernel read
views in `contracts/assurance_kernel.py`):
- IncidentJudgeV1 - real semantic adjudicator for the four governed R1 rule families, with
  deterministic EAP precheck, `gl.eq_principle.strict_eq` nondeterministic judgment (real web
  fetch + real LLM call inside the re-executed closure), strict per-rule condition-code registry.
- IncentiveVault - bond/target-bounty-pool/settle/claim/reclaim, zero target-control authority.
- Kernel deterministic read views for the Judge, plus C3-added policy enumeration views
  (`get_policy_counts`/`get_policy_resource_at`/`get_policy_rule_id_at`/`get_policy_effect_at`).

**C3** (`packages/`):
- `@reclose/protocol-sdk` - real `mapRawTransaction`/`isSafeToResubmit` lifecycle-mapping logic
  (previously type-only since A0-T1).
- `@reclose/policy-compiler` - compiles a policy manifest into the exact ordered Kernel write-call
  sequence, with client-side validation mirroring the Kernel's own checks.
- `@reclose/evidence-builder` - builds/validates the EAP JSON string, porting
  `IncidentJudgeV1._valid_source_url`/`_parse_and_validate_eap`'s bounds to TypeScript.
- `@reclose/transaction-tracker` - tracks GenLayer transactions and their triggered children
  through the lifecycle; pluggable persistence.
- `@reclose/cli` (`reclose` executable) - `policy compile`, `evidence build`, `tx track`.
- `@reclose/sentinel` - deterministic candidate-condition source monitoring + EAP building; no
  submission/signing capability.
- `scripts/fee-profile.mjs` - fee-profiling automation (CLAUDE.md Section 34).
- `scripts/studio-dev-deploy.sh` - deployment automation with bounded retry on confirmed-transient
  RPC connectivity errors only.
- `docs/execution/Operations Runbook.md` - first operational reference tying all of the above
  together for real Studio-dev use.

## What was NOT implemented (explicitly out of C2/C3 scope)

Frontend/product surfaces (D1-D4/I1-I2), benchmark (H1), a standing Sentinel daemon process
(library-level `SentinelMonitor` exists; a cron/service wrapper does not yet).

## Verification performed

- Full Direct Mode Python test suite: 185/185 passing (up from 182 at A1), including the full
  Judge/Vault test matrix and a new Kernel policy-enumeration-view test.
- `genvm-lint` clean on every changed/new contract.
- `npm run verify:js`: green, including 6 new/extended test scripts (lifecycle, policy-compiler,
  evidence-builder, transaction-tracker, CLI, Sentinel - 54 new JS/TS tests total across those six).
- **Live deployment to Studio-dev (chain 61997)**: full fresh C2 contract stack deployed, wired,
  and a real policy built/sealed/activated - see `deployment-evidence.md`.
- **Live C2/C3 proof, including a materially corrected finding**: IncidentJudgeV1's deterministic
  precheck, real web fetch, and real `eq_principle` LLM judgment are now proven live end-to-end
  (not just up to dispatch, as A2's first attempt found) - see `known-limitations.md` and
  `docs/execution/C2 Live Proof Evidence.md` for the full, honestly-narrowed characterization of
  the one remaining open finding (a fee-allocation-routing gap on the Judge->Kernel dispatch's
  triggered child transaction, not a rollback of the Judge's own execution).

## Packet contents

```text
docs/execution/audit-packets/A2/
├── README.md                    (this file)
├── scope.md                     (what changed since A1, and why C2+C3 are bundled into one gate)
├── commands-and-results.md      (verification commands and their results)
├── deployment-evidence.md       (live Studio-dev deployment summary + addresses/tx hashes)
├── requirements.csv             (156 locked RTM IDs, snapshot at the audit target commit)
├── threat-status.csv            (82 locked TM-* IDs, snapshot at the audit target commit)
├── known-limitations.md         (honest list of what remains unverified or out of scope)
└── file-manifest.txt            (full tracked-file listing at the audit target commit)
```
