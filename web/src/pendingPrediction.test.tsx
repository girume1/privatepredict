import { describe, it, expect, beforeEach } from "vitest";
import { savePending, loadPending, clearPending } from "./pendingPrediction.js";

const ADDRESS_A = "a".repeat(64);
const ADDRESS_B = "b".repeat(64);

describe("pendingPrediction", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is saved for this address", () => {
    expect(loadPending(ADDRESS_A)).toBeNull();
  });

  it("round-trips a prediction and salt exactly", () => {
    const prediction = new Uint8Array([1, 2, 3]);
    const salt = new Uint8Array(32).fill(7);
    savePending(ADDRESS_A, { prediction, salt });

    const loaded = loadPending(ADDRESS_A);
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!.prediction)).toEqual(Array.from(prediction));
    expect(Array.from(loaded!.salt)).toEqual(Array.from(salt));
  });

  it("scopes by contract address — one address's data doesn't leak into another's", () => {
    savePending(ADDRESS_A, {
      prediction: new Uint8Array([1]),
      salt: new Uint8Array(32).fill(1),
    });
    expect(loadPending(ADDRESS_B)).toBeNull();
  });

  it("clears the saved pending prediction", () => {
    savePending(ADDRESS_A, {
      prediction: new Uint8Array([1]),
      salt: new Uint8Array(32).fill(1),
    });
    clearPending(ADDRESS_A);
    expect(loadPending(ADDRESS_A)).toBeNull();
  });

  it("ignores malformed data already in storage", () => {
    localStorage.setItem(`privatepredict.pending.${ADDRESS_A}`, "not json");
    expect(loadPending(ADDRESS_A)).toBeNull();
  });
});
