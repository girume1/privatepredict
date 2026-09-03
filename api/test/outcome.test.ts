import { describe, it, expect } from "vitest";
import { encodeOutcome, decodeOutcome, type Outcome } from "../src/outcome.js";

const OUTCOMES: Outcome[] = ["HOME", "DRAW", "AWAY"];

describe("outcome encoding", () => {
  it("encodes each outcome to a 32-byte value", () => {
    for (const outcome of OUTCOMES) {
      const bytes = encodeOutcome(outcome);
      expect(bytes.length).toEqual(32);
    }
  });

  it("matches the verified Compact pad(32, <string>) byte layout", () => {
    const bytes = encodeOutcome("HOME");
    const expected = new Uint8Array(32);
    expected.set(new TextEncoder().encode("HOME"), 0);
    expect(bytes).toEqual(expected);
  });

  it("round-trips through decodeOutcome", () => {
    for (const outcome of OUTCOMES) {
      expect(decodeOutcome(encodeOutcome(outcome))).toEqual(outcome);
    }
  });

  it("produces a distinct encoding per outcome", () => {
    const encodings = OUTCOMES.map(encodeOutcome);
    expect(encodings[0]).not.toEqual(encodings[1]);
    expect(encodings[0]).not.toEqual(encodings[2]);
    expect(encodings[1]).not.toEqual(encodings[2]);
  });

  it("returns null for bytes that don't match a known outcome", () => {
    expect(decodeOutcome(new Uint8Array(32))).toBeNull();
  });

  it("returns null for the wrong length", () => {
    expect(decodeOutcome(new Uint8Array(16))).toBeNull();
  });
});
