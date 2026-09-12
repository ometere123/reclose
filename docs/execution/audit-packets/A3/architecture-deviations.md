# A3 architecture deviations

**Active product architecture deviations:** none identified.

The product implementation remains inside the locked R1 architecture:

- protocol contracts remain the source of truth;
- fixture/indexer/browser data do not gain authority;
- GenLayer judgment is separated from deterministic policy consequence;
- deterministic policy consequence is separated from actual child execution;
- recovery is first-class;
- ordinary agents do not gain owner/admin authority;
- chain `61997` remains the canonical R1 environment;
- no arbitrary calldata or generic execution surface was added;
- the existing Studio-dev child fee-routing failure is recorded as a compatibility/blocker issue, not silently reclassified as an architecture deviation.

Any future attempt to bypass the live Judge -> Kernel failure by manually mutating target state, replacing the Kernel boundary, weakening child-success requirements or treating Direct Mode as equivalent to E1 would constitute a material architecture/release deviation and must go through the repository's deviation/change-control process.
