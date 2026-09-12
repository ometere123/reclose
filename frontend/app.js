import {
  createDraftRegistry, escapeHtml, executionLabel, formatIso, incidentDisplayStatus, outcomeLabel,
  recordRows, routeFromHash, setLiveMessage, shortHash, stateMarker, CHAIN_ID, NETWORK_NAME
} from "./lib/domain.js";
import { selectProductAdapter } from "./lib/adapters.js";
import { PendingTransactionStore, persistThenTrack } from "./lib/persistence.js";
import { connectBrowserWallet, switchToStudioDev, walletProviderAvailable } from "./lib/wallet.js";
import { createGenLayerWriter } from "./lib/genlayerWriter.js";

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
  lastRender: null,
  /** Real connected browser wallet identity (address + live chain ID) - null until
   * connectBrowserWallet() succeeds. This is the reporterAddress every write preview now binds
   * to; there is no other path to a reporter identity in the browser. */
  wallet: null,
  /** Sequential policy construction/activation journey state - see renderPolicyJourneyStep. */
  policyJourney: null,
  /** The currently-confirmed reporter bond for the report form's selected rule, if one was
   * opened this session - see renderBondGate/handleOpenBondSubmit. */
  openedBond: null
};

/**
 * A3-H01: the single canonical prepared-write registry (see domain.js::createDraftRegistry for
 * the pure, unit-tested invalidation behaviour). The object passed to the writer at submit time
 * is always exactly `draftRegistry.getDraft(kind)` - never a caller-reconstructed or empty object.
 */
const draftRegistry = createDraftRegistry();

