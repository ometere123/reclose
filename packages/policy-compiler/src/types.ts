// Human-authored policy manifest input shape (C3). This is the AUTHORING format a policy author
// or frontend form produces; compile.ts turns it into the exact ordered Kernel write-call
// sequence. Deliberately distinct from PolicyDetail (protocol-sdk/types.ts), which is the
// PROTOCOL's read-back shape (includes sealed/active/version/manifestHash fields this package
// does not need as input, since the Kernel itself assigns them).

import type { ActionType, RuleKind } from "@reclose/protocol-sdk";

export interface PolicyRuleManifest {
  ruleId: string;
  judge: `0x${string}`;
  judgeVersion: number;
  ruleKind: RuleKind;
  provisionalAllowed: boolean;
  /** u256 as decimal string or number; defaults to "0". */
  reportBond?: string | number;
  /** u256 as decimal string or number; defaults to "0". */
  confirmedBounty?: string | number;
}

/**
 * Kernel-v1 only supports release phases 1 (REMEDIATION_CONFIRMED) and 2 (RECOVERY_VALIDATED)
 * for policy-AUTHORED effects (contracts/assurance_kernel.py::VALID_RELEASE_PHASES,
 * RELEASE_AT_POLICY_REPLACEMENT=3 is Kernel-internal only). Note: protocol-sdk's frozen
 * PolicyEffectReleasePhase type also lists "PROVISIONAL" - the Kernel contract has no
 * corresponding numeric release phase for that string; this compiler deliberately does NOT
 * invent a mapping for it (see compile.ts's explicit rejection and the comment there) rather than
 * silently resolving what looks like an F1-vs-Implementation-Specification naming drift on its
 * own authority (CLAUDE.md Section 22: "breaking interface changes go through Interface Change
 * Log.md").
 */
export type CompilablePolicyEffectReleasePhase = "REMEDIATION_CONFIRMED" | "RECOVERY_VALIDATED";

export interface PolicyEffectManifest {
  ruleId: string;
  actionType: ActionType;
  /** Required (possibly "") for RESOURCE_SCOPED_ACTIONS; must be "" for TARGET_WIDE_ACTIONS. */
  resourceId: string;
  paramU256?: string | number;
  paramStr?: string;
  releasePhase: CompilablePolicyEffectReleasePhase;
}

export interface PolicyManifest {
  targetId: string;
  policyKey: string;
  resources: string[];
  rules: PolicyRuleManifest[];
  effects: PolicyEffectManifest[];
}

/** One ordered Kernel write call. args are in the exact positional order the contract method
 * expects - callers pass these straight to `genlayer write <address> <functionName> --args ...`
 * or genlayer-js's writeContract({ functionName, args }). */
export interface CompiledKernelCall {
  functionName:
    | "begin_policy"
    | "add_policy_resource"
    | "add_policy_rule"
    | "add_policy_effect"
    | "seal_policy";
  args: (string | number | boolean)[];
  /** Human-readable description of what this call does, for CLI/Sentinel progress output. */
  description: string;
}

export interface CompiledPolicy {
  /** keccak256-style manifest hash (0x + 64 hex chars) committed to begin_policy's
   * manifest_hash argument - the canonical content-address of this exact manifest. */
  manifestHash: `0x${string}`;
  calls: CompiledKernelCall[];
}
