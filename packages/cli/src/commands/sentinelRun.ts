import { execFileSync } from "node:child_process";
import type { CommandResult } from "./policyCompile";

/**
 * Real, keyless `sentinel run` for the `reclose` CLI. This CLI never custodies a private key
 * (Section 21 header rule), so the ReporterClient's actual signature comes from the local
 * `genlayer` CLI's own configured keystore - the exact same pattern already used by
 * scripts/studio-dev-write.sh and scripts/a2-c01-live-retest.mjs: shell out to `genlayer write`
 * with public arguments only, never touch key material in this process.
 *
 * Config file shape (JSON):
 * {
 *   "sources": [{ "sourceId": "...", "url": "...", "sourceClass": "AUTHORITATIVE_PUBLIC", "pattern": "..." }],
 *   "context": { "targetId": "...", "policyKey": "...", "policyHash": "0x...", "ruleId": "PROVIDER_COMPROMISE_V1", "resourceId": "...", "subject": "..." },
 *   "judgeAddress": "0x...",
 *   "reporterAccount": "reclose-deployer",
 *   "rpc": "https://studio-dev.genlayer.com/api",
 *   "stateFile": ".sentinel-state.json",
 *   "cooldownSeconds": 300,
 *   "intervalSeconds": 60,
 *   "maxTicks": 0
 * }
 */
export interface SentinelRunConfig {
  sources: Array<{ sourceId: string; url: string; sourceClass: string; pattern: string }>;
  context: { targetId: string; policyKey: string; policyHash: `0x${string}`; ruleId: string; resourceId: string; subject: string };
  judgeAddress: `0x${string}`;
  reporterAccount: string;
  rpc?: string;
  stateFile?: string;
  cooldownSeconds?: number;
  intervalSeconds?: number;
  maxTicks?: number;
}

function genlayerAccountAddress(account: string): `0x${string}` {
  const out = execFileSync("genlayer", ["account", "show", "--account", account, "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(out) as { address: `0x${string}` };
  return parsed.address;
}

/** Shells out to `genlayer write` exactly like scripts/studio-dev-write.sh - never touches the
 * private key itself, which stays inside the genlayer CLI's own OS-keychain-backed keystore. */
function genlayerWriteSubmitIncident(
  judgeAddress: string,
  rpc: string,
  reporterAccount: string,
  args: { targetId: string; policyKey: string; ruleId: string; resourceId: string; evidenceHash: string; evidenceJson: string; reporterNonce: number; bondId: string },
): { txId: string } {
  const out = execFileSync("genlayer", [
    "write", judgeAddress, "submit_incident",
    "--rpc", rpc,
    "--account", reporterAccount,
    "--json",
    "--args", args.targetId, args.policyKey, args.ruleId, args.resourceId, args.evidenceHash, args.evidenceJson, String(args.reporterNonce), args.bondId,
  ], { encoding: "utf8" });
  const parsed = JSON.parse(out) as { txId?: string; hash?: string };
  const txId = parsed.txId ?? parsed.hash;
  if (!txId) throw new Error("genlayer write returned no transaction id");
  return { txId };
}

/** Builds the real SentinelRunner wiring (monitor + FileSentinelStateStore + a genlayer-CLI-backed
 * ReporterClient) from a config object. Exported separately from the process-loop entrypoint so it
 * can be unit-tested without actually shelling out or sleeping. */
export function buildSentinelRunnerFromConfig(
  config: SentinelRunConfig,
  deps: {
    SentinelMonitor: new (sources: unknown[]) => { checkAll(): Promise<unknown[]> };
    SentinelRunner: new (options: unknown) => { runOnce(): Promise<unknown>; resumePending(): Promise<void>; getHealthMetrics(): unknown };
    FileSentinelStateStore: new (path: string) => unknown;
    getNextReporterNonce: () => Promise<number>;
  },
): unknown {
  const rpc = config.rpc ?? "https://studio-next.genlayer.com/api";
  const reporterAddress = genlayerAccountAddress(config.reporterAccount);
  const monitor = new deps.SentinelMonitor(config.sources);
  const store = new deps.FileSentinelStateStore(config.stateFile ?? ".sentinel-state.json");
  const reporter = {
    async getReporterAddress() { return reporterAddress; },
    async getNextReporterNonce() { return deps.getNextReporterNonce(); },
    async submitIncident(args: { targetId: string; policyKey: string; ruleId: string; resourceId: string; evidenceHash: string; evidenceJson: string; reporterNonce: number; bondId: string }) {
      return genlayerWriteSubmitIncident(config.judgeAddress, rpc, config.reporterAccount, args);
    },
  };
  return new deps.SentinelRunner({
    monitor,
    reporter,
    store,
    tracker: { async track() { return null; }, async poll() { return { lifecycle: { derived: { isFinal: true } } }; } },
    context: config.context,
    cooldownSeconds: config.cooldownSeconds,
  });
}

export function summarizeSentinelRunResult(result: { submittedTxId: string | null; duplicateSuppressed: boolean }): CommandResult {
  return { exitCode: 0, output: JSON.stringify(result, null, 2) };
}
