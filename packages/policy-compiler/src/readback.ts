import type { CompiledPolicy, CompiledKernelCall } from "./types";

export interface PolicyReadTransport {
  readContract(args: { address: string; functionName: string; args?: unknown[] }): Promise<unknown>;
}

export interface PolicyReadbackMismatch {
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface PolicyReadbackVerification {
  policyKey: string;
  verified: boolean;
  manifestHashMatches: boolean;
  mismatches: PolicyReadbackMismatch[];
  observed: {
    version: number;
    manifestHash: string;
    sealed: boolean;
    active: boolean;
    resources: string[];
    rules: Array<{ ruleId: string; judge: string; judgeVersion: number; ruleKind: number; provisionalAllowed: boolean; enabled: boolean; reportBond: string; confirmedBounty: string }>;
    effects: Array<{ ruleId: string; actionType: number; resourceId: string; paramU256: string; paramStr: string; releasePhase: number; enabled: boolean }>;
  };
}

function tuple(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected tuple from Kernel view");
  return value;
}
function numberish(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  throw new Error(`Expected numeric value, got ${String(value)}`);
}
function stringish(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "number") return String(value);
  throw new Error(`Expected string-compatible value, got ${String(value)}`);
}

function callsByName(compiled: CompiledPolicy, name: CompiledKernelCall["functionName"]): CompiledKernelCall[] {
  return compiled.calls.filter((call) => call.functionName === name);
}

export async function verifyPolicyReadback(args: {
  transport: PolicyReadTransport;
  kernelAddress: string;
  policyKey: string;
  compiled: CompiledPolicy;
}): Promise<PolicyReadbackVerification> {
  const { transport, kernelAddress, policyKey, compiled } = args;
  const read = (functionName: string, fnArgs: unknown[] = []) => transport.readContract({ address: kernelAddress, functionName, args: fnArgs });

  const header = tuple(await read("get_policy_header", [policyKey]));
  const counts = tuple(await read("get_policy_counts", [policyKey]));
  const ruleCount = numberish(counts[0]);
  const resourceCount = numberish(counts[1]);
  const effectCount = numberish(counts[2]);

  const resources: string[] = [];
  for (let i = 0; i < resourceCount; i++) resources.push(stringish(await read("get_policy_resource_at", [policyKey, i])));

  const rules = [];
  for (let i = 0; i < ruleCount; i++) {
    const ruleId = stringish(await read("get_policy_rule_id_at", [policyKey, i]));
    const rule = tuple(await read("get_policy_rule", [policyKey, ruleId]));
    const economics = tuple(await read("get_policy_rule_economics", [policyKey, ruleId]));
    rules.push({
      ruleId,
      judge: stringish(rule[0]),
      judgeVersion: numberish(rule[1]),
      ruleKind: numberish(rule[2]),
      provisionalAllowed: Boolean(rule[3]),
      enabled: Boolean(rule[4]),
      reportBond: stringish(economics[0]),
      confirmedBounty: stringish(economics[1]),
    });
  }

  const effects = [];
  for (let i = 0; i < effectCount; i++) {
    const effect = tuple(await read("get_policy_effect_at", [policyKey, i]));
    effects.push({
      ruleId: stringish(effect[0]),
      actionType: numberish(effect[1]),
      resourceId: stringish(effect[2]),
      paramU256: stringish(effect[3]),
      paramStr: stringish(effect[4]),
      releasePhase: numberish(effect[5]),
      enabled: Boolean(effect[6]),
    });
  }

  const observed = {
    version: numberish(header[0]),
    manifestHash: stringish(header[1]),
    sealed: Boolean(header[2]),
    active: Boolean(header[3]),
    resources,
    rules,
    effects,
  };
  const mismatches: PolicyReadbackMismatch[] = [];
  const manifestHashMatches = observed.manifestHash.toLowerCase() === compiled.manifestHash.toLowerCase();
  if (!manifestHashMatches) mismatches.push({ path: "manifestHash", expected: compiled.manifestHash, actual: observed.manifestHash });

  const expectedResources = callsByName(compiled, "add_policy_resource").map((call) => String(call.args[1]));
  if (JSON.stringify(expectedResources) !== JSON.stringify(resources)) mismatches.push({ path: "resources", expected: expectedResources, actual: resources });

  const expectedRules = callsByName(compiled, "add_policy_rule").map((call) => ({
    ruleId: String(call.args[1]),
    judge: String(call.args[2]),
    judgeVersion: Number(call.args[3]),
    ruleKind: Number(call.args[4]),
    provisionalAllowed: Boolean(call.args[5]),
    enabled: true,
    reportBond: String(call.args[6]),
    confirmedBounty: String(call.args[7]),
  }));
  const normalizeRule = (rule: typeof expectedRules[number]) => ({ ...rule, judge: rule.judge.toLowerCase() });
  if (JSON.stringify(expectedRules.map(normalizeRule)) !== JSON.stringify(rules.map(normalizeRule))) mismatches.push({ path: "rules", expected: expectedRules, actual: rules });

  const expectedEffects = callsByName(compiled, "add_policy_effect").map((call) => ({
    ruleId: String(call.args[1]),
    actionType: Number(call.args[2]),
    resourceId: String(call.args[3]),
    paramU256: String(call.args[4]),
    paramStr: String(call.args[5]),
    releasePhase: Number(call.args[6]),
    enabled: true,
  }));
  if (JSON.stringify(expectedEffects) !== JSON.stringify(effects)) mismatches.push({ path: "effects", expected: expectedEffects, actual: effects });

  if (!observed.sealed) mismatches.push({ path: "sealed", expected: true, actual: observed.sealed });

  return { policyKey, verified: mismatches.length === 0, manifestHashMatches, mismatches, observed };
}
