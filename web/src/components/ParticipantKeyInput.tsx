import { useState } from "react";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import { hexToBytes } from "../hex.js";

interface ParticipantKeyInputProps {
  onImport: (secretKey: Uint8Array | null) => void;
  disabled?: boolean;
}

/**
 * Lets a returning participant paste back the secret key that was generated
 * for them on their first connection to this match (stored in localStorage
 * per contract address — see persistentPrivateStateProvider.ts). Collapsed
 * by default since most first-time visitors don't need it.
 *
 * Use case: a participant who has already submitted a commitment wants to
 * reveal from a different browser or a cleared-storage context and has
 * manually backed up their participant key. Without pre-seeding this key,
 * connectAndJoin would generate a fresh unrelated identity and the reveal
 * ownership check would fail.
 */
export function ParticipantKeyInput({
  onImport,
  disabled = false,
}: ParticipantKeyInputProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string) {
    setValue(next);
    const trimmed = next.trim();
    if (trimmed === "") {
      setError(null);
      onImport(null);
      return;
    }
    const bytes = hexToBytes(trimmed);
    if (!bytes || bytes.length !== 32) {
      setError("Must be a 64-character hex string (32 bytes).");
      onImport(null);
      return;
    }
    setError(null);
    onImport(bytes);
  }

  return (
    <div className="key-input">
      <button
        type="button"
        className="key-input-toggle"
        aria-expanded={open}
        aria-controls="participant-key-panel"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        <User aria-hidden="true" size={15} />
        <span>I&apos;m a returning participant</span>
        {open ? (
          <ChevronUp aria-hidden="true" size={15} />
        ) : (
          <ChevronDown aria-hidden="true" size={15} />
        )}
      </button>
      {open && (
        <div id="participant-key-panel" className="key-input-body">
          <div className="deploy-field">
            <label htmlFor="participant-key">Participant secret key</label>
            <input
              id="participant-key"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              placeholder="Paste your participant key to restore your identity"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "participant-key-error" : undefined}
            />
          </div>
          <p className="organizer-hint">
            Only needed if your browser storage was cleared or you are
            connecting from a different browser.
          </p>
          {error && (
            <p id="participant-key-error" role="alert" className="deploy-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
