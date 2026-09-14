# Reclose

Autonomous protocols can continue operating under stale assumptions after a provider is compromised or a remediation claim appears. Reclose adds a runtime assurance layer that lets them respond to changing external conditions while keeping execution authority bounded.

A Reporter or Sentinel candidate supplies evidence. IncidentJudgeV1 asks GenLayer validators to evaluate a constrained semantic condition. AssuranceKernel then checks the target, active policy, version and incident lineage and maps an authorized result to finite typed effects. The target adapter applies those effects. Transaction tracking separates semantic outcome, parent finality, child execution and observed post-state. Remediation and recovery validation provide a governed path back to normal operation.

The R1 reference scenario protects an agent protocol that uses Provider A and Provider B. The intended response to confirmed compromise is to restrict Provider A and enter safe mode while preserving a pre-authorized Provider B fallback, then restore Provider A only after remediation and recovery validation.

The repository includes contract, SDK, compiler, evidence, CLI, Sentinel and frontend components with automated tests and CI. The current Studio-dev deployment has a verified active policy. The live incident sequence has not been demonstrated: a minimal explicit-allocation Parent→Child simulation fails on `on="accepted"` with `SystemError: 2: inval`, while the finalized control succeeds. No Run A incident write was submitted as a workaround. This limitation and the exact evidence are retained in the repository.
