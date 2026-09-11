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
  RuleId,
  RuleKind,
  Target,
} from "./types";
import type { RecloseSDK } from "./sdk";
import type { RawGenLayerTransaction } from "./lifecycle";
import { mapRawTransaction } from "./lifecycle";
import { assertCanonicalChainId, RECLOSE_CANONICAL_CHAIN_ID } from "./networkGuard";
import { canonicalKeccak256 } from "./canonical";

export interface RecloseAddresses {
  kernel: string;
  judge: string;
  vault?: string;
}

/** Direct protocol adapter. A genlayer-js client can satisfy this with a thin wrapper. */
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
  }): Promise<{ feeValue?: bigint | string | number; distribution?: Record<string, unknown> | null }>;
  resolveActionTransaction?(actionId: string): Promise<{ parentTxId: string; childTxId: string } | null>;
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

function authoritySnapshot(apm: unknown): { resources: Set<string>; actions: Set<string>; judges: Set<string>; humanOverride: boolean } {
  const obj = (apm && typeof apm === "object" ? apm : {}) as Record<string, any>;
  const resources = new Set<string>();
  const actions = new Set<string>();
  const judges = new Set<string>();
  for (const r of Array.isArray(obj.protectedResources) ? obj.protectedResources : []) {
    if (typeof r === "string") resources.add(r);
    else if (r && typeof r.resourceId === "string") resources.add(r.resourceId);
    else if (r && typeof r.id === "string") resources.add(r.id);
  }
  for (const collection of [obj.capabilities, obj.actionBounds, obj.authority]) {
    const entries = Array.isArray(collection) ? collection : collection && typeof collection === "object" ? Object.values(collection) : [];
    for (const item of entries) {
      if (typeof item === "string") actions.add(item);
      else if (item && typeof item.actionType === "string") actions.add(item.actionType);
      else if (item && typeof item.action === "string") actions.add(item.action);
    }
  }
  for (const judge of Array.isArray(obj.judgeModules) ? obj.judgeModules : []) {
    if (typeof judge === "string") judges.add(judge);
    else if (judge && typeof judge.address === "string") judges.add(`${judge.address}:${String(judge.version ?? "")}`);
  }
  const humanOverride = obj.humanOverride === true || obj.humanOverride?.enabled === true;
  return { resources, actions, judges, humanOverride };
}

