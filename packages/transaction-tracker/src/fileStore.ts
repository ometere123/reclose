import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import type { TransactionStore } from "./store";
import type { TrackedTransaction } from "./tracker";

/** Durable JSON store for CLI/Sentinel. Writes are atomic rename operations so a process crash
 * cannot leave a half-written transaction database. Private keys are never stored here. */
export class FileTransactionStore implements TransactionStore {
  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<Record<string, TrackedTransaction>> {
    try {
      return JSON.parse(await fs.readFile(this.filePath, "utf8")) as Record<string, TrackedTransaction>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  private async writeAll(records: Record<string, TrackedTransaction>): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(records, null, 2) + "\n", { mode: 0o600 });
    await fs.rename(tmp, this.filePath);
  }

  async save(record: TrackedTransaction): Promise<void> {
    const records = await this.readAll();
    records[record.txId] = record;
    await this.writeAll(records);
  }

  async load(txId: string): Promise<TrackedTransaction | undefined> {
    const records = await this.readAll();
    return records[txId];
  }

  async list(): Promise<TrackedTransaction[]> {
    return Object.values(await this.readAll());
  }
}
