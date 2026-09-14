# Sentinel Operator Guide

Sentinel is a candidate-monitoring and evidence-preparation library. It does not hold keys, sign, or submit incidents. Its output is a candidate for explicit review.

## Run a monitor pass

Configure the target, rule/resource context and allowed HTTPS sources in a `SentinelMonitor`. Call `runOnce()` and inspect every source/result. When a candidate is produced, validate it with the evidence builder and compare fetched content against the source registry rules. For immutable snapshot sources, the actual immutable reference and content hash must be present.

Before submission, an operator must independently review the candidate, current active policy and target, Reporter nonce, bond state (if applicable), fee simulation, and full nested message allocation tree. Keep fee estimation and receipt polling within the shared Studio-dev throttle. A candidate is not a judgment, an authorization, or an execution receipt.

The package surface is exported from `packages/sentinel/src/index.ts`; main implementations are `monitor.ts`, `candidateEap.ts` and `runner.ts`. Run `npm run sentinel:test` for package tests. The current Run A simulation blocker prevents the canonical incident write; Sentinel output must not be submitted around that gate.
