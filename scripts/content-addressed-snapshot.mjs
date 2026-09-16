import { keccak256Hex } from "../packages/protocol-sdk/dist/canonical.js";

export function hashAuthoritativeBytes(bytes) {
  const value = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return keccak256Hex(value);
}

export async function fetchAuthoritativeSnapshot(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Snapshot fetch failed: HTTP ${response.status} (${url})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const hash = hashAuthoritativeBytes(bytes);
  if (hash.toLowerCase() !== keccak256Hex(text).toLowerCase()) {
    throw new Error(`Snapshot bytes are not a valid UTF-8 round-trip for ${url}`);
  }
  return { url, httpStatus: response.status, bytes, text, hash };
}

export function normalizedFixtureMatches(localText, authoritativeText) {
  return String(localText).replace(/\r\n/g, "\n") === String(authoritativeText).replace(/\r\n/g, "\n");
}
