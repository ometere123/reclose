import { isValidSourceUrl } from "@reclose/evidence-builder";
import type { SourceClass } from "@reclose/protocol-sdk";

export interface MonitoredSource {
  /** Immutable source-authority ID configured in the Judge registry. */
  sourceId: string;
  url: string;
  sourceClass: SourceClass;
  /** Deterministic candidate detector only. Never a truth decision or prompt. */
  pattern: string | RegExp;
}

export interface SourceCheckResult {
  sourceId: string;
  url: string;
  sourceClass: SourceClass;
  candidateDetected: boolean;
  extractedText: string;
  fetchedAt: string;
  error?: string;
}

export type FetchLike = (url: string) => Promise<{ status: number; text(): Promise<string> }>;
const MAX_FETCHED_TEXT_CHARS = 16000;

function matchesPattern(text: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") return text.includes(pattern);
  // Avoid stateful RegExp.lastIndex behaviour for global/sticky expressions.
  pattern.lastIndex = 0;
  return pattern.test(text);
}

export async function checkSource(source: MonitoredSource, fetchImpl: FetchLike = fetch as FetchLike): Promise<SourceCheckResult> {
  const fetchedAt = new Date().toISOString();
  const base = { sourceId: source.sourceId, url: source.url, sourceClass: source.sourceClass, fetchedAt };
  if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(source.sourceId)) {
    return { ...base, candidateDetected: false, extractedText: "", error: "invalid sourceId" };
  }
  if (!isValidSourceUrl(source.url)) {
    return { ...base, candidateDetected: false, extractedText: "", error: "URL rejected by canonical evidence URL rules" };
  }
  try {
    const response = await fetchImpl(source.url);
    const body = await response.text();
    const extractedText = body.slice(0, MAX_FETCHED_TEXT_CHARS);
    if (response.status !== 200) {
      return { ...base, candidateDetected: false, extractedText, error: `HTTP ${response.status}` };
    }
    return { ...base, candidateDetected: matchesPattern(extractedText, source.pattern), extractedText };
  } catch (error) {
    return { ...base, candidateDetected: false, extractedText: "", error: (error as Error).message };
  }
}

export interface HealthMetrics {
  sourcesConfigured: number;
  checksPerformed: number;
  candidatesDetected: number;
  sourceErrors: number;
  reportsSubmitted: number;
  transactionFailures: number;
  duplicateCandidatesSuppressed: number;
  lastCheckAt: string | null;
}

export async function checkAllSources(sources: MonitoredSource[], fetchImpl: FetchLike = fetch as FetchLike): Promise<SourceCheckResult[]> {
  return Promise.all(sources.map((source) => checkSource(source, fetchImpl)));
}

export class SentinelMonitor {
  private metrics: HealthMetrics;

  constructor(private readonly sources: MonitoredSource[], private readonly fetchImpl: FetchLike = fetch as FetchLike) {
    this.metrics = {
      sourcesConfigured: sources.length,
      checksPerformed: 0,
      candidatesDetected: 0,
      sourceErrors: 0,
      reportsSubmitted: 0,
      transactionFailures: 0,
      duplicateCandidatesSuppressed: 0,
      lastCheckAt: null,
    };
  }

  async runOnce(): Promise<SourceCheckResult[]> {
    const results = await checkAllSources(this.sources, this.fetchImpl);
    this.metrics.checksPerformed += results.length;
    this.metrics.candidatesDetected += results.filter((result) => result.candidateDetected).length;
    this.metrics.sourceErrors += results.filter((result) => result.error !== undefined).length;
    this.metrics.lastCheckAt = new Date().toISOString();
    return results;
  }

  recordReportSubmitted(): void { this.metrics.reportsSubmitted += 1; }
  recordTransactionFailure(): void { this.metrics.transactionFailures += 1; }
  recordDuplicateSuppressed(): void { this.metrics.duplicateCandidatesSuppressed += 1; }
  getHealthMetrics(): HealthMetrics { return { ...this.metrics }; }
}
