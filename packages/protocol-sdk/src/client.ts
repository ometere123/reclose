import type {
  ActionType,
  AssuranceState,
  AssuranceStateSummary,
  CanonicalDecisionOutcome,
  CanonicalDecisionStage,
  DecisionRecord,
  DecisionView,
  ErrorEnvelope,
  EvidenceSource,
  ExecutionReceipt,
  ExecutionResult,
  FeeTransactionPreview,
  GenLayerTransactionLifecycle,
  Incident,
  IncidentStatus,
  PolicyDetail,
  PolicyEffect,
  PolicyRule,
  PolicySecurityDiff,
  PolicySecurityDiffChange,
  PredictedIncidentIdentity,
  PreparedRecloseWrite,
  PreparedWriteSemanticKind,
  RuleId,
  RuleKind,
  Target,
} from "./types";
import type { RecloseSDK } from "./sdk";
import type { RawGenLayerTransaction } from "./lifecycle";
import { mapRawTransaction } from "./lifecycle";
import { assertCanonicalChainId, RECLOSE_CANONICAL_CHAIN_ID } from "./networkGuard";
import { canonicalKeccak256 } from "./canonical";
import { buildEapObject } from "./evidence";

/** A3-H01: the review-to-sign content hash covers every field of the draft that must not change
 * between preview and signing - explicitly excluding feeEstimate, which may legitimately be
 * refreshed without altering what is being signed. */
function computeReviewHash(draft: Omit<PreparedRecloseWrite, "reviewHash" | "feeEstimate">): `0x${string}` {
  return canonicalKeccak256(draft);
}

/** A3-H12: mirrors contracts/incident_judge_v1.py::_derive_incident_id exactly - same separator,
 * same field order, same lower-level representation the contract evaluates at execution time. */
function deriveIncidentId(targetId: string, reporterAddress: string, reporterNonce: number): string {
  return `${targetId}:${reporterAddress.toLowerCase()}:${reporterNonce}`;
}

/** Item 2 (owner-directed remediation pass): the prior `bond:${predictedIncidentId}` construction
 * truncated to 96 chars at the TAIL-END of a variable-length string (targetId may itself be up to
 * 96 chars per `_valid_identifier(target_id, 96)` in assurance_kernel.py). Two different
 * (targetId, reporterAddress, nonce) tuples whose first ~90 chars happen to agree after the
 * "bond:" prefix would silently collide once truncated to 96 chars, since truncation discards
 * whichever suffix (including the nonce/reporter) did not fit. Replacing the raw-concatenation
 * prefix with a deterministic Keccak-256 digest over the FULL canonical tuple removes the
 * truncation-collision risk entirely: the id is always `bond:0x<64 hex>` (71 chars, well inside
 * the Vault's 96-char bound - see contracts/incentive_vault.py's own `_valid_identifier` check),
 * and is deterministic so the same logical bond always resolves to the same id (idempotent
 * preview), while any differing input field changes the hash. Uses the same canonicalKeccak256
 * (RFC8785 JCS + Keccak-256) helper every other Reclose identity hash in this file uses - no new
 * hashing primitive introduced. */
function deriveBondId(input: {
  targetId: string;
  policyKey: string;
  ruleId: string;
  reporterAddress: string;
  reporterNonce: number;
  predictedIncidentId: string;
}): string {
  const digest = canonicalKeccak256({
    targetId: input.targetId,
    policyKey: input.policyKey,
    ruleId: input.ruleId,
    reporterAddress: input.reporterAddress.toLowerCase(),
    reporterNonce: input.reporterNonce,
    predictedIncidentId: input.predictedIncidentId,
  });
  const bondId = `bond:${digest}`;
  // Defensive bound, even though the fixed digest form above is always 71 chars - never silently
  // truncate in a way that could reintroduce a collision; instead this would be a loud bug.
  if (bondId.length > 96) throw new Error(`INTERNAL: derived bondId exceeds 96 chars (${bondId.length})`);
  return bondId;
}

/** Mirrors contracts/assurance_kernel.py::_ck exactly - length-prefixed concatenation, used by the
 * Kernel for every composite storage/identity key including action_id. Client-side replication is
 * required because action_id is never returned by any Kernel view method; it must be derived from
 * already-known inputs (incident_id, policy_key, action_type ordinal, resource_id, bounded payload) to correctly
 * track the real dispatched action instead of substituting the incident_id itself. */
function ck(...parts: string[]): string {
  return parts.map((p) => `${p.length}:${p}`).join("");
}

/** Mirrors contracts/assurance_kernel.py::_dispatch_action's action_id derivation:
 * `_ck(incident_id, policy_key, str(int(action_type)), resource_id, str(int(param_u256)), param_str)`. One action_id exists PER
 * dispatched effect (an incident's final decision may dispatch up to MAX_EFFECTS_PER_DECISION
 * effects at once) - there is no single "the" action_id for an incident, so this must be computed
 * per effect, never approximated by the bare incident_id. */
export function computeActionId(incidentId: string, policyKey: string, actionTypeOrdinal: number, resourceId: string, paramU256: string | number | bigint = "0", paramStr = ""): string {
  return ck(incidentId, policyKey, String(actionTypeOrdinal), resourceId, String(paramU256), paramStr);
}

/**
 * Item 1 (owner-directed remediation pass): deep bigint -> decimal-string normalization, matching
 * the pattern feeAllocation.ts's own node normalization already relies on (every bigint budget/
 * parentIndex value stays a bigint internally but must become a JSON-safe decimal string before it
 * can survive canonicalKeccak256/JSON.stringify/localStorage - jcsCanonicalize explicitly REJECTS a
 * raw bigint). Never drops a field, never re-derives a value - purely a type-level normalization.
 */
function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((v) => toJsonSafe(v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toJsonSafe(v);
    return out;
  }
  return value;
}

export interface RecloseAddresses {
  kernel: string;
  judge: string;
  vault?: string;
}

/**
 * Index-provided action execution identity. Every required value is either protocol-derived or an
 * explicit nullable proof field. `executionTime` is the block/transaction execution time, never
 * the wall clock of the reader constructing an ExecutionReceipt.
 */
export interface ResolvedActionTransaction {
  parentTxId: string;
  childTxId: string;
  targetId: string;
  adapterId: string;
  executionTime: string;
  preStateHash: string | null;
  postStateHash: string | null;
  expectedPostStateRequired: boolean;
  observedPostState?: Record<string, unknown> | null;
  postStateMatchesExpected?: boolean | null;
}

/** Direct protocol adapter. A genlayer-js client can satisfy this with a thin wrapper. */
export interface RecloseTransport {
  getChainId(): Promise<number | bigint>;
  getBlockNumber(): Promise<number | bigint>;
  readContract(args: { address: string; functionName: string; args?: unknown[] }): Promise<unknown>;
  getTransaction(args: { hash: string }): Promise<RawGenLayerTransaction & { executionResult?: ExecutionResult }>;
  getTriggeredTransactionIds(args: { hash: string }): Promise<string[]>;
  estimateTransactionFeesForWrite?(args: {
    address: string;
    functionName: string;
    args: unknown[];
    value?: bigint;
  }): Promise<{
    feeValue?: bigint | string | number;
    distribution?: Record<string, unknown> | null;
    /** Item 1: the estimator's own per-hop allocation nodes (budget/parentIndex as bigint, exactly
     * as genlayer-js reports them) - optional because not every transport implementation surfaces
     * this yet; when present it is preserved in full, never discarded. */
    messageAllocations?: Array<Record<string, unknown>> | null;
  }>;
  resolveActionTransaction?(actionId: string): Promise<ResolvedActionTransaction | null>;
}

export interface CreateRecloseClientOptions {
  transport: RecloseTransport;
  addresses: RecloseAddresses;
}

const ASSURANCE_STATES: AssuranceState[] = ["NORMAL", "MONITORED", "RESTRICTED", "SAFE_MODE", "PAUSED", "RECOVERY"];
const RULE_KINDS: Record<number, RuleKind> = { 1: "INCIDENT", 2: "REMEDIATION", 3: "RECOVERY_VALIDATION" };
const ACTION_TYPES: ActionType[] = [
  "NO_ACTION", "ALERT", "MONITOR", "RESTRICT", "THROTTLE", "REVOKE_CAPABILITY", "REROUTE",
  "ENTER_SAFE_MODE", "PAUSE", "ENTER_RECOVERY", "RESTORE",
];
const RELEASE_PHASES: Record<number, PolicyEffect["releasePhase"]> = {
  1: "REMEDIATION_CONFIRMED",
  2: "RECOVERY_VALIDATED",
  3: "PROVISIONAL",
};
const OUTCOMES: Record<number, CanonicalDecisionOutcome | null> = { 0: null, 1: "CONFIRMED", 2: "REJECTED", 3: "UNDETERMINED" };
const INCIDENT_STATUSES: Record<number, IncidentStatus> = { 0: "OPEN", 1: "PROVISIONAL_APPLIED", 2: "FINAL_CONFIRMED", 3: "RECOVERY", 4: "CLOSED" };
const ACTION_TYPE_ORDINALS: Record<string, number> = Object.fromEntries(ACTION_TYPES.map((a, i) => [a, i]));
const MAX_EFFECTS_PER_DECISION = 4;

function tuple(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected contract view tuple");
  return value;
}
function num(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  throw new Error(`Expected numeric value, got ${String(value)}`);
}
function str(value: unknown): string {
  if (typeof value !== "string") throw new Error(`Expected string value, got ${typeof value}`);
  return value;
}
function iso(value: unknown): string {
  return new Date(num(value) * 1000).toISOString();
}
function byOrdinal<T>(values: T[], value: unknown, label: string): T {
  const result = values[num(value)];
  if (result === undefined) throw new Error(`Unknown ${label} ordinal ${String(value)}`);
  return result;
}

