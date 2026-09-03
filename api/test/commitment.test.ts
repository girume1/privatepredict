import { describe, it, expect } from "vitest";
import { pureCircuits } from "@privatepredict/contract";
import { computeCommitment } from "../src/commitment.js";
import { generateSalt } from "../src/crypto.js";
import { encodeOutcome } from "../src/outcome.js";

describe("computeCommitment", () => {
  it("matches the compiled contract's own computeCommitment circuit exactly", () => {
    const prediction = encodeOutcome("HOME");
    const salt = generateSalt();

    expect(computeCommitment(prediction, salt)).toEqual(
      pureCircuits.computeCommitment(prediction, salt),
    );
  });

  it("produces a different commitment for a different prediction", () => {
    const salt = generateSalt();
    const home = computeCommitment(encodeOutcome("HOME"), salt);
    const draw = computeCommitment(encodeOutcome("DRAW"), salt);

    expect(home).not.toEqual(draw);
  });

  it("produces a different commitment for a different salt", () => {
    const prediction = encodeOutcome("HOME");
    const a = computeCommitment(prediction, generateSalt());
    const b = computeCommitment(prediction, generateSalt());

    expect(a).not.toEqual(b);
  });
});
