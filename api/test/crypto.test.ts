import { describe, it, expect } from "vitest";
import { generateSecretKey, generateSalt } from "../src/crypto.js";

describe("local secret generation", () => {
  it("generates 32-byte secret keys", () => {
    expect(generateSecretKey().length).toEqual(32);
  });

  it("generates 32-byte salts", () => {
    expect(generateSalt().length).toEqual(32);
  });

  it("does not repeat values across calls", () => {
    expect(generateSecretKey()).not.toEqual(generateSecretKey());
    expect(generateSalt()).not.toEqual(generateSalt());
  });
});