const PREVIEW_ELEMENT_IDS = {
  incident: "incident-preview", recovery: "recovery-preview", registerTarget: "onboard-preview",
  revokeAuthority: "revoke-preview", disableAction: "disable-action-preview", disableResource: "disable-resource-preview"
};

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
          ${walletChip()}
        </div>
        <a class="button" href="#/system">Runtime truth</a>
      </header>
      <main id="main" tabindex="-1">${content}</main>
      <footer class="footer"><span>Reclose · GenLayer judgment, deterministic consequence.</span><span>Accepted ≠ final · Finalized ≠ execution success</span></footer>
    </div>`;
}

/**
 * Real browser wallet connection state, rendered in every page's shell (not just the write
 * flows) - independent-audit finding: no connect-wallet control existed anywhere in the product,
 * so reporterAddress was structurally unobtainable. Shows the actual connected address/chain when
 * connected (with an explicit wrong-network warning if the connected chain isn't 61997), a real
 * "Connect wallet" button when a provider is present but not yet connected, or an honest
 * "No wallet provider detected" notice when none is (never a button that could never succeed).
 */
function walletChip() {
  if (state.wallet) {
    const wrongNetwork = state.wallet.chainId !== CHAIN_ID;
    const status = `<span class="network-chip" data-action="wallet-status" title="${escapeHtml(state.wallet.address)}">${wrongNetwork ? "WRONG NETWORK · " : ""}${escapeHtml(shortHash(state.wallet.address, 6, 4))} · chain ${escapeHtml(state.wallet.chainId)}</span>`;
    return wrongNetwork ? `${status} <button class="button" type="button" data-action="switch-network">Switch network</button>` : status;
  }
  if (!walletProviderAvailable()) return `<span class="muted" style="font-size:11px">No wallet provider detected</span>`;
  return `<button class="button" type="button" data-action="connect-wallet">Connect wallet</button>`;
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
  const ownerControls = `
    <div class="field-row" style="display:flex;gap:12px;flex-wrap:wrap">
      <form id="revoke-form" data-target="${escapeHtml(targetId)}" novalidate style="flex:1;min-width:220px">
        <fieldset><legend>Revoke authority</legend><p class="muted" style="font-size:12px">Immediate, authority-reducing, non-value-moving (Kernel <span class="mono">revoke_authority</span>).</p>
        <div class="form-actions"><button class="button" type="submit">Preview revocation</button></div></form>
        <div id="revoke-preview" class="empty">No revocation preview yet.</div>
      </form>
      <form id="disable-action-form" data-target="${escapeHtml(targetId)}" novalidate style="flex:1;min-width:220px">
        <fieldset><legend>Disable action</legend><div class="field"><label for="disable-action-type">Action type ordinal</label><input id="disable-action-type" name="actionType" type="number" min="0" max="10" value="8" required></div>
        <div class="form-actions"><button class="button" type="submit">Preview disable</button></div></fieldset>
        <div id="disable-action-preview" class="empty">No disable-action preview yet.</div>
      </form>
      <form id="disable-resource-form" data-target="${escapeHtml(targetId)}" novalidate style="flex:1;min-width:220px">
        <fieldset><legend>Disable resource</legend><div class="field"><label for="disable-resource-id">Resource ID</label><input id="disable-resource-id" name="resourceId" value="provider_a" required></div>
        <div class="form-actions"><button class="button" type="submit">Preview disable</button></div></fieldset>
        <div id="disable-resource-preview" class="empty">No disable-resource preview yet.</div>
      </form>
    </div>`;
  return `${pageHead("target", targetId, "Effective authority and restrictions are derived from protocol state, not from a frontend policy engine.", `<a class="button" href="#/report?target=${encodeURIComponent(targetId)}">Report incident</a><a class="button" href="#/policies/${encodeURIComponent(targetId)}">Policy</a>`)}
    <div class="metric-strip"><div class="metric"><span class="label">assurance state</span><span class="value" style="font-size:16px">${stateMarker(target.assuranceState ?? assurance.state)}</span></div><div class="metric"><span class="label">active restrictions</span><span class="value">${assurance.activeRestrictions?.length ?? 0}</span></div><div class="metric"><span class="label">effective capabilities</span><span class="value">${assurance.effectiveCapabilities?.length ?? 0}</span></div><div class="metric"><span class="label">policy version</span><span class="value">${policy?.summary?.version ?? "—"}</span></div></div>
    <div class="grid">${panel("Identity & authority", details, "span-6")}${panel("Active reasons", restrictions ? `<ul class="trace">${restrictions}</ul>` : '<div class="empty">No active restrictions.</div>', "span-6")}
    ${panel("Owner bounded controls", ownerControls, "span-12")}</div>`;
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
const unknownOrYesNo = (value) => value === null || value === undefined ? '<span class="muted">unknown</span>' : value ? "yes" : "no";
  const recovery = incident.recovery ? recordRows([
    ["Remediation required", unknownOrYesNo(incident.recovery.remediationRequired)], ["Remediation submitted", unknownOrYesNo(incident.recovery.remediationSubmitted)],
    ["Remediation decision", outcomeLabel(incident.recovery.remediationDecision)], ["Recovery validation", unknownOrYesNo(incident.recovery.recoveryValidated)],
    ["Remaining restrictions", (incident.recovery.remainingRestrictions || []).map((r) => `<span class="mono">${escapeHtml(r)}</span>`).join(", ") || "none"]
  ]) + (incident.recovery.protocolReadLimitation ? notice("Protocol read limitation", incident.recovery.protocolReadLimitation, "warning") : "") : '<div class="empty">Recovery data unavailable.</div>';
  const traceFailure = (incident.trace || []).find((t) => t.finalStatus === "FAILURE");
  window.__RECLOSE_LAST_INCIDENT__ = incident;
  return `${pageHead("incident explorer", shortHash(incidentId, 26, 12), "The five causal bands deliberately prevent judgment, policy consequence and execution from collapsing into one status.", `<a class="button" href="#/recover/${encodeURIComponent(incidentId)}">Recovery flow</a><button class="button" type="button" data-action="export-audit-trail">Export audit trail</button>`)}
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
    ? policy.rules.filter((r) => r.enabled).map((r) => `<option value="${escapeHtml(r.ruleId)}">${escapeHtml(r.ruleId)}</option>`).join("")
    : `<option>PROVIDER_COMPROMISE_V1</option><option>SERVICE_FAILURE_V1</option>`;
  // Resources are filtered PER RULE (using each effect's real ruleId, not a rule-agnostic union) -
  // `ruleResourceMap` drives a live resource-select refresh when the rule changes (wired in
  // bindEvents via handleReportRuleChange), so a reviewer can never submit a resourceId the SDK
  // would reject for the chosen rule. A target-wide effect (resourceId === "") surfaces as the
  // literal option value "" labeled "(target-wide)".
  const ruleResourceMap = {};
  if (policy?.effects?.length) {
    for (const e of policy.effects) {
      if (!e.enabled) continue;
      (ruleResourceMap[e.ruleId] ??= new Set()).add(e.resourceId);
    }
    for (const k of Object.keys(ruleResourceMap)) ruleResourceMap[k] = [...ruleResourceMap[k]];
  }
  // FINAL_REMEDIATION.md Section 5: the non-zero Reporter bond journey. ruleBondMap lets the
  // report form know, per rule, whether a Vault bond must be opened (and verified) before an
  // incident preview is even attempted - a bonded report is never presented as signable without
  // a confirmed open bond.
  const ruleBondMap = {};
  for (const r of policy?.rules?.filter((r) => r.enabled) ?? []) ruleBondMap[r.ruleId] = r.reportBond;
  const firstRuleId = policy?.rules?.find((r) => r.enabled)?.ruleId ?? "";
  const initialResourceIds = ruleResourceMap[firstRuleId] ?? [];
  const resourceOptionsHtml = (ids) => ids.length
    ? ids.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r || "(target-wide)")}</option>`).join("")
    : `<option value="">No governed resource for this rule</option>`;
  const resourceField = policy
    ? `<select id="report-resource" name="resourceId">${resourceOptionsHtml(initialResourceIds)}</select>`
    : `<input id="report-resource" name="resourceId" value="provider_a" required>`;
  const governedNotice = target
    ? (policy
        ? notice("Governed selection", `Rule and resource options below are the ${policy.rules.filter((r) => r.enabled).length} enabled rule(s) and their real per-rule effect resources in policy ${policy.summary.policyKey} for ${target}. Changing the rule refreshes the resource list to match.`, "success")
        : notice("No active policy found", policyError || `Could not resolve an active policy for ${target} - free-text fields below will be independently verified against protocol state before signing.`, "warning"))
    : notice("No target selected", "Enter a target ID to load its governed rules/resources, or the SDK will verify your selection against protocol state before signing.", "warning");
  return `${pageHead("write flow", "Report incident", "Evidence is built and fee/bond requirements are previewed before any signing step.")}
    ${adapter.mode === "mock" ? notice("No mock writes", "Fixture mode can preview this flow but will never fabricate a submitted transaction.", "warning") : ""}
    ${governedNotice}
    <div class="grid">${panel("Incident report", `<form id="incident-form" novalidate data-rule-resource-map='${escapeHtml(JSON.stringify(ruleResourceMap))}' data-rule-bond-map='${escapeHtml(JSON.stringify(ruleBondMap))}'>
      <div id="incident-errors" class="error-summary" hidden></div>
      <div class="field"><label for="report-target">Target ID</label><input id="report-target" name="targetId" value="${escapeHtml(target)}" required autocomplete="off"></div>
      <div class="field"><label for="report-rule">Rule</label><select id="report-rule" name="ruleId">${ruleOptions}</select></div>
      <div class="field"><label for="report-resource">Affected resource</label>${resourceField}</div>
      <div class="field"><label for="report-url">Evidence URL</label><input id="report-url" name="url" type="url" value="https://status.example.com/incident" required><span class="hint">Public HTTPS only. Evidence content is never rendered as HTML.</span></div>
      <div class="field"><label for="report-class">Source class</label><select id="report-class" name="sourceClass"><option>AUTHORITATIVE_PUBLIC</option><option>INDEPENDENT_PUBLIC</option><option>ONCHAIN</option><option>CONTENT_ADDRESSED_SNAPSHOT</option></select></div>
      <div id="bond-gate"></div>
      <div class="form-actions"><button class="button primary" type="submit">Preview fee & bond</button></div>
    </form>`, "span-7")}${panel("Signing boundary", `<div id="incident-preview" class="empty">No fee preview yet.</div>`, "span-5")}</div>`;
}

/** FINAL_REMEDIATION.md Section 5: renders the bond gate for the currently selected rule. A
 * non-zero-bond rule shows an "Open reporter bond" control and BLOCKS the incident preview
 * (handleIncidentSubmit checks `state.openedBond`) until that bond is signed and its real bondId
 * captured. Zero-bond rules render nothing - they remain the direct path. */
function renderBondGate() {
  const form = document.getElementById("incident-form");
  const gate = document.getElementById("bond-gate");
  if (!form || !gate) return;
  const map = JSON.parse(form.dataset.ruleBondMap || "{}");
  const ruleId = document.getElementById("report-rule")?.value;
  const reportBond = map[ruleId] ?? "0";
  if (!ruleId || BigInt(reportBond || "0") <= 0n) { gate.innerHTML = ""; state.openedBond = null; return; }
  if (state.openedBond?.ruleId === ruleId) {
    gate.innerHTML = notice("Reporter bond open", `Bond ${state.openedBond.bondId} confirmed (tx ${shortHash(state.openedBond.txId)}). This report will reference it.`, "success");
    return;
  }
  gate.innerHTML = `${notice("Reporter bond required", `This rule requires a ${reportBond} wei bond. Open it before the incident can be previewed - a bonded report is never signable without a confirmed open bond.`, "warning")}<button class="button" type="button" data-action="open-bond">Open reporter bond</button><div id="bond-preview" class="empty">No bond preview yet.</div>`;
  document.querySelector('[data-action="open-bond"]')?.addEventListener("click", handleOpenBondSubmit);
}

async function handleOpenBondSubmit() {
  const targetId = document.getElementById("report-target")?.value || "";
  const ruleId = document.getElementById("report-rule")?.value || "";
  const el = document.getElementById("bond-preview");
  if (!state.wallet?.address) { el.innerHTML = notice("Wallet required", "Connect a wallet first - the bond is opened by the reporter's own account.", "danger"); return; }
  try {
    const preview = await adapter.previewOpenBond({ targetId, ruleId, reporterAddress: state.wallet.address });
    el.className = "";
    draftRegistry.registerDraft("openBond", preview.draft);
    el.innerHTML = `${renderPreparedWriteFields(preview.draft)}<button class="button primary" type="button" data-action="submit-openBond">Sign & open bond</button>`;
    document.querySelector('[data-action="submit-openBond"]')?.addEventListener("click", async () => {
      const draft = draftRegistry.getDraft("openBond");
      const ok = await submitLiveWriteReturningTxId("openBond");
      if (ok) {
        state.openedBond = { ruleId, bondId: draft.args[0], txId: ok };
        renderBondGate();
      }
    });
  } catch (error) {
    el.className = "";
    el.innerHTML = notice("Bond preview unavailable", error.message, "danger");
  }
}

/** Like submitLiveWrite, but for the bond step specifically: stays on this page (never navigates
 * to #/pending) and returns the confirmed txId so the bond gate can capture it. */
async function submitLiveWriteReturningTxId(kind) {
  const draft = draftRegistry.getDraft(kind);
  if (!draft) return null;
  try {
    const result = await adapter.submitWrite(kind, draft);
    if (!result?.txId) throw new Error("Writer returned no transaction ID");
    draftRegistry.invalidateDraft(kind);
    await persistThenTrack(pendingStore, { txId: result.txId, kind, incidentId: null }, globalThis.__RECLOSE_PRODUCT_RUNTIME__?.trackTransaction, ({ phase }) => setLiveMessage(`Bond transaction ${phase}: ${shortHash(result.txId)}`));
    state.pending = pendingStore.loadAll();
    return result.txId;
  } catch (error) {
    setLiveMessage(`Bond submission failed: ${error.message}`);
    alert(`Bond submission failed: ${error.message}`);
    return null;
  }
}

/** Refreshes `#report-resource`'s options to exactly the resources the NEWLY selected rule
 * actually governs, read from the same ruleResourceMap the page was rendered with (no re-fetch,
 * no drift from what renderReport already loaded). */
