#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statusPath = path.join(root, 'docs/execution/Requirements Status.csv');
const matrixPath = path.join(root, 'docs/governance/Requirements Traceability Matrix.md');
// The packet's requirements.csv is the canonical 156-row ledger. Keep using the
// preserved A3-specific source map as enrichment input so refreshing the packet
// cannot make this reconciliation check parse its own output as the old schema.
const a3MapPath = path.join(root, 'docs/execution/audit-packets/A3-attempt-2/requirements-at-98b98cc.csv');
const threatPath = path.join(root, 'docs/security/Threat Status.csv');
const reportPath = path.join(root, 'docs/execution/Requirements Reconciliation.md');
const writeMode = process.argv.includes('--write');
const candidateCommit = '7522927cd2a94aed3a0b860bf948bf618b44f269';
const candidateCiRun = '34797526119';

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { cells.push(cell); cell = ''; }
    else cell += ch;
  }
  cells.push(cell);
  return cells;
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
}

const csvLines = fs.readFileSync(statusPath, 'utf8').split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(csvLines[0]);
const records = csvLines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']));
});
const a3Lines = fs.readFileSync(a3MapPath, 'utf8').split(/\r?\n/).filter(Boolean);
const a3Headers = parseCsvLine(a3Lines[0]);
const a3Requirements = new Map(a3Lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  const row = Object.fromEntries(a3Headers.map((header, i) => [header, values[i] ?? '']));
  return [row.requirement_id, row];
}));
const threatLines = fs.readFileSync(threatPath, 'utf8').split(/\r?\n/).filter(Boolean);
const threatHeaders = parseCsvLine(threatLines[0]);
const threats = threatLines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  return Object.fromEntries(threatHeaders.map((header, i) => [header, values[i] ?? '']));
});
const matrix = new Map();
for (const line of fs.readFileSync(matrixPath, 'utf8').split(/\r?\n/)) {
  if (!line.startsWith('| **PRD-') && !line.startsWith('| **NFR-')) continue;
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  const id = cells[0]?.match(/\*((?:PRD|NFR)-[A-Z]+-\d{3})\*\*/)?.[1];
  if (!id) continue;
  matrix.set(id, {
    area: cells[1] ?? '',
    priority: cells[2] ?? '',
    governing: cells[3] ?? '',
    owner: cells[4] ?? '',
    verification: cells[5] ?? '',
    evidence: cells[6] ?? '',
  });
}

if (matrix.size !== 156 || records.length !== 156) {
  throw new Error(`Expected 156 source/status rows; matrix=${matrix.size}, status=${records.length}`);
}
const statusIds = new Set(records.map((row) => row.requirement_id));
if (statusIds.size !== 156 || [...matrix.keys()].some((id) => !statusIds.has(id))) {
  throw new Error('Requirement IDs do not match uniquely between the canonical matrix and status ledger.');
}
for (const id of a3Requirements.keys()) {
  if (!statusIds.has(id)) throw new Error(`A3 requirement map contains unlocked ID ${id}.`);
}
const threatIds = new Set(threats.map((row) => row.threat_id));
if (threats.length !== 82 || threatIds.size !== 82) throw new Error(`Expected 82 unique threat rows, found ${threats.length}.`);
for (const row of threats) {
  for (const field of ['control_refs', 'implementation_refs', 'test_refs', 'evidence_refs', 'residual_risk', 'commit']) {
    if (!row[field]?.trim()) throw new Error(`${row.threat_id} is missing required ${field}.`);
  }
}

