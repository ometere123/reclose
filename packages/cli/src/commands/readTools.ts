import type { RecloseSDK } from "@reclose/protocol-sdk";
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
