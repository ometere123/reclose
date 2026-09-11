// C3 real implementation: Sentinel source monitoring and CANDIDATE condition detection
// (CLAUDE.md Section 33). This module deliberately does NOT run any LLM or semantic judgment -
// that boundary belongs exclusively to IncidentJudgeV1's gl.eq_principle.strict_eq judgment
// (CLAUDE.md Section 6: "Do not allow the model/LLM to invent execution authority" - and more
// pointedly, Sentinel itself must never even approximate that role, or an operator could come to
// trust Sentinel's own opinion as if it were the Judge's). Detection here is a PURELY
// deterministic keyword/pattern match against fetched text - it can only ever produce a CANDIDATE
// signal ("this source's content matches a pattern worth reporting"), never a decision.

import { isValidSourceUrl } from "@reclose/evidence-builder";
import type { SourceClass } from "@reclose/protocol-sdk";

export interface MonitoredSource {
  url: string;
  sourceClass: SourceClass;
  /** Deterministic candidate-detection pattern - a plain substring or RegExp, NEVER a prompt. */
  pattern: string | RegExp;
}

export interface SourceCheckResult {
  url: string;
  sourceClass: SourceClass;
  /** True only if the deterministic pattern matched the fetched content - a CANDIDATE signal,
   * never a truth determination (CLAUDE.md Section 33: "It does not decide truth"). */
  candidateDetected: boolean;
  extractedText: string;
  fetchedAt: string;
  error?: string;
}

/** Minimal fetch abstraction so this module is unit-testable without a real HTTPS call. Node's
 * global fetch satisfies this shape directly. */
export type FetchLike = (url: string) => Promise<{ status: number; text(): Promise<string> }>;

function matchesPattern(text: string, pattern: string | RegExp): boolean {
  if (typeof pattern === "string") return text.includes(pattern);
  return pattern.test(text);
}

const MAX_FETCHED_TEXT_CHARS = 16000; // mirrors @reclose/evidence-builder's MAX_SOURCE_TEXT_CHARS

/**
 * Checks one configured source: rejects it locally if the URL fails the same deterministic
 * source-URL rules the Judge itself enforces (never even attempts to fetch an unsafe URL - this
 * is Sentinel applying the existing evidence-builder bound, not inventing a second one), fetches
 * it, and runs the deterministic pattern match. Never throws for a fetch failure - a dead/
 * unreachable source is reported as a structured result (error set, candidateDetected false),
 * since "source outage" is itself a case the rest of the system must be able to observe
 * (CLAUDE.md Section 15/37: source outage/variance tests).
 */
export async function checkSource(source: MonitoredSource, fetchImpl: FetchLike = fetch as FetchLike): Promise<SourceCheckResult> {
  const fetchedAt = new Date().toISOString();
  if (!isValidSourceUrl(source.url)) {
    return {
      url: source.url,
      sourceClass: source.sourceClass,
      candidateDetected: false,
      extractedText: "",
      fetchedAt,
      error: "URL rejected by the same rules IncidentJudgeV1._valid_source_url enforces - refusing to fetch",
    };
  }
  try {
    const response = await fetchImpl(source.url);
    const body = await response.text();
    const extractedText = body.slice(0, MAX_FETCHED_TEXT_CHARS);
    if (response.status !== 200) {
      return { url: source.url, sourceClass: source.sourceClass, candidateDetected: false, extractedText, fetchedAt, error: `HTTP ${response.status}` };
    }
    return {
      url: source.url,
      sourceClass: source.sourceClass,
      candidateDetected: matchesPattern(extractedText, source.pattern),
      extractedText,
      fetchedAt,
    };
  } catch (e) {
    return {
      url: source.url,
      sourceClass: source.sourceClass,
      candidateDetected: false,
      extractedText: "",
      fetchedAt,
      error: (e as Error).message,
    };
  }
}

export interface HealthMetrics {
  sourcesConfigured: number;
  checksPerformed: number;
  candidatesDetected: number;
  sourceErrors: number;
  lastCheckAt: string | null;
}

/**
 * Runs one monitoring pass over every configured source and returns both the per-source results
 * and updated cumulative health metrics (CLAUDE.md Section 33: "export health metrics"). Pure
 * with respect to prior state - callers accumulate metrics across calls themselves (see
 * SentinelMonitor below for a stateful convenience wrapper).
 */
export async function checkAllSources(sources: MonitoredSource[], fetchImpl: FetchLike = fetch as FetchLike): Promise<SourceCheckResult[]> {
  return Promise.all(sources.map((s) => checkSource(s, fetchImpl)));
}

/** Stateful convenience wrapper accumulating health metrics across repeated monitoring passes -
 * e.g. for a long-running Sentinel process on an interval. */
export class SentinelMonitor {
  private metrics: HealthMetrics = {
    sourcesConfigured: 0,
    checksPerformed: 0,
    candidatesDetected: 0,
    sourceErrors: 0,
    lastCheckAt: null,
  };

  constructor(
    private readonly sources: MonitoredSource[],
    private readonly fetchImpl: FetchLike = fetch as FetchLike
  ) {
    this.metrics.sourcesConfigured = sources.length;
  }

  async runOnce(): Promise<SourceCheckResult[]> {
    const results = await checkAllSources(this.sources, this.fetchImpl);
    this.metrics.checksPerformed += results.length;
    this.metrics.candidatesDetected += results.filter((r) => r.candidateDetected).length;
    this.metrics.sourceErrors += results.filter((r) => r.error !== undefined).length;
    this.metrics.lastCheckAt = new Date().toISOString();
    return results;
  }

  getHealthMetrics(): HealthMetrics {
    return { ...this.metrics };
  }
}
