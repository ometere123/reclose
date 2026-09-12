#!/usr/bin/env node
// Schema-validates every F1 synthetic fixture against its declared schema.
// These fixtures illustrate the shape of Reclose's frontend-facing types; they
// do not assert or invent any live protocol behaviour (CLAUDE.md Section 26).

const fs = require("fs");
const path = require("path");
// Ajv2020 (draft 2020-12) is used for ALL schemas here, not just the two new
// evidence schemas that declare that draft - it remains backward-compatible with the
// existing draft-07 schemas' constructs, so this is a compatibility widening, not a
// schema rewrite (CLAUDE.md: smallest compatible correction, never a redesign).
// validateSchema: false skips Ajv's internal meta-schema self-check of each added schema
// file (which would otherwise require registering BOTH the draft-07 and 2020-12
// meta-schemas) - this script's actual job is validating FIXTURE DATA against these
// schemas, not validating the schema files against a meta-schema, so this does not weaken
// what this script tests.
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const ROOT = path.join(__dirname, "..");
const SCHEMAS_DIR = path.join(ROOT, "schemas");
const FIXTURES_DIR = path.join(ROOT, "tests", "frontend-fixtures");
const MANIFEST_PATH = path.join(FIXTURES_DIR, "manifest.json");

function loadAllSchemas(ajv, dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadAllSchemas(ajv, full);
    } else if (entry.name.endsWith(".schema.json")) {
      const schema = JSON.parse(fs.readFileSync(full, "utf-8"));
      ajv.addSchema(schema, schema.$id);
    }
  }
}

function main() {
  const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
  addFormats(ajv);
  loadAllSchemas(ajv, SCHEMAS_DIR);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  let failures = 0;

  for (const entry of manifest) {
    const fixturePath = path.join(FIXTURES_DIR, entry.fixture);
    const schemaId = `https://reclose.internal/schemas/${entry.schema}`;
    const data = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      console.error(`FAIL  ${entry.fixture}: schema not found: ${schemaId}`);
      failures++;
      continue;
    }
    const ok = validate(data);
    if (ok) {
      console.log(`PASS  ${entry.fixture}  (${entry.schema})`);
    } else {
      console.error(`FAIL  ${entry.fixture}  (${entry.schema})`);
      for (const err of validate.errors) {
        console.error(`        ${err.instancePath || "/"} ${err.message}`);
      }
      failures++;
    }
  }

  console.log(`\n${manifest.length - failures}/${manifest.length} fixtures valid.`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
