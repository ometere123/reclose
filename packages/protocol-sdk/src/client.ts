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
  RawGenLayerTransaction,
  RuleId,
  RuleKind,
  Target,
} from "./types";
import type { RecloseSDK } from "./sdk";
import { assertCanonicalChainId, RECLOSE_CANONICAL_CHAIN_ID } from "./networkGuard";
import { canonicalKeccak256 } from "./canonical";
import { mapRawTransaction } from "./lifecycle";

export interface RecloseAddresses {
  kernel: string;
  judge: string;
  vault?: string;
}

/**
 * Minimal direct-protocol adapter. A genlayer-js client can satisfy this surface with a thin
 * object wrapper; tests can use a fake without network access. No hosted Reclose API is required.
 */
export interface RecloseTransport {
  getChainId(): Promise<number | bigint>;
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
  }>;
  /** Optional application-side mapping from a semantic action ID to the parent/child transaction
   * carrying it. Direct chain reads do not provide a global action-id index in Kernel-v1. */
  resolveActionTransaction?(actionId: string): Promise<{ parentTxId: string; childTxId: string } | null>;
  /** Optional immutable policy artifact loader, keyed by on-chain manifest hash. */
  loadPolicyArtifact?(manifestHash: string): Promise<unknown | null>;
}

export interface CreateRecloseClientOptions {
  transport: RecloseTransport;
  addresses: RecloseAddresses;
}

const ASSURANCE_STATES: AssuranceState[] = ["NORMAL", "MONITORED", "RESTRICTED", "SAFE_MODE", "PAUSED", "RECOVERY"];
const RULE_KINDS: Record<number, RuleKind> = { 1: "INCIDENT", 2: "REMEDIATION", 3: "RECOVERY_VALIDATION" };
const ACTION_TYPES: ActionType[] = [
  "NO_ACTION", "ALERT", "MONITOR", "RESTRICT", "THROTTLE", "REVOKE_CAPABILITY",
  "REROUTE", "ENTER_SAFE_MODE", "PAUSE", "ENTER_RECOVERY", "RESTORE",
];
const RELEASE_PHASES: Record<number, PolicyEffect["releasePhase"]> = {
  1: "REMEDIATION_CONFIRMED",
  2: "RECOVERY_VALIDATED",
  3: "PROVISIONAL",
};
const OUTCOMES: Record<number, CanonicalDecisionOutcome | null> = { 0: null, 1: "CONFIRMED", 2: "REJECTED", 3: "UNDETERMINED" };
const INCIDENT_STATUSES: Record<number, IncidentStatus> = {
  0: "OPEN",
  1: "PROVISIONAL_APPLIED",
  2: "FINAL_CONFIRMED",
  3: "RECOVERY",
  4: "CLOSED",
};

function asTuple(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected contract view tuple");
  return value;
}
function asNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  throw new Error(`Expected numeric contract value, got ${String(value)}`);
}
function asString(value: unknown): string {
  if (typeof value !== "string") throw new Error(`Expected string contract value, got ${typeof value}`);
  return value;
}
function isoFromSeconds(value: unknown): string {
  const n = asNumber(value);
  return new Date(n * 1000).toISOString();
}
function ordinal<T>(values: T[], raw: unknown, label: string): T {
  const v = values[asNumber(raw)];
  if (v === undefined) throw new Error(`Unknown ${label} ordinal ${String(raw)}`);
  return v;
}
function isHexTx(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]+$/.test(value);
}

/** Conservative, client-side APM structure validator. Kernel remains authoritative. */
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
  for (const key of required) if (!(key in obj)) errors.push(`missing required APM field: ${key}`);
  if (typeof obj.policyId !== "string" || obj.policyId.length === 0) errors.push("policyId must be a non-empty string");
  if (!Number.isSafeInteger(obj.version) || Number(obj.version) <= 0) errors.push("version must be a positive safe integer");
  // Reject unsafe JS numbers anywhere under fields conventionally used for high-precision bounds.
  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path ? `${path}.${key}` : key;
      if (/amount|bond|bounty|limit|ceiling|wei|u256/i.test(key) && typeof child === "number") {
        errors.push(`${childPath} must use a canonical decimal string, not a JS number`);
      }
      if (/amount|bond|bounty|limit|ceiling|wei|u256/i.test(key) && typeof child === "string" && !/^\d+$/.test(child)) {
        errors.push(`${childPath} must be a non-negative canonical decimal string`);
      }
      walk(child, childPath);
    }
  };
  walk(obj, "");
  return errors;
}

