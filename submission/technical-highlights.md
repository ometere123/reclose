# Technical highlights

- GenLayer semantic evaluation is isolated from deterministic policy enforcement.
- Kernel validates target, active policy, version, Judge identity and incident lineage before effects.
- Typed finite actions prevent arbitrary calldata or destination selection through the canonical envelope.
- Provisional and final Kernel entrypoints have distinct call keys; same-phase repeated messages are grouped under one cumulative allocation.
- Content-addressed evidence requires immutable snapshot references and independent hash-verified fetching.
- SDK/CLI/compiler/evidence-builder/transaction-tracker/Sentinel surfaces share canonical schemas and hashes.
- Transaction truth separates decision outcome, finality, child execution and target post-state.
- The isolated typed-address `decided` path passed a read-only Studio-dev simulation; the previous `accepted` harness failure is superseded. Full lifecycle evidence remains open because the active deployment predates the source fix.
