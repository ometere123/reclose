import {
  compileCanonicalApm,
  hashCanonicalApm,
  validateCanonicalApm,
  diffCanonicalApm,
  type CanonicalApm,
} from "@reclose/policy-compiler";

export interface CommandResult { exitCode: number; output: string; }

function parse(text: string): unknown {
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`Input is not valid JSON: ${(error as Error).message}`); }
}

export function runPolicyValidate(text: string): CommandResult {
  try {
    const result = validateCanonicalApm(parse(text));
    return { exitCode: result.valid ? 0 : 1, output: JSON.stringify(result, null, 2) };
  } catch (error) {
    return { exitCode: 1, output: JSON.stringify({ valid: false, errors: [(error as Error).message] }, null, 2) };
  }
}

export function runPolicyHash(text: string): CommandResult {
  try { return { exitCode: 0, output: hashCanonicalApm(parse(text)) }; }
  catch (error) { return { exitCode: 1, output: (error as Error).message }; }
}

export function runPolicyDiff(fromText: string, toText: string): CommandResult {
  try {
    const from = parse(fromText);
    const to = parse(toText);
    return { exitCode: 0, output: JSON.stringify(diffCanonicalApm(from, to), null, 2) };
  } catch (error) {
    return { exitCode: 1, output: (error as Error).message };
  }
}

export function runCanonicalPolicyCompile(text: string): CommandResult {
  try {
    const apm = parse(text) as CanonicalApm;
    const compiled = compileCanonicalApm(apm);
    return { exitCode: 0, output: JSON.stringify(compiled, null, 2) };
  } catch (error) {
    return { exitCode: 1, output: (error as Error).message };
  }
}
