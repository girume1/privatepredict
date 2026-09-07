import { useState } from "react";
import { CalendarX2, Plus, Trash2 } from "lucide-react";
import { hexToBytes, truncateHex } from "../hex.js";
import type { SavedMatch } from "../matchRegistry.js";

interface MatchListProps {
  matches: SavedMatch[];
  onSelect: (address: string) => void;
  onAdd: (address: string, label: string) => void;
  onRemove: (address: string) => void;
}

/**
 * A purely local, off-chain list of match contract addresses (see
 * matchRegistry.ts) — not a contract feature. Lets a participant browse and
 * switch between several independently-deployed one-match contracts,
 * without any change to the single-match contract itself.
 */
export function MatchList({
  matches,
  onSelect,
  onAdd,
  onRemove,
}: MatchListProps) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = address.trim();
    const bytes = hexToBytes(trimmed);
    // Contract addresses are 32-byte hex (64 characters). Validate the
    // exact length here so a typo surfaces immediately instead of as an
    // obscure wallet/indexer failure after "connecting".
    if (!trimmed) {
      setError("Enter the contract address shown when the match was deployed.");
      return;
    }
    if (!bytes || bytes.length !== 32) {
      setError(
        "Contract addresses are 64 hex characters (32 bytes). Check the full address was copied — hex characters only.",
      );
      return;
    }
    onAdd(trimmed, label);
    setAddress("");
    setLabel("");
    setError(null);
  }

  return (
    <div className="match-list">
      <h1>Matches</h1>

      {matches.length === 0 ? (
        <div className="empty-state" role="status">
          <CalendarX2 aria-hidden="true" size={32} />
          <p>
            No matches saved yet. Add a match's contract address below — the
            organizer shares this after deploying (see DEPLOYMENT.md).
          </p>
        </div>
      ) : (
        <ul className="match-list-items">
          {matches.map((m) => (
            <li key={m.address} className="match-list-item">
              <button
                type="button"
                className="match-list-select"
                onClick={() => onSelect(m.address)}
              >
                <span>{m.label}</span>
                <code>{truncateHex(m.address, 8, 6)}</code>
              </button>
              <button
                type="button"
                aria-label={`Remove ${m.label}`}
                onClick={() => onRemove(m.address)}
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="match-list-add">
        <div className="deploy-field">
          <label htmlFor="match-address">Contract address</label>
          <input
            id="match-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste a deployed match's contract address"
          />
        </div>
        <div className="deploy-field">
          <label htmlFor="match-label">Label (optional)</label>
          <input
            id="match-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Arsenal vs Chelsea"
          />
        </div>
        <button type="button" onClick={handleAdd}>
          <Plus aria-hidden="true" size={16} /> Add match
        </button>
        {error && (
          <p role="alert" className="deploy-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