export function validateCanonicalApmStructure(apm: unknown): string[] {
  if (!apm || typeof apm !== "object" || Array.isArray(apm)) return ["APM must be an object"];
  const obj = apm as Record<string, unknown>;
  const required = [
    "schema", "policyId", "version", "target", "authority", "protectedResources", "judgeModules",
    "semanticRules", "sourcePolicies", "capabilities", "actionBounds", "stateMachine",
    "provisionalContainment", "recovery", "reporting", "crossChain", "humanOverride",
    "evolutionEnvelope", "activation", "metadata",
  ];
  const errors: string[] = [];
  for (const field of required) if (!(field in obj)) errors.push(`missing required APM field: ${field}`);
  if (typeof obj.policyId !== "string" || obj.policyId.length === 0) errors.push("policyId must be a non-empty string");
  if (!Number.isSafeInteger(obj.version) || Number(obj.version) <= 0) errors.push("version must be a positive safe integer");
  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path ? `${path}.${key}` : key;
      if (/amount|bond|bounty|limit|ceiling|wei|u256/i.test(key)) {
        if (typeof child === "number") errors.push(`${childPath} must use a canonical decimal string`);
        if (typeof child === "string" && !/^\d+$/.test(child)) errors.push(`${childPath} must be a non-negative decimal string`);
      }
      walk(child, childPath);
    }
  };
  walk(obj, "");
  return errors;
}

const RULE_KIND_ORDINALS: Record<string, number> = { INCIDENT: 1, REMEDIATION: 2, RECOVERY_VALIDATION: 3 };
const RELEASE_PHASE_ORDINALS: Record<string, number> = { REMEDIATION_CONFIRMED: 1, RECOVERY_VALIDATED: 2, PROVISIONAL: 3 };

interface KernelRuleIdentity {
  ruleId: string;
  judge: string;
  judgeVersion: number;
  ruleKind: number;
  provisionalAllowed: boolean;
  reportBond: string;
  confirmedBounty: bigint;
  enabled: boolean;
}
interface KernelEffectTuple {
  ruleId: string;
  actionType: number;
  resourceId: string;
  paramU256: string;
  paramStr: string;
  releasePhase: number;
  enabled: boolean;
}

function ruleIdentityKey(r: Pick<KernelRuleIdentity, "ruleId" | "judge" | "judgeVersion" | "ruleKind" | "provisionalAllowed" | "reportBond">): string {
  return [r.ruleId, r.judge.toLowerCase(), r.judgeVersion, r.ruleKind, r.provisionalAllowed, r.reportBond].join("|");
}
function effectTupleKey(e: Pick<KernelEffectTuple, "ruleId" | "actionType" | "resourceId" | "paramU256" | "paramStr" | "releasePhase">): string {
  return [e.ruleId, e.actionType, e.resourceId, e.paramU256, e.paramStr, e.releasePhase].join("|");
}

/**
 * Extracts the EXACT same rule/effect identity model contracts/assurance_kernel.py::
 * _rule_identity_map/_effect_tuples operate on, from either shape this SDK encounters: an
 * already-read on-chain `PolicyDetail` (rules[]/effects[], each with an explicit `enabled` flag),
 * or a raw canonical APM object (`semanticRules[]`, each carrying nested `effects[]`, judge
 * resolved via `judgeModules` by id - mirroring packages/policy-compiler/src/canonicalApm.ts's own
 * resolution exactly, since a freshly-authored APM's effects are implicitly enabled=true until an
 * owner overlay disables one post-activation). Malformed/partial entries are skipped rather than
 * thrown on, since diffAPM's frozen public signature accepts arbitrary caller-supplied objects.
 */
function extractKernelRuleEffectModel(candidate: unknown): { rules: KernelRuleIdentity[]; effects: KernelEffectTuple[]; humanOverride: boolean } {
  const obj = (candidate && typeof candidate === "object" ? candidate : {}) as Record<string, any>;
  const rules: KernelRuleIdentity[] = [];
  const effects: KernelEffectTuple[] = [];

  // Shape 1: PolicyDetail (already-read on-chain policy).
  if (Array.isArray(obj.rules) && Array.isArray(obj.effects) && !Array.isArray(obj.semanticRules)) {
    for (const r of obj.rules) {
      if (!r || typeof r.ruleId !== "string" || typeof r.judge !== "string") continue;
      rules.push({
        ruleId: r.ruleId, judge: r.judge, judgeVersion: Number(r.judgeVersion ?? 0), ruleKind: RULE_KIND_ORDINALS[r.ruleKind] ?? 0,
        provisionalAllowed: Boolean(r.provisionalAllowed), reportBond: String(r.reportBond ?? "0"),
        confirmedBounty: BigInt(String(r.confirmedBounty ?? "0") || "0"), enabled: r.enabled !== false,
      });
    }
    for (const e of obj.effects) {
      if (!e || typeof e.ruleId !== "string" || typeof e.actionType !== "string") continue;
      effects.push({
        ruleId: e.ruleId, actionType: ACTION_TYPE_ORDINALS[e.actionType] ?? -1, resourceId: String(e.resourceId ?? ""),
        paramU256: String(e.paramU256 ?? "0"), paramStr: String(e.paramStr ?? ""),
        releasePhase: RELEASE_PHASE_ORDINALS[e.releasePhase] ?? 0, enabled: e.enabled !== false,
      });
    }
    const humanOverride = obj.summary?.humanOverrideEnabled === true;
    return { rules, effects, humanOverride };
  }

  // Shape 2: raw canonical APM (semanticRules[] with nested effects[], judgeModules[] by id).
  const judgesById = new Map<string, { address?: string; version?: number }>();
  for (const j of Array.isArray(obj.judgeModules) ? obj.judgeModules : []) {
    if (j && typeof (j.moduleId ?? j.id) === "string") judgesById.set(j.moduleId ?? j.id, j);
  }
  for (const rule of Array.isArray(obj.semanticRules) ? obj.semanticRules : []) {
    if (!rule || typeof rule.ruleId !== "string") continue;
    const judge = judgesById.get(rule.judgeModuleId ?? rule.judgeId);
    rules.push({
      ruleId: rule.ruleId, judge: String(judge?.address ?? ""), judgeVersion: Number(judge?.version ?? 0),
      ruleKind: RULE_KIND_ORDINALS[rule.ruleKind] ?? 0, provisionalAllowed: Boolean(rule.provisionalAllowed),
      reportBond: String(rule.reportBond ?? "0"), confirmedBounty: BigInt(String(rule.confirmedBounty ?? "0") || "0"), enabled: true,
    });
    for (const effect of Array.isArray(rule.effects) ? rule.effects : []) {
      if (!effect || typeof effect.actionType !== "string") continue;
      effects.push({
        ruleId: rule.ruleId, actionType: ACTION_TYPE_ORDINALS[effect.actionType] ?? -1, resourceId: String(effect.resourceId ?? ""),
        paramU256: String(effect.paramU256 ?? "0"), paramStr: String(effect.paramStr ?? ""),
        releasePhase: RELEASE_PHASE_ORDINALS[effect.releasePhase] ?? 0, enabled: true,
      });
    }
  }
  const humanOverride = obj.humanOverride === true || obj.humanOverride?.enabled === true;
  return { rules, effects, humanOverride };
}

/**
 * Mirrors contracts/assurance_kernel.py::_classify_expansion EXACTLY (not a reduced resource/
 * action/judge/human-override-only proxy): a rule identity is
 * (ruleId, judge, judgeVersion, ruleKind, provisionalAllowed, reportBond) mapped to
 * confirmedBounty; expansion if any new identity is unseen OR its bounty increased. An effect is
 * the tuple (ruleId, actionType, resourceId, paramU256, paramStr, releasePhase) - ANY change to
 * ANY of these fields produces a DIFFERENT tuple, so a parameter, resource, or release-phase
 * change on an otherwise-identical effect is conservatively treated as expansion (the Kernel
 * itself draws no "this specific field change is obviously a reduction" distinction - this SDK
 * must not either). Only ENABLED rules/effects participate, exactly like `_rule_identity_map`/
 * `_effect_tuples`. No active/"from" policy at all is treated exactly like the Kernel's own
 * `_classify_expansion` first-policy branch: expansion iff the new policy has any enabled rule or
 * effect at all.
 */
