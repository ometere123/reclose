# Technical highlights

- GenLayer semantic evaluation is isolated from deterministic policy enforcement.
- Kernel validates target, active policy, version, Judge identity and incident lineage before effects.
- Typed finite actions prevent arbitrary calldata or destination selection through the canonical envelope.
- Provisional and final Kernel entrypoints have distinct call keys; same-phase repeated messages are grouped under one cumulative allocation.
- Content-addressed evidence requires immutable snapshot references and independent hash-verified fetching.
- SDK/CLI/compiler/evidence-builder/transaction-tracker/Sentinel surfaces share canonical schemas and hashes.
- Transaction truth separates decision outcome, finality, child execution and target post-state.
- Current accepted-message platform limitation has a minimized reproduction and preserved response.
