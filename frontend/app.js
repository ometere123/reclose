import {
  createDraftRegistry, escapeHtml, executionLabel, formatIso, incidentDisplayStatus, outcomeLabel,
  recordRows, routeFromHash, setLiveMessage, shortHash, stateMarker, CHAIN_ID, NETWORK_NAME
} from "./lib/domain.js";
import { selectProductAdapter } from "./lib/adapters.js";
import { PendingTransactionStore, persistThenTrack } from "./lib/persistence.js";

const app = document.getElementById("app");
const adapter = selectProductAdapter();
const pendingStore = new PendingTransactionStore();

const NAV = [
  ["overview", "Overview"], ["targets", "Targets"], ["incidents", "Incidents"],
  ["policies", "Policies"], ["benchmark", "Benchmark"], ["system", "System"]
];

const state = {
  navOpen: false,
  loading: false,
  error: null,
  pending: pendingStore.loadAll(),
  lastRender: null
};

/**
 * A3-H01: the single canonical prepared-write registry (see domain.js::createDraftRegistry for
 * the pure, unit-tested invalidation behaviour). The object passed to the writer at submit time
 * is always exactly `draftRegistry.getDraft(kind)` - never a caller-reconstructed or empty object.
 */
const draftRegistry = createDraftRegistry();

const PREVIEW_ELEMENT_IDS = { incident: "incident-preview", recovery: "recovery-preview", registerTarget: "onboard-preview" };

function invalidateDraft(kind) {
  draftRegistry.invalidateDraft(kind);
  const el = document.getElementById(PREVIEW_ELEMENT_IDS[kind] || `${kind}-preview`);
  if (el && !el.classList.contains("empty")) {
    el.className = "empty";
    el.innerHTML = "Reviewed input changed - preview again before signing.";
  }
}

/** Wires one form so ANY change to its fields after a preview invalidates that preview's draft. */
function invalidateDraftOnEdit(form, kind) {
  if (!form || form.dataset.invalidateWired) return;
  form.dataset.invalidateWired = "1";
  form.addEventListener("input", () => invalidateDraft(kind));
  form.addEventListener("change", () => invalidateDraft(kind));
}

function shell(content, currentRoute) {
  const nav = NAV.map(([id, label], index) => `
    <a href="#/${id}" ${id === currentRoute ? 'aria-current="page"' : ""}>
      <span>${label}</span><span class="nav-index">0${index + 1}</span>
    </a>`).join("");
  return `
    <aside class="rail" aria-label="Primary" data-open="${state.navOpen}">
      <a class="brand" href="#/overview"><strong>reclose</strong><small>protocol assurance</small></a>
      <nav class="nav">${nav}</nav>
      <div class="rail-foot">
        <span class="eyebrow">canonical network</span>
        <span class="network-chip">${NETWORK_NAME} · ${CHAIN_ID}</span>
        <span class="muted" style="font-size:11px">Runtime assurance without hidden authority.</span>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <button class="button mobile-nav-button" type="button" data-action="toggle-nav" aria-expanded="${state.navOpen}" aria-label="Toggle navigation">Menu</button>
        <div class="topbar-meta">
          <span class="mode-chip" data-mode="${adapter.mode}">${escapeHtml(adapter.meta.label)}</span>
          <span class="network-chip">${NETWORK_NAME} · ${CHAIN_ID}</span>
        </div>
        <a class="button" href="#/system">Runtime truth</a>
      </header>
      <main id="main" tabindex="-1">${content}</main>
      <footer class="footer"><span>Reclose · GenLayer judgment, deterministic consequence.</span><span>Accepted ≠ final · Finalized ≠ execution success</span></footer>
    </div>`;
}

