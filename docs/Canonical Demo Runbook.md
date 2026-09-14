# Canonical Demo Runbook

This runbook is evidence-first. The active Studio-dev policy and deployment are real, but the full incident lifecycle has not been executed. Until a complete canonical E1 run is recorded, present only architecture, policy/readback proof, automated test evidence and the accepted-message blocker reproduction.

## Current verified stack

Studio-dev / 61997; target `reclose-target-007`; active policy `policy-r1-009` version 1; Kernel `0x5A271CB03b4833aA485ff13035844ba500c4E536`; Judge `0x43c6061FEde8372a3e4c3AB513D32abcfA956e89`; target `0xdf68B59C5f5Fb8929Ab6360B0024f34aec7a0353`; Vault `0x10451Cd05cDeD4CE0f40983f4f87FFE42968E701`. See the deployment manifest for exact transaction evidence.

## Safe demonstration sequence

1. Show the target, active policy, policy hash/version and constrained action vocabulary.
2. Explain Reporter evidence, independent source fetch, Judge semantic decision and deterministic Kernel boundary.
3. Show the minimized Parent→Child fixture: accepted simulation returns `SystemError: 2: inval`; finalized simulation succeeds with the same explicit fee allocation.
4. Explain that no incident was written and no containment/recovery result is claimed on this deployment.
5. Show automated tests and the separate pending gates without calling them live E1/H1 completion.

Use the full user-facing narrative only after E1 A+B evidence checker passes against a frozen source candidate. Never portray reference-fixture behavior as live 61997 proof.