const statusRank = { 'NOT STARTED': 0, 'IN PROGRESS': 1, 'IMPLEMENTED / UNVERIFIED': 2, VERIFIED: 3, BLOCKED: 0, 'DEFERRED BY RELEASE DECISION': 0 };
const appendUnique = (current, value) => {
  if (!value?.trim()) return current;
  if (current.includes(value.trim())) return current;
  const parts = current ? current.split('; ').filter(Boolean) : [];
  if (!parts.includes(value.trim())) parts.push(value.trim());
  return parts.join('; ');
};
for (const row of records) {
  const source = matrix.get(row.requirement_id);
  const a3 = a3Requirements.get(row.requirement_id);
  if (a3 && a3.implementation_ref.trim() && a3.test_or_evidence_ref.trim()) {
    const a3Status = a3.status.trim();
    if (!(a3Status in statusRank)) throw new Error(`${row.requirement_id} has invalid A3 status ${a3Status}.`);
    // Prefer an explicit, test-backed A3 map over a stale NOT STARTED row; if the
    // A3 map is more conservative than the canonical row, lower the broad status.
    if (row.status === 'NOT STARTED' || statusRank[a3Status] < statusRank[row.status]) row.status = a3Status;
    if (!row.implementation_ref.trim()) row.implementation_ref = a3.implementation_ref;
    if (!row.test_ref.trim()) row.test_ref = a3.test_or_evidence_ref;
    row.evidence_ref = appendUnique(row.evidence_ref, `GitHub Actions run ${candidateCiRun} (full repository verification; test scope is listed in test_ref)`);
    if (!row.commit.trim()) row.commit = `${candidateCommit} (audited source snapshot; feature-origin commit not inferred)`;
    if (row.blocker.startsWith('Not started in the delivery ledger. Owner:')) row.blocker = '';
    if (row.status === 'VERIFIED') {
      row.blocker = '';
    } else if (!row.blocker.trim()) {
      row.blocker = a3.remaining_verification.trim()
        ? `A3 attempt-2 remaining verification: ${a3.remaining_verification.trim()}`
        : `A3 attempt-2 maps implementation and tests, but the canonical requirement remains ${row.status}; acceptance evidence is still open.`;
    }
    row.last_updated = '2026-09-14';
  }
  if (row.status === 'NOT STARTED' && !row.blocker.trim()) {
    row.blocker = `Not started in the delivery ledger. Owner: ${source.owner}. Acceptance: ${source.verification}. Required evidence: ${source.evidence}. No implementation, test, evidence, or commit mapping is recorded.`;
  }
  if (row.status !== 'VERIFIED' && !row.blocker.trim()) {
    throw new Error(`${row.requirement_id} (${row.status}) needs an explicit open-gap/blocker entry.`);
  }
  if (row.status === 'VERIFIED') {
    for (const field of ['implementation_ref', 'test_ref', 'evidence_ref', 'commit']) {
      if (!row[field].trim()) throw new Error(`${row.requirement_id} is VERIFIED but has no ${field}.`);
    }
  }
}

const counts = new Map();
for (const row of records) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
const report = [
  '# Requirements reconciliation',
  '',
  'This report joins every locked requirement in the governance matrix to the delivery status ledger and the existing A3 attempt-2 requirement map. Test-backed A3 implementation mappings are carried into the canonical ledger; statuses are lowered when the A3 map records broader work still open. Repository CI is not treated as live deployment proof.',
  '',
  `Reconciled rows: **${records.length}/156**. Status counts: ${[...counts].map(([status, count]) => `${status}: ${count}`).join('; ')}. A3 map joined: ${a3Requirements.size} rows, including ${[...a3Requirements.values()].filter((row) => row.implementation_ref.trim() && row.test_or_evidence_ref.trim()).length} rows with implementation and test references.`,
  '',
  'A non-VERIFIED status is open. NOT STARTED means neither the canonical ledger nor the A3 map records a tested implementation. Where the A3 map records implementation and tests, those refs and its remaining-verification note are shown. A3 rows that predate the latest protocol fixes are not allowed to overwrite newer canonical refs. VERIFIED rows are rejected unless implementation, test, evidence, and commit references are all present.',
  '',
  '| Requirement | Area | Priority / release | Status | Owner | Required verification | Required evidence | Current delivery mapping / open gap |',
  '|---|---|---|---|---|---|---|---|',
];
for (const row of records) {
  const source = matrix.get(row.requirement_id);
  const mapping = row.status === 'VERIFIED'
    ? `Implementation: ${row.implementation_ref}; test: ${row.test_ref}; evidence: ${row.evidence_ref}; commit: ${row.commit}`
    : `Implementation: ${row.implementation_ref || 'none recorded'}; test: ${row.test_ref || 'none recorded'}; evidence: ${row.evidence_ref || 'none recorded'}; commit: ${row.commit || 'none recorded'}; open gap: ${row.blocker}`;
  report.push(`| ${row.requirement_id} | ${markdownCell(source.area)} | ${markdownCell(source.priority)} | ${markdownCell(row.status)} | ${markdownCell(source.owner)} | ${markdownCell(source.verification)} | ${markdownCell(source.evidence)} | ${markdownCell(mapping)} |`);
}
report.push('', '## Scope and interpretation', '',
  '- This is a traceability reconciliation, not a claim that all requirements are implemented.',
  '- Rows marked NOT STARTED have no test-backed implementation mapping in either joined delivery map; each carries its canonical owner, verification method, and required evidence.',
  `- ${counts.get('VERIFIED') ?? 0} VERIFIED rows have all four required refs. Evidence scope remains bounded by the cited tests and deployments.`,
  '- The isolated typed-address `decided` message simulation passed read-only and closes only that narrow validation. The active immutable Kernel/Judge deployment predates the source correction; this report does not close the full Judge-to-Target lifecycle, E1 Run A/B, H1, A3/A4, or release gates.',
  '',
  '## Threat reconciliation',
  '',
  `Threat rows reconciled: **${threats.length}/82**. Status counts: ${[...threats.reduce((map, row) => map.set(row.status, (map.get(row.status) ?? 0) + 1), new Map())].map(([status, count]) => `${status}: ${count}`).join('; ')}. Every row has control, implementation, test, evidence, residual-risk, and commit fields. Field completeness does not mean the threat is closed; open and unverified risks remain as recorded.`,
  '',
  '| Threat | Severity | Status | Control | Implementation | Test | Evidence | Residual risk | Commit |',
  '|---|---|---|---|---|---|---|---|---|');
