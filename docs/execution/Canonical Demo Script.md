# Canonical Reclose R1 Demo Script

This script is designed for the Agent Tank demo. It must adapt to the evidence actually available on the day of presentation. Never narrate an unproven live step as successful.

## 1. Opening

> Reclose is runtime assurance for autonomous protocols. GenLayer judges whether the evidence satisfies a pre-agreed condition. Deterministic policy, not the model, decides what bounded consequence is allowed.

Show the product overview and the protected ReferenceAgentProtocol.

Emphasise the separation:

`evidence -> GenLayer judgment -> policy consequence -> actual execution -> recovery`

## 2. Authority before incident

Open the target/policy view.

Show:

- target and active policy;
- protected resources/providers;
- finite permitted actions;
- policy hash/version;
- Judge module/version;
- provisional containment policy;
- human-override setting.

> The Reporter cannot choose an action. The Judge cannot invent authority. The Kernel can only map a valid decision into an action already delegated by this policy.

## 3. Normal operation

If E1 live evidence exists, show the first real test-GEN purchase through Provider A and its transaction evidence.

If E1 is still blocked, label this as Direct Mode/reference behaviour rather than live 61997 proof.

## 4. Incident report

Open Report Incident.

Show:

- target/rule/resource selection;
- governed public evidence;
- canonical evidence hash/provenance;
- fee/bond preview;
- Reporter is submitting evidence, not selecting the result.

## 5. GenLayer decision

Open Incident Explorer and move through the first two causal bands:

1. claim & evidence;
2. GenLayer judgment.

Show raw GenLayer lifecycle separately from Reclose DecisionOutcome and DecisionStage.

> Accepted is not final. Finalized does not automatically mean the downstream action executed successfully.

## 6. Policy consequence and execution

Move to:

3. policy consequence;
4. actual execution.

If the live child path is fixed and E1 evidence exists:

> GenLayer decision: provider compromise confirmed. Policy consequence: Provider A restricted and safe mode entered. The child execution and resulting target state are verified here.

If the known blocker still exists:

> The Judge-side semantic path completed, but the Studio-dev triggered child failed with `fee no_matching_allocation # internal`. Reclose shows that downstream execution failure explicitly rather than pretending the confirmed judgment changed target state.

Do not use wording such as “Reclose automatically contained Provider A live” while the child remains failed.

## 7. Safe continuity

If E1 is complete, show AUTO purchase routing to Provider B with real test GEN.

This is the defining product moment:

> Assurance does not have to mean stopping everything. The target can continue through a pre-authorized safe fallback while the compromised resource stays restricted.

If E1 is not complete, show the reference/Direct Mode proof and label it accurately.

## 8. Recovery

Open recovery.

Show:

- original incident/restrictions;
- remediation evidence;
- RECOVERY state;
- recovery-validation requirement;
- restoration only after the governed validation path succeeds.

If E1 is complete, show the final NORMAL state and restored Provider A plus final purchase.

## 9. Machine-native use

Briefly show:

- Reclose SDK;
- CLI;
- Sentinel;
- `skill.md`.

> Autonomous agents do not need the website. They can query current assurance state and effective provider authorization directly. The ordinary agent interface does not expose policy activation, Judge installation or authority expansion.

## 10. Security/benchmark close

Show the benchmark surface and state the exact corpus count from the final report.

Do not say every scenario passed if live cases remain blocked/not run.

Suggested close:

> Reclose lets an autonomous system react to a changing external world without handing a monitor or a model unlimited emergency authority. GenLayer supplies decentralized judgment; the protocol's own pre-authorized policy supplies the boundary.

## Evidence checklist before presenting

Before using the live-success version of this script, confirm:

- exact demo commit has green CI;
- final addresses are current;
- fee profile is current;
- `npm run e1:evidence:check` passes;
- both E1 clean runs are present;
- no screenshot/transaction shown comes from a superseded deployment;
- every transaction/result narrated is supported by the displayed evidence.
