#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cli = require(path.join(__dirname, "..", "dist", "index.js"));
const sdkModule = require(path.join(__dirname, "..", "..", "protocol-sdk", "dist", "index.js"));

const STUDIO_DEV_RPC = "https://studio-dev.genlayer.com/api";

function usage() {
  return [
    "Usage:",
    "  reclose status <targetId>",
    "  reclose target inspect <targetId>",
    "  reclose policy validate <apm.json>",
    "  reclose policy hash <apm.json>",
    "  reclose policy diff <from.json> <to.json>",
    "  reclose policy compile <apm.json>",
    "  reclose policy inspect <targetId>",
    "  reclose evidence build <eap-input.json>",
    "  reclose incident prepare <incident-report-input.json>",
    "  reclose incident inspect <incidentId>",
    "  reclose recovery prepare <recovery-report-input.json>",
    "  reclose decision inspect <decisionId>",
    "  reclose tx track <txId>",
    "  reclose action trace <actionId>",
    "  reclose audit export <targetId> [incidentId ...]",
    "",
    "`prepare` commands build canonical SDK report drafts/fee previews only; they never custody or use a private key.",
    "Network options: --rpc <url>. Default: Studio-dev.",
    "Read/prepare commands require RECLOSE_KERNEL_ADDRESS and RECLOSE_JUDGE_ADDRESS.",
    `Canonical chain ID: ${sdkModule.RECLOSE_CANONICAL_CHAIN_ID}.`,
  ].join("\n");
}

function fileText(file) {
  if (!file) throw new Error("missing input file");
  return fs.readFileSync(file, "utf8");
}

function jsonFile(file) {
  const text = fileText(file);
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`invalid JSON in ${file}: ${error.message}`); }
}

function rpcFrom(args) {
  const index = args.indexOf("--rpc");
  return index >= 0 && args[index + 1] ? args[index + 1] : STUDIO_DEV_RPC;
}

function clientFor(args) {
  const { createClient, chains } = require("genlayer-js");
  const rpc = rpcFrom(args);
  const chain = { ...chains.studioDevnet, id: sdkModule.RECLOSE_CANONICAL_CHAIN_ID, rpcUrls: { default: { http: [rpc] } } };
  return createClient({ chain });
}

function directSdk(args) {
  const kernel = process.env.RECLOSE_KERNEL_ADDRESS;
  const judge = process.env.RECLOSE_JUDGE_ADDRESS;
  if (!kernel || !judge) throw new Error("RECLOSE_KERNEL_ADDRESS and RECLOSE_JUDGE_ADDRESS are required for direct protocol reads/preparation");
  const client = clientFor(args);
  return sdkModule.createRecloseClient({
    transport: sdkModule.createGenLayerTransport(client),
    addresses: { kernel, judge, vault: process.env.RECLOSE_VAULT_ADDRESS || undefined },
  });
}

function printAndExit(result) {
  if (result.output) console.log(result.output);
  process.exit(result.exitCode);
}

async function main() {
  const args = process.argv.slice(2);
  const [group, action, ...rest] = args;

  if (group === "policy" && action === "validate") return printAndExit(cli.runPolicyValidate(fileText(rest[0])));
  if (group === "policy" && action === "hash") return printAndExit(cli.runPolicyHash(fileText(rest[0])));
  if (group === "policy" && action === "diff") return printAndExit(cli.runPolicyDiff(fileText(rest[0]), fileText(rest[1])));
  if (group === "policy" && action === "compile") return printAndExit(cli.runCanonicalPolicyCompile(fileText(rest[0])));
  if (group === "evidence" && action === "build") return printAndExit(cli.runEvidenceBuild(fileText(rest[0])));

  if (group === "tx" && action === "track") {
    const txId = rest[0];
    if (!txId) throw new Error("tx track requires txId");
    const client = clientFor(rest);
    sdkModule.assertCanonicalChainId(Number(await client.getChainId()));
    const trackerClient = {
      async getTransaction({ hash }) {
        const tx = await client.getTransaction({ hash });
        return { txId: hash, status: tx.statusName ?? tx.status, result: tx.resultName ?? tx.result ?? null };
      },
      async getTriggeredTransactionIds({ hash }) { return client.getTriggeredTransactionIds({ hash }); },
    };
    return printAndExit(await cli.runTxTrack(txId, trackerClient));
  }

  if (group === "status" && action) return printAndExit(await cli.runTargetStatus(directSdk(args), action));
  if (group === "target" && action === "inspect") return printAndExit(await cli.runTargetInspect(directSdk(args), rest[0]));
  if (group === "policy" && action === "inspect") return printAndExit(await cli.runPolicyInspect(directSdk(args), rest[0]));
  if (group === "incident" && action === "prepare") return printAndExit(await cli.runIncidentReportPrepare(directSdk(args), jsonFile(rest[0])));
  if (group === "incident" && action === "inspect") return printAndExit(await cli.runIncidentInspect(directSdk(args), rest[0]));
  if (group === "recovery" && action === "prepare") return printAndExit(await cli.runRecoveryPrepare(directSdk(args), jsonFile(rest[0])));
  if (group === "decision" && action === "inspect") return printAndExit(await cli.runDecisionInspect(directSdk(args), rest[0]));
  if (group === "action" && action === "trace") return printAndExit(await cli.runActionTrace(directSdk(args), rest[0]));
  if (group === "audit" && action === "export") {
    const [targetId, ...incidentIds] = rest.filter((x) => x !== "--rpc" && x !== rpcFrom(rest));
    if (!targetId) throw new Error("audit export requires targetId");
    return printAndExit(await cli.runAuditExport(directSdk(args), { targetId, incidentIds }));
  }

  console.error(usage());
  process.exit(1);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