function handleReportRuleChange(event) {
  const form = event.currentTarget.closest("form");
  const map = JSON.parse(form.dataset.ruleResourceMap || "{}");
  const ids = map[event.currentTarget.value] ?? [];
  const select = document.getElementById("report-resource");
  if (select && select.tagName === "SELECT") {
    select.innerHTML = ids.length
      ? ids.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r || "(target-wide)")}</option>`).join("")
      : `<option value="">No governed resource for this rule</option>`;
  }
  renderBondGate();
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
  return `${pageHead("write flow", "Author & review policy", "Policy activation is a security boundary. Authority expansion is explicit and delayed.")}
    <div class="grid">${panel("Manifest", `<form id="policy-form"><div class="field"><label for="policy-target">Target ID</label><input id="policy-target" value="${escapeHtml(targetId)}" required></div><div class="field"><label for="policy-json">Canonical APM</label><textarea id="policy-json" spellcheck="false" aria-describedby="policy-hint">{\n  "schema": "reclose-apm/1",\n  "policyId": "new-policy",\n  "version": 1\n}</textarea><span class="hint" id="policy-hint">The production compiler validates the full governed APM shape and hashes RFC8785/JCS with Keccak-256.</span></div><div class="form-actions"><button class="button" type="button" data-action="policy-review">Validate & diff</button> <button class="button" type="button" data-action="policy-build-construction">Build construction sequence</button></div></form>`, "span-7")}${panel("Authority review", '<div id="policy-review-output" class="empty">No review yet.</div>', "span-5")}
      ${panel("Construction & activation sequence", '<div id="policy-construction-output" class="empty">Not built yet. "Build construction sequence" compiles this manifest through the real canonical compiler into its exact ordered begin_policy / add_policy_resource / add_policy_rule / add_policy_effect / seal_policy / activate_policy calls, each independently previewed and signed.</div>', "span-12")}
    </div>`;
}

/**
 * FINAL_REMEDIATION.md Section 3 (strict sequential state machine, independent-audit requirement):
 * prepare/sign/track/verify begin_policy FIRST, then each resource/rule/effect transaction ONE AT
 * A TIME, then seal, read the readback, then - only after that - build a fresh activation draft.
 * `state.policyJourney` holds the compiled PLAN (call descriptions only) and `currentIndex`; a
 * PreparedRecloseWrite is built for exactly ONE step at a time, never pre-built/pre-estimated for
 * a step whose prerequisite has not yet been submitted and tracked. Activation is built only after
 * `seal_policy` is confirmed, never pre-enabled alongside the construction steps.
 */
async function handlePolicyBuildConstruction() {
  const el = document.getElementById("policy-construction-output");
  const targetId = document.getElementById("policy-target")?.value || "";
  let apm;
  try { apm = JSON.parse(document.getElementById("policy-json")?.value || "{}"); }
  catch (error) { el.className = ""; el.innerHTML = notice("Manifest is not valid JSON", error.message, "danger"); return; }
  try {
    const { manifestHash, calls } = await adapter.compilePolicyConstruction(apm);
    state.policyJourney = { targetId, apm, policyKey: apm.policyId, manifestHash, calls, currentIndex: 0, sealConfirmed: false, activationBuilt: false };
    el.className = "";
    renderPolicyJourneyStep();
  } catch (error) {
    el.className = "";
    el.innerHTML = notice("Construction sequence unavailable", error.message, "danger");
  }
}

function renderPolicyJourneyPlan() {
  const j = state.policyJourney;
  const rows = j.calls.map((c, i) => `<li class="${i < j.currentIndex ? "" : i === j.currentIndex ? "" : "muted"}">${i < j.currentIndex ? "done" : i === j.currentIndex ? "next" : "waiting"} - ${escapeHtml(c.description)}</li>`).join("");
  return recordRows([["Manifest hash", `<span class="hash">${escapeHtml(j.manifestHash)}</span>`], ["Progress", `<span class="mono">${j.currentIndex}/${j.calls.length} construction steps signed</span>`]]) + `<ol class="trace">${rows}</ol>`;
}

/** Prepares and renders ONLY the CURRENT step - builds its PreparedRecloseWrite fresh (fee
 * estimate + review hash over THIS exact call), never reusing a stale estimate from an earlier
 * render. Never builds or shows a later step's draft. */
async function renderPolicyJourneyStep() {
  const el = document.getElementById("policy-construction-output");
  const j = state.policyJourney;
  if (!j) return;
  if (j.currentIndex >= j.calls.length) {
    el.innerHTML = `${renderPolicyJourneyPlan()}${j.sealConfirmed
      ? (j.activationBuilt ? "" : `<div class="form-actions" style="margin-top:10px"><button class="button primary" type="button" data-action="policy-build-activation">Build activation draft</button></div>`)
      : `<div class="form-actions" style="margin-top:10px"><button class="button" type="button" data-action="policy-verify-seal">Verify seal on-chain</button></div>`}`;
    document.querySelector('[data-action="policy-verify-seal"]')?.addEventListener("click", handlePolicyVerifySeal);
    document.querySelector('[data-action="policy-build-activation"]')?.addEventListener("click", handlePolicyBuildActivation);
    return;
  }
  try {
    const step = await adapter.buildPolicyConstructionStep(j.calls[j.currentIndex]);
    draftRegistry.registerDraft(`policyStep:${j.currentIndex}`, step.draft);
    el.innerHTML = `${renderPolicyJourneyPlan()}<div class="notice" style="margin-top:10px"><strong>Step ${j.currentIndex + 1} of ${j.calls.length}: ${escapeHtml(step.description)}</strong>${renderPreparedWriteFields(step.draft)}<button class="button primary" type="button" data-action="submit-policyStep:${j.currentIndex}">Sign & submit step ${j.currentIndex + 1}</button></div>`;
    document.querySelector(`[data-action="submit-policyStep:${j.currentIndex}"]`)?.addEventListener("click", () => submitPolicyJourneyStep());
  } catch (error) {
    el.innerHTML = `${renderPolicyJourneyPlan()}${notice(`Step ${j.currentIndex + 1} unavailable`, error.message, "danger")}`;
  }
}

/** Submits the CURRENT step, then only advances to preparing the next one after this step's
 * transaction ID is persisted - a later step is never prepared while an earlier one is still
 * in flight or unconfirmed. */
async function submitPolicyJourneyStep() {
  const j = state.policyJourney;
  const ok = await submitLiveWrite(`policyStep:${j.currentIndex}`);
  if (!ok) return; // a failed/rejected step must never advance the sequence
  j.currentIndex += 1;
  await renderPolicyJourneyStep();
}

/** "Read activation_not_before, wait the real timelock where required" (FINAL_REMEDIATION.md
 * Section 3) - honestly bounded: the Kernel exposes no view for `sealed_at`/`activation_not_before`
 * (confirmed by reading contracts/assurance_kernel.py::get_policy_header in full - it returns only
 * version/manifestHash/sealed/active/humanOverrideEnabled). This reads what IS available (sealed
 * flag via getPolicyHeaderReadback) rather than fabricating a timelock countdown this SDK cannot
 * actually observe. */
async function handlePolicyVerifySeal() {
  const j = state.policyJourney;
  const el = document.getElementById("policy-construction-output");
  try {
    const summary = await adapter.getPolicyHeaderReadback(j.policyKey);
    if (!summary.sealed) { el.innerHTML = `${renderPolicyJourneyPlan()}${notice("Not sealed yet", "On-chain readback reports sealed=false. The seal_policy transaction may still be pending.", "warning")}`; return; }
    j.sealConfirmed = true;
    el.innerHTML = `${renderPolicyJourneyPlan()}${notice("Seal confirmed on-chain", `Readback: version=${summary.version}, manifestHash=${summary.manifestHash}, sealed=true. Activation_not_before cannot be read - the Kernel exposes no view for it (see known-limitations.md) - confirm any required expansion delay has elapsed before activating.`, "success")}<div class="form-actions" style="margin-top:10px"><button class="button primary" type="button" data-action="policy-build-activation">Build activation draft</button></div>`;
    document.querySelector('[data-action="policy-build-activation"]')?.addEventListener("click", handlePolicyBuildActivation);
  } catch (error) {
    el.innerHTML = `${renderPolicyJourneyPlan()}${notice("Readback failed", error.message, "danger")}`;
  }
}

/** Built ONLY after seal is confirmed - never pre-enabled alongside the construction steps. */
async function handlePolicyBuildActivation() {
  const j = state.policyJourney;
  const el = document.getElementById("policy-construction-output");
  try {
    const activation = await adapter.buildPolicyActivation(j.targetId, j.policyKey, j.apm);
    j.activationBuilt = true;
    draftRegistry.registerDraft("policyActivate", activation.draft);
    const expansionNotice = notice("Signing consequence", activation.authorityExpands ? "This activation expands authority and must respect the configured activation delay." : "No authority expansion is represented by this diff.", activation.authorityExpands ? "danger" : "success");
    el.innerHTML = `${renderPolicyJourneyPlan()}<div class="notice" style="margin-top:10px"><strong>${escapeHtml(activation.description)}</strong>${renderPreparedWriteFields(activation.draft)}${expansionNotice}<button class="button primary" type="button" data-action="submit-policyActivate">Sign & submit activation</button></div>`;
    document.querySelector('[data-action="submit-policyActivate"]')?.addEventListener("click", () => submitLiveWrite("policyActivate"));
  } catch (error) {
    el.innerHTML = `${renderPolicyJourneyPlan()}${notice("Activation draft unavailable", error.message, "danger")}`;
  }
}

/** A3-H02 (policy-activation half): real canonical validate/hash/diff, never a setLiveMessage-only
 * stub. Invalid manifests are blocked from producing any diff/hash output. */
async function handlePolicyReview() {
  const el = document.getElementById("policy-review-output");
  const targetId = document.getElementById("policy-target")?.value || "";
  let apm;
  try { apm = JSON.parse(document.getElementById("policy-json")?.value || "{}"); }
  catch (error) { el.className = ""; el.innerHTML = notice("Manifest is not valid JSON", error.message, "danger"); return; }
  try {
    const result = await adapter.previewPolicyActivation({ targetId, apm });
    el.className = "";
    if (!result.valid) { el.innerHTML = notice("Manifest rejected", result.errors.join("; "), "danger"); return; }
    const diffHtml = result.diff ? `<div class="authority-diff">${result.diff.changes.map((c) => `<div class="diff-row ${c.isExpansion ? "expand" : "reduce"}"><div class="diff-sign">${c.isExpansion ? "+" : "−"}</div><div class="mono">${escapeHtml(c.kind)}</div><div>${escapeHtml(c.description)}</div></div>`).join("") || '<div class="muted">No authority changes represented.</div>'}</div>` : "";
    el.innerHTML = `${recordRows([["Manifest hash", `<span class="hash">${escapeHtml(result.manifestHash)}</span>`]])}${diffHtml}${notice("Signing consequence", result.diff?.authorityExpands ? "This change expands authority and must respect the configured activation delay." : "No authority expansion is represented by this diff.", result.diff?.authorityExpands ? "danger" : "success")}`;
  } catch (error) {
    el.className = "";
    el.innerHTML = notice("Review failed", error.message, "danger");
  }
  setLiveMessage("Policy manifest review complete.");
}

async function renderPending() {
  state.pending = pendingStore.loadAll();
  const body = state.pending.length ? `<div class="table-wrap"><table><thead><tr><th>Transaction</th><th>Incident</th><th>Kind</th><th>Persisted</th></tr></thead><tbody>${state.pending.map((p) => `<tr><td class="hash">${escapeHtml(p.txId)}</td><td class="hash">${p.incidentId ? `${escapeHtml(p.incidentId)}${p.predicted ? ' <span class="muted" style="font-size:11px">(predicted pre-sign)</span>' : ""}` : '<span class="muted">not yet known</span>'}</td><td>${escapeHtml(p.kind || "write")}</td><td>${formatIso(p.persistedAt)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No pending transaction IDs are persisted in this browser.</div>';
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

/**
 * Independent-audit finding: the signing-boundary panels previously showed only
 * contractAddress/functionName/reviewHash - never the actual args array, valueWei, chainId, or
 * semanticKind a reviewer is about to sign. A review-to-sign integrity guarantee (A3-H01) is
 * hollow if the human reviewing it cannot see every security-bearing field of what they sign.
 * Renders EVERY field of `draft` (the exact PreparedRecloseWrite object, never a summary of it).
 */
function renderPreparedWriteFields(draft) {
  if (!draft?.reviewHash) return "";
  const argsHtml = Array.isArray(draft.args)
    ? `<ol class="trace" style="margin-top:4px">${draft.args.map((a, i) => `<li><span class="mono">arg[${i}]</span>: <span class="hash">${escapeHtml(typeof a === "object" ? JSON.stringify(a) : String(a))}</span></li>`).join("")}</ol>`
    : '<span class="muted">no args</span>';
  return recordRows([
    ["Chain ID", `<span class="mono">${escapeHtml(draft.chainId)}</span>`],
    ["Contract", `<span class="hash">${escapeHtml(draft.contractAddress)}</span>`],
    ["Method", `<span class="mono">${escapeHtml(draft.functionName)}</span>`],
    ["Semantic kind", `<span class="mono">${escapeHtml(draft.semanticKind || "unknown")}</span>`],
    ["Value (wei)", `<span class="mono">${escapeHtml(draft.valueWei ?? "0")}</span>`],
    ["Full call arguments", argsHtml],
    ["Review hash", `<span class="hash">${escapeHtml(draft.reviewHash)}</span>`],
    ...(draft.predictedIncidentId ? [["Predicted incident ID", `<span class="hash">${escapeHtml(draft.predictedIncidentId.incidentId)}</span>`]] : []),
  ]);
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
  // independent-audit finding: buildIncidentReport REQUIRES reporterAddress (it binds the EAP and
  // derives the reporter nonce) - there is no other source for it in the browser besides a
  // connected wallet. Without one, preview must refuse rather than silently omitting it.
  if (adapter.mode !== "mock" && !state.wallet?.address) errors.push("Connect a wallet first - reporterAddress is required to build this report and cannot be fabricated.");
  // FINAL_REMEDIATION.md Section 5: never present a bonded report as signable without a verified
  // open bond - if the selected rule requires one and it isn't confirmed for THIS rule, refuse.
  const bondMap = JSON.parse(form.dataset.ruleBondMap || "{}");
  const requiredBond = bondMap[input.ruleId] ?? "0";
  if (BigInt(requiredBond || "0") > 0n && state.openedBond?.ruleId !== input.ruleId) {
    errors.push(`This rule requires a ${requiredBond} wei reporter bond. Open it first using the "Open reporter bond" control above.`);
  }
  try { const u = new URL(input.url); if (u.protocol !== "https:") errors.push("Evidence URL must use HTTPS."); } catch { errors.push("Evidence URL is invalid."); }
  formError("incident-errors", errors);
  if (errors.length) return;
  const preview = await adapter.previewIncident({ targetId: input.targetId, ruleId: input.ruleId, resourceId: input.resourceId, reporterAddress: state.wallet?.address, bondId: state.openedBond?.bondId, evidenceSources: [{ sourceId: "user-source-1", url: input.url, sourceClass: input.sourceClass, fetchedAt: new Date().toISOString(), availability: "AVAILABLE" }] });
  const el = document.getElementById("incident-preview");
  el.className = "";
  // A3-H01: the draft registered here is EXACTLY `preview.draft` - the same object rendered
  // below - and is the ONLY object submitLiveWrite will ever pass to the writer.
  draftRegistry.registerDraft("incident", preview.draft);
  invalidateDraftOnEdit(form, "incident");
  const draftHtml = renderPreparedWriteFields(preview.draft);
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
  if (adapter.mode !== "mock" && !state.wallet?.address) errors.push("Connect a wallet first - reporterAddress is required to build this recovery report and cannot be fabricated.");
  try { const u = new URL(input.url); if (u.protocol !== "https:") errors.push("Evidence URL must use HTTPS."); } catch { errors.push("Evidence URL is invalid."); }
  formError("recovery-errors", errors);
  if (errors.length) return;
  const preview = await adapter.previewRecovery({ incidentId: input.incidentId, reporterAddress: state.wallet?.address, evidenceSources: [{ sourceId: "recovery-source-1", url: input.url, sourceClass: input.sourceClass, fetchedAt: new Date().toISOString(), availability: "AVAILABLE" }] });
  const el = document.getElementById("recovery-preview");
  el.className = "";
  draftRegistry.registerDraft("recovery", preview.draft);
  invalidateDraftOnEdit(form, "recovery");
  const draftHtml = renderPreparedWriteFields(preview.draft);
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
  const draftHtml = renderPreparedWriteFields(preview.draft);
  el.innerHTML = `${recordRows([["Network", `<span class="mono">${preview.network} · ${preview.chainId}</span>`],["Estimated fee", `<span class="mono">${escapeHtml(preview.estimatedFeeValueWei)} wei</span>`],["Estimate", preview.isEstimate ? "yes · may change" : "no"]])}${draftHtml}${preview.synthetic ? notice("Preview only", "Fixture mode cannot fabricate a registration transaction.", "warning") : '<button class="button primary" type="button" data-action="submit-registerTarget">Sign & submit registration</button>'}`;
  setLiveMessage("Registration preview ready. The exact reviewed draft will be signed.");
  bindDynamicButtons();
}

async function handleOwnerControlSubmit(event, kind, previewFn, buildInput) {
  event.preventDefault();
  invalidateDraft(kind);
  const form = event.currentTarget;
  const data = new FormData(form);
  const input = buildInput(Object.fromEntries(data.entries()), form.dataset.target);
  const preview = await adapter[previewFn](input);
  const el = document.getElementById(PREVIEW_ELEMENT_IDS[kind]);
  el.className = "";
  draftRegistry.registerDraft(kind, preview.draft);
  invalidateDraftOnEdit(form, kind);
  const draftHtml = renderPreparedWriteFields(preview.draft);
  el.innerHTML = `${recordRows([["Network", `<span class="mono">${preview.network} · ${preview.chainId}</span>`], ["Estimated fee", `<span class="mono">${escapeHtml(preview.estimatedFeeValueWei)} wei</span>`]])}${draftHtml}${preview.synthetic ? notice("Preview only", "Fixture mode cannot fabricate this transaction.", "warning") : `<button class="button primary" type="button" data-action="submit-${kind}">Sign & submit</button>`}`;
  setLiveMessage("Owner-control preview ready. The exact reviewed draft will be signed.");
  bindDynamicButtons();
}

function handleRevokeSubmit(event) {
  return handleOwnerControlSubmit(event, "revokeAuthority", "previewRevokeAuthority", (_input, targetId) => ({ targetId }));
}
function handleDisableActionSubmit(event) {
  return handleOwnerControlSubmit(event, "disableAction", "previewDisableAction", (input, targetId) => ({ targetId, actionType: Number(input.actionType) }));
}
function handleDisableResourceSubmit(event) {
  return handleOwnerControlSubmit(event, "disableResource", "previewDisableResource", (input, targetId) => ({ targetId, resourceId: input.resourceId }));
}

/**
 * A3-H08: a complete causal-reconstruction export (claim -> EAP/artifact -> DecisionRecord ->
 * policy/rule/effect -> parent/child transaction trace -> ExecutionReceipt/post-state ->
 * recovery, per FINAL_REMEDIATION.md Section 10) assembled ONLY from the exact incident object the
 * Incident Explorer already rendered - never re-fetched/re-derived/fabricated separately, so the
 * export can never disagree with what was on screen. Missing links remain explicitly null/absent
 * rather than silently omitted.
 */
function handleExportAuditTrail() {
  const incident = window.__RECLOSE_LAST_INCIDENT__;
  if (!incident) { setLiveMessage("No incident is currently loaded to export."); return; }
  const bundle = {
    schemaVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    claim: { reporter: incident.reporter, ruleId: incident.ruleId, resourceId: incident.resourceId ?? null, evidenceHash: incident.evidenceHash },
    evidence: incident.evidence ?? null,
    decision: { finalOutcome: incident.finalOutcome ?? null, decisionStage: incident.decisionStage ?? null, conditionCode: incident.conditionCode ?? null },
    policyConsequence: incident.consequences ?? [],
    transactionTrace: incident.trace ?? [],
    recovery: incident.recovery ?? null,
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reclose-audit-trail-${incident.incidentId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setLiveMessage("Audit trail exported as a downloadable JSON file.");
}

async function submitLiveWrite(kind) {
  const draft = draftRegistry.getDraft(kind);
  if (!draft) {
    setLiveMessage("No reviewed draft is available. Preview the write again before signing.");
    alert("No reviewed draft is available. Preview the write again before signing.");
    return false;
  }
  try {
    // A3-H01: pass EXACTLY the previewed/reviewed draft - never an empty or reconstructed object.
    const result = await adapter.submitWrite(kind, draft);
    if (!result?.txId) throw new Error("Writer returned no transaction ID");
    // A3-H12: persist the transaction ID immediately. The incident identity is known even BEFORE
    // the writer returns, for incident/recovery writes: `draft.predictedIncidentId` was derived
    // client-side with the exact formula the IncidentJudge contract itself evaluates
    // (target_id:reporter:nonce). Prefer it over whatever a writer's return object happens to
    // carry; fall back to the writer's own value only if no prediction exists (e.g. for writes
    // that don't mint an incident identity at all).
    const incidentId = draft.predictedIncidentId?.incidentId ?? result.incidentId ?? null;
    const record = { txId: result.txId, kind, incidentId, predicted: Boolean(draft.predictedIncidentId) };
    draftRegistry.invalidateDraft(kind);
    await persistThenTrack(pendingStore, record, globalThis.__RECLOSE_PRODUCT_RUNTIME__?.trackTransaction, ({ phase }) => setLiveMessage(`Transaction ${phase}: ${shortHash(result.txId)}`));
    state.pending = pendingStore.loadAll();
    // Sequential policy-journey steps stay on the policy-author page so the next step can be
    // prepared in place - only one-shot writes navigate to the pending-transaction tracker.
    const isPolicyJourneyStep = kind.startsWith("policyStep:") || kind === "policyActivate";
    if (!isPolicyJourneyStep) location.hash = "#/pending";
    return true;
  } catch (error) {
    setLiveMessage(`Submission failed: ${error.message}`);
    alert(`Submission failed: ${error.message}`);
    return false;
  }
}

function bindDynamicButtons() {
  document.querySelector('[data-action="submit-incident"]')?.addEventListener("click", () => submitLiveWrite("incident"));
  document.querySelector('[data-action="submit-recovery"]')?.addEventListener("click", () => submitLiveWrite("recovery"));
  document.querySelector('[data-action="submit-registerTarget"]')?.addEventListener("click", () => submitLiveWrite("registerTarget"));
  document.querySelector('[data-action="submit-revokeAuthority"]')?.addEventListener("click", () => submitLiveWrite("revokeAuthority"));
  document.querySelector('[data-action="submit-disableAction"]')?.addEventListener("click", () => submitLiveWrite("disableAction"));
  document.querySelector('[data-action="submit-disableResource"]')?.addEventListener("click", () => submitLiveWrite("disableResource"));
}

/** Real provider event wiring (independent-audit requirement): an account or network switch in
 * the connected wallet must invalidate every prepared draft and force a fresh connection/preview -
 * a draft signed under a DIFFERENT account/network than the one it was reviewed for is exactly the
 * review-to-sign integrity break A3-H01 closed for edits; the same guarantee must hold for wallet
 * identity changes, not just form edits. */
function wireWalletEvents(provider) {
  if (typeof provider?.on !== "function") return;
  const onChanged = (label) => () => {
    draftRegistry.clearAll();
    state.wallet = null;
    adapter.writer = adapter.mode === "mock" ? adapter.writer : null;
    setLiveMessage(`Wallet ${label} changed - every prepared draft was invalidated. Reconnect and preview again.`);
    render();
  };
  provider.on("accountsChanged", onChanged("account"));
  provider.on("chainChanged", onChanged("network"));
}

async function handleConnectWallet() {
  try {
    state.wallet = await connectBrowserWallet();
    wireWalletEvents(state.wallet.provider);
    // Real GenLayerJS-backed writer over the connected provider/account - no host-injected writer
    // is required for ordinary browser usage. This is the corrected architecture: injected
    // provider -> genlayer-js write client -> writeContract(), never a fake/throwing stub.
    if (adapter.mode !== "mock") {
      adapter.writer = createGenLayerWriter({ account: state.wallet.address, provider: state.wallet.provider });
    }
    setLiveMessage(`Wallet connected: ${state.wallet.address} on chain ${state.wallet.chainId}.`);
  } catch (error) {
    setLiveMessage(`Wallet connection failed: ${error.message}`);
    alert(`Wallet connection failed: ${error.message}`);
    return;
  }
  const chip = document.querySelector(".topbar-meta");
  if (chip) {
    const existing = chip.querySelector('[data-action="connect-wallet"], [data-action="wallet-status"]');
    if (existing) existing.outerHTML = walletChip();
  }
}

function bindShellEvents() {
  document.querySelector('[data-action="toggle-nav"]')?.addEventListener("click", () => {
    state.navOpen = !state.navOpen;
    document.querySelector(".rail")?.setAttribute("data-open", String(state.navOpen));
    document.querySelector('[data-action="toggle-nav"]')?.setAttribute("aria-expanded", String(state.navOpen));
  });
  document.querySelector('[data-action="connect-wallet"]')?.addEventListener("click", handleConnectWallet);
  document.querySelector('[data-action="switch-network"]')?.addEventListener("click", async () => {
    try {
      await switchToStudioDev(state.wallet?.provider);
      setLiveMessage("Network switch requested. Reconnect once your wallet confirms Studio-dev.");
    } catch (error) {
      setLiveMessage(`Network switch failed: ${error.message}`);
      alert(`Network switch failed: ${error.message}`);
    }
  });
}

function bindEvents() {
  bindShellEvents();
  document.getElementById("incident-form")?.addEventListener("submit", handleIncidentSubmit);
  document.getElementById("report-rule")?.addEventListener("change", handleReportRuleChange);
  renderBondGate();
  document.getElementById("recovery-form")?.addEventListener("submit", handleRecoverySubmit);
  document.getElementById("onboard-form")?.addEventListener("submit", handleOnboardSubmit);
  document.getElementById("revoke-form")?.addEventListener("submit", handleRevokeSubmit);
  document.getElementById("disable-action-form")?.addEventListener("submit", handleDisableActionSubmit);
  document.getElementById("disable-resource-form")?.addEventListener("submit", handleDisableResourceSubmit);
  document.querySelector('[data-action="policy-review"]')?.addEventListener("click", handlePolicyReview);
  document.querySelector('[data-action="policy-build-construction"]')?.addEventListener("click", handlePolicyBuildConstruction);
  document.querySelector('[data-action="export-audit-trail"]')?.addEventListener("click", handleExportAuditTrail);
  bindDynamicButtons();
}

window.addEventListener("hashchange", () => { state.navOpen = false; render(); });
if (!location.hash) location.hash = "#/overview";
else render();
