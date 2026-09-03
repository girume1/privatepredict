/**
 * A purely off-chain, local list of match contract addresses the user has
 * added to this browser — not a contract feature. The compiled contract
 * still only ever represents one match per deployment (see
 * docs/data-model.md); this just lets the app remember several deployed
 * addresses so a participant can switch between matches without a
 * multi-match contract redesign.
 *
 * Contract addresses are public information (shared by the organizer out
 * of band, same as in DEPLOYMENT.md's Step 1) — unlike prediction salts or
 * secret keys, persisting them in localStorage carries no privacy risk.
 */

export interface SavedMatch {
  readonly address: string;
  readonly label: string;
}

const STORAGE_KEY = "privatepredict.matches";

function readRaw(): SavedMatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry): entry is SavedMatch =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SavedMatch).address === "string" &&
        typeof (entry as SavedMatch).label === "string",
    );
  } catch {
    return [];
  }
}

function writeRaw(matches: SavedMatch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch {
    // Best-effort only (e.g. private browsing, full storage) — the list
    // just won't persist for this session, which is not fatal.
  }
}

/**
 * Reads the saved match list, seeding it on first use with
 * VITE_PREDICTION_BOARD_ADDRESS (if configured) so a single-match
 * deployment keeps working with zero extra setup.
 */
export function loadSavedMatches(defaultAddress?: string): SavedMatch[] {
  const matches = readRaw();
  if (defaultAddress && !matches.some((m) => m.address === defaultAddress)) {
    const seeded = [
      ...matches,
      { address: defaultAddress, label: "Default match" },
    ];
    writeRaw(seeded);
    return seeded;
  }
  return matches;
}

export function addMatch(address: string, label: string): SavedMatch[] {
  const trimmedAddress = address.trim();
  const trimmedLabel = label.trim() || trimmedAddress;
  const matches = readRaw();
  const next = matches.some((m) => m.address === trimmedAddress)
    ? matches.map((m) =>
        m.address === trimmedAddress
          ? { address: trimmedAddress, label: trimmedLabel }
          : m,
      )
    : [...matches, { address: trimmedAddress, label: trimmedLabel }];
  writeRaw(next);
  return next;
}

export function removeMatch(address: string): SavedMatch[] {
  const next = readRaw().filter((m) => m.address !== address);
  writeRaw(next);
  return next;
}
