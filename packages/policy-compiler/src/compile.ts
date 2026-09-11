// C3 policy compiler: compiles a PolicyManifest into the exact ordered AssuranceKernel write
// sequence. Client validation mirrors deterministic Kernel checks for fast feedback; the Kernel
// remains the sole authority.

import type { ActionType } from "@reclose/protocol-sdk";
import { canonicalKeccak256 } from "@reclose/protocol-sdk";
import type {
  PolicyManifest,
  PolicyRuleManifest,
  PolicyEffectManifest,
  CompiledKernelCall,
  CompiledPolicy,
} from "./types";

export class PolicyCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyCompileError";
  }
}

const ACTION_TYPE_ORDINAL: Record<ActionType, number> = {
  NO_ACTION: 0,
  ALERT: 1,
  MONITOR: 2,
  RESTRICT: 3,
  THROTTLE: 4,
  REVOKE_CAPABILITY: 5,
  REROUTE: 6,
  ENTER_SAFE_MODE: 7,
  PAUSE: 8,
  ENTER_RECOVERY: 9,
  RESTORE: 10,
};

const RESOURCE_SCOPED_ACTIONS = new Set<ActionType>(["RESTRICT", "THROTTLE", "REVOKE_CAPABILITY", "REROUTE"]);
const TARGET_WIDE_ACTIONS = new Set<ActionType>(["MONITOR", "ENTER_SAFE_MODE", "PAUSE", "ENTER_RECOVERY", "RESTORE"]);

const RELEASE_PHASE_ORDINAL: Record<PolicyEffectManifest["releasePhase"], number> = {
  REMEDIATION_CONFIRMED: 1,
  RECOVERY_VALIDATED: 2,
};

const MAX_EFFECTS_PER_DECISION = 4;
const VALID_IDENTIFIER_EXTRA = new Set(["_", ".", ":", "-"]);

function isValidIdentifier(value: string, maxLen: number, allowEmpty = false): boolean {
  if (value === "") return allowEmpty;
  if (value.length > maxLen) return false;
  for (const ch of value) {
    const isAlnum = /^[0-9A-Za-z]$/.test(ch);
    if (!isAlnum && !VALID_IDENTIFIER_EXTRA.has(ch)) return false;
  }
  return true;
}

function isValidAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function toU256String(value: string | number | undefined): string {
  if (value === undefined) return "0";
  const s = String(value);
  if (!/^[0-9]+$/.test(s)) {
    throw new PolicyCompileError(`u256 value must be a non-negative decimal integer, got: ${s}`);
  }
  return s;
}

/**
 * Canonical policy identity used by every Reclose client surface:
 * Keccak-256(RFC8785-JCS(manifest)). This intentionally replaces the earlier SHA-256/custom-sort
 * implementation, which was not the locked APM identity.
 */
export function hashPolicyManifest(manifest: PolicyManifest): `0x${string}` {
  return canonicalKeccak256(manifest);
}

function validateRule(rule: PolicyRuleManifest, seenRuleIds: Set<string>): void {
  if (!isValidIdentifier(rule.ruleId, 64)) {
    throw new PolicyCompileError(`Invalid rule_id (must be <=64 chars, [A-Za-z0-9_.:-]): ${rule.ruleId}`);
  }
  if (seenRuleIds.has(rule.ruleId)) {
    throw new PolicyCompileError(`Duplicate rule_id in manifest: ${rule.ruleId} (E_KRN_005 DUPLICATE_RULE_ID on-chain)`);
  }
  seenRuleIds.add(rule.ruleId);
  if (!isValidAddress(rule.judge)) {
    throw new PolicyCompileError(`Rule ${rule.ruleId}: judge must be a 0x-prefixed 40-hex-char address, got: ${rule.judge}`);
  }
  if (!Number.isSafeInteger(rule.judgeVersion) || rule.judgeVersion <= 0) {
    throw new PolicyCompileError(`Rule ${rule.ruleId}: judgeVersion must be a positive safe integer`);
  }
}

