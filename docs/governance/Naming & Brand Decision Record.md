# Naming & Brand Decision Record

**Status:** LOCKED  
**Date:** 8 September 2026  
**Product name:** **Reclose**  
**Product category:** Autonomous Protocol Assurance  
**Hackathon track:** Autonomous Protocols  
**Canonical network for Agent Tank:** GenLayer Studio-dev, chain ID 61997

---

## 1. Purpose

This document establishes **Reclose** as the canonical product name and records the reasoning, brand meaning, usage rules, collision research, and conditions under which the naming decision could ever be reopened.

The naming decision comes after closure of the product thesis, protocol architecture, and implementation specification. The name therefore describes an already-defined product rather than attempting to shape an unfinished idea.

The technical documents remain authoritative for protocol behaviour. This record is authoritative for product identity.

---

## 2. Decision

The product is named:

# Reclose

The canonical styling is **Reclose**.

Not:

- RECLOSE as the default wordmark in prose;
- ReClose;
- Re-Close;
- Reclose AI;
- Reclose Agent;
- Reclose Protocol as the main product name;
- Reclose Network as the main product name.

The product may be described as:

> **Reclose - runtime assurance for autonomous protocols.**

or:

> **Reclose - autonomous protocol assurance for the agentic economy.**

The descriptor is explanatory. It is not part of the legal/product name.

---

## 3. Why the name fits the product

A recloser is protection equipment used in electrical distribution systems. When a fault is detected, the system interrupts the circuit, isolates danger, evaluates whether service can safely resume, and can reclose to restore operation. In more advanced restoration systems, protective switching is combined with isolation, fallback paths and controlled service restoration.

That sequence closely mirrors Reclose's protocol architecture:

```text
observe abnormal condition
        |
        v
collect evidence
        |
        v
GenLayer judges the condition
        |
        v
isolate / restrict / safe mode
        |
        v
continue through a safe path where possible
        |
        v
verify remediation
        |
        v
recovery
        |
        v
restore normal operation
```

The name therefore represents more than stopping a system. It represents **protection with restoration**.

That distinction is central to the product. Reclose is not merely a kill switch. It is designed to let autonomous economic systems reduce authority, isolate unsafe dependencies, continue through approved fallbacks, and restore normal operation when recovery is established.

Electrical reclose terminology is established in grid protection and automation. ABB documents automatic reclose sequences that either restore service or lock out when a fault persists. Schweitzer Engineering Laboratories describes fault location, isolation and service restoration workflows in which switching isolates faulted zones and restores unaffected service. These are conceptually aligned with the product's state-machine approach.

Sources:

- ABB, *SPRREC Reclose sequence examples*: https://techdoc.relays.protection-control.abb/r/REC615-Technical-Manual/PCL1/en-US/SPRREC-Reclose-sequence-examples
- SEL, *Fault Location, Isolation, and Service Restoration*: https://selinc.com/solutions/p/flisr/
- Wiktionary, *reclose*: https://en.wiktionary.org/wiki/reclose

---

## 4. Brand thesis

Reclose should stand for five ideas.

### 4.1 Bounded autonomy

Autonomous systems should be powerful enough to operate without constant human intervention, but their authority must remain explicitly bounded.

### 4.2 Evidence before intervention

A consequential runtime change should be traceable to evidence and a rule, not an opaque administrator or hidden model output.

### 4.3 Continuity, not panic

The default safety story is not "shut everything down." Where policy allows, the system should isolate the problem and maintain safe operation through fallback paths.

### 4.4 Recovery is part of security

A mature protection system does not stop at containment. It specifies how normal operation can be restored and what evidence is required.

### 4.5 Authority is certain even when the world is not

The environment may be ambiguous. The system's permitted actions must not be.

This is captured in the product's core architectural statement:

> **GenLayer determines the judgment. The policy determines the consequence. The Kernel enforces the boundary.**

---

## 5. Why the name is preferable to generic security names

The adjacent market is crowded with names built around obvious security metaphors such as Guard, Shield, Sentinel, Warden, Bastion, Circuit, Fuse and Control Plane.

Those names tend to create three problems:

1. they sound interchangeable;
2. they over-emphasise blocking rather than safe continuation and recovery;
3. they often collide with existing cybersecurity, crypto or agent-security products.

Reclose is more specific to the product behaviour. It carries an engineering meaning while still sounding like a standalone software product.

The name also avoids common AI/Web3 naming patterns such as:

- AgentGuard;
- AutoShield;
- IntelligentGuardian;
- AutonomousSafetyLayer;
- ChainSentinel;
- TrustAgent;
- GenGuard.

Those are rejected as primary brand directions.

---

## 6. Collision research

A public-web collision search was performed around combinations of:

