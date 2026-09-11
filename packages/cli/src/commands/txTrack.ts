// `reclose tx track <txId> --rpc <url>` - the one CLI command that DOES touch the network (a
// single read-only transaction-lifecycle poll; never signs or sends anything). The polling logic
// itself is decoupled from genlayer-js via @reclose/transaction-tracker's TrackerClient
// interface, so it is unit-testable with a fake client; bin/reclose.js supplies the real
// genlayer-js-backed client.

import { TransactionTracker, InMemoryTransactionStore, type TrackerClient, type TrackedTransaction } from "@reclose/transaction-tracker";
import type { CommandResult } from "./policyCompile";

export function formatTrackedTransaction(record: TrackedTransaction): string {
  const lines: string[] = [];
  lines.push(`txId: ${record.txId}`);
  lines.push(`rawStatus: ${record.lifecycle.rawStatus}`);
  lines.push(`rawResult: ${record.lifecycle.rawResult ?? "(none yet)"}`);
  lines.push(`protocolDecisionOutcome: ${record.lifecycle.protocolDecisionOutcome ?? "(not decided yet)"}`);
  lines.push(`display: ${record.lifecycle.derived?.displayLabel ?? "(unknown)"} (isFinal=${record.lifecycle.derived?.isFinal ?? false})`);
  if (record.children.length > 0) {
    lines.push(`children (${record.children.length}):`);
    for (const child of record.children) {
      lines.push(`  - ${child.txId}: ${child.lifecycle.rawStatus} (${child.lifecycle.derived?.displayLabel ?? ""})`);
    }
  }
  return lines.join("\n");
}

/** One-shot: track + poll once + format. The real CLI entrypoint supplies a live client; tests
 * supply a fake one. Never resubmits anything - if the status is a terminal CANCELED, the output
 * notes that resubmission MAY be considered, but this command never does it itself. */
export async function runTxTrack(txId: string, client: TrackerClient): Promise<CommandResult> {
  if (!/^0x[0-9a-fA-F]+$/.test(txId)) {
    return { exitCode: 1, output: `Invalid transaction hash: ${txId}` };
  }
  const tracker = new TransactionTracker(client, new InMemoryTransactionStore());
  await tracker.track(txId);
  try {
    const record = await tracker.poll(txId);
    let output = formatTrackedTransaction(record);
    if (await tracker.isReadyForResubmitDecision(txId)) {
      output += "\n\nThis transaction was CANCELED - resubmission may be considered (never automatic).";
    }
    return { exitCode: 0, output };
  } catch (e) {
    return { exitCode: 1, output: `Failed to poll transaction: ${(e as Error).message}` };
  }
}
