import { useState } from "react";
import { ChevronRight, Trash2, Plus } from "lucide-react";
import { hexToBytes, truncateHex } from "../hex.js";
import { Brand } from "./Brand.js";
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
      {/* ── Header / nav ── */}
      <header className="app-toolbar">
        <Brand />
      </header>

      {/* ── Hero ── */}
      <section className="match-list-hero" aria-label="Product introduction">
        <span className="match-list-hero-eyebrow">Midnight · Privacy dApp</span>
        <h1 className="match-list-hero-headline">
          Private
          <br />
          <em>Predictions.</em>
        </h1>
        <p className="match-list-hero-sub">
          Predict before kick-off. Keep your pick private. Prove it on-chain
          after the result.
        </p>
      </section>

      {/* ── Match cards ── */}
      <p className="match-list-section-label">
        {matches.length > 0 ? "Matches" : "No matches yet"}
      </p>

      {matches.length === 0 ? (
        <div className="empty-state" role="status">
          <span className="empty-state-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect
                x="4"
                y="8"
                width="32"
                height="28"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
              />
              <line
                x1="4"
                y1="16"
                x2="36"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="14"
                y1="8"
                x2="14"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="26"
                y1="8"
                x2="26"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="12"
                y1="24"
                x2="28"
                y2="24"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="12"
                y1="28"
                x2="22"
                y2="28"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </svg>
          </span>
          <p>
            No matches saved yet. Add a match address below — the organizer
            shares this after deploying.
          </p>
        </div>
      ) : (
        // role="list" restores list semantics in Safari + VoiceOver when
        // list-style is removed via CSS (known Safari/VoiceOver behaviour).
        <ul className="match-list-items" role="list">
          {matches.map((m) => (
            <li key={m.address} className="match-list-item">
              <button
                type="button"
                className="match-list-select"
                aria-label={`Open match: ${m.label}`}
                onClick={() => onSelect(m.address)}
              >
                <div className="match-card-teams">
                  <div className="match-card-vs-row">
                    <span>{m.label || "Unnamed match"}</span>
                  </div>
                  <code className="match-card-address">
                    {truncateHex(m.address, 8, 6)}
                  </code>
                </div>
                <ChevronRight
                  className="match-card-arrow"
                  aria-hidden="true"
                  size={18}
                />
              </button>
              <button
                type="button"
                aria-label={`Remove ${m.label}`}
                onClick={() => onRemove(m.address)}
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add match form */}
      {/* Wrapped in <form> so pressing Enter in the address field submits —
          keyboard users should not have to Tab all the way to the button. */}
      <form
        className="match-list-add"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <p className="match-list-add-title">Add a match</p>
        <div className="deploy-field">
          <label htmlFor="match-address">Contract address</label>
          <input
            id="match-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Paste a 64-char hex contract address"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "match-address-error" : undefined}
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
        <button type="submit">
          <Plus aria-hidden="true" size={15} />
          Add match
        </button>
        {error && (
          <p id="match-address-error" role="alert" className="deploy-error">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
