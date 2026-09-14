import assert from "node:assert/strict";
import { chains } from "genlayer-js";
import { CalldataAddress } from "genlayer-js/types";
import {
  assertAddressArgumentEncoding,
  calldataAddressFromHex,
  captureWriteCalldataLocally,
} from "./ob014-calldata-address.mjs";

const PARENT = "0xbd7a6BcFaa8Ab8505e7C62C8Dcfff1Ae40fcA5de";
const CHILD = "0x763289C8d65316032e3717C32A84b33c8DaB5020";

const typed = calldataAddressFromHex(CHILD);
assert.ok(typed instanceof CalldataAddress);
assert.equal(typed.bytes.length, 20);

const { request, decodedArgs } = await captureWriteCalldataLocally({
  chain: chains.studioDevnet,
  parent: PARENT,
  functionName: "emit_decided",
  args: [typed],
});
assertAddressArgumentEncoding(decodedArgs, CHILD);

// Negative control: the previous plain-string argument must decode as a string.
const stringControl = await captureWriteCalldataLocally({
  chain: chains.studioDevnet,
  parent: PARENT,
  functionName: "emit_decided",
  args: [CHILD],
});
assert.equal(stringControl.decodedArgs[0], CHILD);
assert.equal(typeof stringControl.decodedArgs[0], "string");

console.log(JSON.stringify({
  test: "OB-014 CalldataAddress wire encoding",
  result: "PASS",
  parent: PARENT,
  method: "emit_decided",
  child: CHILD,
  typedArgumentBytes: Array.from(typed.bytes),
  sdkRequestMethod: request.method,
  sdkTransactionType: request.params[0].type,
  calldata: request.params[0].data,
  decodedArgumentType: "CalldataAddress",
  stringNegativeControl: "decodes as string and is rejected by the encoding assertion",
  networkRequestsMade: 0,
}, null, 2));
