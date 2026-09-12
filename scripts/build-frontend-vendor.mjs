#!/usr/bin/env node
// Bundles the EXACT pinned genlayer-js@2.0.0-rc.1 (see scripts/genlayer-vendor-entry.mjs) into a
// single browser-consumable ESM file at frontend/vendor/genlayer-client.js. This is the one build
// step the frontend's browser write path needs - the frontend otherwise remains plain static
// files with no bundler. Run via `npm run frontend:vendor:build`; CI/verify regenerates it so the
// committed repo never depends on a stale bundle (frontend/vendor/ is gitignored).
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "scripts", "genlayer-vendor-entry.mjs")],
  outfile: path.join(root, "frontend", "vendor", "genlayer-client.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  logLevel: "info",
});
console.log("Built frontend/vendor/genlayer-client.js from the pinned genlayer-js@2.0.0-rc.1");
