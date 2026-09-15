# Kernel deployment native-read diagnosis

- Transaction: `0x27e3aead3a85a6a9f98aeb53aed036d7f36be8a7b9a0728f8cf42926670f1428`
- Returned address: `0xA2b0e7DBd3E32f0bFC9D36Fcf92845d336fC73F4`
- Network/RPC: Studio-dev / Studio Next, chain `61997`, `https://studio-dev.genlayer.com/api`
- CLI network info: alias `studio-dev`, chain ID `61997`, RPC `https://studio-dev.genlayer.com/api`

## Native responses

The complete raw responses are saved in `0x27e3...-native-read-diagnosis.json`.

- `eth_chainId`: `0xf22d` (`61997`).
- `gen_getTransactionLifecycle({txId})`: `storedStatus=Finalized`, `projectedStatus=Finalized`, `storedStatusCode=7`, `decisionActive=false`, `resolutionAction=NoOp`.
- `gen_getContractCode(address)`: returned source bytes successfully. Decoding the returned base64 and hashing it produced SHA-256 `111F158F2714A0935A690C95269FD992750E480D7F76431282DEE70742F59C4E`, exactly matching local `contracts/assurance_kernel.py`.
- `gen_getContractSchema(address)`: returned a constructor with exactly two integer parameters: `protocol_schema_version`, `minimum_policy_delay_seconds`.

The decoded deployed code is preserved as `0x27e3...-deployed-code.py`.

## Comparison with deployment output

The deployment command submitted `--args 1 60`, reported fee `100000000000010352` wei (`0.100000000000010352 GEN`), returned the address above, and reported `ACCEPTED` / `FINISHED_WITH_RETURN`. Native lifecycle and code/schema reads confirm that result. The earlier CLI receipt command used `eth_getTransactionByHash`, which returned `Transaction ... not found`; that method is not authoritative for this Studio deployment despite the native transaction and contract being present.

## Classification

1. **Transaction exists but wrong receipt method/network:** yes, specifically the generic `eth_getTransactionByHash` path was not usable; the exact Studio-native lifecycle path succeeds on the same RPC and chain.
2. **Transaction finalized and contract exists:** yes. Native lifecycle is Finalized and code/schema are readable; deployed code hash exactly matches local source.
3. **Returned address never persisted:** no. `gen_getContractCode` and `gen_getContractSchema` both resolve the returned address.
4. **Studio propagation/indexing problem:** not indicated for native Studio indexing. The generic Ethereum transaction lookup appears incomplete for this Studio transaction; this is a method-specific visibility limitation.

No retry, deployment, wiring, funding, activation, simulation, or other transaction was performed during this diagnosis.
