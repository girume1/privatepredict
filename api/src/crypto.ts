/**
 * Local-only secret generation. Values returned here must never be logged,
 * sent over the network, or persisted anywhere but approved local storage.
 */

/** A fresh 32-byte secret key, generated on-device. */
export function generateSecretKey(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** A fresh 32-byte prediction salt. Must never be reused across commitments. */
export function generateSalt(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}
