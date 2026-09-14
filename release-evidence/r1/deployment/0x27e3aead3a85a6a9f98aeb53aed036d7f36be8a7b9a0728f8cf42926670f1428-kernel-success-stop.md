# Operation 1 corrected retry — verification stop

- Network: Studio-dev / Studio Next, chain `61997`
- Source commit: `b2976094b6b02161411cad46d77deda464f7aa04`
- Contract: `AssuranceKernel`
- Constructor invocation: `--args 1 60`
- Intended constructor values: `[1, 60]`
- Fee cap/value: `100000000000010352` wei (`0.100000000000010352 GEN`)
- Deployment transaction: `0x27e3aead3a85a6a9f98aeb53aed036d7f36be8a7b9a0728f8cf42926670f1428`
- Returned contract address: `0xA2b0e7DBd3E32f0bFC9D36Fcf92845d336fC73F4`
- Deployment command result: `ACCEPTED`; `FINISHED_WITH_RETURN`; CLI reported “Contract deployed successfully.”

## Verification stop

A subsequent read-only receipt request for the returned transaction failed with:

```text
GenLayer RPC error (eth_getTransactionByHash): Transaction 0x27e3aead3a85a6a9f98aeb53aed036d7f36be8a7b9a0728f8cf42926670f1428 not found
```

Therefore authoritative finalized receipt fields, deployed code hash, deployed schema, and constructor readback are **not proven** in this operation. No retry was made after this verification failure, and operation 2 was not attempted.

The local source hash remains `111F158F2714A0935A690C95269FD992750E480D7F76431282DEE70742F59C4E`. The previous failed transaction `0x628cdc535245cb366ba6dc4017de09b0f605d406f6e0376f293b691688f84095` remains the documented type-marker encoding failure.
