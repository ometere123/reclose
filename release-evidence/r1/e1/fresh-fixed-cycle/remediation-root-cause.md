# Remediation nonce-5 read-only root-cause report

Captured from the fixed-Kernel Studio Devnet generation without submitting a transaction, changing policy, or redeploying.

## Transaction recovered

- Incident: `reclose-target-source-matched:0x24fAe7cD031Ed702Be63BDeA8912141805B996bd:5`
- Root transaction: `0xe57b28abb3a59c0d09a9b8a5e5817457ae58b7ad36b07283b7e1ec1063316991`
- Direct Judge → Kernel child: `0x7b12b9b1b68f8c33865a83f24d79e4d4314f408fe3c9371acb0154670588b723`
- Root result: `MAJORITY_AGREE`; root emitted one finalized Kernel message.
- Judge readback: `condition_code=INSUFFICIENT_EVIDENCE`, `outcome=3`.

The complete receipt, fee distribution, consumed message budget, emitted message, and child relationship are preserved in `remediation.json`. The debug-trace capture is in `remediation-nonce5-debug-trace.json`.

## Debug trace result

`client.debugTraceTransaction({ hash, round: 0 })` was attempted for both the root and its direct child. Studio Devnet returned:

`gen_dbg_traceTransaction: Method not found`

Therefore the response exposes no stdout, stderr, eq outputs, GenVM log entries, web-module metrics, LLM-module metrics, `web_module.calls`, or `llm_module.calls`. These values are recorded as unavailable, not inferred. Classification: **D — trace is insufficient to distinguish web failure, LLM failure, and semantic insufficient evidence**.

The receipt does prove the root successfully finalized and emitted the Judge → Kernel message. It does not expose the internal Judge nondeterministic call metrics needed to distinguish the three branches.

## Pinned runner inspection

The contract pins:

`py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`

No locally cached package directory containing that exact runner identifier was found. The locally cached GenLayer standard-library source inspected at:

`C:\Users\USER\.cache\genvm-linter\extracted\v0.3.0-rc7.tar\py-lib-genlayer-std\10pqy9vk4a8w8pg25py83s23k3mjjy7dwpdqjvqggb9ms7ycipvh\genlayer\nondet\web.py`

defines `Response` at lines 24–28 with fields `status`, `headers`, and `body`; `get()` is defined at lines 41–49. It does not define `status_code`. A second cached GenLayer standard-library copy has the same shape at `genlayer/nondet/web.py` lines 27–31. This supports the deployed Judge’s use of `resp.status`, but is not proof that the opaque exact `py-genlayer` runner exposes no additional compatibility alias. No Judge source change was made.

## Live policy effects

Read directly from Kernel `0xD06Ec39feF25f54D857A440F197eA4Fc2A3240d5`, policy `policy-source-matched-current`:

| Rule | Action type | Resource | param_u256 | param_str | Release phase | Enabled |
|---|---:|---|---:|---|---:|---|
| `REMEDIATION_CONFIRMED_V1` | `9` | empty | `0` | empty | `1` | true |
| `RECOVERY_VALIDATED_V1` | `10` | empty | `0` | empty | `2` | true |

The current `scripts/submit-fixed-remediation.mjs` hardcodes action type `10`, `param_u256=5`, and expected state `RECOVERY` for the remediation hop. That does not match the live remediation policy effect. Action type `10` is the live recovery-validation RESTORE effect, not remediation. The script must derive the deployed remediation effect rather than guess numeric values before another attempt.

## Evidence mismatch

The byte-authority fix passed: the pinned remediation snapshot was HTTP 200, exactly 734 bytes, and hash `0x2ad13ff8a80da7b24495ea9a3708ddc2ce62a9afb2f63b77d62ecb6e621af9b1`. The EAP carried that same hash.

The immutable source text nevertheless identifies `Provider A (controlled demo contract reclose-target-006)`, while the governed incident and current deployment target are `reclose-target-source-matched`. The fixture therefore does not explicitly bind its remediation claim to the referenced current incident. This is a confirmed semantic mismatch and a strong candidate for the Judge’s insufficient-evidence result, but the unavailable trace prevents proving whether the LLM was reached.

## Safety outcome

No nonce-6 transaction was submitted. No recovery-validation transaction was submitted. No contract, policy, or source registry was modified. The next valid release path requires a deliberate generation whose immutable remediation and recovery fixtures bind the current target and incident, plus a remediation builder derived from the live action-9 policy effect.
