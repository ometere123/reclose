# Reclose frontend

The frontend is the Reclose control room, not an enforcement engine. It must never become a second policy/Judge implementation or replace missing protocol truth with optimistic UI state.

## Current product surfaces

- Overview / assurance posture
- Targets list and target detail
- Policy viewer and authority-diff review
- Incidents list
- Five-band Incident Explorer: evidence -> judgment -> consequence -> execution -> recovery
- Benchmark / release evidence surface
- Deployment/runtime truth surface
- Target onboarding review
- Incident report + fee/bond preview
- Policy author/review flow
- Remediation/recovery preview
- Persistent pending-transaction queue

The app is framework-free by design at R1: standards-based HTML/CSS/ES modules, no browser build dependency and no extra client-side trust layer. `frontend/lib/adapters.js` exposes two modes:

1. `MockProductAdapter` for validated synthetic F1/I1 fixtures. It **cannot submit writes**.
2. `SdkProductAdapter` for a host-injected frozen `RecloseSDK`, optional index/evidence adapter and least-privilege wallet writer.

A host enables live mode before loading `app.js` by assigning:

```js
globalThis.__RECLOSE_PRODUCT_RUNTIME__ = {
  sdk,       // RecloseSDK
  writer,    // optional wallet-backed bounded write adapter
  indexer,   // optional discovery/release-evidence convenience adapter
  trackTransaction // optional tx poll function
};
```

Without that object the UI visibly remains in fixture mode. It never silently falls back from a failed live read to mock chain state.

## Run locally

Any static server works, for example:

```bash
python -m http.server 8080 -d frontend
```

Then open `http://localhost:8080/#/overview`.

## Verification

`npm run frontend:test` verifies required D1-D4/I1-I2 surfaces, truth separation, XSS-safe evidence rendering, transaction persistence-before-polling and accessibility primitives. It is part of the root `npm run verify:js` gate.

Browser screenshots, keyboard walkthroughs and real SDK runtime evidence belong in the A3 packet and must be captured from the deployed product rather than fabricated from fixtures.
