# A4 recovery-validation result

Network: Studio Dev (`61997`), canonical RPC `https://studio-dev.genlayer.com/api`.

The single recovery-validation transaction was:

- root: `0x4aeeb30b521f6ac11a3e140e6832dc0e94d9d097bbc08266c4c62c8c5e769ade`
- incident: `reclose-target-r1-final-a4:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:2`
- parent incident: `reclose-target-r1-final-a4:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:0`
- reporter nonce: `2`
- immutable snapshot: commit `a4677a518dd07163d00ff8ddb68b9d5c119d71ff`, HTTP 200, 935 bytes, Keccak `0x9f98038ba589bf00f48b52ebc9c3d95f1da7aa5edbe893e6bf2d64b74ba63a71`

The root finalized and executed as `FINISHED_WITH_RETURN`, but the Judge returned `CONFLICTING_EVIDENCE / outcome 3`. Its only child, Kernel transaction `0xfce87beb805286b4390c52f0a319533df66fe62b97b8b432e748aa2b5e1de1a4`, also finalized and executed successfully. No Target child was emitted because the decision was not confirmed.

The root emitted one Judge → Kernel final-decision message. Root message-fee budget and consumption were both `240000000000020704`. The Kernel child reserved `120000000000010352` for a possible Target action, but consumed zero because no confirmed recovery action was dispatched.

Post-state is intentionally unchanged after the rejected semantic decision:

- Kernel incident status: `RECOVERY` (`3`)
- Target state: `RECOVERY` (`5`)
- effective provider: Provider B (`2`)

The preserved receipt and full fee/message data are in `recovery-pending.json`. No semantic retry, target action, final Provider A purchase, or other write was performed after this result. Recovery is therefore not proven for A4; the next step requires diagnosis of the conflicting validator evidence and a deliberate new recovery attempt only after approval.
