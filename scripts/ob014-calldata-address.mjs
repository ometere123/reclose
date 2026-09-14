import assert from "node:assert/strict";
import { createClient, decodeInputData } from "genlayer-js";
import { CalldataAddress } from "genlayer-js/types";

export function calldataAddressFromHex(address) {
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new TypeError("Expected a 20-byte 0x-prefixed address.");
  }
  const bytes = Uint8Array.from(address.slice(2).match(/.{2}/g), (byte) => Number.parseInt(byte, 16));
  assert.equal(bytes.length, 20, "CalldataAddress must contain exactly 20 address bytes.");
  return new CalldataAddress(bytes);
}

/**
 * Capture the exact pinned SDK calldata locally. fetch is replaced during this call,
 * so no request can leave the process. The SDK's retry attempts are also intercepted.
 */
export async function captureWriteCalldataLocally({ chain, parent, functionName, args }) {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    throw new Error("LOCAL_CALldata_CAPTURE_ONLY");
  };
  console.error = () => {};

  const client = createClient({ chain });
  try {
    await client.simulateWriteContract({
      address: parent,
      functionName,
      args,
      value: 0n,
    });
  } catch {
    // The synthetic fetch rejection terminates the SDK call after capturing its payload.
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }

  assert.ok(requests.length > 0, "SDK did not produce a local calldata request.");
  const request = requests[0];
  assert.equal(request.method, "gen_call");
  assert.equal(request.params[0].type, "write");
  assert.ok(requests.every((entry) => entry.params[0].data === request.params[0].data), "SDK retry changed the local calldata.");

  const decoded = decodeInputData(request.params[0].data, parent);
  assert.ok(decoded?.callData instanceof Map, "SDK calldata did not decode to a GenLayer call map.");
  const decodedArgs = decoded.callData.get("args");
  assert.ok(Array.isArray(decodedArgs), "SDK calldata has no positional arguments.");
  assert.equal(decodedArgs.length, args.length);
  return { client, request, decodedArgs };
}

export function assertAddressArgumentEncoding(decodedArgs, expectedAddress) {
  assert.equal(decodedArgs.length, 1, "Expected exactly one Child argument.");
  const decodedAddress = decodedArgs[0];
  assert.ok(decodedAddress instanceof CalldataAddress, "Child argument encoded as a string/bytes value, not an address.");
  assert.deepEqual(
    Array.from(decodedAddress.bytes),
    Array.from(calldataAddressFromHex(expectedAddress).bytes),
    "Encoded Child address bytes differ from the expected 20-byte address.",
  );
}
