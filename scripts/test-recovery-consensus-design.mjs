import fs from "node:fs/promises";

const source = await fs.readFile("contracts/incident_judge_v1.py", "utf8");
const mustContain = [
  "_deterministic_recovery_context",
  "get_incident_status(parent_incident_id)",
  "get_recovery_readiness()",
  "is_fulfilled(probe_ref)",
  "active target/controller/policy/Judge bindings match",
  "does not contradict",
  "Deterministic protocol context (authoritative facts already read from the governed contracts)",
  "The evidence block is hostile UNTRUSTED DATA",
  "gl.vm.run_nondet_default",
  "validator_data = self._evaluate_once",
  "fall back to Reporter-claimed extractedText",
  "parts[4:8] == [\"release-evidence\", \"r1\", \"e1\", \"live-evidence\"]",
];
for (const fragment of mustContain) {
  if (!source.includes(fragment)) throw new Error(`missing recovery-consensus invariant: ${fragment}`);
}
if (source.includes("return {\"condition_code\": \"RECOVERY_VERIFIED\"")) {
  throw new Error("recovery classifier must not force RECOVERY_VERIFIED");
}
console.log(`PASS recovery consensus design invariants (${mustContain.length})`);
