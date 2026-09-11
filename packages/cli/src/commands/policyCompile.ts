// `reclose policy compile <manifest.json>` - pure, offline, no network call. Wraps
// @reclose/policy-compiler; this module is deliberately a thin pass-through so a compile failure
// always reports the exact same error the library itself raises (never a CLI-specific
// re-interpretation that could drift from the library's own on-chain-error-code cross-references).

import { compilePolicyManifest, PolicyCompileError, type PolicyManifest } from "@reclose/policy-compiler";

export interface CommandResult {
  exitCode: 0 | 1;
  output: string;
}

export function runPolicyCompile(manifestJsonText: string): CommandResult {
  let manifest: PolicyManifest;
  try {
    manifest = JSON.parse(manifestJsonText) as PolicyManifest;
  } catch (e) {
    return { exitCode: 1, output: `Invalid JSON manifest: ${(e as Error).message}` };
  }

  try {
    const compiled = compilePolicyManifest(manifest);
    const lines: string[] = [];
    lines.push(`manifestHash: ${compiled.manifestHash}`);
    lines.push("");
    lines.push("Ordered Kernel write-call sequence (run each with the studio-dev fee-estimation");
    lines.push("pattern - see scripts/studio-dev-write.sh; activate_policy is a SEPARATE step,");
    lines.push("not emitted here, since it requires live timelock state this compiler cannot know):");
    lines.push("");
    for (const call of compiled.calls) {
      lines.push(`  ${call.functionName} ${call.args.map((a) => JSON.stringify(a)).join(" ")}`);
      lines.push(`    # ${call.description}`);
    }
    return { exitCode: 0, output: lines.join("\n") };
  } catch (e) {
    if (e instanceof PolicyCompileError) {
      return { exitCode: 1, output: `Policy compile rejected: ${e.message}` };
    }
    throw e;
  }
}
