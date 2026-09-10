# Requirements Traceability Matrix

**Status:** RELEASE-CONTROL BASELINE  
**Product:** **Reclose**  
**Companion document:** Product Requirements Document  
**Governing architecture:** Research Closure & Architecture Decision Record; Master Design Package; Implementation Specification; Naming & Brand Decision Record  
**Canonical R1 network:** GenLayer Studio-dev, chain ID 61997

---

# 1. Purpose

This matrix prevents a common failure mode in ambitious products: requirements exist in documents but nobody can prove where they were implemented, how they were tested, or what evidence demonstrates completion.

Each row connects:

```text
Product requirement
 -> governing architecture/design decision
 -> implementation owner/component
 -> verification method
 -> release evidence
```

A requirement is not considered complete because code exists. It is complete when the implementation and required evidence satisfy the row.

---

# 2. Status model

During repository implementation each requirement should receive one delivery status:

- **NOT STARTED**
- **IN PROGRESS**
- **IMPLEMENTED / UNVERIFIED**
- **VERIFIED**
- **DEFERRED BY RELEASE DECISION** - allowed only for non-P0 requirements and must record rationale
- **BLOCKED**

This generated baseline does not pretend implementation has already happened. It therefore leaves delivery status to the repository/release process.

---

# 3. Release rule

For R1:

- every **P0 / R1** row must be **VERIFIED**;
- any **P1 / R1** deferment must be explicit and must not weaken an ADR invariant or the canonical demo;
- P2 requirements may move without redefining the product;
- later-release rows remain traceable now so roadmap implementation does not silently violate R1 architecture.

---

