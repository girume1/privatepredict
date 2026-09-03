/**
 * Encoding for match predictions/results as the Bytes<32> values the
 * PredictionBoard contract's `prediction`/`result` circuit parameters
 * expect. The contract itself treats these as opaque 32-byte values with no
 * built-in HOME/DRAW/AWAY validation (see contract/src/prediction-board.compact,
 * publishResult TODO) — this encoding is an API-layer convention, not a
 * contract-enforced one.
 *
 * The byte layout mirrors Compact's own `pad(32, <string>)` builtin (UTF-8
 * bytes, left-aligned, zero-padded to 32 bytes), verified against the
 * installed compact 0.31.1 compiler, so it stays consistent with the
 * domain-separation tags the contract itself already uses (e.g. "pp:pid:").
 */
export type Outcome = "HOME" | "DRAW" | "AWAY";

const OUTCOMES: readonly Outcome[] = ["HOME", "DRAW", "AWAY"];

export function encodeOutcome(outcome: Outcome): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoded = new TextEncoder().encode(outcome);
  bytes.set(encoded, 0);
  return bytes;
}

export function decodeOutcome(bytes: Uint8Array): Outcome | null {
  if (bytes.length !== 32) {
    return null;
  }
  for (const outcome of OUTCOMES) {
    if (bytesEqual(bytes, encodeOutcome(outcome))) {
      return outcome;
    }
  }
  return null;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
