# A3 screenshots and recordings index

**Status:** NOT YET CAPTURED IN A BROWSER-CAPABLE ENVIRONMENT.

No screenshot, recording, Lighthouse score, axe report or manual keyboard result is invented by this packet. Source-level implementation and automated product checks exist, but A3 requires real browser evidence for the final accessibility/product review.

## Required capture set

| ID | Surface / state | Required evidence | Status |
|---|---|---|---|
| UI-01 | Overview/dashboard | desktop + mobile screenshot | NOT RUN |
| UI-02 | Targets list | desktop screenshot | NOT RUN |
| UI-03 | Target detail | NORMAL and restricted/safe-mode states | NOT RUN |
| UI-04 | Policy viewer/review | authority-added and authority-removed diff states | NOT RUN |
| UI-05 | Incidents list | mixed provisional/final outcomes | NOT RUN |
| UI-06 | Incident Explorer | full five-band causal view | NOT RUN |
| UI-07 | Incident Explorer failure | successful judgment + failed child execution shown distinctly | NOT RUN |
| UI-08 | Report incident | evidence validation + fee/bond preview | NOT RUN |
| UI-09 | Recovery | remediation -> RECOVERY -> validation presentation | NOT RUN |
| UI-10 | Target onboarding | authority review before signature | NOT RUN |
| UI-11 | Wrong network | 61997 mismatch write-block state | NOT RUN |
| UI-12 | Pending transaction | persisted/resumed transaction state | NOT RUN |
| UI-13 | Benchmark | methodology/scenario status view | NOT RUN |
| UI-14 | System/deployment | network + deployed-address information | NOT RUN |
| A11Y-01 | Keyboard | complete primary-flow keyboard walkthrough | NOT RUN |
| A11Y-02 | Focus | visible focus and logical order | NOT RUN |
| A11Y-03 | Reduced motion | prefers-reduced-motion recording/check | NOT RUN |
| A11Y-04 | Contrast/labels | browser accessibility inspection | NOT RUN |
| RESP-01 | Responsive | representative mobile/tablet/desktop widths | NOT RUN |

## Source-side evidence already available

- `frontend/index.html`
- `frontend/app.js`
- `frontend/styles.css`
- `frontend/lib/domain.js`
- `frontend/lib/adapters.js`
- `frontend/lib/persistence.js`
- `scripts/test-frontend-product.js`
- `docs/design/Product UI Specification.md`

The external browser run should record exact commit SHA, browser/version, viewport sizes, commands/tooling used and any discovered defects. Failures must reopen the relevant product/threat work rather than being omitted from this index.
