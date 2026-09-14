# Architecture

```text
Reporter / Sentinel candidate
        │ bounded evidence
        ▼
IncidentJudgeV1 ── GenLayer semantic outcome
        │ provisional/final lifecycle-specific call keys
        ▼
AssuranceKernel ── active policy, identity, version, lineage checks
        │ finite typed effects
        ▼
Registered target adapter ── state transition / provider selection
        │
        ▼
Transaction tracker ── parent, child, execution result, post-state
```

Supporting components include the protocol SDK, RFC8785/JCS + Keccak policy compiler, canonical evidence builder, CLI, Sentinel monitor/candidate tooling and frontend. The Reporter cannot choose an effect. The Judge cannot invent target authority. The Kernel does not expose arbitrary calldata execution. Target state and transaction truth are read from protocol sources; hosted indexes are not protocol authority.

The Kernel exposes phase-specific provisional and final decision entrypoints so internal-message call keys remain distinct under Studio's allocation identity rules. Provisional messages use the pinned runner's `decided` ABI phase; final messages remain `finalized`. Repeated same-phase target effects share one cumulative fee allocation. The isolated typed-address `decided` path passed a read-only Studio-dev simulation. The active deployment's source commit predates that fix, so the complete live provisional branch and incident lifecycle remain unverified.