function collectAuthority(apm: unknown): {
  resources: Set<string>;
  actions: Set<string>;
  judges: Set<string>;
  humanOverride: boolean;
} {
  const obj = (apm && typeof apm === "object" ? apm : {}) as Record<string, any>;
  const resources = new Set<string>();
  const actions = new Set<string>();
  const judges = new Set<string>();
  for (const r of Array.isArray(obj.protectedResources) ? obj.protectedResources : []) {
    if (typeof r === "string") resources.add(r);
    else if (r && typeof r.id === "string") resources.add(r.id);
    else if (r && typeof r.resourceId === "string") resources.add(r.resourceId);
  }
  const capabilityLists = [obj.capabilities, obj.actionBounds, obj.authority];
  for (const list of capabilityLists) {
    const stack = Array.isArray(list) ? list : list && typeof list === "object" ? Object.values(list) : [];
    for (const item of stack) {
      if (typeof item === "string") actions.add(item);
      else if (item && typeof item.actionType === "string") actions.add(item.actionType);
      else if (item && typeof item.action === "string") actions.add(item.action);
    }
  }
  for (const j of Array.isArray(obj.judgeModules) ? obj.judgeModules : []) {
    if (typeof j === "string") judges.add(j);
    else if (j && typeof j.address === "string") judges.add(`${j.address}:${String(j.version ?? "")}`);
  }
  const humanOverride = obj.humanOverride === true || obj.humanOverride?.enabled === true;
  return { resources, actions, judges, humanOverride };
}

export function diffCanonicalApm(fromApm: unknown, toApm: unknown): PolicySecurityDiff {
  const from = collectAuthority(fromApm);
  const to = collectAuthority(toApm);
  const changes: PolicySecurityDiffChange[] = [];
  const addRemove = (kindAdded: PolicySecurityDiffChange["kind"], kindRemoved: PolicySecurityDiffChange["kind"], label: string, a: Set<string>, b: Set<string>) => {
    for (const x of b) if (!a.has(x)) changes.push({ kind: kindAdded, description: `${label} added: ${x}`, isExpansion: true });
    for (const x of a) if (!b.has(x)) changes.push({ kind: kindRemoved, description: `${label} removed: ${x}`, isExpansion: false });
  };
  addRemove("RESOURCE_ADDED", "RESOURCE_REMOVED", "resource", from.resources, to.resources);
  addRemove("ACTION_ADDED", "ACTION_REMOVED", "action", from.actions, to.actions);
  for (const judge of to.judges) if (!from.judges.has(judge)) changes.push({ kind: "JUDGE_CHANGED", description: `judge added/changed: ${judge}`, isExpansion: true });
  if (from.humanOverride !== to.humanOverride) {
    changes.push({ kind: "HUMAN_OVERRIDE_CHANGED", description: `human override ${from.humanOverride} -> ${to.humanOverride}`, isExpansion: to.humanOverride });
  }
  return {
    fromVersion: (fromApm as any)?.version ?? null,
    toVersion: Number((toApm as any)?.version ?? 0),
    authorityExpands: changes.some((c) => c.isExpansion === true),
    activationDelaySeconds: changes.some((c) => c.isExpansion === true) ? null : null,
    changes,
  };
}

export class DirectRecloseClient implements RecloseSDK {
  private checkedNetwork = false;
  constructor(private readonly transport: RecloseTransport, private readonly addresses: RecloseAddresses) {}

  private async ensureNetwork(): Promise<void> {
    if (this.checkedNetwork) return;
    assertCanonicalChainId(Number(await this.transport.getChainId()));
    this.checkedNetwork = true;
  }
  private async kernel(functionName: string, args: unknown[] = []): Promise<unknown> {
    await this.ensureNetwork();
    return this.transport.readContract({ address: this.addresses.kernel, functionName, args });
  }

