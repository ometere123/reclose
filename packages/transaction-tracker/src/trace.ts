import { mapRawTransaction, type RawGenLayerTransaction } from "@reclose/protocol-sdk";
import type { ExecutionResult, GenLayerTransactionLifecycle } from "@reclose/protocol-sdk";
import type { ExpectedEmittedMessage, MessageTriggerPhase } from "./tracker";

export type TraceRole = "REPORT_SUBMISSION" | "JUDGE_DECISION" | "KERNEL_EFFECT" | "TARGET_ACTION" | "VAULT_PAYOUT" | "UNKNOWN";

export interface TraceClient {
  getTransaction(args: { hash: string }): Promise<RawGenLayerTransaction & {
    executionResult?: ExecutionResult;
    messages?: unknown[] | null;
    emittedMessages?: unknown[] | null;
    postStateVerification?: "MATCH" | "MISMATCH" | "PENDING" | null;
  }>;
  getTriggeredTransactionIds(args: { hash: string }): Promise<string[]>;
  /** Optional role classifier based on decoded calldata/message metadata from the real SDK. */
  classifyTransactionRole?(txId: string): Promise<TraceRole>;
}

export interface TransactionTraceNode {
  txId: string;
  role: TraceRole;
  lifecycle: GenLayerTransactionLifecycle;
  executionResult: ExecutionResult | null;
  emittedMessageCount: number | null;
  expectedMessages: ExpectedEmittedMessage[];
  childMaterialization: "NOT_OBSERVABLE" | "NO_MESSAGES_DUE" | "AWAITING_MATERIALIZATION" | "MATERIALIZATION_STALLED" | "MATERIALIZED";
  postStateVerification: "MATCH" | "MISMATCH" | "PENDING" | null;
  children: TransactionTraceNode[];
}

export interface TransactionTrace {
  root: TransactionTraceNode;
  allTransactionIds: string[];
  hasExecutionFailure: boolean;
  complete: boolean;
}

const FAILURES: ExecutionResult[] = [
  "FINISHED_WITH_ERROR",
  "TIMEOUT",
  "NONDET_DISAGREE",
  "DETERMINISTIC_VIOLATION",
];

/** Recursively follows triggered transactions up to a hard bounded depth. This handles the
 * canonical Judge -> Kernel -> Target chain rather than assuming children are one level deep. */
export async function buildTransactionTrace(
  client: TraceClient,
  rootTxId: string,
  options: { maxDepth?: number } = {},
): Promise<TransactionTrace> {
  const maxDepth = options.maxDepth ?? 6;
  if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 12) throw new Error("maxDepth must be an integer in [0,12]");
  const seen = new Set<string>();
  let hasExecutionFailure = false;
  let complete = true;

  const walk = async (txId: string, depth: number): Promise<TransactionTraceNode> => {
    if (seen.has(txId)) throw new Error(`Transaction trace cycle detected at ${txId}`);
    seen.add(txId);
    const raw = await client.getTransaction({ hash: txId });
    const lifecycle = mapRawTransaction(raw);
    const executionResult = raw.executionResult ?? null;
    if (executionResult && FAILURES.includes(executionResult)) hasExecutionFailure = true;
    const role = client.classifyTransactionRole ? await client.classifyTransactionRole(txId) : "UNKNOWN";
    let children: TransactionTraceNode[] = [];
    const couldHaveChildren = lifecycle.derived?.isFinal || lifecycle.protocolDecisionOutcome !== null;
    if (couldHaveChildren) {
      const childIds = await client.getTriggeredTransactionIds({ hash: txId });
      if (childIds.length > 0 && depth >= maxDepth) {
        complete = false;
      } else {
        children = await Promise.all(childIds.map((childId) => walk(childId, depth + 1)));
      }
    }
    const emitted = raw.emittedMessages ?? raw.messages;
    const emittedMessageCount = Array.isArray(emitted) ? emitted.length : null;
    const expectedMessages = Array.isArray(emitted) ? emitted.map((message, index) => ({
      index,
      triggerPhase: traceMessagePhase(message),
      materializedChildTxId: children[index]?.txId,
    })) : [];
    const dueMessages = expectedMessages.filter((message) => traceMessageDue(message.triggerPhase, lifecycle));
    const childMaterialization: TransactionTraceNode["childMaterialization"] = emittedMessageCount === null ? (children.length ? "MATERIALIZED" : "NOT_OBSERVABLE") :
      dueMessages.length === 0 ? "NO_MESSAGES_DUE" :
      dueMessages.length > children.length ? "AWAITING_MATERIALIZATION" : "MATERIALIZED";
    if (childMaterialization === "AWAITING_MATERIALIZATION" || raw.postStateVerification === "MISMATCH") complete = false;
    return { txId, role, lifecycle, executionResult, emittedMessageCount, expectedMessages, childMaterialization, postStateVerification: raw.postStateVerification ?? null, children };
  };

  const root = await walk(rootTxId, 0);
  return { root, allTransactionIds: Array.from(seen), hasExecutionFailure, complete };
}

function traceMessagePhase(message: unknown): MessageTriggerPhase {
  if (!message || typeof message !== "object") return "UNKNOWN";
  const onAcceptance = (message as { onAcceptance?: unknown }).onAcceptance;
  return onAcceptance === true ? "ACCEPTED" : onAcceptance === false ? "FINALIZED" : "UNKNOWN";
}

function traceMessageDue(phase: MessageTriggerPhase, lifecycle: GenLayerTransactionLifecycle): boolean {
  if (phase === "ACCEPTED") return lifecycle.derived?.isFinal === true || lifecycle.rawStatus === "ACCEPTED" || lifecycle.protocolDecisionOutcome === "accepted";
  if (phase === "FINALIZED") return lifecycle.derived?.isFinal === true;
  return lifecycle.derived?.isFinal === true || lifecycle.protocolDecisionOutcome !== null;
}

export function inferRoleFromFunctionName(functionName: string | null | undefined): TraceRole {
  if (!functionName) return "UNKNOWN";
  if (["submit_incident", "submit_remediation", "submit_recovery_validation"].includes(functionName)) return "REPORT_SUBMISSION";
  if (["receive_provisional_decision", "receive_final_decision", "receive_decision"].includes(functionName)) return "JUDGE_DECISION";
  if (functionName === "apply_assurance_action") return "TARGET_ACTION";
  if (functionName === "emit_transfer" || functionName === "claim") return "VAULT_PAYOUT";
  if (["redispatch_final_action", "activate_policy", "disable_action", "disable_resource"].includes(functionName)) return "KERNEL_EFFECT";
  return "UNKNOWN";
}
