# Reclose R1 Benchmark Status Report

**Status:** STRUCTURE / AUTOMATED-EVIDENCE MAPPING COMPLETE; LIVE RELEASE CASES INCOMPLETE  
**Canonical network for live cases:** Studio-dev, chain `61997`

This report describes the benchmark corpus currently tracked in `benchmark/r1-scenarios.json`. It is not a claim that every scenario has been executed successfully on a live deployment.

## Corpus

- total scenarios: **78**
- automated/evidence-mapped scenarios: **70**
- live/evidence-bound scenarios: **8**

Category distribution:

| Category | Count |
|---|---:|
| AUTH | 12 |
| EVID | 14 |
| LIFE | 12 |
| REC | 8 |
| ECON | 8 |
| INF | 6 |
| UX | 10 |
| LIVE | 8 |

The corpus covers authority boundaries, evidence integrity and prompt injection, GenLayer lifecycle truth, replay/idempotency, remediation/recovery, economic/value-transfer paths, infrastructure/network boundaries, product truth/accessibility and the canonical live scenario.

## Machine validation

Run:

```bash
npm run benchmark:check
```

The checker verifies:

- minimum scenario count;
- unique scenario IDs;
- valid `TM-*` threat references;
- evidence paths that resolve to repository artifacts;
- explicit status for every live scenario;
- blocker text for `BLOCKED_EXTERNAL` cases;
- exact zero hard-release targets.

The checker does **not** convert `BLOCKED_EXTERNAL` or `NOT_RUN` live cases into passes.

## Hard release targets

The benchmark keeps the following release targets exactly at zero:

```text
unauthorized autonomous action successful = 0
duplicate economic effect = 0
autonomous authority expansion = 0
Kernel invariant violation = 0
cross-incident erroneous restoration = 0
stale-policy authority execution = 0
```

These are release targets for the corpus, not a marketing claim that the software is defect-free or unhackable.

## Current live boundary

The canonical live Judge -> Kernel triggered child currently fails on Studio-dev with:

```text
fee no_matching_allocation # internal
```

Accordingly, live benchmark cases that require successful downstream Kernel/Target execution, remediation, recovery or restoration remain blocked rather than being represented as successful.

Other live-only evidence such as a final non-zero bond/claim path and complete clean-run restart/resume proof must remain `NOT_RUN` until executed against the release deployment.

## Relationship to E1

The benchmark's live canonical cases are not a replacement for E1. E1 requires two independent clean deployments to complete the entire compromise -> containment -> safe fallback -> remediation -> recovery -> restoration sequence with real transaction/execution/post-state evidence.

E1 evidence rules are defined in:

- `release-evidence/r1/e1/README.md`
- `release-evidence/r1/e1/run-template.json`
- `scripts/check-e1-evidence.mjs`

## Release interpretation

Allowed statement today:

> Reclose has a 78-scenario threat-linked R1 benchmark corpus with 70 automated/evidence-mapped scenarios and 8 explicit live scenarios; blocked/not-run live cases are preserved as such.

Not allowed until the evidence changes:

> Reclose passed all 78 benchmark scenarios.

Final benchmark release reporting must be regenerated/reviewed at the immutable A4 candidate after the live cases and any newly discovered threats/findings have been reconciled.