export function diffCanonicalApm(fromApm: unknown, toApm: unknown): PolicySecurityDiff {
  const from = extractKernelRuleEffectModel(fromApm);
  const to = extractKernelRuleEffectModel(toApm);
  const changes: PolicySecurityDiffChange[] = [];

  const oldRules = new Map(from.rules.filter((r) => r.enabled).map((r) => [ruleIdentityKey(r), r.confirmedBounty]));
  const newRules = to.rules.filter((r) => r.enabled);
  const hasActiveBaseline = from.rules.some((r) => r.enabled) || from.effects.some((e) => e.enabled);

  for (const rule of newRules) {
    const key = ruleIdentityKey(rule);
    if (!oldRules.has(key)) {
      changes.push({ kind: "ACTION_ADDED", description: `rule added or changed identity: ${rule.ruleId} (judge ${rule.judge || "unresolved"}, kind ordinal ${rule.ruleKind}, provisionalAllowed=${rule.provisionalAllowed}, reportBond=${rule.reportBond})`, isExpansion: true });
    } else if (rule.confirmedBounty > (oldRules.get(key) ?? 0n)) {
      changes.push({ kind: "BOUND_WIDENED", description: `rule ${rule.ruleId} confirmedBounty increased to ${rule.confirmedBounty} (economic expansion)`, isExpansion: true });
    }
  }
  for (const [key, bounty] of [...new Map(from.rules.filter((r) => r.enabled).map((r) => [ruleIdentityKey(r), r] as const)).entries()]) {
    const stillPresent = newRules.some((r) => ruleIdentityKey(r) === key);
    if (!stillPresent) changes.push({ kind: "ACTION_REMOVED", description: `rule removed or changed identity: ${bounty.ruleId}`, isExpansion: false });
  }

  const oldEffectKeys = new Set(from.effects.filter((e) => e.enabled).map((e) => effectTupleKey(e)));
  const newEffects = to.effects.filter((e) => e.enabled);
  const newEffectKeys = new Set(newEffects.map((e) => effectTupleKey(e)));
  let effectsExpand = false;
  for (const effect of newEffects) {
    if (!oldEffectKeys.has(effectTupleKey(effect))) {
      effectsExpand = true;
      changes.push({
        kind: "ACTION_ADDED",
        description: `effect added or changed (rule ${effect.ruleId}, actionType ordinal ${effect.actionType}, resource "${effect.resourceId || "(target-wide)"}", paramU256=${effect.paramU256}, paramStr="${effect.paramStr}", releasePhase ordinal ${effect.releasePhase}) - any field change on an effect is conservatively treated as a distinct, potentially-expanding effect, per Kernel _effect_tuples subset semantics`,
        isExpansion: true,
      });
    }
  }
  for (const effect of from.effects.filter((e) => e.enabled)) {
    if (!newEffectKeys.has(effectTupleKey(effect))) changes.push({ kind: "ACTION_REMOVED", description: `effect removed: rule ${effect.ruleId}, actionType ordinal ${effect.actionType}, resource "${effect.resourceId || "(target-wide)"}"`, isExpansion: false });
  }

  if (to.humanOverride && !from.humanOverride) changes.push({ kind: "HUMAN_OVERRIDE_CHANGED", description: `human override false -> true`, isExpansion: true });
  else if (!to.humanOverride && from.humanOverride) changes.push({ kind: "HUMAN_OVERRIDE_CHANGED", description: `human override true -> false`, isExpansion: false });

  const noBaselineExpansion = !hasActiveBaseline && (newRules.length > 0 || newEffects.length > 0);
  const authorityExpands = noBaselineExpansion || changes.some((c) => c.isExpansion === true);
  return {
    fromVersion: Number((fromApm as any)?.version ?? (fromApm as any)?.summary?.version ?? 0) || null,
    toVersion: Number((toApm as any)?.version ?? 0),
    authorityExpands,
    activationDelaySeconds: null,
    changes,
  };
}

export class DirectRecloseClient implements RecloseSDK {
  private networkChecked = false;
  constructor(private readonly transport: RecloseTransport, private readonly addresses: RecloseAddresses) {}

  private async ensureNetwork(): Promise<void> {
    if (this.networkChecked) return;
    assertCanonicalChainId(Number(await this.transport.getChainId()));
    this.networkChecked = true;
  }
  private async kernel(functionName: string, args: unknown[] = []): Promise<unknown> {
    await this.ensureNetwork();
    return this.transport.readContract({ address: this.addresses.kernel, functionName, args });
  }
  private async judgeRead(functionName: string, args: unknown[] = []): Promise<unknown> {
    await this.ensureNetwork();
    return this.transport.readContract({ address: this.addresses.judge, functionName, args });
  }

  async getTarget(targetId: string): Promise<Target> {
    const t = tuple(await this.kernel("get_target_details", [targetId]));
    return {
      targetId,
      targetAddress: str(t[0]),
      cachedOwner: str(t[1]),
      assuranceState: byOrdinal(ASSURANCE_STATES, t[2], "assurance state"),
      activePolicyKey: str(t[3]),
      registeredAt: iso(t[4]),
      policyGeneration: num(t[5]),
      authorityRevoked: Boolean(t[6]),
      humanOverrideEnabled: Boolean(t[7]),
    };
  }

  async getAssuranceState(targetId: string): Promise<AssuranceStateSummary> {
    const target = await this.getTarget(targetId);
    const activeRestrictions: AssuranceStateSummary["activeRestrictions"] = [];
    const incidentCount = num(await this.kernel("get_target_incident_count", [targetId]));
    const restrictionActionTypes = new Set<string>(["MONITOR", "RESTRICT", "THROTTLE", "REVOKE_CAPABILITY", "REROUTE", "ENTER_SAFE_MODE", "PAUSE"]);
    for (let i = 0; i < incidentCount; i++) {
      const incidentId = str(await this.kernel("get_target_incident_at", [targetId, i]));
      if (!incidentId) continue;
      const restrictionCount = num(await this.kernel("get_incident_restriction_count", [incidentId]));
      for (let j = 0; j < restrictionCount; j++) {
        const r = tuple(await this.kernel("get_incident_restriction_at", [incidentId, j]));
        const active = Boolean(r[5]);
        if (!active) continue;
        const actionType = ACTION_TYPES[num(r[2])];
        if (!actionType || !restrictionActionTypes.has(actionType)) continue;
        activeRestrictions.push({ incidentId, actionType: actionType as AssuranceStateSummary["activeRestrictions"][number]["actionType"], resourceId: str(r[3]) });
      }
    }

    let effectiveCapabilities: string[] = [];
    if (target.activePolicyKey) {
      const policy = await this.getActivePolicy(targetId);
      const restrictedResourceIds = new Set(activeRestrictions.filter((r) => r.resourceId !== "").map((r) => r.resourceId));
      effectiveCapabilities = policy.summary.resourceCount > 0
        ? (await Promise.all(
            Array.from({ length: policy.summary.resourceCount }, (_, i) => this.kernel("get_policy_resource_at", [target.activePolicyKey, i]))
          )).map((r) => str(r)).filter((resourceId) => resourceId !== "" && !restrictedResourceIds.has(resourceId))
        : [];
    }

    const asOfBlock = num(await this.transport.getBlockNumber());
    return { targetId, state: target.assuranceState, activeRestrictions, effectiveCapabilities, asOfBlock };
  }

  async getActivePolicy(targetId: string): Promise<PolicyDetail> {
    const target = await this.getTarget(targetId);
    const policyKey = target.activePolicyKey;
    if (!policyKey) throw new Error(`Target ${targetId} has no active policy`);
    return this.getPolicyByKey(policyKey, targetId);
  }

  /**
   * Additive (not one of the frozen 14): reads an EXPLICIT policy key, not necessarily the
   * target's CURRENT active key. Needed to resolve the policy that was actually in effect for a
   * historical incident, which may since have been superseded - `getActivePolicy` alone can only
   * ever answer "what governs this target right now", which is the wrong question when
   * reconstructing an incident's own rule/effect identity (A3 audit finding: action-id derivation
   * and effect lookup must use the policy_key recorded ON the incident, not whatever the target's
   * active policy happens to be today).
   */
  /**
   * Additive (not one of the frozen 14). Owner-directed remediation pass, item 6: wires the new
   * Kernel view `get_policy_lifecycle` (contracts/assurance_kernel.py) so a caller can render a
   * real chain-derived activation countdown - `activationNotBefore - nowSeconds` - instead of
   * asking the user to self-attest that enough time has passed, which is what
   * `known-limitations.md` item 8 had left as the honest state of the prior pass (get_policy_header
   * alone never exposed sealed_at/activation_not_before/activated_at).
   */
  async getPolicyLifecycle(policyKey: string): Promise<{
    targetId: string;
    version: number;
    manifestHash: string;
    createdAt: number;
    sealedAt: number;
    activationNotBefore: number;
    activatedAt: number;
    sealed: boolean;
    active: boolean;
    superseded: boolean;
  }> {
    const r = tuple(await this.kernel("get_policy_lifecycle", [policyKey]));
    return {
      targetId: str(r[0]),
      version: num(r[1]),
      manifestHash: str(r[2]),
      createdAt: num(r[3]),
      sealedAt: num(r[4]),
      activationNotBefore: num(r[5]),
      activatedAt: num(r[6]),
      sealed: Boolean(r[7]),
      active: Boolean(r[8]),
      superseded: Boolean(r[9]),
    };
  }

  async getPolicyByKey(policyKey: string, targetId: string): Promise<PolicyDetail> {
    const header = tuple(await this.kernel("get_policy_header", [policyKey]));
    const counts = tuple(await this.kernel("get_policy_counts", [policyKey]));
    const ruleCount = num(counts[0]);
    const resourceCount = num(counts[1]);
    const effectCount = num(counts[2]);
    const rules: PolicyRule[] = [];
    for (let i = 0; i < ruleCount; i++) {
      const ruleId = str(await this.kernel("get_policy_rule_id_at", [policyKey, i])) as RuleId;
      const r = tuple(await this.kernel("get_policy_rule", [policyKey, ruleId]));
      const economics = tuple(await this.kernel("get_policy_rule_economics", [policyKey, ruleId]));
      const ruleKind = RULE_KINDS[num(r[2])];
      if (!ruleKind) throw new Error(`Unknown rule kind for ${ruleId}`);
      rules.push({ ruleId, judge: str(r[0]), judgeVersion: num(r[1]), ruleKind, provisionalAllowed: Boolean(r[3]), reportBond: String(economics[0]), confirmedBounty: String(economics[1]), enabled: Boolean(r[4]) });
    }
    const effects: PolicyEffect[] = [];
    for (let i = 0; i < effectCount; i++) {
      // Kernel tuple order (contracts/assurance_kernel.py::get_policy_effect_at):
      // (rule_id, action_type, resource_id, param_u256, param_str, release_phase, enabled).
      const e = tuple(await this.kernel("get_policy_effect_at", [policyKey, i]));
      effects.push({
        ruleId: str(e[0]) as RuleId,
        actionType: byOrdinal(ACTION_TYPES, e[1], "action type"),
        resourceId: str(e[2]),
        paramU256: String(e[3]),
        paramStr: str(e[4]),
        releasePhase: RELEASE_PHASES[num(e[5])] ?? "PROVISIONAL",
        enabled: Boolean(e[6]),
      });
    }
    return {
      summary: {
        policyKey,
        targetId,
        version: num(header[0]),
        manifestHash: str(header[1]),
        sealed: Boolean(header[2]),
        active: Boolean(header[3]),
        // A Kernel policy is superseded only once it was sealed AND is no longer active - a
        // policy that is merely unsealed/unactivated is neither active nor superseded, so the
        // prior `!active` proxy falsely marked every not-yet-activated policy "superseded".
        superseded: Boolean(header[2]) && !Boolean(header[3]),
        ruleCount,
        resourceCount,
        effectCount,
        humanOverrideEnabled: Boolean(header[4]),
      },
      rules,
      effects,
    };
  }

