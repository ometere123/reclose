# Benchmark Methodology & Results

The R1 corpus is defined in `benchmark/r1-scenarios.json` and currently contains 78 scenarios. Scenarios map to threat IDs and evidence paths. `npm run benchmark:check` validates the corpus structure; it does not execute scenarios or convert blocked cases into passes.

## Required reporting

For each executed scenario, retain the exact candidate commit, environment, input fixture, expected and observed outcome, transaction IDs where applicable, and evidence reference. Report precision, recall, false-intervention rate, critical false-negative rate, `UNDETERMINED` rate, validator disagreement, decision latency, execution latency, end-to-end latency, fee distribution, recovery correctness, and post-state mismatch detection only when the underlying dataset supports the calculation. Distinguish automated Direct Mode from live Studio-dev evidence.

## Current result boundary

No full 78-scenario H1 execution has been completed, and no aggregate performance metrics are claimed. Automated checks are run by repository verification and CI. The isolated typed-address `emit_decided` Parent→Child simulation succeeded read-only, superseding the historical `accepted`-phase failure. The active immutable Kernel/Judge deployment predates the source correction, so the complete production Judge→Kernel→Target lifecycle remains unverified; E1 Run A/B and remaining H1 live cases are not run. `BLOCKED` and `NOT_RUN` are not passes.

The hard zero-gate scenario definitions remain release targets, not claims that the measured rate is zero. Results must retain original failures and rerun affected categories after a fix.
