#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statusPath = path.join(root, 'docs/execution/Requirements Status.csv');
const matrixPath = path.join(root, 'docs/governance/Requirements Traceability Matrix.md');
const threatPath = path.join(root, 'docs/security/Threat Status.csv');
const reportPath = path.join(root, 'docs/execution/Requirements Reconciliation.md');
const writeMode = process.argv.includes('--write');

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
const threatIds = new Set(threats.map((row) => row.threat_id));
if (threats.length !== 82 || threatIds.size !== 82) throw new Error(`Expected 82 unique threat rows, found ${threats.length}.`);
for (const row of threats) {
  for (const field of ['control_refs', 'implementation_refs', 'test_refs', 'evidence_refs', 'residual_risk', 'commit']) {
    if (!row[field]?.trim()) throw new Error(`${row.threat_id} is missing required ${field}.`);
  }
}

for (const row of records) {
  const source = matrix.get(row.requirement_id);
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
  'This report joins every locked requirement in the governance matrix to the delivery status ledger. It preserves recorded statuses and evidence; it does not infer implementation from nearby code or treat repository CI as live deployment proof.',
  '',
  `Reconciled rows: **${records.length}/156**. Status counts: ${[...counts].map(([status, count]) => `${status}: ${count}`).join('; ')}.`,
  '',
  'A non-VERIFIED status is an open requirement. For NOT STARTED rows, the blocker records the owner and acceptance evidence from the canonical matrix and states that no delivery mapping is recorded. IN PROGRESS and IMPLEMENTED / UNVERIFIED rows retain their specific recorded blockers. VERIFIED rows are rejected by this generator unless implementation, test, evidence, and commit references are all present.',
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
  '- Rows marked NOT STARTED remain unimplemented/unmapped according to the delivery ledger; their canonical owner, verification method, and required evidence are now visible beside that status.',
  '- The five VERIFIED rows have all four required refs. Live claims remain bounded by the evidence cited in those rows.',
  '- The accepted-message simulation limitation remains an external blocker for E1 Run A; this report does not close E1, H1, A3/A4, or the release candidate gates.',
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
  if (serialized !== fs.readFileSync(statusPath, 'utf8')) {
    throw new Error('Requirements Status.csv needs reconciliation; run npm run rtm:reconcile.');
  }
  if (report.join('\n') !== fs.readFileSync(reportPath, 'utf8')) {
    throw new Error('Requirements Reconciliation.md is stale; run npm run rtm:reconcile.');
  }
  console.log(`PASS requirements reconciliation: ${records.length}/156 rows joined; ${counts.get('VERIFIED') ?? 0} VERIFIED rows have complete references; all open rows have explicit gaps.`);
}
