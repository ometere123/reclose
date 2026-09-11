import type { ExecutionResult, RawTransactionResult, RawTransactionStatus } from "./types";
import type { RecloseTransport } from "./client";

/** Structural subset of genlayer-js@2.0.0-rc.1 used by Reclose. Keeping this structural avoids
 * coupling the public SDK types to every RC-specific generic in genlayer-js while still using the
 * real client methods at runtime. */
export interface GenLayerJsClientLike {
  getChainId(): Promise<number | bigint>;
  readContract(args: { address: string; functionName: string; args?: unknown[] }): Promise<unknown>;
  getTransaction(args: { hash: string }): Promise<{
    statusName?: string;
    resultName?: string | null;
    status?: string;
    result?: string | null;
    executionResultName?: string | null;
    execution_result?: string | null;
    decidedAtBlock?: number | bigint | null;
    appealDeadline?: string | null;
  }>;
  getTriggeredTransactionIds(args: { hash: string }): Promise<string[]>;
  estimateTransactionFeesForWrite?(args: { address: string; functionName: string; args: unknown[]; value?: bigint }): Promise<{
    feeValue?: bigint | string | number;
    distribution?: Record<string, unknown> | null;
  }>;
}

function executionResult(value: unknown): ExecutionResult | undefined {
  const allowed: ExecutionResult[] = ["NOT_VOTED", "FINISHED_WITH_RETURN", "FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"];
  return typeof value === "string" && allowed.includes(value as ExecutionResult) ? value as ExecutionResult : undefined;
}

export function createGenLayerTransport(client: GenLayerJsClientLike): RecloseTransport {
  return {
    getChainId: () => client.getChainId(),
    readContract: (args) => client.readContract(args),
    async getTransaction({ hash }) {
      const tx = await client.getTransaction({ hash });
      const status = (tx.statusName ?? tx.status) as RawTransactionStatus;
      const result = (tx.resultName ?? tx.result ?? null) as RawTransactionResult | null;
      if (!status) throw new Error(`genlayer-js transaction ${hash} did not expose statusName/status`);
      return {
        txId: hash,
        status,
        result,
        decidedAtBlock: tx.decidedAtBlock == null ? null : Number(tx.decidedAtBlock),
        appealDeadline: tx.appealDeadline ?? null,
        executionResult: executionResult(tx.executionResultName ?? tx.execution_result),
      };
    },
    getTriggeredTransactionIds: (args) => client.getTriggeredTransactionIds(args),
    estimateTransactionFeesForWrite: client.estimateTransactionFeesForWrite
      ? (args) => client.estimateTransactionFeesForWrite!(args)
      : undefined,
  };
}
