import { createClient, chains } from "genlayer-js";
import { verifyPolicyReadback } from "../../../packages/policy-compiler/dist/index.js";
import { readFileSync } from "node:fs";

const compiled = JSON.parse(readFileSync("deployment/61997/apm-r1-004-compiled.json", "utf8"));
const chain = { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: ["https://studio-dev.genlayer.com/api"] } } };
const client = createClient({ chain });
const transport = { readContract: (args) => client.readContract(args) };

const result = await verifyPolicyReadback({
  transport,
  kernelAddress: "0x62f0e68c8e2Ab2Ab8afFE1E2D1FCf70197F59621",
  policyKey: "policy-r1-004",
  compiled,
});
console.log(JSON.stringify(result, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2));
process.exit(result.verified ? 0 : 1);
