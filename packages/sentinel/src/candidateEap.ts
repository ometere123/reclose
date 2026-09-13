import { buildEap, buildEapObject, type EapInput } from "@reclose/evidence-builder";
import type { RuleId } from "@reclose/protocol-sdk";
import type { SourceCheckResult } from "./monitor";

export interface CandidateReportContext {
  targetId: string;
  policyHash: `0x${string}`;
  ruleId: RuleId;
  reporter: `0x${string}`;
  subject: string;
  observedAt?: string;
}

export interface CandidateReport {
  subject: string;
  eapJson: string;
  artifactHash: `0x${string}`;
  triggeredSources: SourceCheckResult[];
}

/** Build exactly the canonical EAP the Judge verifies. Source IDs/classes remain untrusted client
 * declarations until the immutable Judge registry verifies them on-chain. */
export function buildCandidateReport(context: CandidateReportContext, results: SourceCheckResult[]): CandidateReport {
  const triggeredSources = results.filter((result) => result.candidateDetected && !result.error);
  if (triggeredSources.length === 0) throw new Error("No candidate-triggering sources to build a report from");
  const retrievedAt = triggeredSources.reduce((latest, source) => source.fetchedAt > latest ? source.fetchedAt : latest, triggeredSources[0]!.fetchedAt);
  const eapInput: EapInput = {
    targetId: context.targetId,
    policyHash: context.policyHash,
    ruleId: context.ruleId,
    subject: context.subject,
    reporter: context.reporter,
    observedAt: context.observedAt ?? retrievedAt,
    retrievedAt,
    sources: triggeredSources.map((source) => ({
      sourceId: source.sourceId,
      url: source.url,
      sourceClass: source.sourceClass,
      extractedText: source.extractedText,
      // CONTENT_ADDRESSED_SNAPSHOT sources are now independently fetched and hash-verified by the
      // Judge against snapshotRef, not trusted from extractedText alone - Sentinel already fetched
      // this exact URL to produce extractedText, so it is the correct independently-fetchable
      // identifier to supply. Every other source class leaves snapshotRef empty as before.
      snapshotRef: source.sourceClass === "CONTENT_ADDRESSED_SNAPSHOT" ? source.url : "",
      retrievedAt: source.fetchedAt,
    })),
  };
  const canonical = buildEapObject(eapInput);
  return { subject: context.subject, eapJson: buildEap(eapInput), artifactHash: canonical.artifactHash, triggeredSources };
}
