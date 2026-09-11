// `reclose evidence build <eap-input.json>` - pure, offline, no network call, no web fetch.
// Wraps @reclose/evidence-builder so a Reporter/Sentinel operator gets the exact evidence_json
// string to pass to submit_incident/submit_remediation/submit_recovery_validation, with fast
// local rejection for anything the Judge's deterministic precheck would reject anyway.

import { buildEap, type EapInput } from "@reclose/evidence-builder";
import type { CommandResult } from "./policyCompile";

export function runEvidenceBuild(eapInputJsonText: string): CommandResult {
  let input: EapInput;
  try {
    input = JSON.parse(eapInputJsonText) as EapInput;
  } catch (e) {
    return { exitCode: 1, output: `Invalid JSON input: ${(e as Error).message}` };
  }

  try {
    const eapJson = buildEap(input);
    return { exitCode: 0, output: eapJson };
  } catch (e) {
    return { exitCode: 1, output: (e as Error).message };
  }
}
