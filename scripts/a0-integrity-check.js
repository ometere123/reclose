#!/usr/bin/env node
// Automated A0 audit integrity gate (Part 22 of the A0 final remediation instruction).
// Derives locked ID sets mechanically from governance sources rather than hand-maintained
// lists, and fails the build if any structural/traceability invariant is violated. The
// checks here are stable and non-circular (they do not require an audit target commit to
// exist) and are wired into `npm run verify`. Packet-specific checks that require an
// already-frozen AUDIT_TARGET_SHA run separately, after target freeze.

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
let failures = 0;
function check(name, fn) {
  try {
    const detail = fn();
    console.log(`PASS  ${name}${detail ? "  (" + detail + ")" : ""}`);
  } catch (e) {
    console.error(`FAIL  ${name}`);
    console.error("  " + e.message);
    failures++;
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function readCsv(relPath) {
  const raw = fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const obj = {};
    header.forEach((h, i) => (obj[h] = cells[i] ?? ""));
    return obj;
  });
}

// Minimal RFC4180-ish CSV line parser sufficient for this repo's fixtures (handles quoted
// fields containing commas/quotes). Not a general-purpose CSV library substitute.
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

// ---------------------------------------------------------------------------
// RTM: exactly 156 unique locked IDs, no missing/extra/renamed
// ---------------------------------------------------------------------------

const RTM_ID_RE = /\b([A-Z]{2,6}-[A-Z]{2,6}-\d{3})\b/g;

function idsFrom(text, re) {
  const set = new Set();
  let m;
  while ((m = re.exec(text))) set.add(m[1] || m[0]);
  return set;
}

const rtmMdText = fs.readFileSync(path.join(REPO_ROOT, "docs/governance/Requirements Traceability Matrix.md"), "utf8");
const lockedRtmIds = idsFrom(rtmMdText, new RegExp(RTM_ID_RE));

check("RTM: exactly 156 unique locked requirement IDs in governance source", () => {
  assert(lockedRtmIds.size === 156, `expected 156, found ${lockedRtmIds.size}`);
  return `${lockedRtmIds.size} IDs`;
});

const requirementsRows = readCsv("docs/execution/Requirements Status.csv");
const csvRtmIds = new Set(requirementsRows.map((r) => r.requirement_id));

check("Requirements Status.csv contains exactly the 156 locked RTM IDs (no missing/extra/renamed)", () => {
  const missing = [...lockedRtmIds].filter((id) => !csvRtmIds.has(id));
  const extra = [...csvRtmIds].filter((id) => !lockedRtmIds.has(id));
  assert(missing.length === 0, `missing IDs: ${missing.join(", ")}`);
  assert(extra.length === 0, `extra/renamed IDs: ${extra.join(", ")}`);
  assert(csvRtmIds.size === requirementsRows.length, "duplicate requirement_id rows present");
  return `${requirementsRows.length} rows, 0 missing, 0 extra, 0 duplicates`;
});

const ALLOWED_REQ_STATUSES = new Set([
  "NOT STARTED",
  "IN PROGRESS",
  "IMPLEMENTED / UNVERIFIED",
  "VERIFIED",
  "DEFERRED BY RELEASE DECISION",
  "BLOCKED",
]);

check("Requirements Status.csv uses only allowed status values", () => {
  const bad = requirementsRows.filter((r) => !ALLOWED_REQ_STATUSES.has(r.status));
  assert(bad.length === 0, `disallowed status on: ${bad.map((r) => `${r.requirement_id}=${r.status}`).join(", ")}`);
});

// ---------------------------------------------------------------------------
// Threats: exactly 82 unique locked TM IDs, severity totals, CRITICAL/HIGH traceability
// ---------------------------------------------------------------------------

const tmMdText = fs.readFileSync(path.join(REPO_ROOT, "docs/security/Threat Model & Security Assurance Plan.md"), "utf8");
const lockedTmIds = idsFrom(tmMdText, /\bTM-[A-Z]{2,6}-\d{3}\b/g);

check("Threat Model: exactly 82 unique locked TM-* IDs in governance-adjacent source", () => {
  assert(lockedTmIds.size === 82, `expected 82, found ${lockedTmIds.size}`);
  return `${lockedTmIds.size} IDs`;
});

