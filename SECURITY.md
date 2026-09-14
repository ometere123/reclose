# Security policy

Reclose is an R1 reference implementation for bounded runtime assurance. It is not a production security certification. The protocol separates semantic judgment from execution authority: IncidentJudgeV1 evaluates governed evidence, AssuranceKernel checks the active policy and target binding, and a registered target exposes a finite typed action interface.

## Reporting a vulnerability

Do not publish exploit details or send secrets in an issue. Contact the repository owner through a private channel associated with the project, include the affected commit, contract/package, reproduction steps, and impact, and allow time to validate and coordinate a fix. This repository currently has no published bounty or guaranteed response-time commitment.

## Security properties and limits

- Reporters provide evidence and do not select policy effects.
- Kernel effects are finite and policy-bound; arbitrary calldata execution is not part of the canonical action envelope.
- Policy authority expansion is timelocked; reductions can take effect immediately.
- Evidence snapshots require an immutable reference and independently fetched content bound to the declared hash.
- Decision, transaction finality, child execution, and target post-state are separate facts.
- The full live incident and recovery lifecycle is not yet proven. Studio-dev's accepted-message simulation limitation blocks Run A before incident submission; see `release-evidence/r1/diagnostics/accepted-message-repro/`.
- Threat and requirements ledgers are not fully reconciled. No external audit PASS or production-readiness claim is made.

## Supported release boundary

The current evidence target is GenLayer Studio-dev, chain ID 61997. Stable Studionet 61999 and production systems are outside this R1 proof. Use pinned dependencies and run the repository verification before deploying. Never place keystores, private keys, passwords, wallet exports, or unredacted validator configuration in issues or commits.

For deployment-specific concerns see [Operations Deployment Recovery Runbook](docs/execution/Operations%20Deployment%20Recovery%20Runbook.md), and for current status see [Open Blockers](docs/execution/Open%20Blockers.md).
