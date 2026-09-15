# Fresh activation estimation diagnostics

Network: Studio Next / Studio-dev, chain 61997. No transaction was submitted.

## Node-clock lifecycle request

Exact code:

```js
client.request({ method: "gen_getTransactionLifecycle", params: [{ txId: "0xdcec26632b106f9e6b96ed8701130fbe78cd5582a7659fcc391c5370bfd027ed" }] })
```

Response:

```json
{"storedStatus":"Finalized","storedStatusCode":7,"projectedStatus":"Finalized","projectedStatusCode":7,"resolutionAction":"NoOp","resolutionActionCode":0,"resolutionSource":"Unspecified","resolutionSourceCode":0,"decisionId":null,"decisionActive":false,"evaluatedAt":1789505416}
```

`evaluatedAt` is above `activation_not_before=1789496966`. The previously reported `1789504022` came from Windows `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()`, not an RPC or contract read.

## Activation estimates

Both bounded, owner-authenticated SDK estimates used:

```json
{"type":"write","to":"0x6eCCfb2B150F12A1A96B9BaA7B762d1f15DcFfd3","from":"0x24fAe7cD031Ed702Be63BDeA8912141805B996bd","function":"activate_policy","args":["policy-r1-fresh-run-a"],"transaction_hash_variant":"latest-nonfinal"}
```

Both returned `TIMELOCK_NOT_ELAPSED` from the concrete simulation. The structured diagnostic included `InvalidInputRpcError`, code `-32000`, the RPC receipt, contract state, simulation request parameters, and no secret material.

Installed SDK source (`node_modules/genlayer-js@2.0.0-rc.1/dist/index.js`) confirms `estimateTransactionFeesForWrite` encodes the call and sends `sim_estimateTransactionFees` with `from: account?.address ?? client.account?.address ?? zeroAddress`, `to`, serialized calldata, transaction variant, and fee inputs. No timestamp is supplied by the SDK.

The live evidence therefore establishes that the earlier host timestamp was not chain time and that the node-clock lifecycle projection is beyond the threshold. Activation remains unsubmitted because the repository does not yet contain a trustworthy measured `activate_policy` profile for this fresh Kernel generation; no old-address fee profile was reused.