  async getIncident(incidentId: string): Promise<Incident> {
    const i = tuple(await this.kernel("get_incident_detail", [incidentId]));
    if (!str(i[0])) throw new Error(`Unknown incident ${incidentId}`);
    let status = INCIDENT_STATUSES[num(i[11])] ?? "OPEN";
    if (status === "CLOSED") {
      const finalOutcome = OUTCOMES[num(i[10])];
      if (finalOutcome === "REJECTED") status = "FINAL_REJECTED";
      else if (finalOutcome === "UNDETERMINED") status = "FINAL_UNDETERMINED";
    }
    return {
      incidentId,
      targetId: str(i[0]),
      policyKey: str(i[1]),
      ruleId: str(i[3]) as RuleId,
      resourceId: str(i[4]),
      reporter: str(i[5]),
      judge: str(i[6]),
      evidenceHash: str(i[7]),
      conditionCode: str(i[8]),
      status,
      createdAt: iso(i[12]),
      closedAt: num(i[13]) === 0 ? null : iso(i[13]),
    };
  }

  private decisionIdentity(decisionId: string): { incidentId: string; stage: CanonicalDecisionStage } {
    if (decisionId.endsWith(":PROVISIONAL")) return { incidentId: decisionId.slice(0, -12), stage: "PROVISIONAL" };
    if (decisionId.endsWith(":FINAL")) return { incidentId: decisionId.slice(0, -6), stage: "FINAL" };
    return { incidentId: decisionId, stage: "FINAL" };
  }

  async getDecision(decisionId: string): Promise<DecisionRecord> {
    const { incidentId, stage } = this.decisionIdentity(decisionId);
    const i = tuple(await this.kernel("get_incident_detail", [incidentId]));
    if (!str(i[0])) throw new Error(`Unknown decision ${decisionId}`);
    const header = tuple(await this.kernel("get_policy_header", [str(i[1])]));
    const ordinal = stage === "PROVISIONAL" ? num(i[9]) : num(i[10]);
    const outcome = OUTCOMES[ordinal];
    if (!outcome) throw new Error(`${stage} decision is not recorded for ${incidentId}`);
    const rule = tuple(await this.kernel("get_policy_rule", [str(i[1]), str(i[3])]));
    return {
      schemaVersion: "1.0.0",
      decisionId,
      incidentId,
      targetId: str(i[0]),
      policyHash: str(header[1]),
      policyVersion: num(i[2]),
      ruleId: str(i[3]) as RuleId,
      affectedResource: str(i[4]),
      evidenceHash: str(i[7]),
      reporter: str(i[5]),
      outcome,
      conditionCode: str(i[8]),
      reasonCodes: [str(i[8])],
      judgeModule: str(i[6]),
      judgeVersion: num(rule[1]),
      decisionStage: stage,
      generatedAt: iso(i[12]),
    };
  }

  /**
   * Additive (not one of the frozen 14): resolves the REAL, Kernel-derived action_id(s) a final
   * decision dispatched for this incident - one per enabled effect of the incident's own ruleId
   * within the POLICY IT WAS DECIDED UNDER (`incident.policyKey`, not necessarily the target's
   * current active policy), capped at MAX_EFFECTS_PER_DECISION exactly like the Kernel itself
   * (`_effects_for_rule`'s `[:MAX_EFFECTS_PER_DECISION]`). Callers must use ONE OF THESE, never the
   * bare incidentId, when tracking a dispatched action's transaction trace.
   */
  async listIncidentActionIds(incidentId: string): Promise<Array<{ actionId: string; actionType: ActionType; resourceId: string }>> {
    const incident = await this.getIncident(incidentId);
    const policy = await this.getPolicyByKey(incident.policyKey, incident.targetId);
    const matching = policy.effects.filter((e) => e.ruleId === incident.ruleId && e.enabled).slice(0, MAX_EFFECTS_PER_DECISION);
    return matching.map((effect) => ({
      actionId: computeActionId(incidentId, incident.policyKey, ACTION_TYPE_ORDINALS[effect.actionType] ?? 0, effect.resourceId, effect.paramU256 ?? "0", effect.paramStr ?? ""),
      actionType: effect.actionType,
      resourceId: effect.resourceId,
    }));
  }

  async getDecisionView(decisionId: string): Promise<DecisionView> {
    const record = await this.getDecision(decisionId);
    if (!this.transport.resolveActionTransaction) throw new Error("Decision transaction lookup requires an index adapter");
    const mapping = await this.transport.resolveActionTransaction(decisionId);
    if (!mapping) throw new Error(`No transaction mapping for ${decisionId}`);
    return { record, transaction: await this.trackTransaction(mapping.parentTxId as `0x${string}`) };
  }

  /**
   * Additive (not one of the frozen 14): the real, protocol-read restriction records THIS
   * incident itself created (`get_incident_restriction_count`/`get_incident_restriction_at`,
   * already used inside `getAssuranceState`'s target-wide scan, but never exposed per-incident).
   * Honest limitation, diagnosed while wiring this (A3-H08): the Kernel's `get_incident_detail`
   * view has no `parent_incident_id` field, and there is no view enumerating "child incidents of
   * X" - so a remediation/recovery-validation CHAIN (which Kernel-side is a separate incident
   * linked by `parent_incident_id`) cannot currently be reconstructed from protocol reads alone.
   * This method returns only what IS protocol-readable: this incident's own restriction set.
   */
  async getIncidentOwnRestrictions(incidentId: string): Promise<Array<{ actionType: ActionType; resourceId: string; active: boolean }>> {
    const count = num(await this.kernel("get_incident_restriction_count", [incidentId]));
    const out: Array<{ actionType: ActionType; resourceId: string; active: boolean }> = [];
    for (let i = 0; i < count; i++) {
      const r = tuple(await this.kernel("get_incident_restriction_at", [incidentId, i]));
      out.push({ actionType: byOrdinal(ACTION_TYPES, r[2], "action type"), resourceId: str(r[3]), active: Boolean(r[5]) });
    }
    return out;
  }

  /**
   * Fix (independent audit finding): `authorityRevoked` was previously conflated with provider
   * UNAVAILABILITY (`available: count === 0 && !target.authorityRevoked`). These are different
   * facts - authority-revoked means Reclose's OWN control authority over the target is gone, not
   * that the underlying provider/resource is actually down. Since `getEffectiveProviderStatus` is
   * one of the frozen 14 RecloseSDK methods (its `available` field is typed as a strict boolean,
   * never nullable), UNKNOWN cannot be returned as a third boolean state - instead the two facts
   * are now reported through DISTINCT `reason.code` values, so a caller can tell "Reclose has lost
   * authority over this target" (`AUTHORITY_REVOKED`) apart from "a real restriction is active on
   * this resource" (restriction count > 0) rather than both silently reading as the same generic
   * unavailability. `available` remains conservative/fail-closed (false) in both cases, since
   * Reclose genuinely cannot vouch for a resource it has no active restriction enforcement over.
   */
  async getEffectiveProviderStatus(targetId: string, resourceId: string): Promise<{ resourceId: string; available: boolean; reason: ErrorEnvelope | null }> {
    const target = await this.getTarget(targetId);
    if (target.authorityRevoked) {
      return {
        resourceId,
        available: false,
        reason: { code: "AUTHORITY_REVOKED", message: `Reclose's control authority over target ${targetId} has been revoked - this is NOT a statement about the actual provider/resource's live availability, which Reclose can no longer assert.` },
      };
    }
    const count = num(await this.kernel("get_resource_restriction_count", [target.targetAddress, resourceId]));
    return {
      resourceId,
      available: count === 0,
      reason: count === 0 ? null : { code: "UNKNOWN", message: `${count} active assurance restriction(s) apply to ${resourceId}` },
    };
  }

  /**
   * Item 5 (owner-directed remediation pass), ADDITIVE: `getEffectiveProviderStatus` is frozen
   * (one of the 14 RecloseSDK methods) and its `available: boolean` return type cannot carry a
   * third state without breaking that contract - so this is a NEW, separate product-facing helper
   * that exposes the real tri-state truth explicitly, never reusing the same narrow boolean field:
   *   - authority-revoked                    -> UNKNOWN (Reclose has lost control authority over
   *                                              the target; it can no longer assert ANYTHING about
   *                                              the underlying provider/resource, available OR not)
   *   - an active restriction governs this resource -> UNAVAILABLE (a real Kernel restriction is in
   *                                              force; Reclose is NOT merely unsure, it has actively
   *                                              restricted this exact resource)
   *   - no restriction, reachable             -> AVAILABLE
   *   - unreadable/unsupported read           -> UNKNOWN (fail-closed-to-uncertain, never AVAILABLE)
   * Built directly on the SAME protocol reads getEffectiveProviderStatus already performs - it does
   * not duplicate a second restriction-lookup implementation.
   */
  async getProviderAvailabilityTriState(targetId: string, resourceId: string): Promise<{
    resourceId: string;
    status: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
    reason: ErrorEnvelope | null;
  }> {
    try {
      const target = await this.getTarget(targetId);
      if (target.authorityRevoked) {
        return {
          resourceId,
          status: "UNKNOWN",
          reason: { code: "AUTHORITY_REVOKED", message: `Reclose's control authority over target ${targetId} has been revoked - no statement about this resource's actual availability can be made.` },
        };
      }
      const count = num(await this.kernel("get_resource_restriction_count", [target.targetAddress, resourceId]));
      if (count > 0) {
        return { resourceId, status: "UNAVAILABLE", reason: { code: "UNKNOWN", message: `${count} active assurance restriction(s) apply to ${resourceId}` } };
      }
      return { resourceId, status: "AVAILABLE", reason: null };
    } catch (error) {
      return { resourceId, status: "UNKNOWN", reason: { code: "UNKNOWN", message: `Provider availability could not be read: ${(error as Error).message}` } };
    }
  }

