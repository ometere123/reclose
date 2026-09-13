import { keccak256Hex, type RuleId } from "@reclose/protocol-sdk";
import { buildCandidateReport, type CandidateReportContext } from "./candidateEap";
import { SentinelMonitor, type HealthMetrics, type SourceCheckResult } from "./monitor";
import * as fs from "node:fs";
import * as path from "node:path";

export interface SentinelSubmissionContext {
  targetId: string;
  policyKey: string;
  policyHash: `0x${string}`;
  ruleId: RuleId;
  resourceId: string;
  subject: string;
}

/** Least-privilege Reporter boundary. Implementations may use a wallet/keystore/provider but the
 * Sentinel package never receives or stores a raw private key. */
export interface ReporterClient {
  getReporterAddress(): Promise<`0x${string}`>;
  getNextReporterNonce(): Promise<number>;
  submitIncident(args: {
    targetId: string;
    policyKey: string;
    ruleId: RuleId;
    resourceId: string;
    evidenceHash: `0x${string}`;
    evidenceJson: string;
    reporterNonce: number;
    bondId: string;
  }): Promise<{ txId: string; incidentId?: string }>;
}

export interface SentinelState {
  seenCandidateKeys: Record<string, string>;
  pendingTransactions: Record<string, { submittedAt: string; candidateKey: string }>;
  lastSubmissionAtByRule: Record<string, string>;
}

export interface SentinelStateStore {
  load(): Promise<SentinelState | null>;
  save(state: SentinelState): Promise<void>;
}

export interface PendingTransactionTracker {
  track(txId: string, options?: { label?: string }): Promise<unknown>;
  poll(txId: string): Promise<{ lifecycle?: { derived?: { isFinal?: boolean }; rawStatus?: string }; [key: string]: unknown }>;
}

export interface SentinelRunnerOptions {
  monitor: SentinelMonitor;
  reporter: ReporterClient;
  store: SentinelStateStore;
  tracker: PendingTransactionTracker;
  context: SentinelSubmissionContext;
  cooldownSeconds?: number;
  bondIdFactory?: (candidateKey: string, nonce: number) => string;
}

function emptyState(): SentinelState {
  return { seenCandidateKeys: {}, pendingTransactions: {}, lastSubmissionAtByRule: {} };
}

/** Stable duplicate key over the event-bearing fetched content. */
export function candidateKey(context: SentinelSubmissionContext, results: SourceCheckResult[]): string {
  const parts = results
    .filter((result) => result.candidateDetected && !result.error)
    .map((result) => `${result.sourceId}|${result.url}|${keccak256Hex(result.extractedText)}`)
    .sort();
  return keccak256Hex(`${context.targetId}|${context.ruleId}|${context.resourceId}|${parts.join("||")}`);
}

export class SentinelRunner {
  private readonly cooldownSeconds: number;
  constructor(private readonly options: SentinelRunnerOptions) {
    this.cooldownSeconds = options.cooldownSeconds ?? 300;
  }

  private async state(): Promise<SentinelState> {
    return (await this.options.store.load()) ?? emptyState();
  }

  /** Resume every known tx after restart. Never resubmits it merely because polling failed. */
  async resumePending(): Promise<void> {
    const state = await this.state();
    let changed = false;
    for (const txId of Object.keys(state.pendingTransactions)) {
      try {
        const tracked = await this.options.tracker.poll(txId);
        if (tracked.lifecycle?.derived?.isFinal === true || tracked.lifecycle?.rawStatus === "CANCELED") {
          delete state.pendingTransactions[txId];
          changed = true;
        }
      } catch {
        // Preserve the original tx ID. A timeout/RPC error is not permission to resubmit.
      }
    }
    if (changed) await this.options.store.save(state);
  }

  async runOnce(): Promise<{ submittedTxId: string | null; duplicateSuppressed: boolean; results: SourceCheckResult[] }> {
    await this.resumePending();
    const results = await this.options.monitor.runOnce();
    const triggered = results.filter((result) => result.candidateDetected && !result.error);
    if (triggered.length === 0) return { submittedTxId: null, duplicateSuppressed: false, results };

    const state = await this.state();
    const key = candidateKey(this.options.context, triggered);
    if (state.seenCandidateKeys[key]) {
      this.options.monitor.recordDuplicateSuppressed();
      return { submittedTxId: null, duplicateSuppressed: true, results };
    }

    const last = state.lastSubmissionAtByRule[this.options.context.ruleId];
    if (last && Date.now() - Date.parse(last) < this.cooldownSeconds * 1000) {
      return { submittedTxId: null, duplicateSuppressed: false, results };
    }

    const reporter = await this.options.reporter.getReporterAddress();
    const nonce = await this.options.reporter.getNextReporterNonce();
    const reportContext: CandidateReportContext = {
      targetId: this.options.context.targetId,
      policyHash: this.options.context.policyHash,
      ruleId: this.options.context.ruleId,
      reporter,
      subject: this.options.context.subject,
    };
    const report = buildCandidateReport(reportContext, triggered);
    const bondId = this.options.bondIdFactory ? this.options.bondIdFactory(key, nonce) : "";
    const submission = await this.options.reporter.submitIncident({
      targetId: this.options.context.targetId,
      policyKey: this.options.context.policyKey,
      ruleId: this.options.context.ruleId,
      resourceId: this.options.context.resourceId,
      evidenceHash: report.artifactHash,
      evidenceJson: report.eapJson,
      reporterNonce: nonce,
      bondId,
    });

    // Persist immediately once the transaction ID exists, before any polling.
    state.seenCandidateKeys[key] = submission.txId;
    state.pendingTransactions[submission.txId] = { submittedAt: new Date().toISOString(), candidateKey: key };
    state.lastSubmissionAtByRule[this.options.context.ruleId] = new Date().toISOString();
    await this.options.store.save(state);
    await this.options.tracker.track(submission.txId, { label: "sentinel-submit-incident" });
    this.options.monitor.recordReportSubmitted();
    return { submittedTxId: submission.txId, duplicateSuppressed: false, results };
  }

  getHealthMetrics(): HealthMetrics {
    return this.options.monitor.getHealthMetrics();
  }
}

export class InMemorySentinelStateStore implements SentinelStateStore {
  private value: SentinelState | null = null;
  async load(): Promise<SentinelState | null> { return this.value ? JSON.parse(JSON.stringify(this.value)) as SentinelState : null; }
  async save(state: SentinelState): Promise<void> { this.value = JSON.parse(JSON.stringify(state)) as SentinelState; }
}

/**
 * Durable, atomic, file-based SentinelStateStore. Persists seen-candidate keys, pending tx IDs
 * and last-submission/cooldown timestamps so a process restart resumes pending transactions
 * without duplicate submission (CLAUDE.md Section 33/36 liveness + replay-safety requirements).
 *
 * Uses plain Node fs with the write-temp-then-rename pattern for atomicity: a crash mid-write
 * never leaves a half-written state file, since rename() is atomic on the same filesystem. No
 * external DB dependency is introduced - none is used elsewhere in this repo for this purpose.
 */
export class FileSentinelStateStore implements SentinelStateStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<SentinelState | null> {
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf8");
      if (!raw.trim()) return null;
      const parsed = JSON.parse(raw) as SentinelState;
      return {
        seenCandidateKeys: parsed.seenCandidateKeys ?? {},
        pendingTransactions: parsed.pendingTransactions ?? {},
        lastSubmissionAtByRule: parsed.lastSubmissionAtByRule ?? {},
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async save(state: SentinelState): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(state, null, 2), "utf8");
    await fs.promises.rename(tmpPath, this.filePath);
  }
}
