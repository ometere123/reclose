# Recovery-validation receipt forensics

This is a read-only forensic supplement for the single E1-A recovery-validation
attempt. It is not a successful release receipt and must not be interpreted as
proof that the target returned to `NORMAL`.

## Classification

- Network: Studio-dev, chain `61997`
- Root transaction: `0x94324dacde653b85fcdbe0e42b4783f38fe6a80bfe415ae367aa10b23bfd8da6`
- Root status: `FINALIZED`
- Root execution: `FINISHED_WITH_RETURN`
- Consensus result: `2` / `MAJORITY_DISAGREE`
- Settlement round: round `0`, outcome `Undetermined`, `5` validators revealed
- Validator votes: `DISAGREE`, `AGREE`, `DISAGREE`, `DISAGREE`, `IDLE`
- Emitted decision: `RECOVERY_NOT_VERIFIED`, outcome `2`
- Materialized children: none
- Target state: remained `RECOVERY` (`5`)

The failure is therefore a semantic/consensus failure at the Judge root, not a
child-routing or fee-allocation failure. Because the final decision was not
`RECOVERY_VERIFIED`, no Kernel child was materialized and no `RESTORE(10,
param_u256=0)` Target child could execute.

## Fee and message evidence

The receipt contains one emitted finalized message to the AssuranceKernel. The
reserved message budget was valid and fully consumed:

- `totalMessageFees`: `240000000000020704`
- message-fee budget: `240000000000020704`
- allocation consumed: `0: 240000000000020704`
- primary fee spent: `530104250002882`
- finalized refund: `111983350007470`
- observed execution fee consumed: `132532250000000`
- observed GenVM message fee consumed: `120000000000004400`
- observed message fee consumed: `240000000000020704`
- observed message fee refunded: `0`

The planned allocation tree was also present: Judge → Kernel with a nested
Kernel → Target allocation, each with a budget of
`120000000000010352` at the nested level. No child transaction appeared because
the rejected semantic result prevented downstream state mutation.

## Trace availability

The canonical RPC was queried for `gen_dbg_traceTransaction`, but returned
`Method not found`. No stdout/stderr, equivalence output, or module-call metric
is inferred beyond the complete receipt artifact. The unmodified receipt and
preflight are preserved in `recovery.json` and `recovery-preflight.json`.

## Consequence

No automatic semantic retry was performed. A successful recovery proof now
requires a deliberate new Judge/source-registry generation with evidence that
validators can independently use to confirm the actual post-remediation
observations, followed by a new end-to-end lifecycle. The frozen fixture and
historical receipt remain unchanged.
