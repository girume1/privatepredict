import { describe, it, expect, beforeEach } from "vitest";
import { addMatch, loadSavedMatches, removeMatch } from "./matchRegistry.js";

const ADDRESS_A = "a".repeat(64);
const ADDRESS_B = "b".repeat(64);

describe("matchRegistry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty list when nothing is saved and no default is given", () => {
    expect(loadSavedMatches()).toEqual([]);
  });

  it("seeds the list with the default address on first use", () => {
    const matches = loadSavedMatches(ADDRESS_A);
    expect(matches).toEqual([{ address: ADDRESS_A, label: "Default match" }]);
  });

  it("does not duplicate the default address on repeated loads", () => {
    loadSavedMatches(ADDRESS_A);
    const matches = loadSavedMatches(ADDRESS_A);
    expect(matches).toHaveLength(1);
  });

  it("adds a match with a trimmed address and label", () => {
    const matches = addMatch(`  ${ADDRESS_A}  `, "  My Match  ");
    expect(matches).toEqual([{ address: ADDRESS_A, label: "My Match" }]);
  });

  it("falls back to the address as the label when none is given", () => {
    const matches = addMatch(ADDRESS_A, "");
    expect(matches).toEqual([{ address: ADDRESS_A, label: ADDRESS_A }]);
  });

  it("updates the label when the same address is added again", () => {
    addMatch(ADDRESS_A, "First label");
    const matches = addMatch(ADDRESS_A, "Second label");
    expect(matches).toEqual([{ address: ADDRESS_A, label: "Second label" }]);
  });

  it("persists across separate calls, keyed by address", () => {
    addMatch(ADDRESS_A, "Match A");
    addMatch(ADDRESS_B, "Match B");
    expect(loadSavedMatches()).toEqual([
      { address: ADDRESS_A, label: "Match A" },
      { address: ADDRESS_B, label: "Match B" },
    ]);
  });

  it("removes a match by address", () => {
    addMatch(ADDRESS_A, "Match A");
    addMatch(ADDRESS_B, "Match B");
    const matches = removeMatch(ADDRESS_A);
    expect(matches).toEqual([{ address: ADDRESS_B, label: "Match B" }]);
  });

  it("ignores malformed data already in storage", () => {
    localStorage.setItem("privatepredict.matches", "not json");
    expect(loadSavedMatches()).toEqual([]);
  });
});
