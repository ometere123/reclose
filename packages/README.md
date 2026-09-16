# Reclose packages

The repository contains the SDK and supporting packages used by Reclose:

```text
@reclose/protocol-sdk
@reclose/policy-compiler
@reclose/evidence-builder
@reclose/transaction-tracker
```

`@reclose/protocol-sdk` is the public integration boundary for external agents.
Build it locally with:

```powershell
npm run build -w @reclose/protocol-sdk
npm pack --workspace @reclose/protocol-sdk
```

The generated tarball contains only the compiled SDK, declarations, README, and
license. The package does not contain deployment keys or `.env.local`.