export function diffCanonicalApm(fromApm: unknown, toApm: unknown): PolicySecurityDiff {
  const from = authoritySnapshot(fromApm);
  const to = authoritySnapshot(toApm);
  const changes: PolicySecurityDiffChange[] = [];
  const diffSet = (
    before: Set<string>,
    after: Set<string>,
    addedKind: PolicySecurityDiffChange["kind"],
    removedKind: PolicySecurityDiffChange["kind"],
    label: string,
  ): void => {
    for (const item of after) if (!before.has(item)) changes.push({ kind: addedKind, description: `${label} added: ${item}`, isExpansion: true });
    for (const item of before) if (!after.has(item)) changes.push({ kind: removedKind, description: `${label} removed: ${item}`, isExpansion: false });
  };
  diffSet(from.resources, to.resources, "RESOURCE_ADDED", "RESOURCE_REMOVED", "resource");
  diffSet(from.actions, to.actions, "ACTION_ADDED", "ACTION_REMOVED", "action");
  for (const judge of to.judges) if (!from.judges.has(judge)) changes.push({ kind: "JUDGE_CHANGED", description: `judge added/changed: ${judge}`, isExpansion: true });
  if (from.humanOverride !== to.humanOverride) changes.push({ kind: "HUMAN_OVERRIDE_CHANGED", description: `human override ${from.humanOverride} -> ${to.humanOverride}`, isExpansion: to.humanOverride });
  return {
    fromVersion: Number((fromApm as any)?.version ?? 0) || null,
    toVersion: Number((toApm as any)?.version ?? 0),
    authorityExpands: changes.some((change) => change.isExpansion === true),
    activationDelaySeconds: changes.some((change) => change.isExpansion === true) ? null : null,
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
    return { targetId, state: target.assuranceState, activeRestrictions: [], effectiveCapabilities: [], asOfBlock: 0 };
  }

  async getActivePolicy(targetId: string): Promise<PolicyDetail> {
    const target = await this.getTarget(targetId);
    const policyKey = target.activePolicyKey;
    if (!policyKey) throw new Error(`Target ${targetId} has no active policy`);
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
      rules.push({ ruleId, judge: str(r[0]), ruleKind, provisionalAllowed: Boolean(r[3]), reportBond: String(economics[0]), confirmedBounty: String(economics[1]), enabled: Boolean(r[4]) });
    }
    const effects: PolicyEffect[] = [];
    for (let i = 0; i < effectCount; i++) {
      const e = tuple(await this.kernel("get_policy_effect_at", [policyKey, i]));
      effects.push({
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
    const i = tuple(await this.kernel("get_incident_detail", [incidentId]));
    if (!str(i[0])) throw new Error(`Unknown incident ${incidentId}`);
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
      status: INCIDENT_STATUSES[num(i[11])] ?? "OPEN",
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
      judgeVersion: 1,
      decisionStage: stage,
      generatedAt: iso(i[12]),
    };
  }

  async getDecisionView(decisionId: string): Promise<DecisionView> {
    const record = await this.getDecision(decisionId);
    if (!this.transport.resolveActionTransaction) throw new Error("Decision transaction lookup requires an index adapter");
    const mapping = await this.transport.resolveActionTransaction(decisionId);
    if (!mapping) throw new Error(`No transaction mapping for ${decisionId}`);
    return { record, transaction: await this.trackTransaction(mapping.parentTxId as `0x${string}`) };
  }

  async getEffectiveProviderStatus(targetId: string, resourceId: string): Promise<{ resourceId: string; available: boolean; reason: ErrorEnvelope | null }> {
    const target = await this.getTarget(targetId);
    const count = num(await this.kernel("get_resource_restriction_count", [target.targetAddress, resourceId]));
    return {
      resourceId,
      available: count === 0 && !target.authorityRevoked,
      reason: count === 0 ? null : { code: "UNKNOWN", message: `${count} active assurance restriction(s) apply to ${resourceId}` },
    };
  }

  private async feePreview(functionName: string, args: unknown[]): Promise<FeeTransactionPreview> {
    await this.ensureNetwork();
    if (!this.transport.estimateTransactionFeesForWrite) throw new Error("Transport does not support fee estimation");
    const estimate = await this.transport.estimateTransactionFeesForWrite({ address: this.addresses.judge, functionName, args, value: 0n });
    return { network: "studio-dev", chainId: RECLOSE_CANONICAL_CHAIN_ID, estimatedFeeValueWei: String(estimate.feeValue ?? "0"), isEstimate: true, distributionSummary: null };
  }

  async buildIncidentReport(input: { targetId: string; ruleId: string; resourceId: string; evidenceSources: EvidenceSource[] }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const policy = await this.getActivePolicy(input.targetId);
    const rule = policy.rules.find((r) => r.ruleId === input.ruleId);
    if (!rule) throw new Error(`Rule ${input.ruleId} is not active for ${input.targetId}`);
    const report = {
      kind: "INCIDENT_REPORT_DRAFT",
      targetId: input.targetId,
      policyKey: policy.summary.policyKey,
      policyHash: policy.summary.manifestHash,
      ruleId: input.ruleId,
      resourceId: input.resourceId,
      evidenceSources: input.evidenceSources,
      reportBondWei: rule.reportBond,
      note: "Reporter address, nonce, canonical EAP and bond ID bind at signing time",
    };
    const feePreview = await this.feePreview("submit_incident", [input.targetId, policy.summary.policyKey, input.ruleId, input.resourceId]);
    feePreview.bondWei = rule.reportBond;
    return { report, feePreview };
  }

  async buildRecoveryReport(input: { incidentId: string; evidenceSources: EvidenceSource[] }): Promise<{ report: unknown; feePreview: FeeTransactionPreview }> {
    const incident = await this.getIncident(input.incidentId);
    const policy = await this.getActivePolicy(incident.targetId);
    const report = { kind: "RECOVERY_REPORT_DRAFT", parentIncidentId: input.incidentId, targetId: incident.targetId, policyKey: policy.summary.policyKey, evidenceSources: input.evidenceSources };
    const feePreview = await this.feePreview("submit_recovery_validation", [input.incidentId, policy.summary.policyKey]);
    return { report, feePreview };
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

  async trackActionTrace(actionId: string): Promise<ExecutionReceipt> {
    if (!this.transport.resolveActionTransaction) throw new Error("Action trace requires a transaction index adapter");
    const mapping = await this.transport.resolveActionTransaction(actionId);
    if (!mapping) throw new Error(`No transaction mapping for action ${actionId}`);
    const parent = await this.trackTransaction(mapping.parentTxId as `0x${string}`);
    const childRaw = await this.transport.getTransaction({ hash: mapping.childTxId });
    const childLifecycle = mapRawTransaction(childRaw);
    const executionResult = childRaw.executionResult ?? "NOT_VOTED";
    const failure: ExecutionResult[] = ["FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"];
    return {
      schemaVersion: "1.0.0",
      actionId,
      targetId: "",
      adapterId: "kernel-target",
      parentTxId: parent.txId,
      childTx: { txId: mapping.childTxId, parentTxId: parent.txId, role: "TARGET_ACTION", lifecycle: childLifecycle, executionResult },
      executionResult,
      finalStatus: executionResult === "FINISHED_WITH_RETURN" ? "SUCCESS" : failure.includes(executionResult) ? "FAILURE" : "UNKNOWN",
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