# 4. Traceability matrix
| ID | Area | Pri / Release | Governing source | Implementation / owner | Verification | Required release evidence |
|---|---|---|---|---|---|---|
| **PRD-ACC-001** | Access & onboarding | P0 / R1 | ADR-028; MDP Book VII | Frontend public routes; indexer/read SDK (Frontend) | UI test: anonymous browsing | Screenshots + route test |
| **PRD-ACC-002** | Access & onboarding | P0 / R1 | ADR-004; IS Frontend authority model | Wallet boundary; transaction builder (Frontend) | E2E read/write permission test | Recorded E2E flow |
| **PRD-ACC-003** | Access & onboarding | P0 / R1 | ADR-005; IS G0 | Network guard; wallet adapter (Frontend) | E2E wrong-network test | Test log + screenshot |
| **PRD-ACC-004** | Access & onboarding | P0 / R1 | ADR-004; MDP target registration | Target onboarding wizard (Frontend/Protocol) | E2E owner onboarding | Screen recording |
| **PRD-ACC-005** | Access & onboarding | P1 / R1 | ADR-001; Naming Record | Onboarding education step (Product/Frontend) | Content review | Approved copy screenshot |
| **PRD-ACC-006** | Access & onboarding | P0 / R1 | ADR-004; ADR-010; MDP Policy UX | Authority review screen (Frontend/Protocol) | E2E + snapshot test | Signed transaction preview artifact |
| **PRD-ACC-007** | Access & onboarding | P0 / R1 | ADR-009; GenLayer querying transaction docs | Transaction tracker; local persistence (Shared) | E2E refresh/resume test | Stored tx + test report |
| **PRD-ACC-008** | Access & onboarding | P1 / R1 | ADR-028; MDP Delivery | About/deployment page (Frontend) | Link integrity test | Screenshot + link check |
| **PRD-TGT-001** | Target management | P0 / R1 | ADR-004; IS register_target | Target registration UI + Kernel (Shared) | Integration test | 61997 tx + state read |
| **PRD-TGT-002** | Target management | P0 / R1 | ADR-004; MDP Registration handshake | Kernel validation + frontend error (Protocol) | Negative contract test | Test output |
| **PRD-TGT-003** | Target management | P0 / R1 | ADR-028; MDP Console | Target detail page; read SDK (Frontend) | UI integration test | Screenshot + chain fixture |
| **PRD-TGT-004** | Target management | P0 / R1 | ADR-001; ADR-014 | Target state component (Product/Frontend) | UX review | Approved screenshots |
| **PRD-TGT-005** | Target management | P0 / R1 | ADR-004; ADR-019; IS revoke_authority | Kernel + target direct control + UI (Shared) | Contract + E2E revocation test | Tx + state proof |
| **PRD-TGT-006** | Target management | P0 / R1 | ADR-019; MDP Human Override | Reference target + UI (Shared) | Contract/E2E test | Audit event + screenshot |
| **PRD-TGT-007** | Target management | P1 / R1 | ADR-019 | Target metadata component (Frontend) | UI test | Screenshot |
| **PRD-TGT-008** | Target management | P0 / R1 | MDP Agent API; IS SDK | @reclose/protocol-sdk (SDK) | SDK integration test | Test report |
| **PRD-POL-001** | Policy management | P0 / R1 | ADR-010; IS Policy compiler | Policy builder + compiler (Frontend/SDK) | E2E policy build | Compiled policy artifact |
| **PRD-POL-002** | Policy management | P0 / R1 | ADR-010; IS compiler pipeline | Policy compiler (SDK) | Schema/unit tests | Validation report |
| **PRD-POL-003** | Policy management | P0 / R1 | ADR-010; RFC 8785 decision | Policy compiler (SDK) | Hash fixture tests | Fixture hashes |
| **PRD-POL-004** | Policy management | P0 / R1 | ADR-010; Naming/MDP schema rules | APM JSON Schema (SDK) | Schema test | Fail/pass fixtures |
| **PRD-POL-005** | Policy management | P0 / R1 | ADR-010; MDP Policy lifecycle | Policy pages + Kernel reads (Frontend) | UI/state test | Screenshots |
| **PRD-POL-006** | Policy management | P0 / R1 | ADR-010; ADR-020 | Kernel + compiler + UI (Protocol) | Contract negative test | Test output |
| **PRD-POL-007** | Policy management | P0 / R1 | ADR-004; MDP Policy Diff UX | Policy diff engine + UI (Frontend/SDK) | Fixture diff tests | Diff snapshots |
| **PRD-POL-008** | Policy management | P0 / R1 | ADR-004; ADR-030 | Kernel + transaction flow (Shared) | Contract/E2E timelock test | Tx rejection + success after warp |
| **PRD-POL-009** | Policy management | P0 / R1 | ADR-004; IS immediate safety overlays | Kernel + policy UI (Shared) | Contract test | State proof |
| **PRD-POL-010** | Policy management | P0 / R1 | ADR-010; MDP Product Interfaces | Policy viewer (Frontend) | Usability review + UI test | Screenshot |
| **PRD-POL-011** | Policy management | P1 / R1 | ADR-028 | Policy artifact viewer (Frontend) | Link/content test | Downloaded fixture |
| **PRD-POL-012** | Policy management | P0 / R1 | ADR-013; IS Target defense in depth | Compiler + Kernel validation (Protocol/SDK) | Negative fixture test | Test output |
| **PRD-REP-001** | Reporting & evidence | P0 / R1 | ADR-016 | Report page + Judge (Shared) | Integration test with unregistered wallet | Tx proof |
| **PRD-REP-002** | Reporting & evidence | P0 / R1 | ADR-012; IS Judge registry | Report builder + Judge (Shared) | Negative tests | Test report |
| **PRD-REP-003** | Reporting & evidence | P0 / R1 | ADR-011; IS EAP | Evidence builder + report UI (Frontend/SDK) | Schema/E2E test | EAP artifact |
| **PRD-REP-004** | Reporting & evidence | P0 / R1 | ADR-011 | EAP schema + builder (SDK) | Schema test | Fixture |
| **PRD-REP-005** | Reporting & evidence | P1 / R1 | ADR-011 | Evidence UI (Frontend) | Content/UX review | Screenshot |
| **PRD-REP-006** | Reporting & evidence | P0 / R1 | ADR-011; IS Judge prechecks | Judge + evidence builder (Protocol) | Unit test with call counters | Test report |
| **PRD-REP-007** | Reporting & evidence | P0 / R1 | ADR-017; ADR-026 | Transaction Kit integration + report UI (Frontend) | E2E quote test | Screenshot + quote fixture |
| **PRD-REP-008** | Reporting & evidence | P1 / R1 | ADR-017; IS zero-bond | Judge/Vault/UI (Protocol) | Contract test | Test report |
| **PRD-REP-009** | Reporting & evidence | P0 / R1 | ADR-009 | Transaction tracker + report UI (Shared) | Refresh/resume E2E test | Stored state capture |
| **PRD-REP-010** | Reporting & evidence | P1 / R1 | ADR-017 | Vault reads + UI (Shared) | Integration test | State proof + screenshot |
| **PRD-REP-011** | Reporting & evidence | P0 / R1 | ADR-002; ADR-013 | Report schema + Kernel (Protocol) | Schema/contract inspection test | Test + schema |
| **PRD-INC-001** | Incident lifecycle | P0 / R1 | ADR-028 | Incident Explorer (Frontend) | UI integration test | Screenshot |
| **PRD-INC-002** | Incident lifecycle | P0 / R1 | ADR-009; MDP Incident lifecycle | Transaction lifecycle component (Frontend) | UI unit/E2E test | Screenshot |
| **PRD-INC-003** | Incident lifecycle | P0 / R1 | ADR-008; ADR-018 | Incident timeline (Frontend) | E2E lifecycle fixture | Screenshot |
| **PRD-INC-004** | Incident lifecycle | P0 / R1 | ADR-009 | Transaction tracker/Explorer (Shared) | Integration trace test | Trace export |
| **PRD-INC-005** | Incident lifecycle | P0 / R1 | ADR-009; GenLayer docs | Transaction tracker (Shared) | Intentional UserError E2E test | Screenshot + test |
| **PRD-INC-006** | Incident lifecycle | P0 / R1 | ADR-009 | Tracker + target read SDK (Shared) | Integration test | State proof |
| **PRD-INC-007** | Incident lifecycle | P0 / R1 | ADR-008; ADR-009 | Kernel + target replay maps (Protocol) | Lifecycle duplicate tests | Test report |
| **PRD-INC-008** | Incident lifecycle | P0 / R1 | ADR-008 | Kernel safety check (Protocol) | Negative contract tests | Test report |
| **PRD-INC-009** | Incident lifecycle | P0 / R1 | ADR-008; multi-incident decision | Kernel restriction accounting (Protocol) | Multi-incident test | Test report |
| **PRD-INC-010** | Incident lifecycle | P0 / R1 | ADR-006/007; MDP uncertainty mapping | Kernel effects + policy (Protocol) | Contract test | Test report |
| **PRD-INC-011** | Incident lifecycle | P0 / R1 | ADR-002; Naming Record vocabulary | Incident Explorer (Frontend) | UI snapshot test | Screenshot |
| **PRD-INC-012** | Incident lifecycle | P0 / R1 | ADR-028 | Incident Explorer (Frontend) | UI snapshot test | Screenshot |
| **PRD-INC-013** | Incident lifecycle | P0 / R1 | ADR-011; IS stale-policy final result | Kernel (Protocol) | Contract test | Test report |
| **PRD-INC-014** | Incident lifecycle | P1 / R1 | ADR-018; v0.6 migration | Transaction Kit/Explorer (Frontend) | Lifecycle fixture test | Screenshot + test |
| **PRD-REC-001** | Recovery | P0 / R1 | ADR-015 | Kernel + recovery pages (Shared) | E2E canonical flow | Trace evidence |
| **PRD-REC-002** | Recovery | P0 / R1 | ADR-015; IS submit_recovery | Judge (Protocol) | Contract test | Test report |
| **PRD-REC-003** | Recovery | P0 / R1 | ADR-015 | Kernel (Protocol) | Recovery tests | Test report |
| **PRD-REC-004** | Recovery | P0 / R1 | ADR-015 | Kernel + target (Protocol) | Recovery test | State proof |
| **PRD-REC-005** | Recovery | P0 / R1 | ADR-015 | Kernel (Protocol) | Recovery test | State proof |
| **PRD-REC-006** | Recovery | P0 / R1 | ADR-015; multi-incident | Kernel (Protocol) | Multi-incident recovery test | Test report |
| **PRD-REC-007** | Recovery | P1 / R1 | MDP Recovery UX | Recovery UI (Frontend) | UI test | Screenshot |
| **PRD-REC-008** | Recovery | P0 / R1 | ADR-019 | Target audit + UI (Shared) | E2E override test | Audit record + screenshot |
| **PRD-EXP-001** | Explorer & audit | P0 / R1 | ADR-028; MDP Incident Explorer | Frontend + index/read SDK (Frontend) | UI integration test | Screenshot/video |
| **PRD-EXP-002** | Explorer & audit | P0 / R1 | ADR-028 | Kernel audit + SDK (Protocol/SDK) | Audit fixture test | JSON export |
| **PRD-EXP-003** | Explorer & audit | P0 / R1 | ADR-009; ADR-028 | Tracker/Explorer (Shared) | Trace test | Trace screenshot |
| **PRD-EXP-004** | Explorer & audit | P0 / R1 | ADR-011; prompt injection posture | Evidence component (Frontend) | UX/security review | Screenshot |
| **PRD-EXP-005** | Explorer & audit | P0 / R1 | Multi-incident decision | Explorer + Kernel reads (Frontend) | UI fixture test | Screenshot |
| **PRD-EXP-006** | Explorer & audit | P1 / R1 | ADR-028 | SDK/export endpoint (SDK/Frontend) | Export test | JSON artifact |
| **PRD-EXP-007** | Explorer & audit | P0 / R1 | ADR-019 | Audit component (Frontend) | UI test | Screenshot |
| **PRD-EXP-008** | Explorer & audit | P1 / R1 | ADR-028; IS deployment manifest | Deployment metadata UI (Frontend) | UI/link test | Screenshot |
| **PRD-EXP-009** | Explorer & audit | P1 / R1 | ADR-026; GenLayer v0.6 docs | Transaction detail panel (Frontend) | Fixture test | Screenshot |
| **PRD-DEV-001** | Developer & agent interfaces | P0 / R1 | MDP Agent API; IS SDK | @reclose/protocol-sdk (SDK) | SDK tests | Package build + tests |
| **PRD-DEV-002** | Developer & agent interfaces | P0 / R1 | MDP Agentic DoD | SDK (SDK) | Integration test | Test output |
| **PRD-DEV-003** | Developer & agent interfaces | P0 / R1 | MDP Agentic DoD | SDK (SDK) | Integration test | Test output |
| **PRD-DEV-004** | Developer & agent interfaces | P0 / R1 | ADR-008; MDP Agent API | SDK (SDK) | Unit/integration test | Test output |
| **PRD-DEV-005** | Developer & agent interfaces | P0 / R1 | ADR-010 | Policy compiler/SDK (SDK) | Fixture tests | Test output |
| **PRD-DEV-006** | Developer & agent interfaces | P0 / R1 | ADR-004; MDP SDK write philosophy | SDK (SDK) | Security/API test | Code review + test |
| **PRD-DEV-007** | Developer & agent interfaces | P1 / R1 | Naming Record; IS CLI | reclose CLI (SDK) | CLI integration tests | CLI transcript |
| **PRD-DEV-008** | Developer & agent interfaces | P1 / R1 | MDP skill.md | docs/skill.md (Product/SDK) | Content + integration review | Published skill |
| **PRD-DEV-009** | Developer & agent interfaces | P0 / R1 | ADR-004; MDP skill restrictions | SDK/skill split (SDK) | API surface review | Interface snapshot |
| **PRD-DEV-010** | Developer & agent interfaces | P0 / R2 | ADR-016; product interaction model | Indexer/API + SDK (Shared) | Resilience architecture test | Runbook/test evidence |
| **PRD-DEV-011** | Developer & agent interfaces | P0 / R2 | ADR-016; ADR-028 | API/indexer (Backend) | Data provenance test | API fixture + chain check |
| **PRD-DEV-012** | Developer & agent interfaces | P1 / R4 | ADR-003; MDP MCP possibility | MCP adapter (SDK) | Interface conformance test | Tool manifest |
| **PRD-SEN-001** | Sentinels | P0 / R1 | ADR-016; MDP Sentinel | sentinel package (Sentinel) | Integration test | Sentinel log + report tx |
| **PRD-SEN-002** | Sentinels | P0 / R1 | ADR-016 | Sentinel wallet/permissions (Sentinel/Protocol) | Security test | Permission test |
| **PRD-SEN-003** | Sentinels | P1 / R1 | IS Sentinel duplicate cache | Sentinel (Sentinel) | Unit + contract duplicate test | Test report |
| **PRD-SEN-004** | Sentinels | P1 / R1 | ADR-016; ADR-012 | Sentinel config (Sentinel) | Config fixture test | Config artifact |
| **PRD-SEN-005** | Sentinels | P0 / R1 | ADR-009 | Sentinel transaction watcher (Sentinel) | Restart integration test | Log + tx evidence |
| **PRD-SEN-006** | Sentinels | P1 / R2 | MDP Sentinel Observability | Sentinel metrics (Sentinel) | Metrics unit test | Metrics snapshot |
| **PRD-SEN-007** | Sentinels | P0 / R2 | ADR-016 | SDK/docs (SDK/Sentinel) | Independent setup test | Runbook + tx |
| **PRD-BEN-001** | Benchmark & product operations | P0 / R1 | ADR-027 | benchmark package (QA) | Count + runner test | Benchmark report |
| **PRD-BEN-002** | Benchmark & product operations | P0 / R1 | ADR-027; IS Benchmark R1 | benchmark scenarios (QA) | Dataset validation test | Dataset summary |
| **PRD-BEN-003** | Benchmark & product operations | P0 / R1 | ADR-027 | benchmark reporter (QA) | Report schema test | r1.md/r1.json |
| **PRD-BEN-004** | Benchmark & product operations | P1 / R1 | MDP Benchmark UI | Benchmark page (Frontend) | UI/link test | Screenshot |
| **PRD-BEN-005** | Benchmark & product operations | P0 / R1 | ADR-027; IS hard release blockers | CI/tests (QA/Protocol) | CI gate test | CI run |
| **PRD-BEN-006** | Benchmark & product operations | P1 / R1 | ADR-028; IS deployment manifest | Release metadata (Release) | Release verification test | verification.json |
| **PRD-BEN-007** | Benchmark & product operations | P0 / R1 | ADR-029; Naming Record | All components (Product/Protocol) | Architecture/code review | Release checklist |
| **PRD-INT-001** | External integrations | P1 / R3 | ADR-023 | integrations/safe (Integrations) | Security/interface tests | Audit report |
| **PRD-INT-002** | External integrations | P1 / R3 | ADR-023 | integrations/erc7579 (Integrations) | Conformance test | Test report |
| **PRD-INT-003** | External integrations | P1 / R4 | ADR-024 | integrations/erc8004 (Integrations) | Integration test | Test report |
| **PRD-INT-004** | External integrations | P1 / R3 | ADR-022 | integrations/hyperlane (Integrations) | Architecture/conformance test | Interface spec |
| **PRD-INT-005** | External integrations | P0 / R3 | ADR-008; ADR-022 | Gateway adapter (Integrations) | Negative test | Test report |
| **PRD-INT-006** | External integrations | P1 / R4 | ADR-025 | integrations/antseed (Integrations) | Dependency isolation test | Runbook/test |
| **NFR-SEC-001** | Security | P0 / R1 | INV-001; ADR-003 | Kernel/target (Protocol) | Negative contract tests | Test report |
| **NFR-SEC-002** | Security | P0 / R1 | INV-005; ADR-020 | Kernel (Protocol) | Schema/source audit | Audit checklist |
| **NFR-SEC-003** | Security | P0 / R1 | INV-002/003 | Judge/Kernel schemas (Protocol) | Schema/security test | Schema snapshot |
| **NFR-SEC-004** | Security | P0 / R1 | INV-015; GenLayer prompt-injection docs | Judge (Protocol) | Adversarial tests | Benchmark result |
| **NFR-SEC-005** | Security | P0 / R1 | ADR-012 | Judge custom validator (Protocol) | Consensus test | Test report |
| **NFR-SEC-006** | Security | P0 / R1 | INV-012 | Kernel/target/vault (Protocol) | Duplicate tests | Test report |
| **NFR-SEC-007** | Security | P0 / R1 | MDP defense in depth | Reference target/adapters (Protocol) | Negative test | Test report |
| **NFR-SEC-008** | Security | P0 / R1 | ADR-016 | Ops/Sentinel (Ops) | Security review | Secrets inventory |
| **NFR-SEC-009** | Security | P0 / R1 | ADR-011/012 | Judge (Protocol) | Source-failure tests | Test report |
| **NFR-SEC-010** | Security | P0 / R1 | ADR-011 | Product/docs (Product) | Content review | Published docs |
| **NFR-REL-001** | Reliability & liveness | P0 / R1 | ADR-016 | SDK/CLI/contracts (Shared) | Failure-mode exercise | Runbook evidence |
| **NFR-REL-002** | Reliability & liveness | P0 / R2 | ADR-016 | SDK/contracts (Shared) | Independent Reporter test | Tx evidence |
| **NFR-REL-003** | Reliability & liveness | P0 / R1 | ADR-009; GenLayer querying docs | Tracker (Shared) | Restart E2E test | Test report |
| **NFR-REL-004** | Reliability & liveness | P0 / R1 | ADR-005 | deploy scripts (Release) | Redeploy rehearsal | Deployment manifest |
| **NFR-REL-005** | Reliability & liveness | P0 / R1 | ADR-026 | fee-profile + transaction kit (Shared) | Fee-profile CI test | fee-profile.json |
| **NFR-REL-006** | Reliability & liveness | P0 / R1 | GenLayer querying docs | Tracker (Shared) | Timeout test | Test report |
| **NFR-REL-007** | Reliability & liveness | P1 / R1 | GenLayer Transaction Kit docs | Global transaction center (Frontend) | E2E navigation test | Video |
| **NFR-REL-008** | Reliability & liveness | P0 / R1 | ADR-011 | Judge (Protocol) | Source outage test | Test report |
| **NFR-UX-001** | UX & accessibility | P0 / R1 | ADR-002; Naming Record | Frontend (Frontend) | Design review | Screenshots |
| **NFR-UX-002** | UX & accessibility | P1 / R1 | Naming Record | Content/design system (Product/Frontend) | Copy review | Approved copy |
| **NFR-UX-003** | UX & accessibility | P1 / R1 | MDP UX | Frontend (Frontend) | Usability review | Screenshots |
| **NFR-UX-004** | UX & accessibility | P0 / R1 | ADR-004 | Frontend (Frontend) | E2E snapshot test | Screenshot |
| **NFR-UX-005** | UX & accessibility | P1 / R1 | IS Error model | Frontend error mapper (Frontend) | Fixture tests | Error screenshots |
| **NFR-UX-006** | UX & accessibility | P2 / R1 | PRD UX | Frontend (Frontend) | UI review | Screenshots |
| **NFR-UX-007** | UX & accessibility | P1 / R1 | PRD product surface | Frontend (Frontend) | Visual regression | Screenshots |
| **NFR-UX-008** | UX & accessibility | P0 / R1 | Accessibility baseline | Design system (Frontend) | Accessibility test | Audit report |
| **NFR-UX-009** | UX & accessibility | P1 / R1 | Accessibility baseline | Frontend (Frontend) | axe/manual test | Accessibility report |
| **NFR-UX-010** | UX & accessibility | P1 / R1 | Naming & Brand Decision Record | Design system (Frontend/Product) | Design review | Design approval |
| **NFR-PERF-001** | Performance | P2 / R1 | Product quality goal | Frontend (Frontend) | Performance test | Lighthouse/report |
| **NFR-PERF-002** | Performance | P0 / R1 | ADR-009 | Frontend tracker (Frontend) | E2E latency test | Video |
| **NFR-PERF-003** | Performance | P2 / R1 | Product architecture | Frontend/indexer (Frontend) | Network test | Trace report |
| **NFR-PERF-004** | Performance | P1 / R1 | ADR-016 | Sentinel (Sentinel) | Config test | Config artifact |
| **NFR-PERF-005** | Performance | P1 / R1 | GenLayer Transaction Kit docs | Frontend (Frontend) | E2E test | Video |
| **NFR-PERF-006** | Performance | P1 / R1 | ADR-027 | Benchmark runner (QA) | Schema test | Benchmark report |
| **NFR-OBS-001** | Observability & support | P0 / R1 | ADR-005; ADR-028 | Deployment tooling (Release) | Manifest schema test | Manifest |
| **NFR-OBS-002** | Observability & support | P1 / R1 | ADR-028 | All services (Shared) | Trace correlation test | Log bundle |
| **NFR-OBS-003** | Observability & support | P2 / R2 | Business/product ops | Frontend analytics (Frontend) | Failure-mode test | Config/runbook |
| **NFR-OBS-004** | Observability & support | P0 / R2 | Security/privacy principle | Analytics (Product/Ops) | Privacy review | Data inventory |
| **NFR-OBS-005** | Observability & support | P1 / R2 | MDP Sentinel Observability | Sentinel (Sentinel) | Metrics test | Metrics snapshot |
| **NFR-OBS-006** | Observability & support | P1 / R1 | ADR-005; IS Studio limitation | About/status page (Frontend/Product) | Content/link test | Screenshot |
| **NFR-CMP-001** | Compatibility & portability | P0 / R1 | ADR-005 | Toolchain/deploy/frontend (Release) | G0 test | Preflight log |
| **NFR-CMP-002** | Compatibility & portability | P0 / R1 | IS G0 | Toolchain (Release) | Smoke test | Locks + tx |
| **NFR-CMP-003** | Compatibility & portability | P0 / R1 | IS canonical types | packages/protocol-sdk/schemas (Shared) | Build/interface test | Package graph |
| **NFR-CMP-004** | Compatibility & portability | P1 / R3 | ADR-022 | Gateway abstraction (Integrations) | Architecture test | Interface spec |
| **NFR-CMP-005** | Compatibility & portability | P1 / R1 | Naming & Brand Decision Record | Repository naming (Shared) | Code review | Repository snapshot |
| **NFR-CMP-006** | Compatibility & portability | P0 / R1 | IS RC compatibility change | CI/release tooling (Release) | Upgrade rehearsal | CI + change record |
| **PRD-EVO-001** | Self-evolution roadmap | P0 / R1 | ADR-021 | Repository/R1 scope (Protocol) | Code review | Release checklist |
| **PRD-EVO-002** | Self-evolution roadmap | P1 / R1 | ADR-021; IS hooks | Versioned modules (Protocol) | Interface test | Schema/test |
| **PRD-EVO-003** | Self-evolution roadmap | P0 / R5 | ADR-021 | EvolutionCoordinator/Kernel (Protocol) | Formal/invariant tests | R5 test report |
| **PRD-EVO-004** | Self-evolution roadmap | P1 / R5 | ADR-021 | Evolution stack (Protocol) | Lifecycle tests | R5 release evidence |
| **PRD-BIZ-001** | Business & ecosystem | P0 / R2 | ADR-029 | Open protocol + SDK (Product) | Self-host test | Runbook |
| **PRD-BIZ-002** | Business & ecosystem | P1 / R2 | ADR-029 | Managed service layer (Product/Ops) | Architecture resilience test | Runbook |
| **PRD-BIZ-003** | Business & ecosystem | P1 / R2 | ADR-025; MDP Ecosystem API | SDK/contracts (SDK) | Integration test | API/docs |
| **PRD-BIZ-004** | Business & ecosystem | P0 / R1 | ADR-027; Naming Record | Docs/marketing (Product) | Content review | Approved copy |