  private async feePreview(
    functionName: string,
    args: unknown[],
    contractAddress: string = this.addresses.judge,
    value: bigint = 0n
  ): Promise<FeeTransactionPreview> {
    await this.ensureNetwork();
    if (!this.transport.estimateTransactionFeesForWrite) throw new Error("Transport does not support fee estimation");
    // Item 1 (owner-directed remediation pass): the PREVIOUS unconditional `value: 0n` silently
    // mis-estimated every payable call (e.g. IncentiveVault.open_bond, which genuinely moves
    // `rule.reportBond` wei) as if it moved nothing - callers that actually carry a non-zero
    // `valueWei` on their PreparedRecloseWrite MUST estimate against that same real value.
    const estimate = await this.transport.estimateTransactionFeesForWrite({ address: contractAddress, functionName, args, value });
    const fullFeeDetail = {
      distribution: toJsonSafe(estimate.distribution ?? null),
      messageAllocations: Array.isArray(estimate.messageAllocations)
        ? estimate.messageAllocations.map((node) => toJsonSafe(node) as Record<string, string | boolean>)
        : null,
      feeValue: String(estimate.feeValue ?? "0"),
    };
    return {
      network: "studio-dev",
      chainId: RECLOSE_CANONICAL_CHAIN_ID,
      estimatedFeeValueWei: String(estimate.feeValue ?? "0"),
      isEstimate: true,
      distributionSummary: null,
      fullFeeDetail,
      feeConfigHash: canonicalKeccak256(fullFeeDetail),
    };
  }

  /**
   * A3-H02: target onboarding must be a real bounded governed write, not a presentation-only
   * form. Not one of the frozen 14 RecloseSDK methods (that boundary is a minimum read/build
   * surface, not an exhaustive list) - purely additive, the frozen methods are unchanged.
   * Verifies the target independently reports the SAME owner/controller the caller expects
   * before ever producing a signable draft, per CLAUDE.md's registration-handshake requirement -
   * the Kernel itself re-verifies this on-chain regardless; this is a fast pre-sign check, not a
   * second authority.
   */
  /**
   * Item 4 (owner-directed remediation pass): the pre-sign handshake is now performed
   * UNCONDITIONALLY by the SDK's own already-configured transport/kernel reference - it no longer
   * depends on a caller optionally injecting `targetReadContract`. Mirrors
   * contracts/assurance_kernel.py::register_target's OWN real-time checks exactly (same method
   * names, same order, same failure semantics), reading them directly off the target contract via
   * `this.transport.readContract({ address: input.targetAddress, ... })`:
   *   - get_assurance_owner()              -> reported owner (compared against expectedOwner, when supplied)
   *   - get_assurance_controller()         -> must equal THIS Kernel's own address
   *   - get_assurance_target_id()          -> must equal the requested targetId
   *   - is_assurance_authority_revoked()   -> must be false
   * The Kernel re-verifies every one of these on-chain regardless (this is a fast pre-sign UX
   * check, not a second authority, per CLAUDE.md Section 12) - but it is no longer possible to skip
   * the controller/targetId/revoked checks just by omitting an optional injection parameter.
   */
  async buildTargetRegistration(input: {
    targetId: string;
    targetAddress: string;
    humanOverrideEnabled: boolean;
    expectedOwner?: string;
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(input.targetAddress)) throw new Error("targetAddress must be a 20-byte 0x-prefixed address");
    if (!/^[A-Za-z0-9_.:-]{1,96}$/.test(input.targetId)) throw new Error("targetId is not a valid identifier");
    await this.ensureNetwork();

    const reportedOwner = str(await this.transport.readContract({ address: input.targetAddress, functionName: "get_assurance_owner" }));
    const controller = str(await this.transport.readContract({ address: input.targetAddress, functionName: "get_assurance_controller" }));
    const reportedTargetId = str(await this.transport.readContract({ address: input.targetAddress, functionName: "get_assurance_target_id" }));
    const revoked = Boolean(await this.transport.readContract({ address: input.targetAddress, functionName: "is_assurance_authority_revoked" }));

    if (controller.toLowerCase() !== this.addresses.kernel.toLowerCase()) {
      throw new Error(`Target handshake failed: target reports controller ${controller}, expected this Kernel (${this.addresses.kernel}). Registration will not be prepared.`);
    }
    if (reportedTargetId !== input.targetId) {
      throw new Error(`Target handshake failed: target reports target ID "${reportedTargetId}", expected "${input.targetId}". Registration will not be prepared.`);
    }
    if (revoked) {
      throw new Error(`Target handshake failed: target reports assurance authority already revoked. Registration will not be prepared.`);
    }
    if (input.expectedOwner && reportedOwner.toLowerCase() !== input.expectedOwner.toLowerCase()) {
      throw new Error(`Target handshake failed: target reports owner ${reportedOwner}, expected ${input.expectedOwner}. Registration will not be prepared.`);
    }

    const args: unknown[] = [input.targetId, input.targetAddress, input.humanOverrideEnabled];
    const feeEstimate = await this.feePreview("register_target", args, this.addresses.kernel);

    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0",
      chainId: RECLOSE_CANONICAL_CHAIN_ID,
      contractAddress: this.addresses.kernel,
      functionName: "register_target",
      args,
      valueWei: "0",
      feeEstimate,
      semanticKind: "TARGET_REGISTRATION" as PreparedWriteSemanticKind,
      // Signer-binding requirement: the expected signer is the EXPLICITLY requested owner when
      // supplied, otherwise the target's own REAL reported owner (never null merely because the
      // caller omitted expectedOwner - the handshake above already read a real owner value).
      expectedSigner: (input.expectedOwner as `0x${string}` | undefined) ?? (reportedOwner as `0x${string}`),
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    const report: PreparedRecloseWrite = { ...draft, reviewHash: computeReviewHash(forHash) };
    return { report, feePreview: feeEstimate };
  }

  /** Builds the canonical EAP for either submission kind, binding it to the reporter/policy/
   * rule actually being submitted against - A3-H05: uses the ONE canonical EAP implementation
   * (protocol-sdk/evidence.ts, re-exported verbatim by @reclose/evidence-builder), never a
   * second simplified validator. */
  private buildCanonicalEap(args: {
    targetId: string;
    policyHash: string;
    ruleId: RuleId;
    subject: string;
    reporterAddress: string;
    evidenceSources: Array<EvidenceSource & { extractedText?: string; snapshotRef?: string }>;
  }) {
    const now = new Date().toISOString();
    return buildEapObject({
      targetId: args.targetId,
      policyHash: args.policyHash as `0x${string}`,
      ruleId: args.ruleId,
      subject: args.subject,
      reporter: args.reporterAddress as `0x${string}`,
      observedAt: now,
      retrievedAt: now,
      sources: args.evidenceSources.map((s) => ({
        sourceId: s.sourceId,
        url: s.url,
        sourceClass: s.sourceClass,
        extractedText: s.extractedText ?? "",
        snapshotRef: s.snapshotRef ?? "",
        retrievedAt: s.observedAt ?? s.fetchedAt,
      })),
    });
  }

  /** A3-H01/A3-H06: returns the exact, complete, bounded draft that will be signed - the SAME
   * object the caller previews. `reporterAddress` is caller-supplied (the SDK is non-custodial
   * and has no wallet access); `bondId` is caller-supplied when the rule's economics require a
   * bond, otherwise "" (zero-bond path). Fee estimation runs over this exact 8-argument call,
   * never a shortened placeholder. */
  /**
   * FINAL_REMEDIATION.md Section 5: the non-zero Reporter bond journey. Prepares
   * `IncentiveVault.open_bond` bound to the EXACT deterministic incident identity
   * (`deriveIncidentId`, the same formula the IncidentJudge contract itself evaluates) and the
   * rule's real immutable policy economics - never a caller-invented amount (value is fixed to
   * `rule.reportBond` wei exactly, matching contracts/incentive_vault.py::open_bond's own
   * `BOND_AMOUNT_MISMATCH` check). `bondId` is derived deterministically from the predicted
   * incident identity when not supplied, so a given reporter/target/nonce always opens the SAME
   * bond id rather than a fresh random one each preview.
   */
  async buildOpenBond(input: { targetId: string; ruleId: string; reporterAddress: string; bondId?: string }): Promise<{
    report: unknown;
    feePreview: FeeTransactionPreview;
    bondId: string;
  }> {
    if (!this.addresses.vault) throw new Error("No Vault address configured - the bonded reporting journey requires addresses.vault");
    const policy = await this.getActivePolicy(input.targetId);
    const rule = policy.rules.find((r) => r.ruleId === input.ruleId && r.enabled);
    if (!rule) throw new Error(`Rule ${input.ruleId} is not active for ${input.targetId}`);
    if (BigInt(rule.reportBond || "0") <= 0n) throw new Error(`Rule ${input.ruleId} is a zero-bond rule - do not open a Vault bond for it (E_VLT_010).`);
    const reporterNonce = num(await this.judgeRead("get_reporter_nonce", [input.reporterAddress]));
    const predictedIncidentId = deriveIncidentId(input.targetId, input.reporterAddress, reporterNonce);
    const bondId = input.bondId ?? deriveBondId({
      targetId: input.targetId,
      policyKey: policy.summary.policyKey,
      ruleId: input.ruleId,
      reporterAddress: input.reporterAddress,
      reporterNonce,
      predictedIncidentId,
    });
    const args: unknown[] = [bondId, input.targetId, policy.summary.policyKey, policy.summary.version, input.ruleId, reporterNonce, predictedIncidentId];
    // Item 1: open_bond is a REAL payable call (it moves exactly rule.reportBond wei) - estimate
    // against that real value, never the flat 0n every previous feePreview call silently assumed.
    const feeEstimate = await this.feePreview("open_bond", args, this.addresses.vault, BigInt(rule.reportBond || "0"));
    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0", chainId: RECLOSE_CANONICAL_CHAIN_ID, contractAddress: this.addresses.vault,
      functionName: "open_bond", args, valueWei: rule.reportBond, feeEstimate,
      semanticKind: "INCIDENT_REPORT" as PreparedWriteSemanticKind, expectedSigner: input.reporterAddress as `0x${string}`,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    return { report: { ...draft, reviewHash: computeReviewHash(forHash) }, feePreview: feeEstimate, bondId };
  }

