#!/usr/bin/env node
import { readFileSync } from "node:fs";

const [coveragePath = "config/fee-profile-coverage.json", profilePath = "release-evidence/r1/c3/fee-profile-input.json"] = process.argv.slice(2);
const coverage = JSON.parse(readFileSync(coveragePath, "utf8"));
const profiles = JSON.parse(readFileSync(profilePath, "utf8"));
const present = new Set(profiles.map((p) => p.id ?? p.coverageId ?? p.name));
const missing = coverage.requiredProfiles.filter((id) => !present.has(id));

if (missing.length) {
  console.error(`Missing mandatory fee-profile coverage: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`PASS fee profile coverage: ${coverage.requiredProfiles.length}/${coverage.requiredProfiles.length} required branches declared`);
