import type { ActionType, RuleKind } from "@reclose/protocol-sdk";
import { canonicalKeccak256, diffCanonicalApm, validateCanonicalApmStructure } from "@reclose/protocol-sdk";
import { compilePolicyManifest } from "./compile";
import type { CompiledPolicy, PolicyEffectManifest, PolicyManifest, PolicyRuleManifest } from "./types";

/** Locked complete APM top-level shape. Nested sections remain schema-governed objects so future
 * fields can be added without changing this compiler's TypeScript public API. */
export interface CanonicalApm {
  schema: string;
  policyId: string;
  version: number;
  target: Record<string, unknown>;
  authority: Record<string, unknown> | unknown[];
  protectedResources: unknown[];
  judgeModules: unknown[];
  semanticRules: unknown[];
  sourcePolicies: Record<string, unknown> | unknown[];
  capabilities: Record<string, unknown> | unknown[];
  actionBounds: Record<string, unknown> | unknown[];
  stateMachine: Record<string, unknown>;
  provisionalContainment: Record<string, unknown>;
  recovery: Record<string, unknown>;
  reporting: Record<string, unknown>;
  crossChain: Record<string, unknown>;
  humanOverride: Record<string, unknown> | boolean;
  evolutionEnvelope: Record<string, unknown>;
  activation: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface CanonicalApmValidation {
  valid: boolean;
  errors: string[];
}

function obj(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, any>;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function decimal(value: unknown, label: string, defaultValue = "0"): string {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error(`${label} must be a canonical decimal string`);
  return value;
}

export function validateCanonicalApm(apm: unknown): CanonicalApmValidation {
  const errors = validateCanonicalApmStructure(apm);
  if (!apm || typeof apm !== "object" || Array.isArray(apm)) return { valid: false, errors };
  const a = apm as Record<string, any>;
  if (!Array.isArray(a.protectedResources)) errors.push("protectedResources must be an array");
  if (!Array.isArray(a.judgeModules)) errors.push("judgeModules must be an array");
  if (!Array.isArray(a.semanticRules)) errors.push("semanticRules must be an array");
  try {
    const target = obj(a.target, "target");
    nonEmptyString(target.targetId ?? target.id, "target.targetId");
    for (const [i, ruleRaw] of (Array.isArray(a.semanticRules) ? a.semanticRules : []).entries()) {
      const rule = obj(ruleRaw, `semanticRules[${i}]`);
      nonEmptyString(rule.ruleId, `semanticRules[${i}].ruleId`);
      nonEmptyString(rule.judgeModuleId ?? rule.judgeId, `semanticRules[${i}].judgeModuleId`);
      decimal(rule.reportBond, `semanticRules[${i}].reportBond`);
      decimal(rule.confirmedBounty, `semanticRules[${i}].confirmedBounty`);
    }
  } catch (error) {
    errors.push((error as Error).message);
  }
  return { valid: errors.length === 0, errors };
}

export function hashCanonicalApm(apm: unknown): `0x${string}` {
  const validation = validateCanonicalApm(apm);
  if (!validation.valid) throw new Error(`Invalid canonical APM: ${validation.errors.join("; ")}`);
  return canonicalKeccak256(apm);
}

function actionType(value: unknown): ActionType {
  const allowed: ActionType[] = [
    "NO_ACTION", "ALERT", "MONITOR", "RESTRICT", "THROTTLE", "REVOKE_CAPABILITY", "REROUTE",
    "ENTER_SAFE_MODE", "PAUSE", "ENTER_RECOVERY", "RESTORE",
  ];
  if (typeof value !== "string" || !allowed.includes(value as ActionType)) throw new Error(`unsupported actionType ${String(value)}`);
  return value as ActionType;
}

function ruleKind(value: unknown): RuleKind {
  if (value === "INCIDENT" || value === "REMEDIATION" || value === "RECOVERY_VALIDATION") return value;
  throw new Error(`unsupported ruleKind ${String(value)}`);
}

/** Project the complete immutable APM into Kernel-v1's compact deterministic storage model. */
export function projectCanonicalApm(apm: CanonicalApm): PolicyManifest {
  const validation = validateCanonicalApm(apm);
  if (!validation.valid) throw new Error(`Invalid canonical APM: ${validation.errors.join("; ")}`);
  const target = obj(apm.target, "target");
  const targetId = nonEmptyString(target.targetId ?? target.id, "target.targetId");

  const resources = apm.protectedResources.map((resource, i) => {
    if (typeof resource === "string") return nonEmptyString(resource, `protectedResources[${i}]`);
    const r = obj(resource, `protectedResources[${i}]`);
    return nonEmptyString(r.resourceId ?? r.id, `protectedResources[${i}].resourceId`);
  });

  const judges = new Map<string, Record<string, any>>();
  for (const [i, judgeRaw] of apm.judgeModules.entries()) {
    const judge = obj(judgeRaw, `judgeModules[${i}]`);
    judges.set(nonEmptyString(judge.moduleId ?? judge.id, `judgeModules[${i}].moduleId`), judge);
  }

  const rules: PolicyRuleManifest[] = [];
  const effects: PolicyEffectManifest[] = [];
  for (const [i, ruleRaw] of apm.semanticRules.entries()) {
    const rule = obj(ruleRaw, `semanticRules[${i}]`);
    const id = nonEmptyString(rule.ruleId, `semanticRules[${i}].ruleId`);
    const judgeId = nonEmptyString(rule.judgeModuleId ?? rule.judgeId, `semanticRules[${i}].judgeModuleId`);
    const judge = judges.get(judgeId);
    if (!judge) throw new Error(`semanticRules[${i}] references unknown judge module ${judgeId}`);
    rules.push({
      ruleId: id,
      judge: nonEmptyString(judge.address, `judgeModules.${judgeId}.address`) as `0x${string}`,
      judgeVersion: Number(judge.version),
      ruleKind: ruleKind(rule.ruleKind),
      provisionalAllowed: Boolean(rule.provisionalAllowed),
      reportBond: decimal(rule.reportBond, `semanticRules[${i}].reportBond`),
      confirmedBounty: decimal(rule.confirmedBounty, `semanticRules[${i}].confirmedBounty`),
    });
    const ruleEffects = Array.isArray(rule.effects) ? rule.effects : [];
    for (const [j, effectRaw] of ruleEffects.entries()) {
      const effect = obj(effectRaw, `semanticRules[${i}].effects[${j}]`);
      const release = effect.releasePhase;
      if (release !== "REMEDIATION_CONFIRMED" && release !== "RECOVERY_VALIDATED") {
        throw new Error(`semanticRules[${i}].effects[${j}].releasePhase is not Kernel-authorable`);
      }
      effects.push({
        ruleId: id,
        actionType: actionType(effect.actionType),
        resourceId: typeof effect.resourceId === "string" ? effect.resourceId : "",
        paramU256: decimal(effect.paramU256, `semanticRules[${i}].effects[${j}].paramU256`),
        paramStr: typeof effect.paramStr === "string" ? effect.paramStr : "",
        releasePhase: release,
      });
    }
  }

  return { targetId, policyKey: apm.policyId, resources, rules, effects };
}

/** Compile Kernel writes while committing the COMPLETE APM hash, not the reduced projection hash. */
export function compileCanonicalApm(apm: CanonicalApm): CompiledPolicy {
  const projection = projectCanonicalApm(apm);
  const compiled = compilePolicyManifest(projection);
  const manifestHash = hashCanonicalApm(apm);
  const calls = compiled.calls.map((call, index) => index === 0
    ? { ...call, args: [projection.targetId, projection.policyKey, manifestHash] }
    : call
  );
  return { manifestHash, calls };
}

export { diffCanonicalApm };
