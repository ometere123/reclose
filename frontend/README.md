# Reclose frontend

The production entry point is live by default. It loads a bundled runtime from the committed Studio-dev 61997 deployment manifest, reads contract state through the canonical Reclose SDK, and requests a browser wallet only when the reviewer connects it. No host injection or developer-console setup is required.

## Production build and hosting

```bash
npm ci
npm run frontend:build
```

The build bundles the pinned `genlayer-js@2.0.0-rc.1`, Reclose protocol SDK/compiler, `@genlayer/transaction-kit@0.1.0-rc.2`, and `@genlayer/transaction-kit-react@0.1.0-rc.2` into `dist/`. `vercel.json` publishes that static directory. Every Studio-dev request shares a FIFO throttle spaced by 2.6 seconds (under 24 requests/minute per browser runtime); calls are serialized and never automatically retried.

The Transaction Kit React adapter supplies the fee review, explicit confirmation, and lifecycle UI. Its current `submit()` omits `messageAllocations`, and its built-in tracker polls every two seconds. Reclose bridges its hook to the exact SDK-prepared write, verifies the root quote equals the estimator-produced distribution and fee value, preserves the full nested allocation tree, saves the transaction ID before tracking, and tracks at a rate below the Studio-dev cap. A mismatch blocks signing. The kit's fee-policy fingerprint covers the root distribution; the UI discloses that nested allocations are carried from the Reclose SDK profile.

The active contract generation in the committed manifest predates the `decided` source correction. Canonical reads are available, while all signing currently fails closed until that immutable deployment and policy are replaced by a verified source-matched generation. This is not a claim that the complete incident lifecycle has passed.

## Fixture preview

Fixtures are available only when explicitly requested with `?mode=preview`. The interface labels this mode as synthetic and its adapter refuses all writes. The ordinary URL always selects live mode; a failed live read never falls back to fixture data.

## Local browser

After the production build, serve `dist/` with any static server, for example:

```bash
python -m http.server 8080 -d dist
```

Then open `http://localhost:8080/#/overview`. Browser proof must use the live URL and a wallet configured for chain 61997; a local fixture screenshot is not live evidence.
