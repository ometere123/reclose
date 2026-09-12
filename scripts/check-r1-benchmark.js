#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, "benchmark", "r1-scenarios.json"), "utf8"));
const failures = [];
const scenarios = matrix.scenarios || [];

if (scenarios.length < matrix.minimumScenarioCount) failures.push(`scenario count ${scenarios.length} < ${matrix.minimumScenarioCount}`);
const ids = new Set();
for (const scenario of scenarios) {
  if (!scenario.id || ids.has(scenario.id)) failures.push(`duplicate/missing scenario id: ${scenario.id}`);
  ids.add(scenario.id);
  if (!scenario.category) failures.push(`${scenario.id}: category missing`);
  if (!Array.isArray(scenario.threatIds) || scenario.threatIds.length === 0) failures.push(`${scenario.id}: threatIds missing`);
  for (const threatId of scenario.threatIds || []) if (!/^TM-[A-Z]+-\d+$/.test(threatId)) failures.push(`${scenario.id}: invalid threat id ${threatId}`);
  if (!scenario.evidence) failures.push(`${scenario.id}: evidence path missing`);
  else if (!fs.existsSync(path.join(ROOT, scenario.evidence))) failures.push(`${scenario.id}: evidence path does not exist: ${scenario.evidence}`);
  if (scenario.mode === "LIVE" && !scenario.status) failures.push(`${scenario.id}: live scenario must state status explicitly`);
  if (scenario.mode === "LIVE" && scenario.status === "BLOCKED_EXTERNAL" && !scenario.blocker) failures.push(`${scenario.id}: blocked live scenario missing blocker`);
}

const hard = matrix.hardReleaseTargets || {};
for (const [name, target] of Object.entries(hard)) {
  if (target !== 0) failures.push(`hard release target ${name} must remain exactly 0`);
}

const byCategory = scenarios.reduce((acc, s) => ((acc[s.category] = (acc[s.category] || 0) + 1), acc), {});
const live = scenarios.filter((s) => s.mode === "LIVE");
const automated = scenarios.filter((s) => s.mode === "AUTOMATED");

console.log(`R1 benchmark matrix: ${scenarios.length} scenarios`);
console.log(`Automated-mapped: ${automated.length}`);
console.log(`Live/evidence-bound: ${live.length}`);
console.log(`Categories: ${Object.entries(byCategory).map(([k,v]) => `${k}=${v}`).join(", ")}`);
for (const s of live) console.log(`${s.id}: ${s.status}${s.blocker ? ` - ${s.blocker}` : ""}`);

if (failures.length) {
  console.error("\nBenchmark matrix validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("\nPASS benchmark structure, threat mapping and evidence references are internally valid.");
console.log("NOTE: this command validates the benchmark matrix. It does not convert NOT_RUN/BLOCKED_EXTERNAL live cases into passes.");
