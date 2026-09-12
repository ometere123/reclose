# A3 Security Self-Review

## Trust boundaries

The browser is a presentation/signing client, not a consensus or policy authority. Semantic truth comes from GenLayer/contract reads through the frozen RecloseSDK. Hosted/indexed data may aid discovery and trace correlation but may not override protocol reads.

## Reviewed failure classes

- **stale/indexer disagreement:** live adapter performs direct SDK reads for target/policy/incident identity; index adapter is optional for discovery. Missing index data becomes unavailable, not invented protocol state.
- **malicious evidence rendering:** dynamic evidence fields pass through `escapeHtml`; product test includes an HTML-event-handler payload.
- **lifecycle conflation:** product helpers reject ACCEPTED-as-final and execution-error-as-success contradictions; UI exposes raw lifecycle and execution result separately.
- **fixture confusion:** mock adapter is visibly labelled and its `submitWrite` always throws.
- **blind resubmission:** pending transaction ID is stored before tracking; polling failure is retained for resume and never invokes submission.
- **authority review bypass:** policy authoring screen displays authority diff and timelock consequence before any live writer may be called.
- **wrong network:** live RecloseSDK retains the 61997 preflight guard.
- **post-state overclaim:** SDK action receipt requires index/protocol execution time and target identity, and converts required post-state mismatch to FAILURE.
- **private-key custody:** no key material exists in frontend source; signing is delegated to a host-provided wallet writer.

## Residual product risks

- index adapter integrity can affect discovery/completeness even though it cannot redefine known protocol records;
- browser/runtime accessibility remains to be externally exercised;
- action-trace proof quality depends on the resolver that supplies parent/child/post-state evidence;
- live downstream execution remains blocked by the current Studio-dev fee-routing issue.

No product-layer mitigation is allowed to hide or reinterpret the A2-C01 live execution blocker.
