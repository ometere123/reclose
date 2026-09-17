import fs from "node:fs/promises";
import { createClient, chains, isSuccessful } from "genlayer-js";
const artifact = process.env.RECLOSE_ROOT_ARTIFACT, hash = process.env.RECLOSE_TX_HASH;
const c = createClient({ chain: { ...chains.studioDevnet, id: 61997, rpcUrls: { default: { http: ["https://studio-dev.genlayer.com/api"] } } } });
const safe = v => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === "bigint" ? x.toString() : x));
const r = await c.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 4000, retries: 150 });
const j = JSON.parse(await fs.readFile(artifact, "utf8")); j.receipt = safe(r); j.executionResult = r.txExecutionResultName ?? r.executionResultName ?? r.execution_result; j.lifecycle = isSuccessful(r) && j.executionResult === "FINISHED_WITH_RETURN" ? "VERIFIED" : "FAILED"; await fs.writeFile(artifact, JSON.stringify(j, null, 2) + "\n"); console.log(JSON.stringify({ hash, lifecycle: j.lifecycle, executionResult: j.executionResult }));
