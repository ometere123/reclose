// C3 real implementation: the tracking state machine behind RecloseSDK.trackTransaction and the
// future frontend transaction UI (CLAUDE.md Section 31). Deliberately decoupled from genlayer-js's
// exact client type (mirrors the adapter-interface pattern protocol-sdk/src/lifecycle.ts already
// uses) so this module is unit-testable with a fake client and reusable from Node, a browser
// bundle, or the CLI without pulling genlayer-js's full surface into its type signature.

import {
  mapRawTransaction,
  isSafeToResubmit,
  type RawGenLayerTransaction,
  type GenLayerTransactionLifecycle,
  type ChildTransactionRole,
} from "@reclose/protocol-sdk";
import type { TransactionStore } from "./store";
import { InMemoryTransactionStore } from "./store";

/** Minimal client surface this module needs - a thin adapter over genlayer-js's real client. */
export interface TrackerClient {
  getTransaction(args: { hash: string }): Promise<RawGenLayerTransaction>;
  /** Returns child transaction hashes this transaction's execution triggered (genlayer-js's own
   * getTriggeredTransactionIds) - the mechanism behind CLAUDE.md Section 31 rule 4 ("display
   * parent + child transactions where relevant"). */
  getTriggeredTransactionIds(args: { hash: string }): Promise<string[]>;
}

export interface TrackedChild {
  txId: string;
  role: ChildTransactionRole | "UNKNOWN";
  lifecycle: GenLayerTransactionLifecycle;
}

export interface TrackedTransaction {
  txId: string;
  /** Caller-supplied label for what this transaction IS (e.g. "submit_incident"), purely for
   * display - never used to alter polling/lifecycle logic. */
  label?: string;
  lifecycle: GenLayerTransactionLifecycle;
  children: TrackedChild[];
  firstTrackedAt: string;
  lastPolledAt: string | null;
}

/**
 * Tracks one or more GenLayer transactions through their lifecycle. Usage:
 *   const tracker = new TransactionTracker(client, store);
 *   tracker.track(txId, { label: "submit_incident" });   // call this the MOMENT you have the
 *                                                          // hash, per Section 31 rule 1
 *   await tracker.poll(txId);                             // repeat on an interval/on navigation
 *   tracker.get(txId);                                    // read current known state, even
 *                                                          // before the first poll resolves
 */
export class TransactionTracker {
  constructor(
    private readonly client: TrackerClient,
    private readonly store: TransactionStore = new InMemoryTransactionStore()
  ) {}

  /** Registers a transaction for tracking immediately, with an UNINITIALIZED placeholder
   * lifecycle - callers must call this before the first poll, never after, so the tx ID is
   * persisted even if the very first poll fails or the page is closed before it resolves. */
  async track(txId: string, options: { label?: string } = {}): Promise<TrackedTransaction> {
    const existing = await this.store.load(txId);
    if (existing) return existing;
    const record: TrackedTransaction = {
      txId,
      label: options.label,
      lifecycle: mapRawTransaction({ txId, status: "UNINITIALIZED", result: null }),
      children: [],
      firstTrackedAt: new Date().toISOString(),
      lastPolledAt: null,
    };
    await this.store.save(record);
    return record;
  }

  async get(txId: string): Promise<TrackedTransaction | undefined> {
    return this.store.load(txId);
  }

  async list(): Promise<TrackedTransaction[]> {
    return this.store.list();
  }

  /**
   * Polls the live lifecycle for a tracked transaction and its triggered children. Never
   * resubmits anything itself - see isReadyForResubmitDecision(). Throws if `track()` was never
   * called for this txId, since an untracked poll would silently lose the "persist immediately"
   * guarantee for any tx that fails its very first poll.
   */
  async poll(txId: string): Promise<TrackedTransaction> {
    const existing = await this.store.load(txId);
    if (!existing) {
      throw new Error(`poll() called for an untracked transaction ${txId} - call track() first so the tx ID is persisted before polling can ever fail.`);
    }

    const raw = await this.client.getTransaction({ hash: txId });
    const lifecycle = mapRawTransaction(raw);

    let children: TrackedChild[] = existing.children;
    // Only worth asking for children once the parent has actually reached a decided/terminal
    // state - mid-flight statuses cannot yet have triggered anything.
    if (lifecycle.derived?.isFinal || lifecycle.protocolDecisionOutcome !== null) {
      const childIds = await this.client.getTriggeredTransactionIds({ hash: txId });
      children = await Promise.all(
        childIds.map(async (childId) => {
          const childRaw = await this.client.getTransaction({ hash: childId });
          return { txId: childId, role: "UNKNOWN" as const, lifecycle: mapRawTransaction(childRaw) };
        })
      );
    }

    const updated: TrackedTransaction = {
      ...existing,
      lifecycle,
      children,
      lastPolledAt: new Date().toISOString(),
    };
    await this.store.save(updated);
    return updated;
  }

  /** CLAUDE.md Section 31 rule 3: "never blindly resubmit because a request timed out." Returns
   * true only when the tracked transaction's lifecycle genuinely permits considering
   * resubmission (CANCELED) - a caller still decides whether to actually resubmit; this tracker
   * never resubmits on its own. */
  async isReadyForResubmitDecision(txId: string): Promise<boolean> {
    const record = await this.store.load(txId);
    return record ? isSafeToResubmit(record.lifecycle) : false;
  }
}
