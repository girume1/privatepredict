import { describe, it, expect, beforeEach } from "vitest";
import { persistentPrivateStateProvider } from "./persistentPrivateStateProvider.js";

type TestState = {
  participantSecretKey: Uint8Array;
  organizerSecretKey: Uint8Array;
};

const ADDRESS_A = "a".repeat(64);
const ADDRESS_B = "b".repeat(64);
const KEY = "predictionBoardPrivateState" as const;

function state(n: number): TestState {
  return {
    participantSecretKey: new Uint8Array(32).fill(n),
    organizerSecretKey: new Uint8Array(32).fill(n + 1),
  };
}

describe("persistentPrivateStateProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a set/get within the same instance", async () => {
    const provider = persistentPrivateStateProvider<typeof KEY, TestState>();
    provider.setContractAddress(ADDRESS_A);
    await provider.set(KEY, state(1));

    const loaded = await provider.get(KEY);
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!.participantSecretKey)).toEqual(
      Array.from(state(1).participantSecretKey),
    );
  });

  it("survives a fresh instance for the same address — the whole point of persistence", async () => {
    const first = persistentPrivateStateProvider<typeof KEY, TestState>();
    first.setContractAddress(ADDRESS_A);
    await first.set(KEY, state(5));

    // A brand-new provider instance simulates a reconnect or page reload.
    const second = persistentPrivateStateProvider<typeof KEY, TestState>();
    second.setContractAddress(ADDRESS_A);
    const loaded = await second.get(KEY);

    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!.participantSecretKey)).toEqual(
      Array.from(state(5).participantSecretKey),
    );
  });

  it("scopes by contract address — different addresses don't collide", async () => {
    const provider = persistentPrivateStateProvider<typeof KEY, TestState>();
    provider.setContractAddress(ADDRESS_A);
    await provider.set(KEY, state(1));

    provider.setContractAddress(ADDRESS_B);
    expect(await provider.get(KEY)).toBeNull();
  });

  it("remove() clears the persisted value too", async () => {
    const provider = persistentPrivateStateProvider<typeof KEY, TestState>();
    provider.setContractAddress(ADDRESS_A);
    await provider.set(KEY, state(1));
    await provider.remove(KEY);

    const fresh = persistentPrivateStateProvider<typeof KEY, TestState>();
    fresh.setContractAddress(ADDRESS_A);
    expect(await fresh.get(KEY)).toBeNull();
  });

  it("clear() removes the whole persisted entry for this address", async () => {
    const provider = persistentPrivateStateProvider<typeof KEY, TestState>();
    provider.setContractAddress(ADDRESS_A);
    await provider.set(KEY, state(1));
    await provider.clear();

    const fresh = persistentPrivateStateProvider<typeof KEY, TestState>();
    fresh.setContractAddress(ADDRESS_A);
    expect(await fresh.get(KEY)).toBeNull();
  });
});
