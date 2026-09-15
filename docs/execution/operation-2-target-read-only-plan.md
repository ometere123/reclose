# Operation 2 — corrected Target deployment (read-only plan)

Prepared against commit `2f94683bf69d8fee5bf1a43025d10172694cdbbe` on Studio-dev/Studio Next (chain `61997`). No deployment, wiring, funding, activation, simulation, or wallet transaction was performed for this operation.

## Operation 1 authoritative record

Kernel deployment transaction: `0x27e3aead3a85a6a9f98aeb53aed036d7f36be8a7b9a0728f8cf42926670f1428`.
Returned address: `0xA2b0e7DBd3E32f0bFC9D36Fcf92845d336fC73F4`.
Native lifecycle: Finalized (status code 7, resolutionAction `NoOp`). Native code readback SHA-256: `111F158F2714A0935A690C95269FD992750E480D7F76431282DEE70742F59C4`, matching the local Kernel source. Native schema exposes constructor parameters `protocol_schema_version: int` and `minimum_policy_delay_seconds: int`.

The pinned CLI/native API exposes no constructor-storage getter (`gen_getContractState` is unavailable), and the Kernel has no public getter for these fields. Therefore a live storage readback of `(1, 60)` cannot honestly be claimed. The deployment invocation and constructor calldata were `[1, 60]`; source/schema/code parity is verified. This limitation is a stop condition for any claim requiring storage-specific readback.

## Operation 2 target

Deployment order: deploy `ReferenceAgentProtocol` Target, then (later, only after approval) wire its assurance controller to the new Kernel.

Constructor arguments (exact, positional; no type-marker strings):

```text
[
  "0x24fAe7cD031Ed702Be63BDeA8912141805B996bd",
  "reclose-target-007",
  "0x02Be7242eb5ef13984590F86662B139384E20B70",
  "0x1f12906AF34143C804f5AeeeF0AcDF408e816d0a",
  "1000000000000000000",
  "100000000000000000",
  true
]
```

Local Target source SHA-256: `92EC5F52B35373D8000B9D17B392BC28275584030CAB87F8FBE935554D55E192`.

## Read-only fee quote

Pinned toolchain: GenLayer CLI `0.40.0-rc.3`; `genlayer-js` `2.0.0-rc.1`; RPC `https://studio-dev.genlayer.com/api`; chain `61997`.

Command used:

```powershell
node "$env:APPDATA\npm\node_modules\genlayer\dist\index.js" estimate-fees --rpc https://studio-dev.genlayer.com/api --json
```

The pinned CLI has no deployed address/code input with which to produce a contract-specific deployment quote. Its authoritative read-only baseline is:

```json
{"feeValue":"100000000000010352","distribution":{"leaderTimeunitsAllocation":"100","validatorTimeunitsAllocation":"200","appealRounds":"0","executionBudgetPerRound":"25000000000000000","executionConsumed":"0","totalMessageFees":"0","rotations":["3"],"maxPriceGenPerTimeUnit":"2","storageFeeMaxGasPrice":"300000000","receiptFeeMaxGasPrice":"300000000"}}
```

This is `0.100000000000010352 GEN`, recorded as a conservative cap/baseline, not an exact Target deployment quote. Deployment must stop if the actual required fee exceeds this cap.

Deployer: `0x24fae7cd031ed702be63bdea8912141805b996bd`; read-only account balance: `204.416387008249727217 GEN` (sufficient for this cap).

## Required post-deployment checks (after separate approval)

Require native Finalized lifecycle and `FINISHED_WITH_RETURN`; returned address persisted; `gen_getContractCode` hash equals the Target source hash; `gen_getContractSchema` matches the constructor schema; and controller readback equals the new Kernel address. Stop immediately on fee over-cap, failed finality, missing native readback, code/schema mismatch, or linkage mismatch.

**Status: Operation 2 is not approved or executed. Separate approval is required before the Target deployment.**
