# SDK API Reference

The frozen public interface is `RecloseSDK` in `packages/protocol-sdk/src/sdk.ts`; the implementation and transport adapters are in the same package. The type-parity test protects the 14-method boundary.

| Method | Purpose |
|---|---|
| `getTarget(targetId)` | Read registered target identity and configuration. |
| `getAssuranceState(targetId)` | Read current governed state and policy identity. |
| `getActivePolicy(targetId)` | Read active policy details. |
| `getIncident(incidentId)` | Read incident lifecycle and bindings. |
| `getDecision(decisionId)` | Read the canonical DecisionRecord. |
| `getDecisionView(decisionId)` | Compose decision data with GenLayer lifecycle. |
| `getEffectiveProviderStatus(targetId, resourceId)` | Read whether a governed resource is currently available. |
| `buildIncidentReport(input)` | Build a canonical incident report and fee preview. |
| `buildRecoveryReport(input)` | Build a canonical remediation/recovery report and fee preview. |
| `validateAPM(apm)` | Validate a policy manifest and return errors. |
| `hashAPM(apm)` | Return its canonical RFC8785/JCS + Keccak-256 hash. |
| `diffAPM(from, to)` | Compare policy authority and effects. |
| `trackTransaction(txId)` | Read transaction lifecycle and execution result. |
| `trackActionTrace(actionId)` | Resolve an action's parent/child execution receipt and post-state evidence. |

Report builders return `{ report, feePreview }`; they do not sign or submit. A transport may expose `estimateTransactionFeesForWrite` with `feeValue`, full `distribution` and `messageAllocations`; preserve all returned allocation fields. The GenLayer adapter is responsible for mapping provider-specific SDK values to the Reclose transport contract.

The SDK distinguishes `CONFIRMED`, `REJECTED` and `UNDETERMINED`; GenLayer transaction lifecycle; execution result; and target post-state. Consumers must retain these distinctions. An absent or failed child receipt must never be rendered as successful execution.

For exact TypeScript types, optional fields and enum values, use `packages/protocol-sdk/src/types.ts` and `sdk.ts`. Verify changes with `npm run f1-parity:test`, `npm run sdk-product-truth:test`, and `npm run transaction-tracker:test`.