# 5. Coverage summary

Total traced requirements: **156**

## By priority

| Priority | Count |
|---|---:|
| P0 | 108 |
| P1 | 44 |
| P2 | 4 |

## By release

| Release | Count |
|---|---:|
| R1 | 135 |
| R2 | 11 |
| R3 | 5 |
| R4 | 3 |
| R5 | 2 |

## By product area

| Area | Count |
|---|---:|
| Access & onboarding | 8 |
| Target management | 8 |
| Policy management | 12 |
| Reporting & evidence | 11 |
| Incident lifecycle | 14 |
| Recovery | 8 |
| Explorer & audit | 9 |
| Developer & agent interfaces | 12 |
| Sentinels | 7 |
| Benchmark & product operations | 7 |
| External integrations | 6 |
| Security | 10 |
| Reliability & liveness | 8 |
| UX & accessibility | 10 |
| Performance | 6 |
| Observability & support | 6 |
| Compatibility & portability | 6 |
| Self-evolution roadmap | 4 |
| Business & ecosystem | 4 |

---

# 6. R1 release evidence pack

A complete R1 release should assemble the following evidence so the matrix can be closed without relying on verbal claims.

## 6.1 Protocol evidence

- contract source commit;
- exact toolchain and runner locks;
- contract schema/linter results;
- 61997 deployment transactions and addresses;
- active policy key/hash;
- canonical incident/recovery transaction traces;
- target pre/post-state reads;
- duplicate/lifecycle test reports;
- multi-incident test report;
- security/invariant test results.

