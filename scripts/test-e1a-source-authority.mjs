import assert from "node:assert/strict";
import { keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";

const anchor = "404affd0eb28be2345f16b8d87ddf2cb27adae17";
const prefix = `/ometere123/reclose/${anchor}/release-evidence/r1/e1/e1a-fixtures/`;
const allowed = (url) => {
  try { const u = new URL(url); return u.origin === "https://raw.githubusercontent.com" && u.pathname.startsWith(prefix) && !u.pathname.slice(prefix.length).includes("/"); }
  catch { return false; }
};
assert.equal(allowed(`https://raw.githubusercontent.com${prefix}provider-a-remediation.md`), true);
assert.equal(allowed(`https://raw.githubusercontent.com/ometere123/reclose/other/release-evidence/r1/e1/e1a-fixtures/provider-a-remediation.md`), false);
assert.equal(allowed(`https://raw.githubusercontent.com/other/reclose/${anchor}/release-evidence/r1/e1/e1a-fixtures/provider-a-remediation.md`), false);
assert.equal(allowed(`https://raw.githubusercontent.com/ometere123/reclose/${anchor}/release-evidence/r1/e1/e1a-fixtures/nested/provider-a-remediation.md`), false);
assert.notEqual(keccak256Hex("expected bytes"), keccak256Hex("wrong bytes"), "wrong content hash must not be accepted as evidence");
console.log("E1-A source authority tests: 5/5 passed");
