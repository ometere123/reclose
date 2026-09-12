// @reclose/evidence-builder re-exports protocol-sdk's canonical EAP implementation verbatim.
// There is exactly ONE Evidence Artifact Package implementation in this repository - it now lives
// in @reclose/protocol-sdk (packages/protocol-sdk/src/evidence.ts) so the SDK's own report
// builders (buildIncidentReport/buildRecoveryReport) can use it without a circular package
// dependency (this package already depends on protocol-sdk for SourceClass/RuleId types; having
// protocol-sdk depend back on this package's runtime functions would be circular at build time).
// This file intentionally contains no logic of its own - every caller of
// @reclose/evidence-builder (the browser adapter, Sentinel, the CLI, existing tests) keeps working
// against the exact same function/type names, per CLAUDE.md Section 13/A3-H05: "Do NOT implement
// a second simplified evidence validator."
export * from "@reclose/protocol-sdk";