## 6.2 Product evidence

- owner onboarding screen recording;
- authority review/policy-diff screenshots;
- target page;
- incident report flow;
- Incident Explorer showing evidence, judgment, consequence and execution separately;
- provisional vs final treatment where enabled;
- recovery flow;
- finalized-error UX example;
- mobile/responsive and accessibility evidence.

## 6.3 Developer evidence

- SDK package build/test;
- CLI transcript;
- `skill.md`;
- policy compiler/hash fixtures;
- transaction refresh/resume test;
- machine-readable incident/audit export.

## 6.4 Sentinel evidence

- reference Sentinel configuration;
- source polling/report submission log;
- process-restart transaction resume test;
- proof Sentinel wallet has no target-control authority.

## 6.5 Benchmark and release evidence

- 50+ scenario benchmark dataset;
- benchmark report JSON/Markdown;
- class-level metrics;
- fee-profile artifact;
- deployment manifest;
- benchmark, fee-profile and source hashes;
- canonical demo run from clean state at least twice.

---

# 7. Change-control rule

When a PRD requirement changes:

1. update the Product Requirements Document;
2. determine whether an ADR/MDP/Implementation Specification change is required;
3. update this matrix row;
4. update or add verification;
5. update required release evidence;
6. if the change weakens a locked invariant, reopen the relevant ADR instead of silently changing implementation.