function validateEffect(
  effect: PolicyEffectManifest,
  ruleIds: Set<string>,
  resourceIds: Set<string>,
  effectCountByRule: Map<string, number>
): void {
  if (!ruleIds.has(effect.ruleId)) {
    throw new PolicyCompileError(`Effect references unknown rule_id: ${effect.ruleId}`);
  }
  const isResourceScoped = RESOURCE_SCOPED_ACTIONS.has(effect.actionType);
  const isTargetWide = TARGET_WIDE_ACTIONS.has(effect.actionType);
  if (isResourceScoped) {
    if (effect.resourceId === "") {
      throw new PolicyCompileError(`Effect ${effect.ruleId}/${effect.actionType}: resourceId is required`);
    }
    if (!resourceIds.has(effect.resourceId)) {
      throw new PolicyCompileError(`Effect ${effect.ruleId}/${effect.actionType}: resourceId "${effect.resourceId}" is not declared`);
    }
  } else if (isTargetWide && effect.resourceId !== "") {
    throw new PolicyCompileError(`Effect ${effect.ruleId}/${effect.actionType}: resourceId must be empty for target-wide action`);
  }
  const count = (effectCountByRule.get(effect.ruleId) ?? 0) + 1;
  effectCountByRule.set(effect.ruleId, count);
  if (count > MAX_EFFECTS_PER_DECISION) {
    throw new PolicyCompileError(`Rule ${effect.ruleId} has more than MAX_EFFECTS_PER_DECISION (${MAX_EFFECTS_PER_DECISION}) enabled effects`);
  }
}

export function compilePolicyManifest(manifest: PolicyManifest): CompiledPolicy {
  if (!isValidIdentifier(manifest.targetId, 96)) throw new PolicyCompileError(`Invalid target_id: ${manifest.targetId}`);
  if (!isValidIdentifier(manifest.policyKey, 96)) throw new PolicyCompileError(`Invalid policy_key: ${manifest.policyKey}`);
  if (!Array.isArray(manifest.rules) || manifest.rules.length === 0) throw new PolicyCompileError("A policy must declare at least one rule");
  if (!Array.isArray(manifest.resources) || !Array.isArray(manifest.effects)) throw new PolicyCompileError("resources and effects must be arrays");

  const resourceIds = new Set<string>();
  for (const resourceId of manifest.resources) {
    if (!isValidIdentifier(resourceId, 64)) throw new PolicyCompileError(`Invalid resource_id: ${resourceId}`);
    if (resourceIds.has(resourceId)) throw new PolicyCompileError(`Duplicate resource_id in manifest: ${resourceId}`);
    resourceIds.add(resourceId);
  }

  const ruleIds = new Set<string>();
  for (const rule of manifest.rules) validateRule(rule, ruleIds);

  const effectCountByRule = new Map<string, number>();
  for (const effect of manifest.effects) validateEffect(effect, ruleIds, resourceIds, effectCountByRule);

  const manifestHash = hashPolicyManifest(manifest);
  const calls: CompiledKernelCall[] = [];

  calls.push({
    functionName: "begin_policy",
    args: [manifest.targetId, manifest.policyKey, manifestHash],
    description: `Begin policy "${manifest.policyKey}" for target "${manifest.targetId}"`,
  });

  for (const resourceId of manifest.resources) {
    calls.push({
      functionName: "add_policy_resource",
      args: [manifest.policyKey, resourceId],
      description: `Register resource "${resourceId}"`,
    });
  }

  for (const rule of manifest.rules) {
    calls.push({
      functionName: "add_policy_rule",
      args: [
        manifest.policyKey,
        rule.ruleId,
        rule.judge,
        rule.judgeVersion,
        rule.ruleKind === "INCIDENT" ? 1 : rule.ruleKind === "REMEDIATION" ? 2 : 3,
        rule.provisionalAllowed,
        toU256String(rule.reportBond),
        toU256String(rule.confirmedBounty),
      ],
      description: `Register rule "${rule.ruleId}" (${rule.ruleKind}, judge ${rule.judge})`,
    });
  }

  for (const effect of manifest.effects) {
    calls.push({
      functionName: "add_policy_effect",
      args: [
        manifest.policyKey,
        effect.ruleId,
        ACTION_TYPE_ORDINAL[effect.actionType],
        effect.resourceId,
        toU256String(effect.paramU256),
        effect.paramStr ?? "",
        RELEASE_PHASE_ORDINAL[effect.releasePhase],
      ],
      description: `Register effect: rule "${effect.ruleId}" -> ${effect.actionType}${effect.resourceId ? ` on "${effect.resourceId}"` : ""} (release at ${effect.releasePhase})`,
    });
  }

  calls.push({
    functionName: "seal_policy",
    args: [manifest.policyKey],
    description: `Seal policy "${manifest.policyKey}"`,
  });

  return { manifestHash, calls };
}