- "Reclose" + AI;
- "Reclose" + agent;
- "Reclose" + autonomous agent;
- "Reclose" + security;
- "Reclose" + blockchain;
- "Reclose" + crypto;
- "Reclose" + protocol;
- "Reclose" + runtime assurance.

### 6.1 Same-category collision result

No current product was found in the target niche using **Reclose** as its product name for:

- autonomous-agent runtime assurance;
- AI-agent security/control;
- blockchain runtime assurance;
- smart-account agent guardrails;
- autonomous-protocol safety;
- GenLayer ecosystem infrastructure.

This is the relevant collision test for product differentiation.

### 6.2 Broader uses found

Broader uses do exist.

- **Reclose SG** appears in public enterprise-software/customer databases as an unrelated Singapore organisation. It was not found operating in autonomous-agent security, crypto runtime assurance, or the GenLayer ecosystem.
- **Reclose** is an ordinary English verb meaning to close again.
- **Reclose/recloser** is established electrical-engineering terminology.
- Historical and product-level uses of "Reclose" exist in electrical equipment contexts.

Public reference:

- Reclose SG profile: https://www.appsruntheworld.com/customers-database/customers/view/reclose-sg-singapore

These broader uses do not undermine the product metaphor, but they mean Reclose is not an invented dictionary-free word.

---

## 7. Trademark and legal status

The public-web collision review is **not a legal trademark clearance opinion**.

Before incorporation, trademark filing, major marketing spend, or a production commercial launch, counsel or a competent trademark specialist should perform jurisdiction-specific clearance across at least:

- WIPO Global Brand Database;
- USPTO;
- EUIPO;
- UKIPO;
- Nigerian trademark records;
- relevant company-name registries;
- relevant software, SaaS, financial-services and blockchain classes.

The product may proceed under Reclose as its locked working and ecosystem name unless professional clearance identifies a material conflict.

A legal conflict meeting that threshold is one of the few valid reasons to reopen this record.

---

## 8. Domain, package and handle policy

Domain and social availability change continuously and are not considered permanently established by search-engine results.

Before public launch, the release checklist must verify live availability or acquisition status for:

- primary web domain;
- GitHub organisation/repository;
- npm package namespace;
- PyPI namespace if required;
- X/Twitter handle;
- Discord/community naming;
- documentation subdomain.

A missing exact-match `.com` does not automatically invalidate Reclose. A coherent domain strategy may use an appropriate modifier while preserving the product name itself.

The product MUST NOT be renamed merely to obtain an exact-match domain unless the available alternatives create material trust or usability problems.

---

## 9. Pronunciation

Canonical pronunciation:

> **ree-KLOHZ**

The word should be spoken as the English verb "reclose".

The brand should not require a pronunciation guide in normal product material.

---

## 10. Canonical naming architecture

The root brand remains **Reclose**.

Technical concepts keep neutral names rather than being unnecessarily branded.

Correct examples:

- Reclose
- Reclose Explorer
- Reclose documentation
- Reclose SDK
- Reclose CLI
- Reclose Sentinel service, if a managed monitoring product is later launched

Technical primitives remain:

- AssuranceKernel
- IncidentJudge
- Autonomous Policy Manifest (APM)
- Evidence Artifact Package (EAP)
- DecisionRecord
- ActionEnvelope
- EvolutionEnvelope

They SHOULD NOT become:

- RecloseKernel;
- RecloseDecisionRecord;
- RecloseActionEnvelope;
- RecloseAPM;

unless implementation language requires a namespace to avoid collisions.

The architecture should remain legible as an open protocol rather than a wall of branded terminology.

---

## 11. Repository naming

The preferred repository root name is:

```text
reclose
```

If an organisation repository namespace is used:

```text
reclose/reclose
```

or an equivalent owner namespace.

Package names should be functional:

```text
@reclose/protocol-sdk
@reclose/policy-compiler
@reclose/evidence-builder
@reclose/transaction-tracker
```

The CLI command should be:

```text
reclose
```

rather than the earlier placeholder `assure` once the package namespace is available.

---

## 12. Product vocabulary

Preferred language:

- protected target;
- policy;
- incident;
- evidence;
- judgment;
- restriction;
- safe mode;
- recovery;
- restoration;
- runtime assurance;
- autonomous protocol;
- bounded authority.

Avoid inflated language such as:

- omniscient AI guardian;
- autonomous superintelligence layer;
- trustless AI firewall;
- unstoppable security brain;
- self-healing AI blockchain.

The brand should communicate precision rather than hype.

---

## 13. Visual-brand direction

This record does not freeze a complete visual identity, but it defines the design principles the frontend must follow.

### 13.1 Desired feel

Reclose should feel:

- engineered;
- calm;
- consequential;
- operational;
- modern;
- trustworthy;
- alive without looking playful.

### 13.2 Avoid

The visual language SHOULD NOT default to:

