# E1-A deployment blocker

The final isolated namespace is `reclose-target-r1-e1a-final`. Studio accepted the first staged Provider A deployment as:

`0xd4a2a7a663b9f7a3811e21064449bb355f7c4ae46c3c5e270d0585afc74a8ecf`

The read-only `gen_getTransactionStatus` endpoint reports `FINALIZED` (status code 7), but `eth_getTransactionByHash`, `genlayer-js getTransaction`, and the receipt surface return the transaction as not found. Consequently, the deployed contract address cannot be recovered, and the remaining wiring/deployment steps are stopped to avoid guessing or creating an unverifiable stack.

No policy, Judge, Vault, target registration, incident, remediation, or recovery write was performed for this final namespace after that deployment. The earlier interrupted namespace remains unusable because its registered target address has no contract at the RPC contract-read surface.
