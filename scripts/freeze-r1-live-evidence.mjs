#!/usr/bin/env node
import fs from "node:fs/promises";
import { keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";

const ROOT = new URL("../", import.meta.url);
const COMMIT = "c15379270dc669947b4acfda85d2f70e4c92bcc7";
const BASE = `https://raw.githubusercontent.com/ometere123/reclose/${COMMIT}/release-evidence/r1/e1/live-evidence/`;
const files = ["run-a-compromise.md", "run-a-remediation.md", "run-b-compromise.md", "run-b-remediation.md"];
const records = [];
for (const file of files) {
  const url = BASE + file;
  const response = await fetch(url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (response.status !== 200) throw new Error(`${file}: expected HTTP 200, got ${response.status}`);
  records.push({ file, url, httpStatus: response.status, bytes: bytes.length, contentHash: keccak256Hex(bytes), utf8: new TextDecoder().decode(bytes) });
}
const artifact = { schema: "reclose-r1-live-evidence-anchor-v1", repository: "ometere123/reclose", commit: COMMIT, baseUrl: BASE, files: records, frozenAt: new Date().toISOString() };
await fs.writeFile(new URL("../release-evidence/r1/e1/live-evidence/anchor.json", import.meta.url), JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ commit: COMMIT, files: records.map(({ file, url, httpStatus, bytes, contentHash }) => ({ file, url, httpStatus, bytes, contentHash })) }, null, 2));
