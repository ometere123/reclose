// Canonical Evidence Artifact Package (EAP) construction/validation, owned here (not in
// @reclose/evidence-builder) so protocol-sdk's report builders (buildIncidentReport/
// buildRecoveryReport) can use the SAME implementation @reclose/evidence-builder exposes to the
// browser/Sentinel, without a circular package dependency (evidence-builder already depends on
// protocol-sdk for SourceClass/RuleId types; protocol-sdk needing evidence-builder's runtime
// functions back would be circular at build time). @reclose/evidence-builder re-exports this
// module verbatim - there is exactly ONE EAP implementation, per CLAUDE.md Section 13/A3-H05
// ("Do NOT implement a second simplified evidence validator").

import type { SourceClass, RuleId } from "./types";
import { canonicalKeccak256, keccak256Hex } from "./canonical";

export const MAX_EAP_JSON_BYTES = 12288;
export const MAX_SOURCES = 4;
export const MAX_SOURCE_URL_CHARS = 2048;
export const MAX_SOURCE_TEXT_CHARS = 16000;
export const MAX_SUBJECT_CHARS = 256;

export const GOVERNED_SOURCE_CLASSES: readonly SourceClass[] = [
  "AUTHORITATIVE_SIGNED",
  "AUTHORITATIVE_PUBLIC",
  "ONCHAIN",
  "INDEPENDENT_PUBLIC",
  "CONTENT_ADDRESSED_SNAPSHOT",
  "DERIVED_DETERMINISTIC",
];

const BLOCKED_HOSTS = new Set(["localhost", "localhost.", "0.0.0.0", "metadata.google.internal", "169.254.169.254"]);
const BLOCKED_PREFIXES = ["127.", "10.", "192.168.", "0."];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^[0-9]+$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) return false;
  if (BLOCKED_PREFIXES.some((prefix) => host.startsWith(prefix))) return true;
  const first = Number(parts[0]);
  const second = Number(parts[1]);
  return (first === 172 && second >= 16 && second <= 31) || (first === 169 && second === 254);
}

export function isValidSourceUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > MAX_SOURCE_URL_CHARS) return false;
  if (!url.startsWith("https://")) return false;
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol !== "https:") return false;
    if (parsed.port && parsed.port !== "443") return false;
    const host = parsed.hostname.toLowerCase();
    if (!host || BLOCKED_HOSTS.has(host) || host.endsWith(".local") || isPrivateIpv4(host)) return false;
    // R1 takes the conservative position that literal IPv6 sources are not admitted until the
    // contract and client share a complete deterministic IPv6 private/link-local classifier.
    if (host.includes(":")) return false;
    return true;
  } catch {
    return false;
  }
}

export interface EvidenceSourceInput {
  sourceId: string;
  url: string;
  sourceClass: SourceClass;
  extractedText: string;
  snapshotRef?: string;
  retrievedAt: string;
}

export interface EapInput {
  targetId: string;
  policyHash: `0x${string}`;
  ruleId: RuleId;
  subject: string;
  reporter: `0x${string}`;
  observedAt: string;
  retrievedAt: string;
  sources: EvidenceSourceInput[];
  /** Required by the V2 recovery Judge path; absent for incident/remediation EAPs. */
  recoveryProbeRef?: string;
}

export interface CanonicalEvidenceSource extends EvidenceSourceInput {
  snapshotRef: string;
  contentHash: `0x${string}`;
}

export interface CanonicalEap {
  schema: "reclose-eap-v1";
  targetId: string;
  policyHash: `0x${string}`;
  ruleId: RuleId;
  subject: string;
  reporter: `0x${string}`;
  observedAt: string;
  sources: CanonicalEvidenceSource[];
  sourceClasses: SourceClass[];
  retrievedAt: string;
  contentHashes: `0x${string}`[];
  snapshotRefs: string[];
  artifactHash: `0x${string}`;
  recoveryProbeRef?: string;
}

export interface EapValidationError {
  field: string;
  message: string;
}

const HASH_RE = /^0x[0-9a-f]{64}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ID_RE = /^[A-Za-z0-9_.:-]+$/;

function validId(value: string, max: number): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= max && ID_RE.test(value);
}

function validTimestamp(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 40) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

