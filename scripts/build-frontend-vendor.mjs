#!/usr/bin/env node
// Bundles the EXACT pinned genlayer-js@2.0.0-rc.1 (see scripts/genlayer-vendor-entry.mjs) into a
// single browser-consumable ESM file at frontend/vendor/genlayer-client.js. This is the one build
// step the frontend's browser write path needs - the frontend otherwise remains plain static
// files with no bundler. Run via `npm run frontend:vendor:build`; CI/verify regenerates it so the
// committed repo never depends on a stale bundle (frontend/vendor/ is gitignored).
import { build } from "esbuild";
import path from "node:path";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentManifest = process.env.RECLOSE_FRONTEND_MANIFEST ?? "deployment/61997/r1-run-a7-manifest.json";
const vendorDir = path.join(root, "frontend", "vendor");
await mkdir(vendorDir, { recursive: true });

await build({
  entryPoints: [path.join(root, "scripts", "reclose-browser-runtime-entry.mjs")],
  outfile: path.join(root, "frontend", "vendor", "reclose-runtime.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  define: {
    __RECLOSE_DEPLOYMENT__: JSON.stringify(JSON.parse(await readFile(path.resolve(root, deploymentManifest), "utf8"))),
  },
  sourcemap: false,
  logLevel: "info",
});
await copyFile(path.join(root, "node_modules", "@genlayer", "transaction-kit-react", "dist", "styles.css"), path.join(vendorDir, "transaction-kit.css"));
console.log("Built frontend/vendor/reclose-runtime.js with the pinned GenLayer SDK, Reclose SDK/compiler, and Transaction Kit adapter.");
