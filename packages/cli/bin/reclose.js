#!/usr/bin/env node
// The real `reclose` CLI entrypoint (CLAUDE.md Section 8/21: Reclose must be usable
// programmatically, without the hosted frontend). Dispatches to the pure command implementations
// in ../dist/index.js; only this file touches process.argv/console/process.exit directly, so the
// commands themselves stay unit-testable.

"use strict";

const fs = require("fs");
const path = require("path");

const { runPolicyCompile, runEvidenceBuild, runTxTrack } = require(path.join(__dirname, "..", "dist", "index.js"));
const { assertCanonicalChainId, RECLOSE_CANONICAL_CHAIN_ID } = require(
  path.join(__dirname, "..", "..", "protocol-sdk", "dist", "index.js")
);

const STUDIO_DEV_RPC = "https://studio-dev.genlayer.com/api";

function usage() {
  return [
    "Usage:",
    "  reclose policy compile <manifest.json>",
    "  reclose evidence build <eap-input.json>",
    "  reclose tx track <txId> [--rpc <url>]",
    "",
    `Canonical network: GenLayer Studio-dev, chain ID ${RECLOSE_CANONICAL_CHAIN_ID} (CLAUDE.md Section 10).`,
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const [group, action, ...rest] = args;

  if (group === "policy" && action === "compile") {
    const file = rest[0];
    if (!file) {
      console.error(usage());
      process.exit(1);
    }
    const text = fs.readFileSync(file, "utf8");
    const result = runPolicyCompile(text);
    console.log(result.output);
    process.exit(result.exitCode);
  }

  if (group === "evidence" && action === "build") {
    const file = rest[0];
    if (!file) {
      console.error(usage());
      process.exit(1);
    }
    const text = fs.readFileSync(file, "utf8");
    const result = runEvidenceBuild(text);
    console.log(result.output);
    process.exit(result.exitCode);
  }

  if (group === "tx" && action === "track") {
    const txId = rest[0];
    let rpc = STUDIO_DEV_RPC;
    const rpcFlagIndex = rest.indexOf("--rpc");
    if (rpcFlagIndex !== -1 && rest[rpcFlagIndex + 1]) {
      rpc = rest[rpcFlagIndex + 1];
    }
    if (!txId) {
      console.error(usage());
      process.exit(1);
    }

    // Lazily required: genlayer-js is only needed for this one network-touching command.
    const { createClient, chains } = require("genlayer-js");
    const chain = { ...chains.studioDevnet, id: RECLOSE_CANONICAL_CHAIN_ID, rpcUrls: { default: { http: [rpc] } } };
    const client = createClient({ chain });
    const reportedChainId = await client.getChainId();
    try {
      assertCanonicalChainId(Number(reportedChainId));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }

    const trackerClient = {
      async getTransaction({ hash }) {
        const tx = await client.getTransaction({ hash });
        return { txId: hash, status: tx.statusName, result: tx.resultName ?? null };
      },
      async getTriggeredTransactionIds({ hash }) {
        return client.getTriggeredTransactionIds({ hash });
      },
    };

    const result = await runTxTrack(txId, trackerClient);
    console.log(result.output);
    process.exit(result.exitCode);
  }

  console.error(usage());
  process.exit(1);
}

main().catch((e) => {
  console.error("Unexpected CLI error (not fabricated as a recognized command failure):");
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
