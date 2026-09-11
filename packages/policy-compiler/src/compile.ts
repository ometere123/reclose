// C3 real implementation: compiles a PolicyManifest into the exact ordered AssuranceKernel write
// sequence, replacing the hand-typed CLI call sequence used during live C2 deployment
// (deployment/61997/c2-manifest.json) with reusable, tested code. Validation here MIRRORS the
// Kernel's own deterministic checks (contracts/assurance_kernel.py) for fast local feedback, but
// is never treated as a second authority - the Kernel still independently enforces every one of
// these rules on-chain, and this compiler's job is only to avoid submitting a call that the
// Kernel would reject anyway (CLAUDE.md Section 13: never a second policy evaluator that can
// disagree with protocol semantics).

import { createHash } from "node:crypto";
import type { ActionType } from "@reclose/protocol-sdk";
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

// Mirrors contracts/assurance_kernel.py's ACTION_* constants exactly (ordinal values, not names).
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

// contracts/assurance_kernel.py::RESOURCE_SCOPED_ACTIONS - requires a non-empty resourceId.
const RESOURCE_SCOPED_ACTIONS = new Set<ActionType>(["RESTRICT", "THROTTLE", "REVOKE_CAPABILITY", "REROUTE"]);
// contracts/assurance_kernel.py::TARGET_WIDE_ACTIONS - must use an empty resourceId.
const TARGET_WIDE_ACTIONS = new Set<ActionType>(["MONITOR", "ENTER_SAFE_MODE", "PAUSE", "ENTER_RECOVERY", "RESTORE"]);

// contracts/assurance_kernel.py::RELEASE_AT_REMEDIATION_CONFIRMED / RELEASE_AT_RECOVERY_VALIDATED.
// RELEASE_AT_POLICY_REPLACEMENT (3) is Kernel-internal only and deliberately has no entry here.
const RELEASE_PHASE_ORDINAL: Record<PolicyEffectManifest["releasePhase"], number> = {
  REMEDIATION_CONFIRMED: 1,
  RECOVERY_VALIDATED: 2,
};

const MAX_EFFECTS_PER_DECISION = 4;
const VALID_IDENTIFIER_EXTRA = new Set(["_", ".", ":", "-"]);

/** Mirrors contracts/assurance_kernel.py::_valid_identifier exactly. */
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

/** Canonical (stable-key-order) JSON serialization, so the same manifest content always hashes
 * identically regardless of object-literal key order in the caller's source. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Content-addressed hash of the manifest, committed to begin_policy's manifest_hash argument. */
export function hashPolicyManifest(manifest: PolicyManifest): `0x${string}` {
  const canonical = JSON.stringify(canonicalize(manifest));
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `0x${digest}` as `0x${string}`;
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
  if (rule.judgeVersion === 0) {
    throw new PolicyCompileError(`Rule ${rule.ruleId}: judgeVersion must be non-zero (E_KRN_005 INVALID_JUDGE_VERSION on-chain)`);
  }
}

function validateEffect(
  effect: PolicyEffectManifest,
  ruleIds: Set<string>,
  resourceIds: Set<string>,
  effectCountByRule: Map<string, number>
): void {
  if (!ruleIds.has(effect.ruleId)) {
    throw new PolicyCompileError(`Effect references unknown rule_id (must be declared in manifest.rules first): ${effect.ruleId}`);
  }
  const isResourceScoped = RESOURCE_SCOPED_ACTIONS.has(effect.actionType);
  const isTargetWide = TARGET_WIDE_ACTIONS.has(effect.actionType);
  if (isResourceScoped) {
    if (effect.resourceId === "") {
      throw new PolicyCompileError(`Effect ${effect.ruleId}/${effect.actionType}: resourceId is required for this action type (E_KRN_013 RESOURCE_REQUIRED on-chain)`);
    }
    if (!resourceIds.has(effect.resourceId)) {
      throw new PolicyCompileError(`Effect ${effect.ruleId}/${effect.actionType}: resourceId "${effect.resourceId}" is not declared in manifest.resources (E_KRN_013 UNREGISTERED_RESOURCE on-chain)`);
    }
  } else if (isTargetWide && effect.resourceId !== "") {
    throw new PolicyCompileError(`Effect ${effect.ruleId}/${effect.actionType}: resourceId must be empty for a target-wide action, got: "${effect.resourceId}"`);
  }
  const count = (effectCountByRule.get(effect.ruleId) ?? 0) + 1;
  effectCountByRule.set(effect.ruleId, count);
  if (count > MAX_EFFECTS_PER_DECISION) {
    throw new PolicyCompileError(`Rule ${effect.ruleId} has more than MAX_EFFECTS_PER_DECISION (${MAX_EFFECTS_PER_DECISION}) enabled effects (E_KRN_005 TOO_MANY_EFFECTS on-chain)`);
  }
}

/**
 * Compiles a PolicyManifest into the exact ordered Kernel write-call sequence:
 * begin_policy -> add_policy_resource* -> add_policy_rule* -> add_policy_effect* -> seal_policy.
 * Throws PolicyCompileError (never silently drops/reorders) on anything the Kernel would itself
 * reject - see each check's on-chain error-code cross-reference in comments above.
 *
 * Deliberately does NOT call activate_policy - activation additionally requires live knowledge
 * of the Kernel's authority-expansion timelock state (whether this is the target's first policy,
 * or whether it only reduces authority vs. the currently active one), which only the chain itself
 * can answer authoritatively at call time. Callers activate separately once sealed.
 */
export function compilePolicyManifest(manifest: PolicyManifest): CompiledPolicy {
  if (!isValidIdentifier(manifest.targetId, 96)) {
    throw new PolicyCompileError(`Invalid target_id: ${manifest.targetId}`);
  }
  if (!isValidIdentifier(manifest.policyKey, 96)) {
    throw new PolicyCompileError(`Invalid policy_key: ${manifest.policyKey}`);
  }
  if (manifest.rules.length === 0) {
    throw new PolicyCompileError("A policy must declare at least one rule");
  }

  const resourceIds = new Set<string>();
  for (const resourceId of manifest.resources) {
    if (!isValidIdentifier(resourceId, 64)) {
      throw new PolicyCompileError(`Invalid resource_id: ${resourceId}`);
    }
    if (resourceIds.has(resourceId)) {
      throw new PolicyCompileError(`Duplicate resource_id in manifest: ${resourceId} (E_KRN_005 DUPLICATE_RESOURCE on-chain)`);
    }
    resourceIds.add(resourceId);
  }

  const ruleIds = new Set<string>();
  for (const rule of manifest.rules) {
    validateRule(rule, ruleIds);
  }

  const effectCountByRule = new Map<string, number>();
  for (const effect of manifest.effects) {
    validateEffect(effect, ruleIds, resourceIds, effectCountByRule);
  }

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