for (const row of threats) {
  report.push(`| ${row.threat_id} | ${markdownCell(row.severity)} | ${markdownCell(row.status)} | ${markdownCell(row.control_refs)} | ${markdownCell(row.implementation_refs)} | ${markdownCell(row.test_refs)} | ${markdownCell(row.evidence_refs)} | ${markdownCell(row.residual_risk)} | ${markdownCell(row.commit)} |`);
}
report.push('');

const serialized = `${headers.join(',')}\n${records.map((row) => headers.map((header) => csvCell(row[header])).join(',')).join('\n')}\n`;
if (writeMode) {
  fs.writeFileSync(statusPath, serialized);
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`Updated open-gap entries for ${records.filter((row) => row.status === 'NOT STARTED').length} NOT STARTED requirements and wrote ${records.length}-row reconciliation report.`);
} else {
  const actual = fs.readFileSync(statusPath, 'utf8');
  // Git checkout settings may materialize this tracked CSV with CRLF on Windows.
  // Compare logical content independent of the host line-ending convention.
  if (serialized !== actual.replaceAll('\r\n', '\n')) {
    const expectedLines = serialized.split('\n');
    const actualLines = actual.split(/\r?\n/);
    const mismatch = expectedLines.findIndex((line, i) => line !== actualLines[i]);
    const expectedLine = expectedLines[mismatch] ?? '';
    const actualLine = actualLines[mismatch] ?? '';
    let charAt = 0;
    while (charAt < expectedLine.length && expectedLine[charAt] === actualLine[charAt]) charAt += 1;
    throw new Error(`Requirements Status.csv needs reconciliation at line ${mismatch + 1}, column ${charAt + 1}; expectedLength=${expectedLine.length}, actualLength=${actualLine.length}, expected=${JSON.stringify(expectedLine.slice(Math.max(0, charAt - 50), charAt + 100))}, actual=${JSON.stringify(actualLine.slice(Math.max(0, charAt - 50), charAt + 100))}; run npm run rtm:reconcile.`);
  }
  if (report.join('\n') !== fs.readFileSync(reportPath, 'utf8')) {
    throw new Error('Requirements Reconciliation.md is stale; run npm run rtm:reconcile.');
  }
  console.log(`PASS requirements reconciliation: ${records.length}/156 rows joined; ${counts.get('VERIFIED') ?? 0} VERIFIED rows have complete references; all open rows have explicit gaps.`);
}