  /**
   * Item 2 (owner-directed remediation pass): generalizes the non-zero-bond gating that previously
   * existed only inline inside buildIncidentReport to every Judge submission entrypoint
   * (buildIncidentReport, buildRecoveryReport). Re-derives the bondId a currently-open bond for
   * this EXACT reporter/target/rule/policy would have used, with the reporter's CURRENT nonce, and
   * requires it to match the caller-supplied `bondId` exactly - if the reporter's nonce changed
   * since the bond was opened (e.g. a different report was submitted/confirmed in between), the
   * previously-opened bond no longer corresponds to the incident this submission will actually
   * mint, and the stale bondId must be rejected with a clear explanation rather than silently
   * accepted and failed opaquely by the Judge's own `_verify_bond` at execution time.
   */
  private requireVerifiedBond(input: {
    rule: { ruleId: string; reportBond: string } | undefined;
    ruleId: string;
    targetId: string;
    policyKey: string;
    reporterAddress: string;
    reporterNonce: number;
    predictedIncidentId: string;
    bondId?: string;
  }): string {
    if (!input.rule || BigInt(input.rule.reportBond || "0") <= 0n) return input.bondId ?? "";
    if (!input.bondId) {
      throw new Error(`Rule ${input.ruleId} requires a non-zero bond (${input.rule.reportBond} wei). Call buildOpenBond first, submit and confirm that transaction, then pass its bondId here - this submission cannot be prepared without it.`);
    }
    const expectedBondId = deriveBondId({
      targetId: input.targetId,
      policyKey: input.policyKey,
      ruleId: input.ruleId,
      reporterAddress: input.reporterAddress,
      reporterNonce: input.reporterNonce,
      predictedIncidentId: input.predictedIncidentId,
    });
    if (expectedBondId !== input.bondId) {
      throw new Error(`Bond mismatch: the reporter's nonce has changed since this bond was opened (current nonce ${input.reporterNonce} derives expected bondId ${expectedBondId}, but ${input.bondId} was supplied). The previously-opened bond no longer corresponds to the incident this submission would mint - re-open the bond with buildOpenBond using the CURRENT nonce before submitting.`);
    }
    return input.bondId;
  }

