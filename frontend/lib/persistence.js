import { storageAvailable } from "./domain.js";

const KEY = "reclose.pending-transactions.v1";

export class PendingTransactionStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storageAvailable() ? storage : null;
    this.memory = new Map();
  }

  loadAll() {
    if (!this.storage) return [...this.memory.values()];
    try {
      const parsed = JSON.parse(this.storage.getItem(KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(record) {
    if (!record?.txId) throw new Error("Pending transaction record requires txId");
    const records = this.loadAll().filter((item) => item.txId !== record.txId);
    records.push({ ...record, persistedAt: record.persistedAt || new Date().toISOString() });
    if (!this.storage) {
      this.memory.set(record.txId, records.at(-1));
      return;
    }
    this.storage.setItem(KEY, JSON.stringify(records));
  }

  remove(txId) {
    const records = this.loadAll().filter((item) => item.txId !== txId);
    if (!this.storage) {
      this.memory.delete(txId);
      return;
    }
    this.storage.setItem(KEY, JSON.stringify(records));
  }

  clear() {
    this.memory.clear();
    this.storage?.removeItem(KEY);
  }
}

/** Persist first, poll second. A polling timeout never authorises resubmission. */
export async function persistThenTrack(store, txRecord, tracker, onUpdate = () => {}) {
  store.save(txRecord);
  onUpdate({ phase: "persisted", record: txRecord });
  if (!tracker) return;
  try {
    const result = await tracker(txRecord.txId);
    onUpdate({ phase: "tracked", record: txRecord, result });
    if (result?.derived?.isFinal === true || result?.rawStatus === "CANCELED") store.remove(txRecord.txId);
  } catch (error) {
    onUpdate({ phase: "tracking-error", record: txRecord, error });
  }
}
