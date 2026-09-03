/**
 * A localStorage-backed wrapper around inMemoryPrivateStateProvider.ts,
 * scoped per contract address, on this device only.
 *
 * Why this exists: the verified in-memory reference regenerates a fresh
 * random participant identity on every connect() call (see connect.ts's
 * PredictionBoardAPI.join() -> getPrivateState() fallback), which is
 * correct for a genuinely new participant but destroys the *same*
 * participant's ability to reveal later if they reconnect or reload before
 * doing so — a real, demonstrated failure mode (see DEPLOYMENT.md's
 * testnet lessons: "Your local prediction data could not be found").
 * Persisting the identity fixes that without changing what is stored or
 * where — it is never transmitted anywhere either way, so this does not
 * change the privacy model in docs/privacy-model.md, only how long the
 * data survives on the participant's own device.
 */
import type { ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import type {
  PrivateStateId,
  PrivateStateProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { inMemoryPrivateStateProvider } from "./inMemoryPrivateStateProvider.js";

function storageKey(address: ContractAddress): string {
  return `privatepredict.privateState.${address}`;
}

function replacer(_key: string, value: unknown): unknown {
  return value instanceof Uint8Array ? { __bytes__: Array.from(value) } : value;
}

function reviver(_key: string, value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { __bytes__?: unknown }).__bytes__)
  ) {
    return Uint8Array.from((value as { __bytes__: number[] }).__bytes__);
  }
  return value;
}

function readStore<PS>(address: ContractAddress): Record<string, PS> {
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? (JSON.parse(raw, reviver) as Record<string, PS>) : {};
  } catch {
    return {};
  }
}

function writeStore<PS>(
  address: ContractAddress,
  store: Record<string, PS>,
): void {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(store, replacer));
  } catch {
    // Best-effort only — falls back to in-memory-only behavior for this tab.
  }
}

export const persistentPrivateStateProvider = <
  PSI extends PrivateStateId,
  PS = unknown,
>(): PrivateStateProvider<PSI, PS> => {
  const base = inMemoryPrivateStateProvider<PSI, PS>();
  let currentAddress: ContractAddress | null = null;

  return {
    ...base,
    setContractAddress(address: ContractAddress): void {
      base.setContractAddress(address);
      currentAddress = address;
      for (const [key, value] of Object.entries(readStore<PS>(address))) {
        void base.set(key as PSI, value);
      }
    },
    async set(key: PSI, state: PS): Promise<void> {
      await base.set(key, state);
      if (currentAddress) {
        const store = readStore<PS>(currentAddress);
        store[key as string] = state;
        writeStore(currentAddress, store);
      }
    },
    async remove(key: PSI): Promise<void> {
      await base.remove(key);
      if (currentAddress) {
        const store = readStore<PS>(currentAddress);
        delete store[key as string];
        writeStore(currentAddress, store);
      }
    },
    async clear(): Promise<void> {
      await base.clear();
      if (currentAddress) {
        try {
          localStorage.removeItem(storageKey(currentAddress));
        } catch {
          // Best-effort only.
        }
      }
    },
  };
};