  async buildIncidentReport(input: {
    targetId: string;
    ruleId: string;
    resourceId: string;
    evidenceSources: Array<EvidenceSource & { extractedText?: string; snapshotRef?: string }>;
    reporterAddress?: string;
    bondId?: string;
    subject?: string;
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const policy = await this.getActivePolicy(input.targetId);
    const rule = policy.rules.find((r) => r.ruleId === input.ruleId && r.enabled);
    if (!rule) throw new Error(`Rule ${input.ruleId} is not active for ${input.targetId}`);
    // Resources are NOT free text against an ordinary report path (FINAL_REMEDIATION.md Section
    // 12): the resourceId must match a real enabled effect of this exact rule in the ACTIVE
    // policy - a target-wide effect is declared with resourceId === "", so an empty resourceId is
    // valid only when such an effect exists for this rule.
    const resourceId = input.resourceId ?? "";
    const matchingEffect = policy.effects.find((e) => e.ruleId === input.ruleId && e.enabled && e.resourceId === resourceId);
    if (!matchingEffect) {
      const validResourceIds = [...new Set(policy.effects.filter((e) => e.ruleId === input.ruleId && e.enabled).map((e) => e.resourceId || "(target-wide)"))];
      throw new Error(`resourceId "${resourceId || "(target-wide)"}" is not governed by an enabled effect of rule ${input.ruleId} in policy ${policy.summary.policyKey}. Valid resources for this rule: ${validResourceIds.join(", ") || "none"}.`);
    }
    if (!input.reporterAddress) throw new Error("reporterAddress is required to bind the EAP and derive the reporter nonce - Reclose never custodies a signing identity");
    const reporterAddress = input.reporterAddress;
    const ruleId = input.ruleId as RuleId;

    const eap = this.buildCanonicalEap({
      targetId: input.targetId,
      policyHash: policy.summary.manifestHash,
      ruleId,
      subject: input.subject ?? `${ruleId} report against ${input.resourceId || input.targetId}`,
      reporterAddress,
      evidenceSources: input.evidenceSources,
    });
    const evidenceJson = JSON.stringify(eap);
    const reporterNonce = num(await this.judgeRead("get_reporter_nonce", [reporterAddress]));
    const predictedIncidentId = deriveIncidentId(input.targetId, reporterAddress, reporterNonce);
    // Item 2: non-zero bond rule gating, generalized into requireVerifiedBond - never prepared with
    // bondId="" when reportBond > 0, and rejects a bond whose reporter nonce no longer matches.
    const bondId = this.requireVerifiedBond({
      rule, ruleId, targetId: input.targetId, policyKey: policy.summary.policyKey,
      reporterAddress, reporterNonce, predictedIncidentId, bondId: input.bondId,
    });

    const args: unknown[] = [input.targetId, policy.summary.policyKey, ruleId, input.resourceId, eap.artifactHash, evidenceJson, reporterNonce, bondId];
    const feeEstimate = await this.feePreview("submit_incident", args);
    feeEstimate.bondWei = rule.reportBond;

    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0",
      chainId: RECLOSE_CANONICAL_CHAIN_ID,
      contractAddress: this.addresses.judge,
      functionName: "submit_incident",
      args,
      valueWei: "0",
      feeEstimate,
      semanticKind: "INCIDENT_REPORT" as PreparedWriteSemanticKind,
      // Signer-binding requirement: the connected wallet account must equal the EAP-bound
      // reporter immediately before signing - this draft was reviewed and built FOR this address.
      expectedSigner: reporterAddress as `0x${string}`,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    const report: PreparedRecloseWrite & { predictedIncidentId: PredictedIncidentIdentity } = {
      ...draft,
      reviewHash: computeReviewHash(forHash),
      // A3-H12: derived with the EXACT formula contracts/incident_judge_v1.py::_derive_incident_id
      // evaluates on-chain (`f"{target_id}:{reporter.as_hex}:{int(nonce)}"`) - computable now,
      // before this transaction resolves, because target_id/reporterAddress/reporterNonce are all
      // already protocol-read inputs to this same draft. The caller persists this alongside the
      // txId the instant the draft is signed - never waiting on (or substituting) whatever value
      // a writer's return object happens to carry.
      predictedIncidentId: { incidentId: predictedIncidentId, targetId: input.targetId, reporterAddress, reporterNonce },
    };
    return { report, feePreview: feeEstimate };
  }

  async buildRecoveryReport(input: {
    incidentId: string;
    evidenceSources: Array<EvidenceSource & { extractedText?: string; snapshotRef?: string }>;
    reporterAddress?: string;
    bondId?: string;
    subject?: string;
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const incident = await this.getIncident(input.incidentId);
    const policy = await this.getActivePolicy(incident.targetId);
    if (!input.reporterAddress) throw new Error("reporterAddress is required to bind the EAP and derive the reporter nonce - Reclose never custodies a signing identity");
    const reporterAddress = input.reporterAddress;
    const ruleId: RuleId = "RECOVERY_VALIDATED_V1";
    // Item 2: generalizes buildIncidentReport's non-zero-bond gating to the recovery path - the
    // rule's REAL bond economics are read from the active policy, never assumed zero just because
    // the previous code always defaulted bondId to "".
    const recoveryRule = policy.rules.find((r) => r.ruleId === ruleId && r.enabled);

    const eap = this.buildCanonicalEap({
      targetId: incident.targetId,
      policyHash: policy.summary.manifestHash,
      ruleId,
      subject: input.subject ?? `Recovery validation for ${input.incidentId}`,
      reporterAddress,
      evidenceSources: input.evidenceSources,
    });
    const evidenceJson = JSON.stringify(eap);
    const reporterNonce = num(await this.judgeRead("get_reporter_nonce", [reporterAddress]));
    const predictedIncidentId = deriveIncidentId(incident.targetId, reporterAddress, reporterNonce);
    const bondId = this.requireVerifiedBond({
      rule: recoveryRule, ruleId, targetId: incident.targetId, policyKey: policy.summary.policyKey,
      reporterAddress, reporterNonce, predictedIncidentId, bondId: input.bondId,
    });

    const args: unknown[] = [input.incidentId, policy.summary.policyKey, eap.artifactHash, evidenceJson, reporterNonce, bondId];
    const feeEstimate = await this.feePreview("submit_recovery_validation", args);

    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0",
      chainId: RECLOSE_CANONICAL_CHAIN_ID,
      contractAddress: this.addresses.judge,
      functionName: "submit_recovery_validation",
      args,
      valueWei: "0",
      feeEstimate,
      semanticKind: "RECOVERY_VALIDATION_REPORT" as PreparedWriteSemanticKind,
      expectedSigner: reporterAddress as `0x${string}`,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    const report: PreparedRecloseWrite & { predictedIncidentId: PredictedIncidentIdentity } = {
      ...draft,
      reviewHash: computeReviewHash(forHash),
      predictedIncidentId: { incidentId: predictedIncidentId, targetId: incident.targetId, reporterAddress, reporterNonce },
    };
    return { report, feePreview: feeEstimate };
  }

  /**
   * Remediation is a distinct on-chain entrypoint from recovery validation
   * (contracts/incident_judge_v1.py::submit_remediation / RULE_REMEDIATION_CONFIRMED_V1), not a
   * relabeling of submit_recovery_validation - the two rule families have separate outcome/
   * condition-code vocabularies (REMEDIATION_VERIFIED vs RECOVERY_VERIFIED) and the product must
   * gate recovery-validation behind a genuinely CONFIRMED remediation decision (see
   * frontend/app.js's recovery flow), never let a caller skip straight to recovery validation.
   * Mirrors buildRecoveryReport's exact bond-gating/EAP/fee-preview pattern.
   */
  async buildRemediationReport(input: {
    incidentId: string;
    evidenceSources: Array<EvidenceSource & { extractedText?: string; snapshotRef?: string }>;
    reporterAddress?: string;
    bondId?: string;
    subject?: string;
  }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const incident = await this.getIncident(input.incidentId);
    const policy = await this.getActivePolicy(incident.targetId);
    if (!input.reporterAddress) throw new Error("reporterAddress is required to bind the EAP and derive the reporter nonce - Reclose never custodies a signing identity");
    const reporterAddress = input.reporterAddress;
    const ruleId: RuleId = "REMEDIATION_CONFIRMED_V1";
    const remediationRule = policy.rules.find((r) => r.ruleId === ruleId && r.enabled);

    const eap = this.buildCanonicalEap({
      targetId: incident.targetId,
      policyHash: policy.summary.manifestHash,
      ruleId,
      subject: input.subject ?? `Remediation for ${input.incidentId}`,
      reporterAddress,
      evidenceSources: input.evidenceSources,
    });
    const evidenceJson = JSON.stringify(eap);
    const reporterNonce = num(await this.judgeRead("get_reporter_nonce", [reporterAddress]));
    const predictedIncidentId = deriveIncidentId(incident.targetId, reporterAddress, reporterNonce);
    const bondId = this.requireVerifiedBond({
      rule: remediationRule, ruleId, targetId: incident.targetId, policyKey: policy.summary.policyKey,
      reporterAddress, reporterNonce, predictedIncidentId, bondId: input.bondId,
    });

    const args: unknown[] = [input.incidentId, policy.summary.policyKey, eap.artifactHash, evidenceJson, reporterNonce, bondId];
    const feeEstimate = await this.feePreview("submit_remediation", args);

    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0",
      chainId: RECLOSE_CANONICAL_CHAIN_ID,
      contractAddress: this.addresses.judge,
      functionName: "submit_remediation",
      args,
      valueWei: "0",
      feeEstimate,
      semanticKind: "REMEDIATION_REPORT" as PreparedWriteSemanticKind,
      expectedSigner: reporterAddress as `0x${string}`,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    const report: PreparedRecloseWrite & { predictedIncidentId: PredictedIncidentIdentity } = {
      ...draft,
      reviewHash: computeReviewHash(forHash),
      predictedIncidentId: { incidentId: predictedIncidentId, targetId: incident.targetId, reporterAddress, reporterNonce },
    };
    return { report, feePreview: feeEstimate };
  }

  /**
   * Additive (not one of the frozen 14). Wires the authoritative Judge recovery-lineage views
   * added in contracts/incident_judge_v1.py (get_incident_parent/target_id/policy_key/rule_id/
   * reporter/evidence_hash and the get_parent_child_count/at reverse index) so the product can
   * reconstruct a real remediation/recovery-validation chain from protocol state directly, rather
   * than relying only on the optional indexer.resolveIncidentLineage hook from an earlier pass.
   * Returns an empty children array and null parent fields for a root incident (parent_incident_id
   * == "" on-chain) - never fabricates a chain that doesn't exist.
   */
  async getIncidentLineage(incidentId: string): Promise<{
    incidentId: string;
    parentIncidentId: string | null;
    targetId: string;
    policyKey: string;
    ruleId: string;
    reporter: string;
    evidenceHash: string;
    outcome: number;
    conditionCode: string;
    children: string[];
  }> {
    const [parentIncidentId, targetId, policyKey, ruleId, reporter, evidenceHash, outcome, conditionCode, childCount] = await Promise.all([
      this.judgeRead("get_incident_parent", [incidentId]),
      this.judgeRead("get_incident_target_id", [incidentId]),
      this.judgeRead("get_incident_policy_key", [incidentId]),
      this.judgeRead("get_incident_rule_id", [incidentId]),
      this.judgeRead("get_incident_reporter", [incidentId]),
      this.judgeRead("get_incident_evidence_hash", [incidentId]),
      this.judgeRead("get_incident_outcome", [incidentId]),
      this.judgeRead("get_incident_condition_code", [incidentId]),
      this.judgeRead("get_parent_child_count", [incidentId]),
    ]);
    const childCountNum = num(childCount);
    const children: string[] = [];
    for (let i = 0; i < childCountNum; i += 1) {
      children.push(str(await this.judgeRead("get_parent_child_at", [incidentId, i])));
    }
    const parentStr = str(parentIncidentId);
    return {
      incidentId,
      parentIncidentId: parentStr === "" ? null : parentStr,
      targetId: str(targetId),
      policyKey: str(policyKey),
      ruleId: str(ruleId),
      reporter: str(reporter),
      evidenceHash: str(evidenceHash),
      outcome: num(outcome),
      conditionCode: str(conditionCode),
      children,
    };
  }

  /**
   * A3-H07: bounded owner bearing-authority controls that already exist on the deployed Kernel
   * (`revoke_authority`, `disable_action`, `disable_resource` - contracts/assurance_kernel.py) but
   * were never exposed as a governed write in the product. No separate "emergency pause" method
   * exists on the Kernel beyond these three bounded, immediate, owner-gated writes - they ARE the
   * Kernel's bounded pause/authority-reduction mechanism (CLAUDE.md Section 7 item 6: an accepted-
   * phase action must be authority-reducing and non-value-moving, which all three satisfy). Adding
   * a fourth distinct contract method would be an architecture change outside this remediation
   * pass's scope, so this builder wires the product to the bounded controls that already exist
   * rather than inventing a new one.
   */
  async buildRevokeAuthority(input: { targetId: string }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const args: unknown[] = [input.targetId];
    const feeEstimate = await this.feePreview("revoke_authority", args, this.addresses.kernel);
    // Signer-binding requirement: the expected signer for an owner-bounded write is the target's
    // currently-cached owner - a fast pre-sign UX check only. The Kernel's own live owner read at
    // execution time (_require_live_owner) remains the actual authority (CLAUDE.md Section 12).
    const expectedSigner = (await this.getTarget(input.targetId)).cachedOwner as `0x${string}`;
    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0", chainId: RECLOSE_CANONICAL_CHAIN_ID, contractAddress: this.addresses.kernel,
      functionName: "revoke_authority", args, valueWei: "0", feeEstimate, semanticKind: "AUTHORITY_REVOCATION" as PreparedWriteSemanticKind,
      expectedSigner,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    return { report: { ...draft, reviewHash: computeReviewHash(forHash) }, feePreview: feeEstimate };
  }

  async buildDisableAction(input: { targetId: string; actionType: number }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const args: unknown[] = [input.targetId, input.actionType];
    const feeEstimate = await this.feePreview("disable_action", args, this.addresses.kernel);
    const expectedSigner = (await this.getTarget(input.targetId)).cachedOwner as `0x${string}`;
    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0", chainId: RECLOSE_CANONICAL_CHAIN_ID, contractAddress: this.addresses.kernel,
      functionName: "disable_action", args, valueWei: "0", feeEstimate, semanticKind: "DISABLE_ACTION" as PreparedWriteSemanticKind,
      expectedSigner,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    return { report: { ...draft, reviewHash: computeReviewHash(forHash) }, feePreview: feeEstimate };
  }

  async buildDisableResource(input: { targetId: string; resourceId: string }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const args: unknown[] = [input.targetId, input.resourceId];
    const feeEstimate = await this.feePreview("disable_resource", args, this.addresses.kernel);
    const expectedSigner = (await this.getTarget(input.targetId)).cachedOwner as `0x${string}`;
    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0", chainId: RECLOSE_CANONICAL_CHAIN_ID, contractAddress: this.addresses.kernel,
      functionName: "disable_resource", args, valueWei: "0", feeEstimate, semanticKind: "DISABLE_RESOURCE" as PreparedWriteSemanticKind,
      expectedSigner,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    return { report: { ...draft, reviewHash: computeReviewHash(forHash) }, feePreview: feeEstimate };
  }

  /**
   * A3-H02 (policy-activation half): replaces the presentation-only "Validate & diff" stub with
   * real canonical validation (`validateCanonicalApmStructure`), real deterministic hashing
   * (RFC8785/JCS + Keccak-256 via `canonicalKeccak256`), and a real authority diff against the
   * target's CURRENTLY active policy (read live from protocol state, not a caller-supplied "from"
   * value that could be stale or fabricated). Blocks on an invalid manifest before any diff/fee
   * work, per FINAL_REMEDIATION.md Section 3 item 6. This covers steps 1-6 and 12 of that section's
   * required path (construct/accept -> validate -> canonicalize/hash -> diff -> show consequence ->
   * expose raw manifest/hash); it intentionally does NOT attempt the multi-transaction
   * sequence (begin_policy, then add_policy_resource, add_policy_rule and add_policy_effect
   * repeated per item, then seal_policy, then activate_policy) in this pass - that remains a
   * distinct, larger write-sequence feature, honestly left open rather than claimed closed here.
   */
  async buildPolicyActivationReview(input: { targetId: string; apm: unknown }): Promise<{
    valid: boolean;
    errors: string[];
    manifestHash: string | null;
    diff: PolicySecurityDiff | null;
  }> {
    const validation = await this.validateAPM(input.apm);
    if (!validation.valid) return { valid: false, errors: validation.errors, manifestHash: null, diff: null };
    const manifestHash = await this.hashAPM(input.apm);
    // `diffCanonicalApm`/`extractKernelRuleEffectModel` natively understands a PolicyDetail
    // object's shape (rules[]/effects[], including each effect's real enabled flag) - pass the
    // live current policy through DIRECTLY rather than lossily re-projecting it into a pretend
    // APM first, so every kernel-equivalent field (judgeVersion, provisionalAllowed, reportBond,
    // confirmedBounty, paramU256, paramStr, releasePhase) is compared with full fidelity.
    let fromApm: unknown = {};
    try { fromApm = await this.getActivePolicy(input.targetId); }
    catch { /* target has no active policy yet - diffing against an empty baseline is correct, not an error */ }
    const diff = diffCanonicalApm(fromApm, input.apm);
    return { valid: true, errors: [], manifestHash, diff };
  }

  /**
   * FINAL_REMEDIATION.md Section 3: policy construction/activation must be a REAL multi-
   * transaction write sequence (begin_policy -> add_policy_resource* -> add_policy_rule* ->
   * add_policy_effect* -> seal_policy -> activate_policy), never a single-button fiction. This
   * package (protocol-sdk) cannot import @reclose/policy-compiler - policy-compiler already
   * depends on protocol-sdk, so the reverse would be circular (the exact issue A3-H05 already hit
   * and resolved by relocating evidence.ts; there is no equivalent safe relocation for the
   * compiler without a much larger refactor under this remediation pass's time constraints). The
   * canonical compiler (`@reclose/policy-compiler::compileCanonicalApm`) remains the ONE
   * implementation that turns a manifest into the exact ordered Kernel calls - this method only
   * wraps an ALREADY-COMPILED call (produced by that canonical compiler, injected by the host
   * exactly like `sdk`/`writer`/`indexer` already are for the same no-bundler reason) with real
   * fee estimation and a real review hash. It never re-derives or second-guesses the call's
   * args/functionName itself.
   */
  async buildPreparedWriteForCall(
    call: { functionName: string; args: unknown[] },
    options: { contractAddress?: string; semanticKind: PreparedWriteSemanticKind; valueWei?: string; targetId?: string }
  ): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const contractAddress = options.contractAddress ?? this.addresses.kernel;
    const feeEstimate = await this.feePreview(call.functionName, call.args, contractAddress, BigInt(options.valueWei ?? "0"));
    // Item 3 (owner-directed remediation pass): every policy-construction/activation step must be
    // bound to the target's CURRENT, LIVE-read owner (via getTarget, which always issues a fresh
    // readContract call - never a cached value) immediately before this draft is hashed/signed.
    // Previously no expectedSigner was ever set on a policy-construction step at all, so
    // submitWrite's signer-binding check (adapters.js) had nothing to verify against; an account
    // switch mid-journey could sign a step reviewed under a different identity undetected.
    let expectedSigner: `0x${string}` | null = null;
    if (options.targetId) {
      try { expectedSigner = (await this.getTarget(options.targetId)).cachedOwner as `0x${string}`; } catch { expectedSigner = null; }
    }
    const draft: Omit<PreparedRecloseWrite, "reviewHash"> = {
      schemaVersion: "1.0.0", chainId: RECLOSE_CANONICAL_CHAIN_ID, contractAddress,
      functionName: call.functionName, args: call.args, valueWei: options.valueWei ?? "0",
      feeEstimate, semanticKind: options.semanticKind, expectedSigner,
    };
    const { feeEstimate: _omitted, ...forHash } = draft;
    return { report: { ...draft, reviewHash: computeReviewHash(forHash) }, feePreview: feeEstimate };
  }

  /** Builds the final `activate_policy` prepared write plus the real kernel-equivalent expansion/
   * timelock classification (via `diffCanonicalApm` against the target's CURRENT active policy,
   * not a guess) - the last step of the construction journey, kept separate from
   * `buildPreparedWriteForCall` so callers get the expansion verdict alongside the draft. */
  async buildPolicyActivationWrite(input: { targetId: string; policyKey: string; apm: unknown }): Promise<{
    report: unknown;
    feePreview: FeeTransactionPreview;
    authorityExpands: boolean;
    diff: PolicySecurityDiff;
  }> {
    let fromApm: unknown = {};
    try { fromApm = await this.getActivePolicy(input.targetId); } catch { /* first policy for this target - expansion-from-empty semantics apply */ }
    const diff = diffCanonicalApm(fromApm, input.apm);
    const built = await this.buildPreparedWriteForCall(
      { functionName: "activate_policy", args: [input.policyKey] },
      { semanticKind: "POLICY_ACTIVATION" as PreparedWriteSemanticKind, targetId: input.targetId }
    );
    return { ...built, authorityExpands: diff.authorityExpands, diff };
  }

  async validateAPM(apm: unknown): Promise<{ valid: boolean; errors: string[] }> {
    const errors = validateCanonicalApmStructure(apm);
    return { valid: errors.length === 0, errors };
  }

  async hashAPM(apm: unknown): Promise<string> {
    const validation = await this.validateAPM(apm);
    if (!validation.valid) throw new Error(`Invalid APM: ${validation.errors.join("; ")}`);
    return canonicalKeccak256(apm);
  }

  async diffAPM(fromApm: unknown, toApm: unknown): Promise<PolicySecurityDiff> {
    const validation = await this.validateAPM(toApm);
    if (!validation.valid) throw new Error(`Invalid destination APM: ${validation.errors.join("; ")}`);
    return diffCanonicalApm(fromApm, toApm);
  }

  async trackTransaction(txId: `0x${string}`): Promise<GenLayerTransactionLifecycle & { executionResult?: ExecutionResult }> {
    await this.ensureNetwork();
    const raw = await this.transport.getTransaction({ hash: txId });
    const lifecycle = mapRawTransaction(raw);
    return raw.executionResult ? { ...lifecycle, executionResult: raw.executionResult } : lifecycle;
  }

  /**
   * A3-H04 (second hop): `trackActionTrace` resolves the Judge -> Kernel child
   * (`receive_decision`); this resolves the NEXT hop, Kernel -> Target (the `_dispatch_action`
   * call the Kernel's child transaction itself triggers), using the transport's own
   * `getTriggeredTransactionIds` against the Judge->Kernel child's tx hash - the same mechanism
   * genlayer-js exposes for any triggered-transaction walk, not a second index layer. Returns null
   * (never a fabricated hop) when the Kernel->Target child does not exist yet or the transport
   * cannot report triggered transactions - e.g. the target adapter's action required no further
   * dispatch, or (per A2-C01) the Kernel->Target dispatch itself never fires because the Judge->
   * Kernel call already failed at the `fee no_matching_allocation # internal` step.
   */
  async trackKernelToTargetChild(actionId: string): Promise<(GenLayerTransactionLifecycle & { executionResult?: ExecutionResult }) | null> {
    if (!this.transport.resolveActionTransaction) throw new Error("Action trace requires a transaction index adapter");
    const mapping = await this.transport.resolveActionTransaction(actionId);
    if (!mapping) throw new Error(`No transaction mapping for action ${actionId}`);
    const triggered = await this.transport.getTriggeredTransactionIds({ hash: mapping.childTxId });
    if (!triggered.length) return null;
    return this.trackTransaction(triggered[0] as `0x${string}`);
  }

  async trackActionTrace(actionId: string): Promise<ExecutionReceipt> {
    if (!this.transport.resolveActionTransaction) throw new Error("Action trace requires a transaction index adapter");
    const mapping = await this.transport.resolveActionTransaction(actionId);
    if (!mapping) throw new Error(`No transaction mapping for action ${actionId}`);
    if (!mapping.targetId) throw new Error(`Action trace ${actionId} has no protocol-derived targetId`);
    if (!mapping.executionTime || Number.isNaN(Date.parse(mapping.executionTime))) throw new Error(`Action trace ${actionId} has no protocol-derived executionTime`);
    const parent = await this.trackTransaction(mapping.parentTxId as `0x${string}`);
    const childRaw = await this.transport.getTransaction({ hash: mapping.childTxId });
    const childLifecycle = mapRawTransaction(childRaw);
    const executionResult = childRaw.executionResult ?? "NOT_VOTED";
    const failure: ExecutionResult[] = ["FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"];
    let finalStatus: ExecutionReceipt["finalStatus"] = executionResult === "FINISHED_WITH_RETURN" ? "SUCCESS" : failure.includes(executionResult) ? "FAILURE" : "UNKNOWN";
    if (finalStatus === "SUCCESS" && mapping.expectedPostStateRequired && mapping.postStateMatchesExpected !== true) finalStatus = "FAILURE";
    return {
      schemaVersion: "1.0.0",
      actionId,
      targetId: mapping.targetId,
      adapterId: mapping.adapterId,
      parentTxId: parent.txId,
      childTx: { txId: mapping.childTxId, parentTxId: parent.txId, role: "TARGET_ACTION", lifecycle: childLifecycle, executionResult },
      executionResult,
      finalStatus,
      preStateHash: mapping.preStateHash,
      postStateHash: mapping.postStateHash,
      expectedPostStateRequired: mapping.expectedPostStateRequired,
      observedPostState: mapping.observedPostState ?? null,
      postStateMatchesExpected: mapping.postStateMatchesExpected ?? null,
      executionTime: mapping.executionTime,
    };
  }
}

export function createRecloseClient(options: CreateRecloseClientOptions): RecloseSDK {
  return new DirectRecloseClient(options.transport, options.addresses);
}
