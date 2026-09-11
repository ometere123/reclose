// Converts a Sentinel candidate detection into the EAP input shape @reclose/evidence-builder
// expects - Sentinel's job ends here. It never calls submit_incident itself and never touches
// key material (CLAUDE.md Section 33/45: no custody of private keys; "other actors must be able
// to submit reports without Reclose-operated Sentinel infrastructure" - submission is always a
// separate, explicit, operator/wallet-driven step, e.g. piping this output into
// `reclose evidence build` and then the operator's own `genlayer write`).

import { buildEap, type EapInput } from "@reclose/evidence-builder";
import type { SourceCheckResult } from "./monitor";

export interface CandidateReport {
  subject: string;
  /** Ready to pass as submit_incident/submit_remediation/submit_recovery_validation's
   * evidence_json argument - already validated against the Judge's deterministic bounds. */
  eapJson: string;
  /** The exact sources that triggered detection - for operator review before they decide whether
   * to actually submit (Sentinel detecting a candidate is NOT the same as a human/operator
   * deciding to report it). */
  triggeredSources: SourceCheckResult[];
}

/**
 * Builds a submittable EAP from one or more candidate-triggering source check results. Throws
 * (via buildEap) if the resulting EAP would be rejected by the Judge's deterministic precheck -
 * Sentinel surfaces that immediately rather than handing an operator something that would fail
 * on-chain.
 */
export function buildCandidateReport(subject: string, results: SourceCheckResult[]): CandidateReport {
  const triggeredSources = results.filter((r) => r.candidateDetected);
  if (triggeredSources.length === 0) {
    throw new Error("No candidate-triggering sources to build a report from");
  }
  const eapInput: EapInput = {
    subject,
    sources: triggeredSources.map((r) => ({
      url: r.url,
      sourceClass: r.sourceClass,
      extractedText: r.extractedText,
    })),
  };
  return { subject, eapJson: buildEap(eapInput), triggeredSources };
}