  async getTarget(targetId: string): Promise<Target> {
    const t = asTuple(await this.kernel("get_target_details", [targetId]));
    return {
      targetId,
      targetAddress: asString(t[0]),
      cachedOwner: asString(t[1]),
      assuranceState: ordinal(ASSURANCE_STATES, t[2], "assurance state"),
      activePolicyKey: asString(t[3]),
      registeredAt: isoFromSeconds(t[4]),
      policyGeneration: asNumber(t[5]),
      authorityRevoked: Boolean(t[6]),
      humanOverrideEnabled: Boolean(t[7]),
    };
  }

  async getAssuranceState(targetId: string): Promise<AssuranceStateSummary> {
    // Kernel-v1 does not expose a full restriction enumeration yet. Returning an empty list would
    // fabricate absence, so this method exposes state truth and intentionally leaves only fields
    // that can be proven from views. The empty arrays mean "not enumerated by v1 read model", not
    // "no restrictions"; frontend must use target state as authoritative until the enumerator is added.
    const target = await this.getTarget(targetId);
    return { targetId, state: target.assuranceState, activeRestrictions: [], effectiveCapabilities: [], asOfBlock: 0 };
  }

  async getActivePolicy(targetId: string): Promise<PolicyDetail> {
    const target = await this.getTarget(targetId);
    if (!target.activePolicyKey) throw new Error(`Target ${targetId} has no active policy`);
    const policyKey = target.activePolicyKey;
    const header = asTuple(await this.kernel("get_policy_header", [policyKey]));
    const counts = asTuple(await this.kernel("get_policy_counts", [policyKey]));
    const [ruleCount, resourceCount, effectCount] = counts.map(asNumber);
    const rules: PolicyRule[] = [];
    for (let i = 0; i < ruleCount; i++) {
      const ruleId = asString(await this.kernel("get_policy_rule_id_at", [policyKey, i])) as RuleId;
      const r = asTuple(await this.kernel("get_policy_rule", [policyKey, ruleId]));
      const econ = asTuple(await this.kernel("get_policy_rule_economics", [policyKey, ruleId]));
      rules.push({
        ruleId,
        judge: asString(r[0]),
        ruleKind: RULE_KINDS[asNumber(r[2])] ?? (() => { throw new Error("Unknown rule kind"); })(),
        provisionalAllowed: Boolean(r[3]),
        reportBond: String(econ[0]),
        confirmedBounty: String(econ[1]),
        enabled: Boolean(r[4]),
      });
    }
    const effects: PolicyEffect[] = [];
    for (let i = 0; i < effectCount; i++) {
      const e = asTuple(await this.kernel("get_policy_effect_at", [policyKey, i]));
      effects.push({
        actionType: ordinal(ACTION_TYPES, e[1], "action type"),
        resourceId: asString(e[2]),
        paramU256: String(e[3]),
        paramStr: asString(e[4]),
        releasePhase: RELEASE_PHASES[asNumber(e[5])] ?? "PROVISIONAL",
        enabled: Boolean(e[6]),
      });
    }
    return {
      summary: {
        policyKey,
        targetId,
        version: asNumber(header[0]),
        manifestHash: asString(header[1]),
        sealed: Boolean(header[2]),
        active: Boolean(header[3]),
        superseded: !Boolean(header[3]),
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
    const i = asTuple(await this.kernel("get_incident_detail", [incidentId]));
    if (!asString(i[0])) throw new Error(`Unknown incident ${incidentId}`);
    return {
      incidentId,
      targetId: asString(i[0]),
      policyKey: asString(i[1]),
      ruleId: asString(i[3]) as RuleId,
      resourceId: asString(i[4]),
      reporter: asString(i[5]),
      judge: asString(i[6]),
      evidenceHash: asString(i[7]),
      conditionCode: asString(i[8]),
      status: INCIDENT_STATUSES[asNumber(i[11])] ?? "OPEN",
      createdAt: isoFromSeconds(i[12]),
      closedAt: asNumber(i[13]) === 0 ? null : isoFromSeconds(i[13]),
    };
  }

  private parseDecisionId(decisionId: string): { incidentId: string; stage: CanonicalDecisionStage } {
    if (decisionId.endsWith(":PROVISIONAL")) return { incidentId: decisionId.slice(0, -12), stage: "PROVISIONAL" };
    if (decisionId.endsWith(":FINAL")) return { incidentId: decisionId.slice(0, -6), stage: "FINAL" };
    return { incidentId: decisionId, stage: "FINAL" };
  }

  async getDecision(decisionId: string): Promise<DecisionRecord> {
    const { incidentId, stage } = this.parseDecisionId(decisionId);
    const detail = asTuple(await this.kernel("get_incident_detail", [incidentId]));
    if (!asString(detail[0])) throw new Error(`Unknown decision/incident ${decisionId}`);
    const policyKey = asString(detail[1]);
    const header = asTuple(await this.kernel("get_policy_header", [policyKey]));
    const outcomeOrdinal = stage === "PROVISIONAL" ? asNumber(detail[9]) : asNumber(detail[10]);
    const outcome = OUTCOMES[outcomeOrdinal];
    if (!outcome) throw new Error(`${stage} decision has not been recorded for ${incidentId}`);
    return {
      schemaVersion: "1.0.0",
      decisionId,
      incidentId,
      targetId: asString(detail[0]),
      policyHash: asString(header[1]),
      policyVersion: asNumber(detail[2]),
      ruleId: asString(detail[3]) as RuleId,
      affectedResource: asString(detail[4]),
      evidenceHash: asString(detail[7]),
      reporter: asString(detail[5]),
      outcome,
      conditionCode: asString(detail[8]),
      reasonCodes: [asString(detail[8])],
      judgeModule: asString(detail[6]),
      judgeVersion: 1,
      decisionStage: stage,
      generatedAt: isoFromSeconds(detail[12]),
    };
  }

  async getDecisionView(decisionId: string): Promise<DecisionView> {
    const record = await this.getDecision(decisionId);
    // Decision->tx lookup is deployment/index metadata, not a Kernel storage field. Require a
    // transport that exposes the mapping rather than inventing one.
    if (!this.transport.resolveActionTransaction) throw new Error("DecisionView requires a transaction-index adapter");
    const resolved = await this.transport.resolveActionTransaction(decisionId);
    if (!resolved || !isHexTx(resolved.parentTxId)) throw new Error(`No transaction mapping for ${decisionId}`);
    return { record, transaction: await this.trackTransaction(resolved.parentTxId as `0x${string}`) };
  }

  async getEffectiveProviderStatus(targetId: string, resourceId: string): Promise<{ resourceId: string; available: boolean; reason: ErrorEnvelope | null }> {
    const target = await this.getTarget(targetId);
    const count = asNumber(await this.kernel("get_resource_restriction_count", [target.targetAddress, resourceId]));
    return {
      resourceId,
      available: count === 0 && !target.authorityRevoked,
      reason: count === 0 ? null : { code: "UNKNOWN", message: `${count} active assurance restriction(s) apply to ${resourceId}` },
    };
  }

  private async feePreview(functionName: string, args: unknown[]): Promise<FeeTransactionPreview> {
    await this.ensureNetwork();
    if (!this.transport.estimateTransactionFeesForWrite) {
      throw new Error("Transport does not support fee estimation");
    }
    const estimate = await this.transport.estimateTransactionFeesForWrite({ address: this.addresses.judge, functionName, args, value: 0n });
    return {
      network: "studio-dev",
      chainId: RECLOSE_CANONICAL_CHAIN_ID,
      estimatedFeeValueWei: String(estimate.feeValue ?? "0"),
      isEstimate: true,
      distributionSummary: null,
    };
  }

  async buildIncidentReport(input: { targetId: string; ruleId: string; resourceId: string; evidenceSources: EvidenceSource[] }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const target = await this.getTarget(input.targetId);
    const policy = await this.getActivePolicy(input.targetId);
    const rule = policy.rules.find((r) => r.ruleId === input.ruleId);
    if (!rule) throw new Error(`Rule ${input.ruleId} is not active for ${input.targetId}`);
    const report = {
      kind: "INCIDENT_REPORT_DRAFT",
      targetId: input.targetId,
      targetAddress: target.targetAddress,
      policyKey: policy.summary.policyKey,
      policyHash: policy.summary.manifestHash,
      ruleId: input.ruleId,
      resourceId: input.resourceId,
      evidenceSources: input.evidenceSources,
      reportBondWei: rule.reportBond,
      note: "Reporter address, nonce, canonical EAP hash and bond_id are bound at signing/submission time",
    };
    const feePreview = await this.feePreview("submit_incident", [input.targetId, policy.summary.policyKey, input.ruleId, input.resourceId]);
    feePreview.bondWei = rule.reportBond;
    return { report, feePreview };
  }

  async buildRecoveryReport(input: { incidentId: string; evidenceSources: EvidenceSource[] }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const incident = await this.getIncident(input.incidentId);
    const policy = await this.getActivePolicy(incident.targetId);
    const report = {
      kind: "RECOVERY_REPORT_DRAFT",
      parentIncidentId: input.incidentId,
      targetId: incident.targetId,
      policyKey: policy.summary.policyKey,
      evidenceSources: input.evidenceSources,
    };
    const feePreview = await this.feePreview("submit_recovery_validation", [input.incidentId, policy.summary.policyKey]);
    return { report, feePreview };
  }

  async validateAPM(apm: unknown): Promise<{ valid: boolean; errors: string[] }> {
    const errors = validateCanonicalApmStructure(apm);
    return { valid: errors.length === 0, errors };
  }

  async hashAPM(apm: unknown): Promise<string> {
    const { valid, errors } = await this.validateAPM(apm);
    if (!valid) throw new Error(`Invalid APM: ${errors.join("; ")}`);
    return canonicalKeccak256(apm);
  }

  async diffAPM(fromApm: unknown, toApm: unknown): Promise<PolicySecurityDiff> {
    const toValidation = await this.validateAPM(toApm);
    if (!toValidation.valid) throw new Error(`Invalid destination APM: ${toValidation.errors.join("; ")}`);
    return diffCanonicalApm(fromApm, toApm);
  }

  async trackTransaction(txId: `0x${string}`): Promise<GenLayerTransactionLifecycle & { executionResult?: ExecutionResult }> {
    await this.ensureNetwork();
    const raw = await this.transport.getTransaction({ hash: txId });
    const lifecycle = mapRawTransaction(raw);
    return raw.executionResult ? { ...lifecycle, executionResult: raw.executionResult } : lifecycle;
  }

  async trackActionTrace(actionId: string): Promise<ExecutionReceipt> {
    if (!this.transport.resolveActionTransaction) throw new Error("Action trace requires a transaction-index adapter");
    const mapping = await this.transport.resolveActionTransaction(actionId);
    if (!mapping) throw new Error(`No transaction mapping for action ${actionId}`);
    const parent = await this.trackTransaction(mapping.parentTxId as `0x${string}`);
    const childRaw = await this.transport.getTransaction({ hash: mapping.childTxId });
    const childLifecycle = mapRawTransaction(childRaw);
    const executionResult = childRaw.executionResult ?? "NOT_VOTED";
    const failureResults: ExecutionResult[] = ["FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"];
    return {
      schemaVersion: "1.0.0",
      actionId,
      targetId: "",
      adapterId: "kernel-target",
      parentTxId: parent.txId,
      childTx: {
        txId: mapping.childTxId,
        parentTxId: parent.txId,
        role: "TARGET_ACTION",
        lifecycle: childLifecycle,
        executionResult,
      },
      executionResult,
      finalStatus: executionResult === "FINISHED_WITH_RETURN" ? "SUCCESS" : failureResults.includes(executionResult) ? "FAILURE" : "UNKNOWN",
      preStateHash: null,
      postStateHash: null,
      expectedPostStateRequired: false,
      executionTime: new Date().toISOString(),
    };
  }
}

export function createRecloseClient(options: CreateRecloseClientOptions): RecloseSDK {
  return new DirectRecloseClient(options.transport, options.addresses);
}
