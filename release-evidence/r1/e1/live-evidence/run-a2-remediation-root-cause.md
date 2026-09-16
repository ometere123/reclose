# Run A2 remediation forensic result

The A2 remediation submission was intentionally sent once after a successful immutable-byte preflight.

- Root transaction: `0x566d2b42e5323a4b04209fe4bc4cd951959321de36a91e0783964402e093b749`
- Root status/execution: `FINALIZED` / `MAJORITY_AGREE`
- Kernel child: `0x3f6e248904f8a640c9585dfe85cfadbdf8c7ebd0049acf5838c1783472b1399b`
- Kernel child execution: `MAJORITY_AGREE`; no descendants materialized
- Judge result: `INSUFFICIENT_EVIDENCE` (outcome `3`)
- RESTORE reconciliation expected by source: action type `10`, payload state `5` (`RECOVERY`)
- Action ID: `71:reclose-target-r1-final-a2:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:118:policy-r1-final-a22:100:1:50:`

The remote fixture preflight passed: HTTP 200, 531 bytes, and content hash `0x526bb5127fdeec7f5f529498c06149fc7aaa2729d77156312dc863d56c0354b4`. The built EAP was bound to those same bytes. The receipt also contains the finalized Judge→Kernel message and settled fee allocation.

The canonical Studio-dev RPC does not expose `gen_dbg_traceTransaction` for this transaction (`Method not found`), so a GenVM stdout/stderr or web/LLM module metric classification is unavailable. Therefore this incident is classified as **D: trace insufficient to distinguish** web retrieval failure, LLM failure, and semantic insufficient evidence.

The target-specific fixture explicitly names the A2 target and root incident. No nonce-2 write was attempted. Recovery remains unsubmitted and the A2 generation is not a complete proof generation.
