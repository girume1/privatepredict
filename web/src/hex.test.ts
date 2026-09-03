import { describe, it, expect } from "vitest";
import { bytesToHex, hexToBytes } from "./hex.js";

describe("hex", () => {
  it("round-trips bytes through hex", () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255]);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it("returns null for odd-length input", () => {
    expect(hexToBytes("abc")).toBeNull();
  });

  it("returns null for non-hex characters", () => {
    expect(hexToBytes("zz")).toBeNull();
  });

  it("accepts uppercase hex", () => {
    expect(hexToBytes("FF")).toEqual(new Uint8Array([255]));
  });

  it("returns an empty array for an empty string", () => {
    expect(hexToBytes("")).toEqual(new Uint8Array(0));
  });
});
