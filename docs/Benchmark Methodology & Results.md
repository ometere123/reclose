# Benchmark Methodology & Results

The R1 corpus is defined in `benchmark/r1-scenarios.json` and currently contains 78 scenarios. Scenarios map to threat IDs and evidence paths. `npm run benchmark:check` validates the corpus structure; it does not execute scenarios or convert blocked cases into passes.

## Required reporting

For each executed scenario, retain the exact candidate commit, environment, input fixture, expected and observed outcome, transaction IDs where applicable, and evidence reference. Report precision, recall, false-intervention rate, critical false-negative rate, `UNDETERMINED` rate, validator disagreement, decision latency, execution latency, end-to-end latency, fee distribution, recovery correctness, and post-state mismatch detection only when the underlying dataset supports the calculation. Distinguish automated Direct Mode from live Studio-dev evidence.

## Current result boundary

No full 78-scenario H1 execution has been completed, and no aggregate performance metrics are claimed. Automated checks are run by repository verification and CI. Live E1 Run A is blocked before incident submission by the reproducible Studio-dev accepted-message simulation error in `release-evidence/r1/diagnostics/accepted-message-repro/`; Run B and remaining live categories are not run. `BLOCKED` and `NOT_RUN` are not passes.

The hard zero-gate scenario definitions remain release targets, not claims that the measured rate is zero. Results must retain original failures and rerun affected categories after a fix.
