import assert from "node:assert/strict";
import { installStudioDevRpcThrottle } from "./studio-dev-rpc-throttle.mjs";

const starts = [];
let active = 0;
let peak = 0;
let retryCount = 0;
globalThis.fetch = async (_request) => {
  active += 1;
  peak = Math.max(peak, active);
  starts.push(Date.now());
  await new Promise((resolve) => setTimeout(resolve, 2));
  active -= 1;
  if (retryCount++ === 0) return new Response('{"error":{"message":"Server busy"}}', { status: 503 });
  return new Response('{"jsonrpc":"2.0","result":"ok"}', { status: 200 });
};

const retryLogs = [];
installStudioDevRpcThrottle({
  rpcUrl: "https://studio-dev.test/api",
  minIntervalMs: 12,
  maxTransientRetries: 2,
  logger: (message) => retryLogs.push(message),
});

const responses = await Promise.all(Array.from({ length: 4 }, (_, id) => fetch(
  "https://studio-dev.test/api",
  { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id, method: "eth_chainId" }) },
)));
assert.equal(peak, 1, "RPC fetches must share one serialized queue");
assert.equal(responses.length, 4);
assert.ok(responses.every((response) => response.status === 200));
assert.equal(retryCount, 5, "only the transient 503 should cause one retry");
assert.equal(retryLogs.length, 1);
assert.ok(starts.slice(1).every((started, index) => started - starts[index] >= 10), "RPC starts must respect configured spacing");

const other = await fetch("https://other.example/api", { method: "POST", body: "{}" });
assert.equal(other.status, 200, "non-Studio URLs should pass through unchanged");
console.log("Studio-dev RPC throttle: serialization, spacing, transient retry, and endpoint scoping passed.");
