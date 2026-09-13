import type { EvidenceSource, RecloseSDK } from "@reclose/protocol-sdk";
import type { CommandResult } from "./policyCompile";

async function result(work: () => Promise<unknown>): Promise<CommandResult> {
  try { return { exitCode: 0, output: JSON.stringify(await work(), null, 2) }; }
  catch (error) { return { exitCode: 1, output: (error as Error).message }; }
}

export function runTargetInspect(sdk: RecloseSDK, targetId: string): Promise<CommandResult> {
  return result(() => sdk.getTarget(targetId));
}

export function runTargetStatus(sdk: RecloseSDK, targetId: string): Promise<CommandResult> {
  return result(() => sdk.getAssuranceState(targetId));
}

export function runPolicyInspect(sdk: RecloseSDK, targetId: string): Promise<CommandResult> {
  return result(() => sdk.getActivePolicy(targetId));
}

export function runIncidentInspect(sdk: RecloseSDK, incidentId: string): Promise<CommandResult> {
  return result(() => sdk.getIncident(incidentId));
}

export function runDecisionInspect(sdk: RecloseSDK, decisionId: string): Promise<CommandResult> {
  return result(() => sdk.getDecision(decisionId));
}

export function runActionTrace(sdk: RecloseSDK, actionId: string): Promise<CommandResult> {
  return result(() => sdk.trackActionTrace(actionId));
}

export function runIncidentReportPrepare(
  sdk: RecloseSDK,
  input: { targetId: string; ruleId: string; resourceId: string; evidenceSources: EvidenceSource[] },
): Promise<CommandResult> {
  return result(() => sdk.buildIncidentReport(input));
}

export function runRecoveryPrepare(
  sdk: RecloseSDK,
  input: { incidentId: string; evidenceSources: EvidenceSource[] },
): Promise<CommandResult> {
  return result(() => sdk.buildRecoveryReport(input));
}

/** Remediation (REMEDIATION_CONFIRMED_V1) is a distinct on-chain entrypoint from recovery
 * validation (RECOVERY_VALIDATED_V1) - see contracts/incident_judge_v1.py::submit_remediation vs
 * submit_recovery_validation - so this is a separate CLI command, not an alias for recovery. */
export function runRemediationPrepare(
  sdk: RecloseSDK,
  input: { incidentId: string; evidenceSources: EvidenceSource[] },
): Promise<CommandResult> {
  return result(() => (sdk as unknown as { buildRemediationReport: (i: typeof input) => Promise<unknown> }).buildRemediationReport(input));
}

/** Reads the real get_policy_lifecycle Kernel view (owner-directed remediation pass item 6) so a
 * caller can verify a policy's on-chain seal/activation-timing state before building an activation
 * draft, without needing the frontend. */
export function runPolicyVerifyReadback(
  sdk: RecloseSDK,
  policyKey: string,
): Promise<CommandResult> {
  return result(() => (sdk as unknown as { getPolicyLifecycle: (k: string) => Promise<unknown> }).getPolicyLifecycle(policyKey));
}

export async function runAuditExport(
  sdk: RecloseSDK,
  input: { targetId: string; incidentIds?: string[] },
): Promise<CommandResult> {
  return result(async () => {
    const target = await sdk.getTarget(input.targetId);
    const assurance = await sdk.getAssuranceState(input.targetId);
    const policy = target.activePolicyKey ? await sdk.getActivePolicy(input.targetId) : null;
    const incidents = [];
    for (const incidentId of input.incidentIds ?? []) incidents.push(await sdk.getIncident(incidentId));
    return {
      schema: "reclose-audit-export-v1",
      generatedAt: new Date().toISOString(),
      target,
      assurance,
      policy,
      incidents,
    };
  });
}
