export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Shortens a hex string (or any address-like string) for display only. */
export function truncateHex(value: string, head = 6, tail = 4): string {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Returns null (rather than throwing) for anything that isn't valid hex. */
export function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
