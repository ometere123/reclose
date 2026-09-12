export const CHAIN_ID = 61997;
export const NETWORK_NAME = "studio-dev";

export const ASSURANCE_STATES = ["NORMAL", "MONITORED", "RESTRICTED", "SAFE_MODE", "PAUSED", "RECOVERY"];
export const DECISION_OUTCOMES = ["CONFIRMED", "REJECTED", "UNDETERMINED"];
export const DECISION_STAGES = ["PROVISIONAL", "FINAL"];
export const EXECUTION_RESULTS = ["NOT_VOTED", "FINISHED_WITH_RETURN", "FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"];

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function shortHash(value, head = 8, tail = 6) {
  const s = String(value ?? "");
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** A3-H10: an unrecognized/missing assurance state must NEVER be displayed as NORMAL (or any
 * other known-good state) by default - that would make the interface MORE certain than the
 * protocol actually is. Render an explicit UNKNOWN marker instead. */
export function stateMarker(state) {
  const safe = ASSURANCE_STATES.includes(state) ? state : "UNKNOWN";
  return `<span class="state-marker" data-state="${safe}">${safe.replaceAll("_", " ")}</span>`;
}

export function outcomeLabel(outcome) {
  if (!outcome) return `<span class="muted mono">not decided</span>`;
  return `<span class="outcome" data-outcome="${escapeHtml(outcome)}">${escapeHtml(outcome)}</span>`;
}

export function executionLabel(result) {
  const finalStatus = executionFinalStatus(result);
  return `<span class="execution mono" data-result="${finalStatus}">${escapeHtml(finalStatus)} · ${escapeHtml(result ?? "NOT_VOTED")}</span>`;
}

export function executionFinalStatus(result) {
  if (result === "FINISHED_WITH_RETURN") return "SUCCESS";
  if (["FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"].includes(result)) return "FAILURE";
  return "UNKNOWN";
}

export function lifecycleIsFinal(rawStatus) {
  return rawStatus === "FINALIZED" || rawStatus === "CANCELED";
}

export function incidentDisplayStatus(incident) {
  if (!incident) return "UNKNOWN";
  if (incident.status !== "CLOSED") return incident.status;
  if (incident.finalOutcome === "REJECTED") return "FINAL_REJECTED";
  if (incident.finalOutcome === "UNDETERMINED") return "FINAL_UNDETERMINED";
  return incident.status;
}

export function assertTruthSeparation(tx) {
  if (!tx) return;
  if (tx.rawStatus === "ACCEPTED" && tx.derived?.isFinal === true) throw new Error("ACCEPTED may not be displayed as final");
  if (tx.rawStatus === "FINALIZED" && tx.executionResult && executionFinalStatus(tx.executionResult) === "FAILURE" && tx.displaySuccess === true) {
    throw new Error("FINALIZED with execution failure may not be displayed as success");
  }
}

export function formatIso(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function recordRows(rows) {
  return `<dl class="record-list">${rows.map(([label, value, className = ""]) => `<div class="record-row"><dt>${escapeHtml(label)}</dt><dd class="${className}">${value}</dd></div>`).join("")}</dl>`;
}

export function routeFromHash(hash = location.hash) {
  const clean = hash.replace(/^#\/?/, "");
  const [route = "overview", ...parts] = clean.split("/").filter(Boolean);
  return { route, parts };
}

export function setLiveMessage(message) {
  const region = document.getElementById("live-region");
  if (region) region.textContent = message;
}

/**
 * A3-H01 canonical prepared-write registry, kept pure/DOM-free so it is directly unit-testable.
 * Exactly one active draft may exist per write `kind` at a time. The object returned by
 * `getDraft` is always the EXACT object passed to `registerDraft` - never reconstructed - and
 * `invalidateDraft` (called on any post-preview input edit) removes it so a stale draft can never
 * be retrieved for signing.
 */
export function createDraftRegistry() {
  const drafts = new Map();
  return {
    registerDraft(kind, draft) {
      if (!draft || typeof draft !== "object") throw new Error("Cannot register a non-object draft");
      drafts.set(kind, draft);
    },
    getDraft(kind) {
      return drafts.get(kind) ?? null;
    },
    invalidateDraft(kind) {
      drafts.delete(kind);
    },
    hasDraft(kind) {
      return drafts.has(kind);
    }
  };
}

export function storageAvailable() {
  try {
    const key = "__reclose_storage_test";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
