# Policy Authoring Guide

Reclose policy manifests (APM) define the authority a target delegates to the Kernel. Treat an APM as security-sensitive executable configuration.

## Authoring flow

1. Select the target ID and a new policy key. Declare only governed resources, rule IDs/Judge versions and finite supported effects.
2. Validate the manifest with the canonical compiler. The compiler checks schema and cross-reference invariants and emits the ordered `begin_policy`, resource, rule, effect and seal calls.
3. Canonicalize with RFC8785/JCS and hash with Keccak-256. Review the exact compiled manifest and security diff before signing.
4. Submit every call using fresh fee estimates and verify each successful execution plus authoritative on-chain readback.
5. Seal and verify counts, hash, lifecycle and `activation_not_before`. Wait beyond the genuine timelock, build a fresh activation transaction and verify active policy identity/version/hash and target generation.

## Authoring constraints

Effects are typed actions on registered resource identifiers; do not add arbitrary destinations, selectors or calldata. Provisional effects must remain in the Kernel's approved reversible safe set. Recovery transitions must be rule- and stage-specific. Restrictions are reason-indexed so resolving one incident cannot clear another incident's restriction. A changed Judge address/version requires a new policy identity because the policy binds that authority.

Use `node packages/cli/bin/reclose.js policy compile <manifest.json>` and inspect the full output. Do not reuse a hash or fee profile after changing any manifest field. Do not activate a policy because a transaction hash exists: require successful execution and readback.

The current active demonstration policy is `policy-r1-009` for `reclose-target-007`, hash `0xb5ac60c955e3bc052531e07b9c351738e7c27d80fb286b702f1f6e2e8ee83953`; this is a Studio-dev demonstration policy, not a production recommendation. Its incident lifecycle remains unproven because accepted-message simulation is blocked.
