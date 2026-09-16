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
  getTransaction(args: { hash: string }): Promise<RawGenLayerTransaction & {
    executionResult?: string | null;
    /** GenLayer's emitted internal-message ledger, when exposed by the adapter. */
    messages?: unknown[] | null;
    emittedMessages?: unknown[] | null;
    postStateVerification?: "MATCH" | "MISMATCH" | "PENDING" | null;
  }>;
  /** Returns child transaction hashes this transaction's execution triggered (genlayer-js's own
   * getTriggeredTransactionIds) - the mechanism behind CLAUDE.md Section 31 rule 4 ("display
   * parent + child transactions where relevant"). */
  getTriggeredTransactionIds(args: { hash: string }): Promise<string[]>;
}

export interface TrackedChild {
  txId: string;
  parentTxId?: string;
  role: ChildTransactionRole | "UNKNOWN";
  lifecycle: GenLayerTransactionLifecycle;
  executionResult?: string | null;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export type ChildMaterializationStatus = "NOT_OBSERVABLE" | "NO_MESSAGES_DUE" | "AWAITING_MATERIALIZATION" | "MATERIALIZED";

export type MessageTriggerPhase = "ACCEPTED" | "FINALIZED" | "UNKNOWN";

export interface ExpectedEmittedMessage {
  index: number;
  triggerPhase: MessageTriggerPhase;
  materializedChildTxId?: string;
}

export interface TrackedTransaction {
  txId: string;
  /** Caller-supplied label for what this transaction IS (e.g. "submit_incident"), purely for
   * display - never used to alter polling/lifecycle logic. */
  label?: string;
  lifecycle: GenLayerTransactionLifecycle;
  children: TrackedChild[];
  /** Persisted graph metadata. Existing stores may contain records without these fields. */
  parentTxId?: string;
  emittedMessageCount?: number | null;
  /** Persisted ledger of emitted messages and the lifecycle phase at which each can exist. */
  expectedMessages?: ExpectedEmittedMessage[];
  childMaterialization: ChildMaterializationStatus;
  postStateVerification?: "MATCH" | "MISMATCH" | "PENDING" | null;
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
      childMaterialization: "NOT_OBSERVABLE",
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

    return this.pollGraph(txId, new Set<string>());
  }

  /** Polls every discovered descendant and persists each node independently. Children are not
   * flattened into a root snapshot: a late grandchild remains discoverable after its parent was
   * already persisted, and an emitted-but-not-yet-materialized message is never reported complete. */
  private async pollGraph(txId: string, visited: Set<string>): Promise<TrackedTransaction> {
    if (visited.has(txId)) {
      const cycle = await this.store.load(txId);
      if (!cycle) throw new Error(`Transaction graph cycle references unknown node ${txId}`);
      return cycle;
    }
    visited.add(txId);
    const existing = await this.store.load(txId);
    if (!existing) throw new Error(`poll() discovered an untracked node ${txId}`);
    const raw = await this.client.getTransaction({ hash: txId });
    const lifecycle = mapRawTransaction(raw);
    let children: TrackedChild[] = existing.children ?? [];
    // Only worth asking for children once the parent has actually reached a decided/terminal
    // state - mid-flight statuses cannot yet have triggered anything.
    if (lifecycle.derived?.isFinal || lifecycle.protocolDecisionOutcome !== null) {
      const childIds = await this.client.getTriggeredTransactionIds({ hash: txId });
      const now = new Date().toISOString();
      const prior = new Map(children.map((child) => [child.txId, child]));
      children = [];
      for (const childId of Array.from(new Set(childIds))) {
        const childRaw = await this.client.getTransaction({ hash: childId });
        const previous = prior.get(childId);
        const child = {
          txId: childId,
          parentTxId: txId,
          role: previous?.role ?? "UNKNOWN" as const,
          lifecycle: mapRawTransaction(childRaw),
          executionResult: childRaw.executionResult ?? null,
          firstSeenAt: previous?.firstSeenAt ?? now,
          lastSeenAt: now,
        };
        children.push(child);
        const childRecord: TrackedTransaction = {
          txId: childId,
          label: previous?.role,
          lifecycle: child.lifecycle,
          children: (await this.store.load(childId))?.children ?? [],
          parentTxId: txId,
          childMaterialization: "NOT_OBSERVABLE",
          firstTrackedAt: child.firstSeenAt,
          lastPolledAt: now,
          postStateVerification: childRaw.postStateVerification ?? null,
        };
        await this.store.save(childRecord);
      }
    }

    const emitted = raw.emittedMessages ?? raw.messages;
    const expectedMessages = Array.isArray(emitted)
      ? emitted.map((message, index) => ({
          index,
          triggerPhase: messageTriggerPhase(message),
          materializedChildTxId: existing.expectedMessages?.find((item) => item.index === index)?.materializedChildTxId,
        }))
      : existing.expectedMessages ?? [];
    const reconciledMessages = expectedMessages.map((message, index) => ({
      ...message,
      materializedChildTxId: message.materializedChildTxId ?? children[index]?.txId,
    }));
    const emittedMessageCount = Array.isArray(emitted) ? emitted.length : existing.emittedMessageCount ?? null;
    const dueMessages = reconciledMessages.filter((message) => isMessageDue(message.triggerPhase, lifecycle));
    const knownChildIds = new Set(children.map((child) => child.txId));
    const materializedDueMessages = dueMessages.filter((message) => message.materializedChildTxId && knownChildIds.has(message.materializedChildTxId));
    const childMaterialization: ChildMaterializationStatus =
      emittedMessageCount === null ? (children.length ? "MATERIALIZED" : "NOT_OBSERVABLE") :
      dueMessages.length === 0 ? "NO_MESSAGES_DUE" :
      materializedDueMessages.length < dueMessages.length ? "AWAITING_MATERIALIZATION" : "MATERIALIZED";

    const updated: TrackedTransaction = {
      ...existing,
      lifecycle,
      children,
      emittedMessageCount,
      expectedMessages: reconciledMessages,
      childMaterialization,
      postStateVerification: raw.postStateVerification ?? existing.postStateVerification ?? null,
      lastPolledAt: new Date().toISOString(),
    };
    await this.store.save(updated);
    for (const child of children) await this.pollGraph(child.txId, visited);
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

function messageTriggerPhase(message: unknown): MessageTriggerPhase {
  if (!message || typeof message !== "object") return "UNKNOWN";
  const onAcceptance = (message as { onAcceptance?: unknown }).onAcceptance;
  if (onAcceptance === true) return "ACCEPTED";
  if (onAcceptance === false) return "FINALIZED";
  return "UNKNOWN";
}

function isMessageDue(phase: MessageTriggerPhase, lifecycle: GenLayerTransactionLifecycle): boolean {
  if (phase === "UNKNOWN") return lifecycle.derived?.isFinal === true || lifecycle.protocolDecisionOutcome !== null;
  if (phase === "ACCEPTED") return lifecycle.derived?.isFinal === true || lifecycle.rawStatus === "ACCEPTED" || lifecycle.protocolDecisionOutcome === "accepted";
  return lifecycle.derived?.isFinal === true;
}