function pageHead(eyebrow, title, description, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="page-actions">${actions}</div></div>`;
}
function panel(title, body, span = "span-12", extra = "") {
  return `<section class="panel ${span}" ${extra}><div class="panel-head"><h2>${escapeHtml(title)}</h2></div><div class="panel-body">${body}</div></section>`;
}
function notice(title, text, kind = "") { return `<div class="notice ${kind}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text)}</span></div>`; }
function errorPage(error) {
  return `${pageHead("runtime", "Unable to resolve this view", "Reclose does not replace missing protocol truth with a synthetic success state.")} ${notice("Read failed", error?.message || String(error), "danger")}<p><a class="button" href="#/overview">Return to overview</a></p>`;
}
function loadingPage() {
  return `${pageHead("loading", "Reading protocol state", "The interface is waiting for its configured data source.")}<div class="grid">${panel("State", '<div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:45%;margin-top:15px"></div>', "span-8")}</div>`;
}

async function renderOverview() {
  const data = await adapter.getOverview();
  const open = data.incidents?.filter((i) => !["CLOSED", "FINAL_REJECTED", "FINAL_UNDETERMINED"].includes(incidentDisplayStatus(i))).length ?? 0;
  const failures = data.incidents?.flatMap((i) => i.trace || []).filter((t) => t.finalStatus === "FAILURE").length ?? 0;
  const metric = `<div class="metric-strip">
    <div class="metric"><span class="label">governed targets</span><span class="value">${data.targets?.length ?? "—"}</span></div>
    <div class="metric"><span class="label">open incidents</span><span class="value">${open}</span></div>
    <div class="metric"><span class="label">execution failures</span><span class="value">${failures}</span></div>
    <div class="metric"><span class="label">pending locally</span><span class="value">${state.pending.length}</span></div>
  </div>`;
  const targetRows = (data.targets || []).map((t) => `<tr><td><a href="#/targets/${encodeURIComponent(t.targetId)}"><strong>${escapeHtml(t.targetId)}</strong></a><div class="hash muted">${escapeHtml(shortHash(t.targetAddress))}</div></td><td>${stateMarker(t.assuranceState ?? t.state)}</td><td class="mono">${escapeHtml(t.activePolicyKey || "none")}</td><td>${(t.effectiveCapabilities || []).map(escapeHtml).join(", ") || "—"}</td></tr>`).join("");
  const incidentRows = (data.incidents || []).slice(0, 5).map((i) => `<tr><td><a class="hash" href="#/incidents/${encodeURIComponent(i.incidentId)}">${escapeHtml(shortHash(i.incidentId, 18, 10))}</a></td><td>${escapeHtml(i.ruleId)}</td><td>${outcomeLabel(i.finalOutcome)}</td><td class="mono">${escapeHtml(incidentDisplayStatus(i))}</td></tr>`).join("");
  const limitation = data.deployment?.liveLimitation ? notice("Known live execution limitation", data.deployment.liveLimitation, "warning") : "";
  return `${pageHead("operations", "Assurance posture", "A causal view of target state, active incidents and execution truth.", '<a class="button primary" href="#/report">Report incident</a>')}
    ${adapter.mode === "mock" ? notice("Fixture mode", adapter.meta.note, "warning") : ""}
    ${metric}${limitation}
    <div class="grid" style="margin-top:18px">
      ${panel("Targets", `<div class="table-wrap"><table><thead><tr><th>Target</th><th>State</th><th>Policy</th><th>Effective capabilities</th></tr></thead><tbody>${targetRows || '<tr><td colspan="4">No targets discovered.</td></tr>'}</tbody></table></div>`, "span-7")}
      ${panel("Recent incidents", `<div class="table-wrap"><table><thead><tr><th>Incident</th><th>Rule</th><th>Outcome</th><th>Status</th></tr></thead><tbody>${incidentRows || '<tr><td colspan="4">No incidents discovered.</td></tr>'}</tbody></table></div>`, "span-5")}
    </div>`;
}

async function renderTargets(parts) {
  if (parts[0]) return renderTargetDetail(decodeURIComponent(parts[0]));
  const items = await adapter.listTargets();
  const rows = items.map((t) => `<tr><td><a href="#/targets/${encodeURIComponent(t.targetId)}"><strong>${escapeHtml(t.targetId)}</strong></a><div class="hash muted">${escapeHtml(t.targetAddress)}</div></td><td>${stateMarker(t.assuranceState ?? t.state)}</td><td class="mono">${escapeHtml(t.activePolicyKey || "none")}</td><td>${t.authorityRevoked ? '<span class="outcome" data-outcome="REJECTED">REVOKED</span>' : "active"}</td></tr>`).join("");
  return `${pageHead("targets", "Governed systems", "Targets that have explicitly delegated bounded assurance authority.", '<a class="button primary" href="#/onboard">Onboard target</a>')}${panel("Registered targets", `<div class="table-wrap"><table><thead><tr><th>Target</th><th>Assurance state</th><th>Active policy</th><th>Authority</th></tr></thead><tbody>${rows}</tbody></table></div>`)}`;
}

async function renderTargetDetail(targetId) {
  const target = await adapter.getTarget(targetId);
  const assurance = await adapter.getAssuranceState(targetId);
  let policy = null;
  try { policy = await adapter.getPolicy(targetId); } catch {}
  const restrictions = (assurance.activeRestrictions || target.restrictions || []).map((r) => `<li><a class="hash" href="#/incidents/${encodeURIComponent(r.incidentId)}">${escapeHtml(shortHash(r.incidentId, 15, 8))}</a> · <span class="mono">${escapeHtml(r.actionType)}</span>${r.resourceId ? ` · ${escapeHtml(r.resourceId)}` : ""}</li>`).join("");
  const details = recordRows([
    ["Target address", `<span class="hash">${escapeHtml(target.targetAddress)}</span>`],
    ["Owner cache", `<span class="hash">${escapeHtml(target.cachedOwner || "unavailable")}</span>`],
    ["Active policy", `<a class="mono" href="#/policies/${encodeURIComponent(targetId)}">${escapeHtml(target.activePolicyKey || "none")}</a>`],
    ["Policy generation", `<span class="mono">${escapeHtml(target.policyGeneration ?? "unknown")}</span>`],
    ["Human override", target.humanOverrideEnabled ? "enabled · audited" : "disabled"],
    ["Authority revoked", target.authorityRevoked ? "yes" : "no"],
    ["As-of block", assurance.asOfBlock ? `<span class="mono">${assurance.asOfBlock}</span>` : '<span class="muted">not provided by current data source</span>']
  ]);
  return `${pageHead("target", targetId, "Effective authority and restrictions are derived from protocol state, not from a frontend policy engine.", `<a class="button" href="#/report?target=${encodeURIComponent(targetId)}">Report incident</a><a class="button" href="#/policies/${encodeURIComponent(targetId)}">Policy</a>`)}
    <div class="metric-strip"><div class="metric"><span class="label">assurance state</span><span class="value" style="font-size:16px">${stateMarker(target.assuranceState ?? assurance.state)}</span></div><div class="metric"><span class="label">active restrictions</span><span class="value">${assurance.activeRestrictions?.length ?? 0}</span></div><div class="metric"><span class="label">effective capabilities</span><span class="value">${assurance.effectiveCapabilities?.length ?? 0}</span></div><div class="metric"><span class="label">policy version</span><span class="value">${policy?.summary?.version ?? "—"}</span></div></div>
    <div class="grid">${panel("Identity & authority", details, "span-6")}${panel("Active reasons", restrictions ? `<ul class="trace">${restrictions}</ul>` : '<div class="empty">No active restrictions.</div>', "span-6")}</div>`;
}

async function renderIncidents(parts) {
  if (parts[0]) return renderIncidentExplorer(decodeURIComponent(parts.join("/")));
  const items = await adapter.listIncidents();
  const rows = items.map((i) => `<tr><td><a class="hash" href="#/incidents/${encodeURIComponent(i.incidentId)}">${escapeHtml(shortHash(i.incidentId, 20, 10))}</a></td><td>${escapeHtml(i.targetId)}</td><td class="mono">${escapeHtml(i.ruleId)}</td><td>${outcomeLabel(i.finalOutcome)}</td><td class="mono">${escapeHtml(incidentDisplayStatus(i))}</td><td>${formatIso(i.createdAt)}</td></tr>`).join("");
  return `${pageHead("incidents", "Incident record", "Judgment, consequence, execution and recovery remain separate all the way to the interface.", '<a class="button primary" href="#/report">Report incident</a>')}${panel("Incidents", `<div class="table-wrap"><table><thead><tr><th>Incident</th><th>Target</th><th>Rule</th><th>Outcome</th><th>Status</th><th>Observed</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No incidents discovered.</td></tr>'}</tbody></table></div>`)}`;
}

function renderTrace(trace = []) {
  if (!trace.length) return '<div class="empty">No transaction trace is available from the current adapter.</div>';
  return `<ol class="trace">${trace.map((t) => `<li class="${t.finalStatus === "FAILURE" ? "failure" : ""}"><div class="role">${escapeHtml(t.role)}</div><div class="hash">${escapeHtml(t.txId)}</div><div><span class="mono">${escapeHtml(t.rawStatus)}</span> · ${executionLabel(t.executionResult)}${t.error ? `<div class="muted">${escapeHtml(t.error)}</div>` : ""}</div></li>`).join("")}</ol>`;
}

async function renderIncidentExplorer(incidentId) {
  const incident = await adapter.getIncident(incidentId);
  const claim = recordRows([
    ["Reporter", `<span class="hash">${escapeHtml(incident.reporter)}</span>`], ["Rule", `<span class="mono">${escapeHtml(incident.ruleId)}</span>`],
    ["Affected resource", `<span class="mono">${escapeHtml(incident.resourceId || "target-wide")}</span>`], ["Evidence artifact", `<span class="hash">${escapeHtml(incident.evidenceHash)}</span>`]
  ]) + (incident.evidence?.sources ? `<div style="margin-top:16px"><span class="eyebrow">sources</span>${incident.evidence.sources.map((s) => `<div class="notice" style="margin-top:8px"><strong>${escapeHtml(s.sourceClass)}</strong><span class="hash">${escapeHtml(s.url)}</span><br><span class="muted">${escapeHtml(s.availability)} · ${escapeHtml(shortHash(s.contentHash))}</span></div>`).join("")}</div>` : "");
  const judgment = recordRows([
    ["Decision stage", `<span class="mono">${escapeHtml(incident.decisionStage || "not final")}</span>`], ["Decision outcome", outcomeLabel(incident.finalOutcome)],
    ["Condition", `<span class="mono">${escapeHtml(incident.conditionCode)}</span>`], ["Raw lifecycle", `<span class="mono">${escapeHtml(incident.judgmentTx?.rawStatus || "unavailable")}</span>`],
    ["Raw result", `<span class="mono">${escapeHtml(incident.judgmentTx?.rawResult || "unavailable")}</span>`], ["Execution result", executionLabel(incident.judgmentTx?.executionResult)]
  ]);
  const consequences = (incident.consequences || []).length ? `<div class="table-wrap"><table><thead><tr><th>Action</th><th>Resource</th><th>Stage</th><th>Execution</th></tr></thead><tbody>${incident.consequences.map((c) => `<tr><td class="mono">${escapeHtml(c.actionType)}</td><td>${escapeHtml(c.resourceId || "target-wide")}</td><td class="mono">${escapeHtml(c.stage)}</td><td class="execution" data-result="${escapeHtml(c.execution)}">${escapeHtml(c.execution)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No policy effect is represented as executed.</div>';
  const recovery = incident.recovery ? recordRows([
    ["Remediation required", incident.recovery.remediationRequired ? "yes" : "no"], ["Remediation submitted", incident.recovery.remediationSubmitted ? "yes" : "no"],
    ["Remediation decision", outcomeLabel(incident.recovery.remediationDecision)], ["Recovery validation", incident.recovery.recoveryValidated ? "validated" : "not validated"],
    ["Remaining restrictions", (incident.recovery.remainingRestrictions || []).map((r) => `<span class="mono">${escapeHtml(r)}</span>`).join(", ") || "none"]
  ]) : '<div class="empty">Recovery data unavailable.</div>';
  const traceFailure = (incident.trace || []).find((t) => t.finalStatus === "FAILURE");
  return `${pageHead("incident explorer", shortHash(incidentId, 26, 12), "The five causal bands deliberately prevent judgment, policy consequence and execution from collapsing into one status.", `<a class="button" href="#/recover/${encodeURIComponent(incidentId)}">Recovery flow</a>`)}
    ${traceFailure ? notice("Execution failure is downstream of judgment", `${traceFailure.role} finalized with ${traceFailure.executionResult}${traceFailure.error ? `: ${traceFailure.error}` : ""}. The semantic decision is not rewritten as failed.`, "danger") : ""}
    <section class="panel"><div class="causal-rail">
      <div class="causal-band"><div class="causal-index">01</div><div class="causal-content"><div class="eyebrow">claim & evidence</div><h3>${escapeHtml(incident.evidence?.subject || incident.ruleId)}</h3>${claim}</div></div>
      <div class="causal-band"><div class="causal-index">02</div><div class="causal-content"><div class="eyebrow">GenLayer judgment</div><h3>${outcomeLabel(incident.finalOutcome)} <span class="muted">· ${escapeHtml(incident.decisionStage || "pending")}</span></h3>${judgment}</div></div>
      <div class="causal-band"><div class="causal-index">03</div><div class="causal-content"><div class="eyebrow">policy consequence</div><h3>Bounded effects</h3>${consequences}</div></div>
      <div class="causal-band"><div class="causal-index">04</div><div class="causal-content"><div class="eyebrow">actual execution</div><h3>Parent / child trace</h3>${renderTrace(incident.trace)}</div></div>
      <div class="causal-band"><div class="causal-index">05</div><div class="causal-content"><div class="eyebrow">recovery</div><h3>Authority restoration</h3>${recovery}</div></div>
    </div></section>`;
}

async function renderPolicies(parts) {
  const targetId = parts[0] ? decodeURIComponent(parts[0]) : (await adapter.listTargets())[0]?.targetId;
  if (!targetId) return `${pageHead("policies", "Authority manifests", "No target was discovered.")}<div class="empty">No active target policy.</div>`;
  const policy = await adapter.getPolicy(targetId);
  let diff = null;
  try { diff = await adapter.getPolicyDiff(); } catch {}
  const rules = policy.rules.map((r) => `<tr><td class="mono">${escapeHtml(r.ruleId)}</td><td>${escapeHtml(r.ruleKind)}</td><td>${r.provisionalAllowed ? "yes" : "no"}</td><td class="hash">${escapeHtml(shortHash(r.judge))}</td><td class="mono">${escapeHtml(r.reportBond)}</td><td class="mono">${escapeHtml(r.confirmedBounty)}</td></tr>`).join("");
  const effects = policy.effects.map((e) => `<tr><td class="mono">${escapeHtml(e.actionType)}</td><td>${escapeHtml(e.resourceId || "target-wide")}</td><td class="mono">${escapeHtml(e.releasePhase)}</td><td>${e.enabled ? "enabled" : "disabled"}</td></tr>`).join("");
  const diffHtml = diff ? `<div class="authority-diff">${diff.changes.map((c) => `<div class="diff-row ${c.isExpansion ? "expand" : "reduce"}"><div class="diff-sign">${c.isExpansion ? "+" : "−"}</div><div class="mono">${escapeHtml(c.kind)}</div><div>${escapeHtml(c.description)}</div></div>`).join("")}</div>${diff.authorityExpands ? notice("Authority expands", `Activation must respect the configured delay${diff.activationDelaySeconds != null ? ` (${diff.activationDelaySeconds}s)` : ""}.`, "danger") : notice("No authority expansion", "This diff does not widen the represented authority envelope.", "success")}` : '<div class="empty">No diff adapter is available.</div>';
  return `${pageHead("policy", policy.summary.policyKey, "The active authority envelope is inspectable as rules and finite effects before any signing action.", `<a class="button" href="#/policy-author/${encodeURIComponent(targetId)}">Author / review</a>`)}
    <div class="grid">${panel("Policy identity", recordRows([["Target", escapeHtml(targetId)],["Version", `<span class="mono">${policy.summary.version}</span>`],["Manifest hash", `<span class="hash">${escapeHtml(policy.summary.manifestHash)}</span>`],["Active", policy.summary.active ? "yes" : "no"],["Human override", policy.summary.humanOverrideEnabled ? "enabled" : "disabled"]]), "span-5")}${panel("Authority diff", diffHtml, "span-7")}
      ${panel("Rules", `<div class="table-wrap"><table><thead><tr><th>Rule</th><th>Kind</th><th>Provisional</th><th>Judge</th><th>Bond</th><th>Bounty</th></tr></thead><tbody>${rules}</tbody></table></div>`, "span-12")}
      ${panel("Finite effects", `<div class="table-wrap"><table><thead><tr><th>Action</th><th>Resource</th><th>Release</th><th>Status</th></tr></thead><tbody>${effects}</tbody></table></div>`, "span-12")}
    </div>`;
}

async function renderBenchmark() {
  const b = await adapter.getBenchmark();
  return `${pageHead("release evidence", "Benchmark corpus", "Security and lifecycle scenarios are release evidence. Blocked live cases remain blocked rather than being counted as successful.")}
    <div class="metric-strip"><div class="metric"><span class="label">required</span><span class="value">${b.required}</span></div><div class="metric"><span class="label">implemented</span><span class="value">${b.implemented}</span></div><div class="metric"><span class="label">passing</span><span class="value">${b.passed}</span></div><div class="metric"><span class="label">blocked live</span><span class="value">${b.blockedLive}</span></div></div>
    ${panel("Hard release targets", `<div class="table-wrap"><table><thead><tr><th>Invariant failure class</th><th>Observed successes</th></tr></thead><tbody>${b.hardTargets.map(([name,value]) => `<tr><td>${escapeHtml(name)}</td><td class="mono">${value}</td></tr>`).join("")}</tbody></table></div>`)}
    <p class="muted">These are engineering targets in the test corpus, not a claim that the software is defect-free.</p>`;
}

async function renderSystem() {
  const d = await adapter.getDeployment();
  const contracts = d.contracts ? Object.entries(d.contracts).map(([name,address]) => `<tr><td>${escapeHtml(name)}</td><td class="hash">${escapeHtml(address)}</td></tr>`).join("") : "";
  return `${pageHead("system", "Runtime & deployment", "Network, implementation identity and known live limitations are first-class product state.")}
    ${adapter.mode === "mock" ? notice("Fixture mode", "Deployment values below are release-evidence fixtures. The page does not claim a current RPC read.", "warning") : ""}
    ${d.liveLimitation ? notice("Open live limitation", d.liveLimitation, "danger") : ""}
    <div class="grid">${panel("Network", recordRows([["Network", `<span class="mono">${escapeHtml(d.network || NETWORK_NAME)}</span>`],["Chain ID", `<span class="mono">${escapeHtml(d.chainId || CHAIN_ID)}</span>`],["Evidence commit", `<span class="hash">${escapeHtml(d.commit || "unavailable")}</span>`],["Last evidence", formatIso(d.lastEvidenceAt)]]), "span-5")}${panel("Contracts", contracts ? `<div class="table-wrap"><table><tbody>${contracts}</tbody></table></div>` : '<div class="empty">No deployment manifest adapter.</div>', "span-7")}</div>
    <div style="margin-top:18px">${panel("Truth model", recordRows([["Transaction", "raw GenLayer lifecycle is always retained"],["Decision", "CONFIRMED / REJECTED / UNDETERMINED"],["Stage", "PROVISIONAL / FINAL"],["Execution", "SUCCESS / FAILURE / UNKNOWN, derived from execution result"],["Post-state", "must be proven where required; unavailable is not success"]]))}</div>`;
}

function queryParams() {
  const hash = location.hash;
  const idx = hash.indexOf("?");
  return new URLSearchParams(idx >= 0 ? hash.slice(idx + 1) : "");
}

/**
 * A3-H11: the ordinary report path must select rule/resource from the ACTIVE governed policy,
 * not arbitrary free text. When a target is known (via ?target=), the rule/resource selects are
 * populated from that target's real active policy (rules[].ruleId / effects[].resourceId) - the
 * only "expert" path left is typing an unlisted target ID, which the SDK itself then verifies
 * (buildIncidentReport throws if the rule is not active for that target) before any preview/sign
 * step, per FINAL_REMEDIATION.md Section 12 ("verify every ID against protocol state before
 * preparing or signing").
 */
async function renderReport() {
  const params = queryParams();
  const target = params.get("target") || "";
  let policy = null;
  let policyError = null;
  if (target) {
    try { policy = await adapter.getPolicy(target); } catch (error) { policyError = error.message; }
  }
  const ruleOptions = policy?.rules?.length
    ? policy.rules.map((r) => `<option value="${escapeHtml(r.ruleId)}">${escapeHtml(r.ruleId)}</option>`).join("")
    : `<option>PROVIDER_COMPROMISE_V1</option><option>SERVICE_FAILURE_V1</option>`;
  const resourceIds = policy?.effects?.length ? [...new Set(policy.effects.map((e) => e.resourceId).filter(Boolean))] : [];
  const resourceField = resourceIds.length
    ? `<select id="report-resource" name="resourceId">${resourceIds.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("")}</select>`
    : `<input id="report-resource" name="resourceId" value="provider_a" required>`;
  const governedNotice = target
    ? (policy
        ? notice("Governed selection", `Rule and resource options below are the ${policy.rules.length} rule(s) and ${resourceIds.length} resource(s) actually active in policy ${policy.summary.policyKey} for ${target}.`, "success")
        : notice("No active policy found", policyError || `Could not resolve an active policy for ${target} - free-text fields below will be independently verified against protocol state before signing.`, "warning"))
    : notice("No target selected", "Enter a target ID to load its governed rules/resources, or the SDK will verify your selection against protocol state before signing.", "warning");
  return `${pageHead("write flow", "Report incident", "Evidence is built and fee/bond requirements are previewed before any signing step.")}
    ${adapter.mode === "mock" ? notice("No mock writes", "Fixture mode can preview this flow but will never fabricate a submitted transaction.", "warning") : ""}
    ${governedNotice}
    <div class="grid">${panel("Incident report", `<form id="incident-form" novalidate>
      <div id="incident-errors" class="error-summary" hidden></div>
      <div class="field"><label for="report-target">Target ID</label><input id="report-target" name="targetId" value="${escapeHtml(target)}" required autocomplete="off"></div>
      <div class="field"><label for="report-rule">Rule</label><select id="report-rule" name="ruleId">${ruleOptions}</select></div>
      <div class="field"><label for="report-resource">Affected resource</label>${resourceField}</div>
      <div class="field"><label for="report-url">Evidence URL</label><input id="report-url" name="url" type="url" value="https://status.example.com/incident" required><span class="hint">Public HTTPS only. Evidence content is never rendered as HTML.</span></div>
      <div class="field"><label for="report-class">Source class</label><select id="report-class" name="sourceClass"><option>AUTHORITATIVE_PUBLIC</option><option>INDEPENDENT_PUBLIC</option><option>ONCHAIN</option><option>CONTENT_ADDRESSED_SNAPSHOT</option></select></div>
      <div class="form-actions"><button class="button primary" type="submit">Preview fee & bond</button></div>
    </form>`, "span-7")}${panel("Signing boundary", `<div id="incident-preview" class="empty">No fee preview yet.</div>`, "span-5")}</div>`;
}

async function renderRecovery(parts) {
  const incidentId = parts[0] ? decodeURIComponent(parts.join("/")) : "";
  return `${pageHead("recovery", "Submit remediation / recovery", "Recovery is a first-class evidence and judgment flow. Authority is not restored by a frontend toggle.")}
    <div class="grid">${panel("Recovery evidence", `<form id="recovery-form" novalidate>
      <div id="recovery-errors" class="error-summary" hidden></div>
      <div class="field"><label for="recovery-incident">Parent incident</label><input id="recovery-incident" name="incidentId" value="${escapeHtml(incidentId)}" required></div>
      <div class="field"><label for="recovery-url">Remediation evidence URL</label><input id="recovery-url" name="url" type="url" value="https://status.example.com/remediation" required></div>
      <div class="field"><label for="recovery-class">Source class</label><select id="recovery-class" name="sourceClass"><option>AUTHORITATIVE_PUBLIC</option><option>INDEPENDENT_PUBLIC</option></select></div>
      <div class="form-actions"><button class="button primary" type="submit">Preview recovery transaction</button></div>
    </form>`, "span-7")}${panel("Recovery boundary", '<div id="recovery-preview" class="empty">Restoration requires a final recovery validation decision and the absence of conflicting restrictions.</div>', "span-5")}</div>`;
}

async function renderOnboard() {
  return `${pageHead("write flow", "Onboard target", "Registration succeeds only when the target independently reports the same owner, controller and target ID.")}
    ${adapter.mode === "mock" ? notice("No mock writes", "Fixture mode can preview this flow but will never fabricate a submitted transaction.", "warning") : ""}
    <div class="grid">${panel("Target handshake", `<form id="onboard-form" novalidate>
      <div id="onboard-errors" class="error-summary" hidden></div>
      <div class="field"><label for="onboard-id">Target ID</label><input id="onboard-id" name="targetId" required autocomplete="off"></div>
      <div class="field"><label for="onboard-address">Target address</label><input id="onboard-address" name="targetAddress" pattern="^0x[a-fA-F0-9]{40}$" required></div>
      <div class="field"><label for="onboard-override">Human override</label><select id="onboard-override" name="humanOverrideEnabled"><option value="false">Disabled</option><option value="true">Enabled</option></select></div>
      <fieldset><legend>Authority acknowledgement</legend><label><input style="width:auto;min-height:auto" type="checkbox" name="ack" required> I understand registration does not grant arbitrary execution. The target must already recognise the Kernel through its narrow assurance-controller interface.</label></fieldset>
      <div class="form-actions"><button class="button primary" type="submit">Preview registration</button></div>
    </form>`, "span-7")}${panel("Signing boundary", `<div id="onboard-preview" class="empty">No registration preview yet.</div>`, "span-5")}</div>`;
}

async function renderPolicyAuthor(parts) {
  const targetId = parts[0] ? decodeURIComponent(parts[0]) : "";
  let diff = null; try { diff = await adapter.getPolicyDiff(); } catch {}
  return `${pageHead("write flow", "Author & review policy", "Policy activation is a security boundary. Authority expansion is explicit and delayed.")}
    <div class="grid">${panel("Manifest", `<form id="policy-form"><div class="field"><label for="policy-target">Target ID</label><input id="policy-target" value="${escapeHtml(targetId)}" required></div><div class="field"><label for="policy-json">Canonical APM</label><textarea id="policy-json" spellcheck="false" aria-describedby="policy-hint">{\n  "schema": "reclose-apm/1",\n  "policyId": "new-policy",\n  "version": 1\n}</textarea><span class="hint" id="policy-hint">The production compiler validates the full governed APM shape and hashes RFC8785/JCS with Keccak-256.</span></div><div class="form-actions"><button class="button" type="button" data-action="policy-review">Validate & diff</button></div></form>`, "span-7")}${panel("Authority review", diff ? `<div class="authority-diff">${diff.changes.map(c => `<div class="diff-row ${c.isExpansion ? "expand" : "reduce"}"><div class="diff-sign">${c.isExpansion ? "+" : "−"}</div><div class="mono">${escapeHtml(c.kind)}</div><div>${escapeHtml(c.description)}</div></div>`).join("")}</div>${notice("Signing consequence", diff.authorityExpands ? "This change expands authority and is timelocked. Review every added action, resource and Judge before signing." : "No expansion is represented in this fixture diff.", diff.authorityExpands ? "danger" : "success")}` : '<div class="empty">Diff unavailable.</div>', "span-5")}</div>`;
}

async function renderPending() {
  state.pending = pendingStore.loadAll();
  const body = state.pending.length ? `<div class="table-wrap"><table><thead><tr><th>Transaction</th><th>Incident</th><th>Kind</th><th>Persisted</th></tr></thead><tbody>${state.pending.map((p) => `<tr><td class="hash">${escapeHtml(p.txId)}</td><td class="hash">${p.incidentId ? escapeHtml(p.incidentId) : '<span class="muted">not yet known</span>'}</td><td>${escapeHtml(p.kind || "write")}</td><td>${formatIso(p.persistedAt)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No pending transaction IDs are persisted in this browser.</div>';
  return `${pageHead("transaction tracker", "Pending writes", "Transaction IDs are persisted immediately. Polling errors never trigger blind resubmission.")}${panel("Local resume queue", body)}`;
}

async function routeContent(route, parts) {
  switch (route) {
    case "overview": return renderOverview();
    case "targets": return renderTargets(parts);
    case "incidents": return renderIncidents(parts);
    case "policies": return renderPolicies(parts);
    case "benchmark": return renderBenchmark();
    case "system": return renderSystem();
    case "report": return renderReport();
    case "recover": return renderRecovery(parts);
    case "onboard": return renderOnboard();
    case "policy-author": return renderPolicyAuthor(parts);
    case "pending": return renderPending();
    default: return `${pageHead("404", "Route not found", "The requested product surface does not exist.")}<a class="button" href="#/overview">Overview</a>`;
  }
}

function currentRouteForNav(route) {
  if (["report", "recover"].includes(route)) return "incidents";
  if (route === "onboard") return "targets";
  if (route === "policy-author") return "policies";
  return route;
}

async function render() {
  const { route, parts } = routeFromHash();
  state.loading = true;
  state.error = null;
  app.innerHTML = shell(loadingPage(), currentRouteForNav(route));
  bindShellEvents();
  try {
    const content = await routeContent(route, parts);
    state.lastRender = { route, parts };
    app.innerHTML = shell(content, currentRouteForNav(route));
    bindEvents();
    document.title = `Reclose · ${route.replaceAll("-", " ")}`;
    requestAnimationFrame(() => document.getElementById("main")?.focus({ preventScroll: true }));
  } catch (error) {
    state.error = error;
    app.innerHTML = shell(errorPage(error), currentRouteForNav(route));
    bindEvents();
  } finally {
    state.loading = false;
  }
}

function formError(id, messages) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!messages.length) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  el.innerHTML = `<strong>Review required</strong><ul>${messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`;
  el.focus?.();
}

async function handleIncidentSubmit(event) {
  event.preventDefault();
  invalidateDraft("incident");
  const form = event.currentTarget;
  const data = new FormData(form);
  const input = Object.fromEntries(data.entries());
  const errors = [];
  if (!input.targetId) errors.push("Target ID is required.");
  try { const u = new URL(input.url); if (u.protocol !== "https:") errors.push("Evidence URL must use HTTPS."); } catch { errors.push("Evidence URL is invalid."); }
  formError("incident-errors", errors);
  if (errors.length) return;
  const preview = await adapter.previewIncident({ targetId: input.targetId, ruleId: input.ruleId, resourceId: input.resourceId, evidenceSources: [{ sourceId: "user-source-1", url: input.url, sourceClass: input.sourceClass, fetchedAt: new Date().toISOString(), availability: "AVAILABLE" }] });
  const el = document.getElementById("incident-preview");
  el.className = "";
  // A3-H01: the draft registered here is EXACTLY `preview.draft` - the same object rendered
  // below - and is the ONLY object submitLiveWrite will ever pass to the writer.
  draftRegistry.registerDraft("incident", preview.draft);
  invalidateDraftOnEdit(form, "incident");
  const draftHtml = preview.draft?.reviewHash
    ? recordRows([
        ["Contract", `<span class="hash">${escapeHtml(preview.draft.contractAddress)}</span>`],
        ["Method", `<span class="mono">${escapeHtml(preview.draft.functionName)}</span>`],
        ["Review hash", `<span class="hash">${escapeHtml(preview.draft.reviewHash)}</span>`],
      ])
    : "";
  el.innerHTML = `${recordRows([["Network", `<span class="mono">${preview.network} · ${preview.chainId}</span>`],["Estimated fee", `<span class="mono">${escapeHtml(preview.estimatedFeeValueWei)} wei</span>`],["Reporter bond", `<span class="mono">${escapeHtml(preview.bondWei ?? "0")} wei</span>`],["Estimate", preview.isEstimate ? "yes · may change" : "no"]])}${draftHtml}${preview.synthetic ? notice("Preview only", "Fixture mode will not sign or submit this report.", "warning") : '<button class="button primary" type="button" data-action="submit-incident">Sign & submit</button>'}`;
  setLiveMessage("Incident fee and bond preview ready. The exact reviewed draft will be signed.");
  bindDynamicButtons();
}

async function handleRecoverySubmit(event) {
  event.preventDefault();
  invalidateDraft("recovery");
  const form = event.currentTarget;
  const data = new FormData(form);
  const input = Object.fromEntries(data.entries());
  const errors = [];
  if (!input.incidentId) errors.push("Parent incident is required.");
  try { const u = new URL(input.url); if (u.protocol !== "https:") errors.push("Evidence URL must use HTTPS."); } catch { errors.push("Evidence URL is invalid."); }
  formError("recovery-errors", errors);
  if (errors.length) return;
  const preview = await adapter.previewRecovery({ incidentId: input.incidentId, evidenceSources: [{ sourceId: "recovery-source-1", url: input.url, sourceClass: input.sourceClass, fetchedAt: new Date().toISOString(), availability: "AVAILABLE" }] });
  const el = document.getElementById("recovery-preview");
  el.className = "";
  draftRegistry.registerDraft("recovery", preview.draft);
  invalidateDraftOnEdit(form, "recovery");
  const draftHtml = preview.draft?.reviewHash
    ? recordRows([
        ["Contract", `<span class="hash">${escapeHtml(preview.draft.contractAddress)}</span>`],
        ["Method", `<span class="mono">${escapeHtml(preview.draft.functionName)}</span>`],
        ["Review hash", `<span class="hash">${escapeHtml(preview.draft.reviewHash)}</span>`],
      ])
    : "";
  el.innerHTML = `${recordRows([["Network", `<span class="mono">${preview.network} · ${preview.chainId}</span>`],["Estimated fee", `<span class="mono">${escapeHtml(preview.estimatedFeeValueWei)} wei</span>`],["Estimate", preview.isEstimate ? "yes · may change" : "no"]])}${draftHtml}${preview.synthetic ? notice("Preview only", "Fixture mode cannot fabricate a recovery transaction.", "warning") : '<button class="button primary" type="button" data-action="submit-recovery">Sign & submit recovery</button>'}`;
  setLiveMessage("Recovery transaction preview ready. The exact reviewed draft will be signed.");
  bindDynamicButtons();
}

async function handleOnboardSubmit(event) {
  event.preventDefault();
  invalidateDraft("registerTarget");
  const form = event.currentTarget;
  const data = new FormData(form);
  const input = Object.fromEntries(data.entries());
  const errors = [];
  if (!input.targetId) errors.push("Target ID is required.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.targetAddress || "")) errors.push("Target address must be a 0x-prefixed 20-byte address.");
  formError("onboard-errors", errors);
  if (errors.length) return;
  const preview = await adapter.previewRegistration({ targetId: input.targetId, targetAddress: input.targetAddress, humanOverrideEnabled: input.humanOverrideEnabled === "true" });
  const el = document.getElementById("onboard-preview");
  el.className = "";
  draftRegistry.registerDraft("registerTarget", preview.draft);
  invalidateDraftOnEdit(form, "registerTarget");
  const draftHtml = preview.draft?.reviewHash
    ? recordRows([
        ["Contract", `<span class="hash">${escapeHtml(preview.draft.contractAddress)}</span>`],
        ["Method", `<span class="mono">${escapeHtml(preview.draft.functionName)}</span>`],
        ["Review hash", `<span class="hash">${escapeHtml(preview.draft.reviewHash)}</span>`],
      ])
    : "";
  el.innerHTML = `${recordRows([["Network", `<span class="mono">${preview.network} · ${preview.chainId}</span>`],["Estimated fee", `<span class="mono">${escapeHtml(preview.estimatedFeeValueWei)} wei</span>`],["Estimate", preview.isEstimate ? "yes · may change" : "no"]])}${draftHtml}${preview.synthetic ? notice("Preview only", "Fixture mode cannot fabricate a registration transaction.", "warning") : '<button class="button primary" type="button" data-action="submit-registerTarget">Sign & submit registration</button>'}`;
  setLiveMessage("Registration preview ready. The exact reviewed draft will be signed.");
  bindDynamicButtons();
}

async function submitLiveWrite(kind) {
  const draft = draftRegistry.getDraft(kind);
  if (!draft) {
    setLiveMessage("No reviewed draft is available. Preview the write again before signing.");
    alert("No reviewed draft is available. Preview the write again before signing.");
    return;
  }
  try {
    // A3-H01: pass EXACTLY the previewed/reviewed draft - never an empty or reconstructed object.
    const result = await adapter.submitWrite(kind, draft);
    if (!result?.txId) throw new Error("Writer returned no transaction ID");
    // A3-H12: persist the transaction ID immediately, AND the associated incident identity the
    // moment it is known (either deterministically derivable or returned by the writer) - a
    // reload must never lose either identity or cause a resubmission.
    const record = { txId: result.txId, kind, incidentId: result.incidentId ?? null };
    draftRegistry.invalidateDraft(kind);
    await persistThenTrack(pendingStore, record, globalThis.__RECLOSE_PRODUCT_RUNTIME__?.trackTransaction, ({ phase }) => setLiveMessage(`Transaction ${phase}: ${shortHash(result.txId)}`));
    state.pending = pendingStore.loadAll();
    location.hash = "#/pending";
  } catch (error) {
    setLiveMessage(`Submission failed: ${error.message}`);
    alert(`Submission failed: ${error.message}`);
  }
}

function bindDynamicButtons() {
  document.querySelector('[data-action="submit-incident"]')?.addEventListener("click", () => submitLiveWrite("incident"));
  document.querySelector('[data-action="submit-recovery"]')?.addEventListener("click", () => submitLiveWrite("recovery"));
  document.querySelector('[data-action="submit-registerTarget"]')?.addEventListener("click", () => submitLiveWrite("registerTarget"));
}

function bindShellEvents() {
  document.querySelector('[data-action="toggle-nav"]')?.addEventListener("click", () => {
    state.navOpen = !state.navOpen;
    document.querySelector(".rail")?.setAttribute("data-open", String(state.navOpen));
    document.querySelector('[data-action="toggle-nav"]')?.setAttribute("aria-expanded", String(state.navOpen));
  });
}

function bindEvents() {
  bindShellEvents();
  document.getElementById("incident-form")?.addEventListener("submit", handleIncidentSubmit);
  document.getElementById("recovery-form")?.addEventListener("submit", handleRecoverySubmit);
  document.getElementById("onboard-form")?.addEventListener("submit", handleOnboardSubmit);
  document.querySelector('[data-action="policy-review"]')?.addEventListener("click", () => setLiveMessage("Policy review uses canonical compiler validation in live integration. No activation has been submitted."));
  bindDynamicButtons();
}

window.addEventListener("hashchange", () => { state.navOpen = false; render(); });
if (!location.hash) location.hash = "#/overview";
else render();
