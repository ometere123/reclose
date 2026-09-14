# Reclose R1 benchmark

The R1 benchmark is deliberately split between **automated** security/lifecycle scenarios and **live evidence-bound** Studio-dev scenarios. A blocked live case is never converted into a pass because a Direct Mode test covers similar logic.

## Matrix

`r1-scenarios.json` contains 70 adversarial/release scenarios across authority, evidence, lifecycle, recovery, economics, infrastructure, UX and live execution. Every scenario maps to one or more `TM-*` threat IDs and an evidence path.

Run:

```bash
npm run benchmark:check
```

This validates scenario count, unique IDs, threat mapping, evidence-path existence and hard-release targets. It does **not** execute the referenced suites and does not promote live statuses.

The repository's canonical `npm run verify` executes the mapped automated suites. GitHub CI evidence must therefore be referenced alongside this matrix when an automated benchmark result is claimed.

## Hard release targets

The following remain exactly zero as engineering release targets:

- unauthorized autonomous action successful
- duplicate economic effect
- autonomous authority expansion
- Kernel invariant violation
- cross-incident erroneous restoration
- stale-policy authority execution

These are not marketing claims of defect-free software.

## Current live status

The canonical corpus currently contains 78 scenarios (check `benchmark/r1-scenarios.json` and `npm run benchmark:check` for the integrity result). No complete H1 execution has been recorded. The isolated typed-address `emit_decided` Parent→Child simulation succeeded read-only, superseding the historical `accepted`-phase failure report. The active immutable Kernel/Judge deployment predates the source correction, so the production Judge→Kernel→Target path remains unverified; Run A/B and all H1 live scenarios remain `NOT_RUN` or blocked, never passes. The preserved success and historical diagnostic evidence are in `release-evidence/r1/diagnostics/accepted-message-repro/`.

The live statuses may only be changed from captured transaction/deployment evidence.
