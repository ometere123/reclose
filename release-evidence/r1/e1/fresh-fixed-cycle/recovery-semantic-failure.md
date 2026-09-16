# E1-A recovery-validation forensic record

Network: Studio-dev, chain 61997

The fresh E1-A compromise and remediation stages succeeded. The recovery-validation root was submitted exactly once with the live Reporter nonce `2` and finalized with successful transaction execution:

- root: `0x94324dacde653b85fcdbe0e42b4783f38fe6a80bfe415ae367aa10b23bfd8da6`
- expected incident: `reclose-target-r1-e1a-final:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:2`
- expected action: RESTORE (`10`), empty resource, `param_u256=0`, final stage
- root execution: `FINISHED_WITH_RETURN`
- root semantic result: `REJECTED` (`result=2`)
- emitted decision: `RECOVERY_NOT_VERIFIED`
- materialized children: none
- target state after root: `RECOVERY` (`5`)

The root receipt exposes an emitted finalized Kernel message, but because the semantic decision was rejected, no Kernel child materialized and no Target RESTORE child executed. The target therefore correctly remained in RECOVERY. No retry or additional write was submitted.

The canonical RPC does not expose `gen_dbg_traceTransaction`; the attempted read-only trace returned `Method not found`. The complete SDK receipt, emitted message, fee accounting, and preflight are preserved in `recovery.json` and `recovery-preflight.json`.

Classification: semantic Judge rejection (not a fee-allocation or child-routing success). The frozen fixture was fetched from the pinned immutable URL and its bytes/hash were verified before signing. A future recovery retry requires a deliberate evidence/Judge decision and must not be treated as an automatic retry.
