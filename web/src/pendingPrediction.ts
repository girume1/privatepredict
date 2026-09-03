/**
 * Persists a participant's pending {prediction, salt} pair — awaiting
 * reveal — in localStorage, scoped per contract address, on this device
 * only. This is the exact same private data that previously lived only in
 * JS memory (see WalletContext.tsx's history); it never leaves the device
 * either way, so persisting it changes nothing about the privacy model in
 * docs/privacy-model.md — it just survives a reconnect or page reload
 * instead of being silently lost by one, which was a real, demonstrated
 * problem (see DEPLOYMENT.md's testnet lessons).
 */
import { bytesToHex, hexToBytes } from "./hex.js";

export interface PendingPrediction {
  readonly prediction: Uint8Array;
  readonly salt: Uint8Array;
}

function storageKey(contractAddress: string): string {
  return `privatepredict.pending.${contractAddress}`;
}

export function savePending(
  contractAddress: string,
  pending: PendingPrediction,
): void {
  try {
    localStorage.setItem(
      storageKey(contractAddress),
      JSON.stringify({
        prediction: bytesToHex(pending.prediction),
        salt: bytesToHex(pending.salt),
      }),
    );
  } catch {
    // Best-effort only (private browsing, full/blocked storage) — the
    // in-memory copy for this tab session still works as before.
  }
}

export function loadPending(contractAddress: string): PendingPrediction | null {
  try {
    const raw = localStorage.getItem(storageKey(contractAddress));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { prediction?: unknown }).prediction !== "string" ||
      typeof (parsed as { salt?: unknown }).salt !== "string"
    ) {
      return null;
    }
    const { prediction: predictionHex, salt: saltHex } = parsed as {
      prediction: string;
      salt: string;
    };
    const prediction = hexToBytes(predictionHex);
    const salt = hexToBytes(saltHex);
    return prediction && salt ? { prediction, salt } : null;
  } catch {
    return null;
  }
}

export function clearPending(contractAddress: string): void {
  try {
    localStorage.removeItem(storageKey(contractAddress));
  } catch {
    // Best-effort only.
  }
}
