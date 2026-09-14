# Judge notes

Reclose addresses runtime authority adaptation for autonomous protocols. Its central design choice is to separate semantic judgment from executable authority. Evidence is evaluated by GenLayer; the Kernel independently checks policy and lineage and dispatches only finite effects to a registered target.

Please distinguish source/test claims from live-chain claims. The active Studio-dev policy and its bindings are evidenced in `deployment/61997/r1-lifecycle-split-run-a-working-manifest.json`. The old `accepted` failure is superseded: the typed-address `decided` isolated simulation succeeded read-only, with `transactionSubmitted: false`. The active immutable Kernel/Judge source predates the correction, so the canonical live incident scenario has not been run on matching contracts. E1 A+B and H1 are incomplete. No claim of successful live containment, recovery, benchmark rates or external audit PASS is made.

Audit disposition remains `AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE`; this is not a self-issued approval.
