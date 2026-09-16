# @reclose/protocol-sdk

Typed protocol primitives for Reclose external agents. The SDK covers evidence
artifacts, policy manifests, lifecycle mapping, transaction preparation, fee
allocation data, and the GenLayer transport adapter.

## Build and local package

```powershell
npm run build -w @reclose/protocol-sdk
npm pack --workspace @reclose/protocol-sdk
```

The package is intentionally non-custodial: callers provide their own wallet,
transport, target ID, Kernel, and Judge addresses. Never copy a deployment
private key into an external-agent project.

See [`examples/external-agent/README.md`](../../examples/external-agent/README.md)
for the complete integration path, including policy validation, incident
submission, and asynchronous child-transaction tracking.
