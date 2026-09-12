# A3 Evidence Index

| Evidence | Location | Claim supported |
|---|---|---|
| product design/IA | `docs/design/Product UI Specification.md` | D1 visual/information architecture and accessibility baseline |
| frontend shell | `frontend/index.html`, `frontend/styles.css` | semantic/responsive/reduced-motion/focus implementation |
| product routes/flows | `frontend/app.js` | D2/D3 read/write/recovery surfaces and five-band explorer |
| fixture/live adapters | `frontend/lib/adapters.js` | I1/I2 boundary, fixture write refusal, SDK delegation |
| tx persistence | `frontend/lib/persistence.js` | persist-before-poll and no blind retry |
| product truth helpers | `frontend/lib/domain.js` | lifecycle/execution separation and escaped rendering |
| SDK product truth | `packages/protocol-sdk/src/client.ts` | real block height, incident outcome preservation, action receipt truth |
| GenLayer transport | `packages/protocol-sdk/src/genlayerAdapter.ts` | live block height and raw transaction mapping |
| product tests | `scripts/test-frontend-product.js` | D1-D4/I1-I2 static/integration assertions |
| SDK truth tests | `scripts/test-sdk-product-truth.js` | post-state/asOfBlock/incident/action receipt negative cases |
| adversarial matrix | `benchmark/r1-scenarios.json` | H1 threat-mapped benchmark plan and explicit live blockers |
| A2 review | `docs/execution/audit-packets/A2-attempt-2/AUDIT_DECISION.md` | authority to proceed into product phases and carried conditions |
| live limitation | `docs/execution/R1 Live Proof Evidence.md` | current Studio-dev child-routing failure evidence |
| final product CI | GitHub Actions on frozen A3 candidate | must be inserted after candidate SHA is frozen |

Screenshots/recordings are intentionally not listed as present until captured from a running browser.