export function validateEap(eap: EapInput): EapValidationError[] {
  const errors: EapValidationError[] = [];
  if (!validId(eap.targetId, 96)) errors.push({ field: "targetId", message: "invalid targetId" });
  if (!HASH_RE.test(eap.policyHash)) errors.push({ field: "policyHash", message: "policyHash must be canonical lowercase 0x+64 hex" });
  if (!validId(eap.ruleId, 64)) errors.push({ field: "ruleId", message: "invalid ruleId" });
  if (!ADDRESS_RE.test(eap.reporter)) errors.push({ field: "reporter", message: "reporter must be a 20-byte address" });
  if (!validTimestamp(eap.observedAt)) errors.push({ field: "observedAt", message: "observedAt must be an ISO-compatible timestamp" });
  if (!validTimestamp(eap.retrievedAt)) errors.push({ field: "retrievedAt", message: "retrievedAt must be an ISO-compatible timestamp" });
  if (eap.ruleId === "RECOVERY_VALIDATED_V1" && !validId(eap.recoveryProbeRef ?? "", 128)) {
    errors.push({ field: "recoveryProbeRef", message: "RECOVERY_VALIDATED_V1 requires a bounded recoveryProbeRef" });
  }
  if (typeof eap.subject !== "string" || eap.subject.length > MAX_SUBJECT_CHARS) {
    errors.push({ field: "subject", message: `subject must be at most ${MAX_SUBJECT_CHARS} characters` });
  }
  if (!Array.isArray(eap.sources) || eap.sources.length < 1 || eap.sources.length > MAX_SOURCES) {
    errors.push({ field: "sources", message: `sources must contain between 1 and ${MAX_SOURCES} entries` });
    return errors;
  }
  eap.sources.forEach((src, i) => {
    if (!validId(src.sourceId, 64)) errors.push({ field: `sources[${i}].sourceId`, message: "invalid sourceId" });
    if (!isValidSourceUrl(src.url)) errors.push({ field: `sources[${i}].url`, message: "unsafe/unsupported HTTPS source URL" });
    if (!GOVERNED_SOURCE_CLASSES.includes(src.sourceClass)) errors.push({ field: `sources[${i}].sourceClass`, message: "sourceClass is not governed" });
    if (typeof src.extractedText !== "string" || src.extractedText.length > MAX_SOURCE_TEXT_CHARS) {
      errors.push({ field: `sources[${i}].extractedText`, message: `extractedText exceeds ${MAX_SOURCE_TEXT_CHARS} characters` });
    }
    if (src.snapshotRef !== undefined && (typeof src.snapshotRef !== "string" || src.snapshotRef.length > 2048)) {
      errors.push({ field: `sources[${i}].snapshotRef`, message: "snapshotRef must be <=2048 characters" });
    }
    if (src.sourceClass === "CONTENT_ADDRESSED_SNAPSHOT") {
      // Contract-side hardening: the Judge now independently fetches snapshotRef and verifies its
      // real content against the claimed contentHash, rather than trusting Reporter-supplied
      // extractedText directly. A CONTENT_ADDRESSED_SNAPSHOT source is therefore no longer valid
      // with an empty/absent snapshotRef - it must be a real, independently-fetchable, immutable
      // content-addressed URL (e.g. a commit-pinned raw URL), bound to the same registered
      // origin/path authority as `url`.
      if (typeof src.snapshotRef !== "string" || src.snapshotRef.length === 0) {
        errors.push({ field: `sources[${i}].snapshotRef`, message: "CONTENT_ADDRESSED_SNAPSHOT requires a non-empty, independently-fetchable snapshotRef" });
      } else if (!isValidSourceUrl(src.snapshotRef)) {
        errors.push({ field: `sources[${i}].snapshotRef`, message: "snapshotRef must be a safe/supported HTTPS URL for CONTENT_ADDRESSED_SNAPSHOT" });
      }
    }
    if (!validTimestamp(src.retrievedAt)) errors.push({ field: `sources[${i}].retrievedAt`, message: "invalid retrievedAt timestamp" });
  });
  return errors;
}

export function buildEapObject(eap: EapInput): CanonicalEap {
  const errors = validateEap(eap);
  if (errors.length > 0) {
    throw new Error(`EAP validation failed:\n${errors.map((e) => `  ${e.field}: ${e.message}`).join("\n")}`);
  }
  const sources: CanonicalEvidenceSource[] = eap.sources.map((src) => ({
    sourceId: src.sourceId,
    url: src.url,
    sourceClass: src.sourceClass,
    extractedText: src.extractedText,
    snapshotRef: src.snapshotRef ?? "",
    retrievedAt: src.retrievedAt,
    contentHash: keccak256Hex(src.extractedText),
  }));
  const withoutArtifact = {
    schema: "reclose-eap-v1" as const,
    targetId: eap.targetId,
    policyHash: eap.policyHash,
    ruleId: eap.ruleId,
    subject: eap.subject,
    reporter: eap.reporter,
    observedAt: eap.observedAt,
    sources,
    sourceClasses: sources.map((s) => s.sourceClass),
    retrievedAt: eap.retrievedAt,
    contentHashes: sources.map((s) => s.contentHash),
    snapshotRefs: sources.map((s) => s.snapshotRef),
    ...(eap.recoveryProbeRef !== undefined ? { recoveryProbeRef: eap.recoveryProbeRef } : {}),
  };
  const artifactHash = canonicalKeccak256(withoutArtifact);
  return { ...withoutArtifact, artifactHash };
}

export function buildEap(eap: EapInput): string {
  const canonical = buildEapObject(eap);
  const json = JSON.stringify(canonical);
  const byteLength = new TextEncoder().encode(json).length;
  if (byteLength > MAX_EAP_JSON_BYTES) {
    throw new Error(`Serialized EAP is ${byteLength} bytes, exceeding MAX_EAP_JSON_BYTES (${MAX_EAP_JSON_BYTES})`);
  }
  return json;
}

/** Verify an already-built EAP has not been mutated. */
export function verifyEapArtifact(eap: CanonicalEap): boolean {
  if (!HASH_RE.test(eap.artifactHash)) return false;
  const { artifactHash, ...preimage } = eap;
  if (canonicalKeccak256(preimage) !== artifactHash) return false;
  if (eap.sources.length !== eap.contentHashes.length || eap.sources.length !== eap.snapshotRefs.length) return false;
  return eap.sources.every((src, i) =>
    src.contentHash === keccak256Hex(src.extractedText) &&
    eap.contentHashes[i] === src.contentHash &&
    eap.snapshotRefs[i] === src.snapshotRef
  );
}
