# External-agent integration

Reclose is non-custodial. An external agent keeps its own wallet, business logic, providers, and treasury. It adds a small target adapter that accepts only the typed actions its owner has authorized.

## Fast path

1. Deploy `target_adapter.py` with your owner address, a unique target ID, and the addresses of your approved providers.
2. Call `set_assurance_controller` on the target with the Reclose Kernel address.
3. Have the target owner register the target with `register_target(targetId, targetAddress, true)`.
4. Copy `policy.apm.json`, replace the target ID and Judge address, then validate and compile it:

```powershell
node packages/cli/bin/reclose.js policy validate examples/external-agent/policy.apm.json
node packages/cli/bin/reclose.js policy compile examples/external-agent/policy.apm.json
```

5. Submit the compiled Kernel calls with the target owner signer, wait for the real activation delay, and verify the active policy hash/readback.
6. Run a Reporter or Sentinel that calls `buildIncidentReport`, signs `submit_incident`, and tracks the resulting transaction and action traces.

The external agent should use its own signer. Never share the Reclose deployment key or copy it into a customer project.

## Runtime integration

### Runnable Reporter

After copying the final deployment config and placing the external agent's own key in a local env file:

```powershell
$env:RECLOSE_DEPLOYMENT_CONFIG = "deployment/61997/reclose-r1-final.json"
$env:RECLOSE_SIGNER_ENV_FILE = ".env.external-agent"
$env:RECLOSE_EVIDENCE_URL = "<exact-commit-pinned-evidence-url>"
$env:RECLOSE_EVIDENCE_HASH = "<keccak-256-of-the-fetched-bytes>"
node examples/external-agent/reporter.mjs
```

The command persists a prepared payload before signing, then persists the root transaction hash immediately and records its direct children. Continue polling each child recursively with the SDK tracker; a finalized parent is not proof that a target action succeeded.

```ts
import { createClient, chains } from "genlayer-js";
import { createRecloseClient } from "@reclose/protocol-sdk";

const gl = createClient({ chain: { ...chains.studioDevnet, id: 61997 } });
const reclose = createRecloseClient({
  transport: {
    getChainId: () => gl.getChainId(),
    getBlockNumber: () => gl.getBlockNumber(),
    readContract: (args) => gl.readContract(args),
    getTransaction: (args) => gl.getTransaction(args),
    getTriggeredTransactionIds: (args) => gl.getTriggeredTransactionIds(args),
  },
  addresses: {
    kernel: process.env.RECLOSE_KERNEL!,
    judge: process.env.RECLOSE_JUDGE!,
  },
});

const state = await reclose.getAssuranceState(process.env.RECLOSE_TARGET_ID!);
const provider = await reclose.getEffectiveProviderStatus(
  process.env.RECLOSE_TARGET_ID!,
  "provider_a",
);

const prepared = await reclose.buildIncidentReport({
  targetId: process.env.RECLOSE_TARGET_ID!,
  ruleId: "PROVIDER_COMPROMISE_V1",
  resourceId: "provider_a",
  evidenceSources,
});

// Sign and submit prepared.report with the agent's Reporter wallet.
// Then use trackTransaction() and trackActionTrace() for final truth.
```

## Trust model

- The Reporter supplies evidence, not consequences.
- The Judge produces a constrained outcome.
- The Kernel permits only actions in the active policy.
- The target independently validates every action.
- Child transactions are asynchronous and must be tracked separately.

This directory is a real integration starter, not a hosted service or a production audit. Replace the example provider/business logic, configure your own source registry, and complete a live incident/recovery rehearsal before production use.