- black-and-purple generic Web3 gradients;
- glowing AI brains;
- robot mascots;
- cyberpunk circuitry for decoration;
- shield logos;
- padlock logos;
- obvious lightning-bolt logos;
- excessive glassmorphism;
- dashboard screens made entirely of identical cards.

### 13.3 Product-native visual motifs

Good source material includes:

- state transitions;
- controlled switching;
- fault isolation;
- route continuity;
- protection zones;
- recovery traces;
- evidence-to-action causal chains;
- system topology.

The UI should make the state machine and causal trace visually memorable.

---

## 14. Logo direction

The logo must not simply be an electrical breaker icon.

The electrical metaphor should inform the product, not trap it in utility-industry branding.

Promising directions may explore:

- interruption and reconnection;
- two paths becoming one safe path;
- a controlled gap;
- an open state resolving into a closed state;
- topology/routing;
- a restrained `R` mark built around continuity.

The final logo is outside this decision record and should be developed during frontend/brand design.

---

## 15. Tagline policy

No marketing tagline is locked by this document.

The canonical descriptive line for technical material is:

> **Runtime assurance for autonomous protocols.**

A broader ecosystem descriptor may be:

> **Autonomous protocol assurance for the agentic economy.**

Potential marketing language may be explored later, but it must not obscure the actual product.

---

## 16. One-sentence product definition

> **Reclose lets autonomous protocols change behaviour safely when real-world conditions change: GenLayer judges the evidence, while deterministic policy limits exactly what the system may do.**

---

## 17. Short product definition

> **Reclose is runtime assurance for autonomous economic systems. Protected protocols pre-authorize bounded responses to defined incident conditions. Permissionless reporters submit evidence, GenLayer reaches a decentralized judgment, and Reclose deterministically applies only the response authorized beforehand, including restriction, safe mode, recovery and restoration.**

---

## 18. Relationship to the Agent Tank track

Reclose belongs in **Autonomous Protocols** because authority is delegated before the event and the protocol can respond without requiring a fresh community vote for each incident.

Its core autonomous loop is:

```text
policy
  -> evidence
  -> GenLayer judgment
  -> bounded intervention
  -> verified recovery
```

The product therefore demonstrates a system that governs its own operating state under predefined authority.

---

## 19. Relationship to the agentic economy

Reclose is designed for systems that increasingly possess:

- funds;
- wallets;
- service-provider dependencies;
- delegated permissions;
- API access;
- autonomous execution loops.

Static authorization answers whether an action is ordinarily allowed.

Reclose addresses the harder runtime question:

> **Has the operating world changed enough that those permissions should change now?**

This boundary is what makes the product relevant beyond the hackathon.

---

## 20. Naming red lines

The following are prohibited without reopening this record:

1. Renaming the product because another name sounds temporarily fashionable.
2. Adding `AI` to the canonical product name.
3. Adding `Agent`, `Chain`, `Gen`, `Protocol`, `Guard`, `Shield` or `Sentinel` to the main name merely for descriptive SEO.
4. Rebranding the technical category as the product name.
5. Using inconsistent capitalisation.
6. Calling future versions `Reclose AI` or `Reclose Network` without a product-architecture reason.

---

## 21. Reopening criteria

The Reclose naming decision may be reopened only if one of these occurs:

### N1 - Material legal conflict

Professional trademark/legal clearance finds a material conflict in a jurisdiction important to launch.

### N2 - Direct category collision

A prior or materially stronger product is verified to have an enforceable or established claim to **Reclose** in autonomous-agent security, autonomous-protocol assurance or an effectively identical market.

### N3 - Material linguistic problem

Evidence emerges that the name causes a serious pronunciation, cultural, or reputational issue in a primary launch market.

### N4 - Acquisition/corporate constraint

A future corporate transaction legally requires brand separation.

The following do **not** reopen the decision:

- preference for a newer name;
- domain envy;
- a competitor using similar imagery;
- a designer wanting a more futuristic word;
- desire to make the name sound more explicitly "AI" or "Web3".

---

## 22. Documentation patch requirements

The following documents must be updated after this decision:

1. **Research Closure & Architecture Decision Record**
2. **Master Design Package**
3. **Implementation Specification**

Required changes:

- set product name to **Reclose**;
- remove statements that the product name remains open;
- retain the decision that no project token is introduced now and future token necessity remains intentionally unresolved;
- update placeholder CLI/package naming to Reclose where it is branding rather than protocol semantics;
- retain `Autonomous Protocol Assurance` as the category;
- do not rename technical primitives merely for branding.

---

# 23. Final brand decision

The product is **Reclose**.

The name is considered locked for the Agent Tank build and post-hackathon ecosystem product.

The brand is built around a simple engineering idea:

> **detect danger, isolate it, preserve safe operation, prove recovery, restore service.**

That is what the product does.

And that is why the name fits.
