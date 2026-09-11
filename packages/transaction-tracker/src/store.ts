// Pluggable persistence boundary (CLAUDE.md Section 31 rule 2: "survive refresh/navigation").
// The tracker core never assumes a specific storage backend - a frontend plugs in localStorage,
// a CLI/Sentinel plugs in a file or in-memory store. Persisting the tx ID the INSTANT it is known
// (rule 1: "persist transaction ID immediately after submission") is the caller's responsibility,
// done by calling track() before the first poll - this module only defines the storage contract.

import type { TrackedTransaction } from "./tracker";

export interface TransactionStore {
  save(record: TrackedTransaction): void | Promise<void>;
  load(txId: string): TrackedTransaction | undefined | Promise<TrackedTransaction | undefined>;
  list(): TrackedTransaction[] | Promise<TrackedTransaction[]>;
}

/** Default store for Node/CLI/Sentinel/test use. Frontend code should supply a localStorage- or
 * IndexedDB-backed TransactionStore instead, per CLAUDE.md Section 31 rule 2. */
export class InMemoryTransactionStore implements TransactionStore {
  private readonly records = new Map<string, TrackedTransaction>();

  save(record: TrackedTransaction): void {
    this.records.set(record.txId, { ...record });
  }

  load(txId: string): TrackedTransaction | undefined {
    const r = this.records.get(txId);
    return r ? { ...r } : undefined;
  }

  list(): TrackedTransaction[] {
    return Array.from(this.records.values()).map((r) => ({ ...r }));
  }
}