When implementation changes without changing product behaviour, update implementation/test/evidence references in this matrix but do not rewrite the PRD requirement unnecessarily.

---

# 8. Why this matrix matters for the Codex / Claude Code split

If Reclose uses specialized coding agents, the matrix becomes the shared definition of completeness.

A practical ownership model is:

- **Codex / protocol engineering:** contracts, Kernel, Judge, Vault, reference agent, policy compiler semantics, SDK protocol semantics, Sentinel core, fees, tests, deployment and integrations.
- **Claude Code / frontend design:** product UX, dashboard, policy builder, Incident Explorer, recovery UX, responsive/accessibility and visual system.
- **Shared boundary:** transaction tracker, schemas, SDK interfaces, error mapping and release acceptance.

Neither tool owns product truth. The governing documents and verified protocol state do.

The matrix allows each implementation phase to be reviewed by asking:

> Which requirement IDs does this commit close, which tests prove them, and what release evidence was produced?

That is substantially safer than telling an agent to "finish the frontend" or "finish the protocol" with no objective closure criteria.

---

# 9. Matrix closure condition

The R1 matrix is closed when every P0/R1 requirement is VERIFIED, all mandatory evidence exists, all hard invariant tests pass, the canonical 61997 scenario is reproducible, and no release claim depends on undocumented manual intervention or an unverified UI assumption.

The matrix should remain in the repository after Agent Tank. It becomes the living bridge from Reclose's product intent to implementation evidence.