const threatRows = readCsv("docs/security/Threat Status.csv");
const csvTmIds = new Set(threatRows.map((r) => r.threat_id));

check("Threat Status.csv contains exactly the 82 locked TM IDs (no missing/extra/renamed)", () => {
  const missing = [...lockedTmIds].filter((id) => !csvTmIds.has(id));
  const extra = [...csvTmIds].filter((id) => !lockedTmIds.has(id));
  assert(missing.length === 0, `missing IDs: ${missing.join(", ")}`);
  assert(extra.length === 0, `extra/renamed IDs: ${extra.join(", ")}`);
  assert(csvTmIds.size === threatRows.length, "duplicate threat_id rows present");
  return `${threatRows.length} rows, 0 missing, 0 extra, 0 duplicates`;
});

const ALLOWED_THREAT_STATUSES = new Set([
  "OPEN",
  "IN PROGRESS",
  "MITIGATED / UNVERIFIED",
  "MITIGATED / VERIFIED",
  "ACCEPTED RESIDUAL RISK",
  "REMOVED FROM SCOPE",
  "BLOCKED",
]);

check("Threat Status.csv uses only allowed status values", () => {
  const bad = threatRows.filter((r) => !ALLOWED_THREAT_STATUSES.has(r.status));
  assert(bad.length === 0, `disallowed status on: ${bad.map((r) => `${r.threat_id}=${r.status}`).join(", ")}`);
});

check("Threat severity totals are exactly CRITICAL=25, HIGH=47, MEDIUM=10", () => {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
  for (const r of threatRows) {
    if (counts[r.severity] === undefined) throw new Error(`unexpected severity value: ${r.severity} on ${r.threat_id}`);
    counts[r.severity]++;
  }
  assert(counts.CRITICAL === 25, `CRITICAL=${counts.CRITICAL}, expected 25`);
  assert(counts.HIGH === 47, `HIGH=${counts.HIGH}, expected 47`);
  assert(counts.MEDIUM === 10, `MEDIUM=${counts.MEDIUM}, expected 10`);
  return `CRITICAL=${counts.CRITICAL} HIGH=${counts.HIGH} MEDIUM=${counts.MEDIUM}`;
});

check("Every CRITICAL/HIGH threat has non-empty control_refs, implementation_refs and test_refs", () => {
  const criticalHigh = threatRows.filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH");
  const bad = criticalHigh.filter(
    (r) => !r.control_refs?.trim() || !r.implementation_refs?.trim() || !r.test_refs?.trim()
  );
  assert(criticalHigh.length === 72, `expected 72 CRITICAL/HIGH threats, found ${criticalHigh.length}`);
  assert(bad.length === 0, `missing refs on: ${bad.map((r) => r.threat_id).join(", ")}`);
  return `${criticalHigh.length}/${criticalHigh.length} have refs`;
});

check("No fully MITIGATED / VERIFIED threat acknowledges a missing required control half in control_refs", () => {
  const bad = threatRows.filter(
    (r) => r.status === "MITIGATED / VERIFIED" && /NOT DONE|not yet implemented|not done/i.test(r.control_refs || "")
  );
  assert(bad.length === 0, `contradictory rows: ${bad.map((r) => r.threat_id).join(", ")}`);
});

// ---------------------------------------------------------------------------
// DecisionRecord canonical shape (A0-T3 / A0-R3)
// ---------------------------------------------------------------------------

check("DecisionRecord.schema.json prohibits NONE for outcome/decisionStage and requires non-null reporter", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "schemas/incident/DecisionRecord.schema.json"), "utf8"));
  const outcomeEnum = schema.properties.outcome.enum || [];
  const stageEnum = schema.properties.decisionStage.enum || [];
  assert(!outcomeEnum.includes("NONE"), "outcome enum still permits NONE");
  assert(!stageEnum.includes("NONE"), "decisionStage enum still permits NONE");
  assert((schema.required || []).includes("reporter"), "reporter is not in required[]");
  const reporterType = schema.properties.reporter.type;
  assert(reporterType === "string", `reporter type is ${JSON.stringify(reporterType)}, expected non-nullable "string"`);
});

// ---------------------------------------------------------------------------
// Fixture/schema manifest counts vs filesystem
// ---------------------------------------------------------------------------

function listFilesRecursive(dir, ext) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

