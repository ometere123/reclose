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
| product tests | `scripts/test-frontend-product.js` | D1-D4/I1-I2 source/integration assertions |
| SDK truth tests | `scripts/test-sdk-product-truth.js` | post-state/asOfBlock/incident/action receipt negative cases |
| autonomous-agent skill | `skill.md`, `scripts/test-agent-skill.js` | bounded machine interface and explicit no-authority-expansion rules |
| adversarial matrix | `benchmark/r1-scenarios.json` | H1 threat-mapped benchmark corpus and explicit live blockers |
| benchmark gate | `scripts/check-r1-benchmark.js` | scenario count/mapping/evidence reference integrity without converting live blockers to PASS |
| A3 requirement map | `docs/execution/audit-packets/A3/requirements.csv` | product/developer requirement implementation and remaining verification boundary |
| A3 threat delta | `docs/execution/audit-packets/A3/threat-delta.md` | product security controls and browser/live verification boundary |
| compatibility review | `docs/execution/audit-packets/A3/compatibility-findings.md` | 61997/toolchain/product-truth compatibility findings |
| architecture deviation review | `docs/execution/audit-packets/A3/architecture-deviations.md` | no active product architecture deviation identified |
| browser evidence index | `docs/execution/audit-packets/A3/screenshots-recordings-index.md` | exact external capture set, currently NOT RUN rather than fabricated |
| A2 review | `docs/execution/audit-packets/A2-attempt-2/AUDIT_DECISION.md` | authority to proceed into product phases and carried conditions |
| live limitation | `docs/execution/R1 Live Proof Evidence.md`, `deployment/61997/r1-manifest.json` | current Studio-dev child-routing failure and final deployed addresses |
| fee profile preparation | `release-evidence/r1/c3/fee-profile-input.json`, `scripts/check-final-fee-profile.mjs` | final-address binding and strict remaining live-profile gate |
| E1 evidence contract | `release-evidence/r1/e1/README.md`, `run-template.json`, `scripts/check-e1-evidence.mjs` | two-clean-run end-to-end release standard |
| external execution handoff | `docs/execution/External Execution Handoff.md` | exact browser/live-only remaining operations |
| release claim matrix | `docs/execution/R1 Release Claim Matrix.md` | allowed versus prohibited evidence-backed product claims |
| final product CI | GitHub Actions on frozen A3 candidate | insert exact successful run after candidate SHA is frozen |

Screenshots/recordings, final live fee profile and successful E1 runs are intentionally not listed as completed until they actually exist.
