/**
 * Canonical JSON + Keccak-256 primitives shared by every Reclose client surface.
 *
 * `jcsCanonicalize` implements the JSON-compatible subset of RFC 8785 (JCS):
 * - object keys sorted lexicographically by UTF-16 code units (JavaScript's default string sort),
 * - arrays retain order,
 * - strings/numbers/booleans/null use ECMAScript JSON serialization,
 * - undefined, bigint, functions, symbols and non-finite numbers are rejected.
 *
 * `keccak256Hex` is Keccak-256, NOT FIPS SHA3-256.  Reclose policy/evidence identities are
 * `Keccak-256(RFC8785-JCS(value))` and must never silently fall back to SHA-256/SHA3-256.
 */

const MASK_64 = (1n << 64n) - 1n;
const RATE_BYTES = 136; // Keccak-256 rate = 1088 bits.

const ROTATION_OFFSETS = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
] as const;

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an,
  0x8000000080008000n, 0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
] as const;

function rotl64(value: bigint, shift: number): bigint {
  if (shift === 0) return value & MASK_64;
  const s = BigInt(shift);
  return ((value << s) | (value >> (64n - s))) & MASK_64;
}

function keccakF1600(state: bigint[]): void {
  const c = new Array<bigint>(5).fill(0n);
  const d = new Array<bigint>(5).fill(0n);
  const b = new Array<bigint>(25).fill(0n);

  for (const rc of ROUND_CONSTANTS) {
    // theta
    for (let x = 0; x < 5; x++) {
      c[x] = state[x]! ^ state[x + 5]! ^ state[x + 10]! ^ state[x + 15]! ^ state[x + 20]!;
    }
    for (let x = 0; x < 5; x++) {
      d[x] = c[(x + 4) % 5]! ^ rotl64(c[(x + 1) % 5]!, 1);
    }
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i = x + 5 * y;
        state[i] = (state[i]! ^ d[x]!) & MASK_64;
      }
    }

    // rho + pi
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i = x + 5 * y;
        const newX = y;
        const newY = (2 * x + 3 * y) % 5;
        b[newX + 5 * newY] = rotl64(state[i]!, ROTATION_OFFSETS[i]!);
      }
    }

    // chi
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i = x + 5 * y;
        state[i] = (b[i]! ^ ((~b[((x + 1) % 5) + 5 * y]!) & b[((x + 2) % 5) + 5 * y]!)) & MASK_64;
      }
    }

    // iota
    state[0] = (state[0]! ^ rc) & MASK_64;
  }
}

function utf8Encode(input: string): Uint8Array {
  // Buffer is intentionally avoided so the primitive remains browser-compatible.
  const encoded = unescape(encodeURIComponent(input));
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) out[i] = encoded.charCodeAt(i);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function absorbBlock(state: bigint[], block: Uint8Array): void {
  for (let lane = 0; lane < RATE_BYTES / 8; lane++) {
    let v = 0n;
    const offset = lane * 8;
    for (let i = 0; i < 8; i++) v |= BigInt(block[offset + i]!) << BigInt(8 * i);
    state[lane] = (state[lane]! ^ v) & MASK_64;
  }
  keccakF1600(state);
}

export function keccak256Bytes(input: Uint8Array): Uint8Array {
  const state = new Array<bigint>(25).fill(0n);
  let offset = 0;
  while (offset + RATE_BYTES <= input.length) {
    absorbBlock(state, input.slice(offset, offset + RATE_BYTES));
    offset += RATE_BYTES;
  }

  const last = new Uint8Array(RATE_BYTES);
  last.set(input.slice(offset));
  const padStart = input.length - offset;
  last[padStart] = (last[padStart] ?? 0) ^ 0x01; // Keccak domain suffix, deliberately not SHA3's 0x06.
  last[RATE_BYTES - 1] = (last[RATE_BYTES - 1] ?? 0) ^ 0x80;
  absorbBlock(state, last);

  const out = new Uint8Array(32);
  for (let i = 0; i < out.length; i++) {
    const lane = state[Math.floor(i / 8)]!;
    out[i] = Number((lane >> BigInt(8 * (i % 8))) & 0xffn);
  }
  return out;
}

export function keccak256Hex(input: string | Uint8Array): `0x${string}` {
  const bytes = typeof input === "string" ? utf8Encode(input) : input;
  return `0x${bytesToHex(keccak256Bytes(bytes))}`;
}

function canonicalizeInternal(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("JCS rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeInternal).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of Object.keys(obj).sort()) {
      const child = obj[key];
      if (child === undefined || typeof child === "function" || typeof child === "symbol" || typeof child === "bigint") {
        throw new TypeError(`JCS rejects unsupported value at key ${key}`);
      }
      parts.push(`${JSON.stringify(key)}:${canonicalizeInternal(child)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new TypeError(`JCS rejects unsupported ${typeof value} value`);
}

export function jcsCanonicalize(value: unknown): string {
  return canonicalizeInternal(value);
}

export function canonicalKeccak256(value: unknown): `0x${string}` {
  return keccak256Hex(jcsCanonicalize(value));
}
