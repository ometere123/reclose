# Reclose Product UI Specification

Status: D1 implementation baseline

## Product posture

Reclose is operational assurance infrastructure, not a trading terminal and not an AI toy. The interface must make causal protocol truth inspectable under pressure. Its visual language is matte instrumentation, Swiss technical editorial composition and restrained state signalling.

The primary user question is always:

> What happened, what did GenLayer decide, what authority did policy permit, what actually executed, and what remains before recovery?

## Information architecture

Primary navigation:

1. **Overview** - assurance posture, open incidents, execution failures and deployment health.
2. **Targets** - governed protocols and effective capabilities.
3. **Incidents** - incident list and flagship causal explorer.
4. **Policies** - active policy, authority envelope, diff and activation state.
5. **Benchmark** - release/security scenario corpus and evidence status.
6. **System** - chain, deployment, SDK/indexer health and known live limitations.

Write flows are contextual rather than top-level destinations:

- onboard target from Targets;
- author/review/activate policy from Policies;
- report incident from Target or Incidents;
- submit remediation/recovery from Incident Explorer.

## Truth hierarchy

Never collapse these concepts into one badge:

- GenLayer raw transaction status;
- protocol decision outcome;
- decision stage;
- execution result;
- target assurance state;
- post-state verification.

Every transaction view keeps raw lifecycle values visible. Human labels are secondary.

## Incident Explorer anatomy

The explorer is a five-band causal record:

1. **Claim & evidence** - Reporter, rule, evidence artifact, source authority and hash.
2. **Judgment** - GenLayer transaction lifecycle, provisional/final stage, condition code and DecisionOutcome.
3. **Policy consequence** - matched policy/rule, bounded effects and authority explanation.
4. **Execution** - parent/child trace, execution result, post-state verification and failures.
5. **Recovery** - remediation evidence, recovery validation, remaining restrictions and restoration eligibility.

Bands remain visually distinct even when one is unavailable or externally blocked.

## State language

Colour is never the sole carrier. Each state has a text label and geometric marker:

- NORMAL - open circle, "normal"
- MONITORED - dot-in-circle, "monitored"
- RESTRICTED - horizontal bar, "restricted"
- SAFE_MODE - double bar, "safe mode"
- PAUSED - solid square, "paused"
- RECOVERY - split circle, "recovery"

Decision outcomes use words exactly: CONFIRMED, REJECTED, UNDETERMINED.
Decision stages use words exactly: PROVISIONAL, FINAL.
Execution uses SUCCESS, FAILURE, UNKNOWN separately from lifecycle status.

## Visual tokens

Typography:

- UI/display: system grotesk stack with high legibility and no web-font dependency.
- technical values: system monospace stack.
- large headings are restrained, sentence case and left aligned.

Core spacing unit: 4px. Major rhythm: 8 / 12 / 16 / 24 / 32 / 48 / 64.

Surfaces:

- page background: warm near-white / near-black in dark preference;
- panels: low-contrast matte surface;
- borders: 1px structural lines;
- radius: 2-8px, no pill-card default;
- shadows: none for ordinary hierarchy; only focus/overlay elevation.

State accent colours are subordinate to labels and icons. No gradients, glow, glassmorphism or decorative cyberpunk motifs.

## Responsive model

- >= 1180px: persistent left rail + full content grid.
- 760-1179px: compact rail/header + two-column content where meaningful.
- < 760px: top navigation drawer, single-column causal bands, sticky primary action only where it does not obscure state.

Dense tables switch to labelled record rows rather than horizontal overflow where possible.

## Accessibility baseline

- semantic landmarks: header/nav/main/footer;
- one H1 per route and ordered heading levels;
- all controls keyboard reachable;
- visible `:focus-visible` treatment with >= 3:1 focus contrast;
- status includes icon/shape + text, never colour only;
- minimum 44px touch target for primary controls;
- reduced-motion media query removes non-essential transitions;
- live transaction updates use polite `aria-live` regions;
- errors are linked to their fields and summarised at form level;
- evidence text is rendered as text only, never trusted HTML;
- transaction/hash strings wrap without forcing viewport overflow.

## Motion

Motion may explain causality, never decorate. Allowed examples:

- a newly observed child transaction appears with a short opacity/translate transition;
- provisional -> final state cross-fades once;
- recovery progress updates along the causal rail.

No looping pulse for healthy states. Reduced-motion users receive immediate state changes.

## Known-live limitation presentation

The current Studio-dev Judge -> Kernel child failure `fee no_matching_allocation # internal` must appear as an execution failure, not as a protocol judgment failure. UI copy must say that the Judge-side transaction can finalize and persist a judgment while the triggered Kernel child may still fail independently.

This distinction is mandatory for D2-D4 and A3.
