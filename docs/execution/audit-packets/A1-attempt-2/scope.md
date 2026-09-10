# Scope (A1 Attempt 2)

## Authorization

This pass was performed under an explicit owner-authorised instruction ("C1R: Core Hardening,
Architectural Correction, and Live-Proof Closure") that:

- treated A1 attempt 1 (`82421aa`) as FAIL based on the owner's external review findings
  (A1-H01..A1-H12);
- treated the current A0 submission as not accepted, citing three foundation/interface findings
  (A0-U01..A0-U03);
- authorised NARROW governance corrections (EffectRecord rule-binding, judge_version binding,
  PolicyHeader.sealed_at, receive_decision policy-identity binding, release_phase semantics
  correction, ActionEnvelope.boundedParameters restoration, F1 SDK exact-signature parity) -
  explicitly NOT a general re-opening of the six locked governance documents;
- did NOT authorise C2 (IncidentJudgeV1, IncentiveVault, Sentinel, frontend, production SDK
  network implementation beyond fee/deployment proof).

## Branch and commit history

Started from the verified remote HEAD of `claude/r1-core` (`4691d58c60d1bd71145adf489fcf9743297eaadb`,
matching `origin/claude/r1-core`). Created `claude/r1-core-hardening`. No force-push, no amend, no
rebase. Seven commits, in the required logical order:

1. `6f4bcb8` - audit/governance/interface correction (A0-U01/U02/U03)
2. `4bb0a94` - Kernel data-model/security correction (A1-H01..H09,H11,H12)
3. `c574550` - target hardening (ReferenceAgentProtocol defense-in-depth) + narrow genvm-lint waiver (A1-H10)
4. `d641cc8` - adversarial/model tests (independent reference model + trace tests)
5. `3519db0` - CI fix (genvm-lint wrapper header-line bug, caught by real GitHub Actions)
6. `4fc2599` - two CLI-arg-encoding bugs found and fixed during live deployment
7. `55ee2cb` - live deployment/proof evidence

This packet's audit target is commit 7 (`55ee2cb`).

## What changed vs. attempt 1

Every item in `findings-closure.md`. In one sentence: the Kernel's data model and security
routing were substantially rebuilt (rule-scoped effects, trusted-only time, a real
authority-expansion classifier, enforced overlays, canonical identifier/hash validation, strict
receive_decision binding), an independent reference-model test layer was added, the genvm-lint
waiver was narrowed to the one confirmed-stale diagnostic, and a fresh contract set was deployed
live to Studio-dev with a materially deeper (though still incomplete) cross-contract dispatch
proof.

## What did NOT change

- The six locked governance documents (only the narrow authorised corrections listed above were
  made, all recorded in `docs/execution/Interface Change Log.md`).
- `ProviderStubA`/`ProviderStubB` contract source (unchanged since `1679840`; only redeployed
  fresh alongside the hardened Kernel/target).
- C2 scope: no `IncidentJudgeV1`, `IncentiveVault`, Sentinel, or frontend code exists.
- The prior C1 deployment (`deployment/61997/c1-manifest.json`) and A1 attempt 1 packet
  (`docs/execution/audit-packets/A1/`) - both preserved untouched as historical evidence.