check("Fixture/schema counts referenced in Gate Verification Status.csv are not the old obsolete values", () => {
  const schemaCount = listFilesRecursive(path.join(REPO_ROOT, "schemas"), ".schema.json").length;
  const fixtureCount = fs
    .readdirSync(path.join(REPO_ROOT, "tests/frontend-fixtures"))
    .filter((f) => f.endsWith(".json") && f !== "manifest.json").length;
  const gateCsv = fs.readFileSync(path.join(REPO_ROOT, "docs/execution/Gate Verification Status.csv"), "utf8");
  assert(!/\b36\/36\b/.test(gateCsv), "Gate Verification Status.csv still references the obsolete 36/36 fixture count");
  assert(!/\b16 schema/i.test(gateCsv), "Gate Verification Status.csv still references the obsolete 16-schema count");
  return `${schemaCount} schema files, ${fixtureCount} fixtures on disk`;
});

// ---------------------------------------------------------------------------
// Governance / G0 lock immutability - STRICT (A0 final remediation A8).
//
// A prior version of this check "best-effort" skipped (warned, did not fail) when `main` or the
// baseline commit could not be resolved - e.g. a shallow CI checkout. External review correctly
// identified that as a status overclaim risk: the script could print "ALL PASS" having silently
// skipped the one check that actually guards against a hidden governance edit. This version
// resolves a fixed, hardcoded accepted G0 baseline commit (the R0/G0 seed commit accepted at the
// externally-reviewed G0 gate) and FAILS - does not skip - if that commit is not resolvable, so a
// shallow/misconfigured checkout can never silently pass this gate. CI accordingly uses
// `fetch-depth: 0` so the baseline commit is always reachable.
// ---------------------------------------------------------------------------

const ACCEPTED_G0_BASELINE_COMMIT = "fe86a2f7ae8f113956cc4815410b79dd26df3f2d";
const GOVERNANCE_IMMUTABLE_PATHS = [
  "docs/governance/Research Closure & Architecture Decision Record.md",
  "docs/governance/Master Design Package.md",
  "docs/governance/Implementation Specification.md",
  "docs/governance/Naming & Brand Decision Record.md",
  "docs/governance/Product Requirements Document.md",
  "docs/governance/Requirements Traceability Matrix.md",
  "CLAUDE.md",
  "Repository Build Master Plan.md",
  "toolchain/versions.lock",
  "toolchain/runner.lock",
  "toolchain/network.lock.json",
];

check("Accepted G0 baseline commit is resolvable locally (required for the strict governance/toolchain check below)", () => {
  const { execSync } = require("child_process");
  execSync(`git cat-file -e ${ACCEPTED_G0_BASELINE_COMMIT}`, { cwd: REPO_ROOT, stdio: ["pipe", "pipe", "pipe"] });
  // No output/throw = the object exists. A failure here throws and this check FAILS the gate -
  // it never silently skips ahead to the next check.
});

check("Governance documents and G0 toolchain locks are byte-identical to the accepted G0 baseline (strict, A0 final remediation A8)", () => {
  const { execSync } = require("child_process");
  const mismatches = [];
  for (const relPath of GOVERNANCE_IMMUTABLE_PATHS) {
    let baselineBlob;
    try {
      baselineBlob = execSync(`git rev-parse "${ACCEPTED_G0_BASELINE_COMMIT}:${relPath}"`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch (e) {
      mismatches.push(`${relPath}: could not resolve baseline blob (${e.message.split("\n")[0]})`);
      continue;
    }
    let currentBlob;
    try {
      currentBlob = execSync(`git rev-parse "HEAD:${relPath}"`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch (e) {
      mismatches.push(`${relPath}: could not resolve current (HEAD) blob (${e.message.split("\n")[0]})`);
      continue;
    }
    if (baselineBlob !== currentBlob) {
      mismatches.push(`${relPath}: baseline blob ${baselineBlob} != current blob ${currentBlob}`);
    }
  }
  assert(mismatches.length === 0, `governance/toolchain drift detected:\n  ${mismatches.join("\n  ")}`);
  return `${GOVERNANCE_IMMUTABLE_PATHS.length}/${GOVERNANCE_IMMUTABLE_PATHS.length} files byte-identical to ${ACCEPTED_G0_BASELINE_COMMIT.slice(0, 7)}`;
});

console.log(`\n${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
