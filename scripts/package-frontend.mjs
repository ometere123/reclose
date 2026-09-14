import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, "dist");
if (!output.startsWith(`${root}${path.sep}`)) throw new Error("Refusing to package frontend outside the repository dist directory.");
await mkdir(output, { recursive: true });
await cp(path.join(root, "frontend"), output, { recursive: true, force: true });
console.log(`Packaged live Reclose frontend to ${output}`);
