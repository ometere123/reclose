// Mirrors contracts/incident_judge_v1.py's deterministic EAP bounds EXACTLY (same constants,
// same URL-rejection logic) for fast client-side feedback before submission. The Judge's own
// _parse_and_validate_eap/_valid_source_url remain the sole authority - this module documents its
// on-chain origin inline so the two can never silently drift without the drift being visible in a
// diff against this comment (CLAUDE.md Section 15: deterministic validation before semantic
// judgment; CLAUDE.md Section 13: never a second evaluator that can disagree with the protocol).

import type { SourceClass } from "@reclose/protocol-sdk";

// contracts/incident_judge_v1.py::MAX_EAP_JSON_BYTES/MAX_SOURCES/MAX_SOURCE_URL_CHARS/
// MAX_SOURCE_TEXT_CHARS/MAX_SUBJECT_CHARS (Implementation Specification Section 34).
export const MAX_EAP_JSON_BYTES = 12288;
export const MAX_SOURCES = 4;
export const MAX_SOURCE_URL_CHARS = 2048;
export const MAX_SOURCE_TEXT_CHARS = 16000;
export const MAX_SUBJECT_CHARS = 256;

// contracts/incident_judge_v1.py::SOURCE_CLASSES (schemas/evidence/EvidenceSource.schema.json,
// ADR-011 - never invented independently of the governed list).
export const GOVERNED_SOURCE_CLASSES: readonly SourceClass[] = [
  "AUTHORITATIVE_SIGNED",
  "AUTHORITATIVE_PUBLIC",
  "ONCHAIN",
  "INDEPENDENT_PUBLIC",
  "CONTENT_ADDRESSED_SNAPSHOT",
  "DERIVED_DETERMINISTIC",
];

// contracts/incident_judge_v1.py::_BLOCKED_HOSTS / _BLOCKED_PREFIXES.
const BLOCKED_HOSTS = new Set(["localhost", "localhost.", "0.0.0.0", "metadata.google.internal", "169.254.169.254"]);
const BLOCKED_PREFIXES = ["127.", "10.", "192.168.", "0."];

// contracts/incident_judge_v1.py::_is_private_ipv4 - ported statement-for-statement.
function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^[0-9]+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
    return false;
  }
  if (BLOCKED_PREFIXES.some((prefix) => host.startsWith(prefix))) return true;
  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 169 && second === 254) return true;
  return false;
}

/**
 * Mirrors contracts/incident_judge_v1.py::_valid_source_url exactly: HTTPS-only, no userinfo,
 * no private/loopback/link-local/metadata host, bounded length (CLAUDE.md Section 15).
 */
export function isValidSourceUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_SOURCE_URL_CHARS) return false;
  if (!url.startsWith("https://")) return false;
  const rest = url.slice("https://".length);
  const authority = rest.split("/")[0] ?? "";
  if (authority.includes("@")) return false; // userinfo in authority is disallowed
  const host = (authority.split(":")[0] ?? "").split("?")[0] ?? "";
  if (host === "" || BLOCKED_HOSTS.has(host.toLowerCase())) return false;
  if (host.toLowerCase().endsWith(".local")) return false;
  if (isPrivateIpv4(host)) return false;
  if (host.toLowerCase() === "::1" || host.toLowerCase() === "[::1]") return false;
  return true;
}

export interface EvidenceSourceInput {
  url: string;
  sourceClass: SourceClass;
  extractedText: string;
}

export interface EapInput {
  subject: string;
  sources: EvidenceSourceInput[];
}

export interface EapValidationError {
  field: string;
  message: string;
}

/**
 * Validates an EAP input against the Judge's deterministic bounds, returning every violation
 * found (not just the first) so a form/CLI can show all problems at once. An empty array means
 * the Judge's deterministic precheck SHOULD accept this EAP's shape - it does not predict the
 * Judge's nondeterministic semantic judgment, which this package never attempts to replicate.
 */
export function validateEap(eap: EapInput): EapValidationError[] {
  const errors: EapValidationError[] = [];

  if (typeof eap.subject !== "string" || eap.subject.length > MAX_SUBJECT_CHARS) {
    errors.push({ field: "subject", message: `subject must be a string of at most ${MAX_SUBJECT_CHARS} characters` });
  }

  if (!Array.isArray(eap.sources) || eap.sources.length < 1 || eap.sources.length > MAX_SOURCES) {
    errors.push({ field: "sources", message: `sources must contain between 1 and ${MAX_SOURCES} entries` });
  } else {
    eap.sources.forEach((src, i) => {
      if (!isValidSourceUrl(src.url)) {
        errors.push({
          field: `sources[${i}].url`,
          message: "source URL rejected - must be https, no userinfo, no private/loopback/link-local/metadata host",
        });
      }
      if (!GOVERNED_SOURCE_CLASSES.includes(src.sourceClass)) {
        errors.push({ field: `sources[${i}].sourceClass`, message: "sourceClass not a governed ADR-011 class" });
      }
      if (typeof src.extractedText !== "string" || src.extractedText.length > MAX_SOURCE_TEXT_CHARS) {
        errors.push({ field: `sources[${i}].extractedText`, message: `extractedText exceeds MAX_SOURCE_TEXT_CHARS (${MAX_SOURCE_TEXT_CHARS})` });
      }
    });
  }

  return errors;
}

/**
 * Builds the exact EAP JSON string the Judge's submit_incident/submit_remediation/
 * submit_recovery_validation expect for evidence_json, after validating it locally. Throws with
 * ALL violations joined (not just the first) if the EAP would be rejected by the Judge's
 * deterministic precheck. Also enforces MAX_EAP_JSON_BYTES on the SERIALIZED form, since that is
 * what the Judge actually measures (contracts/incident_judge_v1.py::_parse_and_validate_eap).
 */
export function buildEap(eap: EapInput): string {
  const errors = validateEap(eap);
  if (errors.length > 0) {
    throw new Error(`EAP validation failed:\n${errors.map((e) => `  ${e.field}: ${e.message}`).join("\n")}`);
  }
  const json = JSON.stringify({
    subject: eap.subject,
    sources: eap.sources.map((s) => ({ url: s.url, sourceClass: s.sourceClass, extractedText: s.extractedText })),
  });
  const byteLength = Buffer.byteLength(json, "utf8");
  if (byteLength > MAX_EAP_JSON_BYTES) {
    throw new Error(`Serialized EAP is ${byteLength} bytes, exceeding MAX_EAP_JSON_BYTES (${MAX_EAP_JSON_BYTES}) - shorten extractedText or reduce source count`);
  }
  return json;
}
