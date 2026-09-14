# OB-014 root-cause report

**As of:** 2026-09-14  
**Repository candidate:** `main` at `6602e3a1c323dd992f74c0bf1fc8b3e64bc64015`  
**Network evidence:** GenLayer Studio-dev, chain 61997; UI-reported version `v0.123.0-rc.6`  
**Disposition:** Accepted-message simulation failure reproduced outside Reclose policy logic; inner host-side rejection is not identified. No code change or further live write is justified by the available evidence.

## Facts established by retained evidence

The controlled reproduction in `release-evidence/r1/diagnostics/accepted-message-repro/` deploys a disposable Parent and Child. The Child exposes a no-op write. The Parent has separate methods that emit that same Child method with `on="accepted"` and `on="finalized"`. It does not invoke Reclose's Judge, Kernel, policy, target actions, or evidence handling.

For both simulations, the supplied allocation uses the Child's SDK-estimated budget and encoded fee parameters, Internal message type, root parent index, the Child recipient, and the `noop` call key. The phase flag is matched to the emitted message. The allocation bytes are otherwise the same. The complete request and response records are retained in `simulation-results.json`; deployed addresses, deployment results, and readbacks are in the adjacent logs and `README.md`.

The accepted simulation returns `SystemError: 2: inval`. Its trace ends at `wasi.gl_call` while handling `EmitInternalMessage`; the captured host-call counts contain storage reads but no completed message emission. The finalized control succeeds and returns the supplied allocation. Thus the failure occurs before the accepted message is dispatched as a child transaction. No child transaction exists for the failed accepted simulation.

This single-message reproduction does not use duplicate allocations, repeated same-key emissions, Judge-to-Kernel phase siblings, or Reclose's nested fee-tree builder. Those mechanisms cannot explain this minimal result. The separate older artifact `release-evidence/r1/e1/accepted-target-fee-allocation-mismatch.json` records unequal fee profiles for two repeated Target effects; it is historical context, not evidence for the cause of this minimal reproduction.

## Version and source boundary

Studio UI evidence records deployed Studio-dev as `v0.123.0-rc.6`. The corresponding public source tag resolves to commit `6551995be232d093144f2c32b6775757a010ab3c`; the source inspected for fee-allocation rules is `backend/protocol_rpc/fees.py` at that commit. It defines allocation identity from message type, recipient, and call key, checks phase and fee parameters during resolution, and accounts repeated consumption against one allocation budget.

The hosted service does not expose its exact backend commit or a trace naming the validator that rejected this request. Therefore the version tag is verified, while exact deployed-source SHA correspondence is **not verified**. The host-call failure boundary is verified; the implementation layer and specific condition producing `inval` remain unknown. The evidence supports an accepted-message simulation limitation in the exposed Studio-dev environment, but does not prove whether the rejecting code is in the simulation adapter, Studio backend, GenVM runner host-call handling, or their interaction.

## Root-cause conclusion

**Established:** a valid-looking, explicitly allocated accepted internal message from a minimal Parent to a no-op Child fails during the `EmitInternalMessage` host call in Studio-dev; the matched finalized control succeeds. The failure is independent of Reclose's policy semantics and the prior repeated-effect fee-profile mismatch.

**Not established:** the exact server-side validation rule or component that emits `SystemError: 2: inval`. No retained response includes a structured validation code or server trace identifying it. Calling this a proven Reclose bug, a specific fee mismatch, or a confirmed GenVM/Studio source defect would exceed the evidence.

## Action and release consequence

Do not repeat the accepted simulation, submit a Run A incident, alter fee values/phases/contract addresses speculatively, or make a protocol change based on this evidence. The reproduction already distinguishes the minimal accepted path from the finalized control, and another identical request is not expected to add information.

The precise missing diagnostic is a server-side trace or structured simulation error for the **existing captured request** that identifies the host-call validation condition, plus a build/source mapping if attributing it to a particular deployed component. Until that diagnostic is available through retained service evidence or an upstream-supported diagnostic channel, the inner cause remains unresolved and E1 Run A/B, H1, and final live fee coverage remain blocked/not run. No Reporter nonce or incident write exists for the current Run A generation.

No Studio-dev RPC call, wallet action, or write was made for this report. Repository CI and local checks do not resolve this runtime boundary.
