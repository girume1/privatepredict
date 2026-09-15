import { useState } from "react";
import { LockKeyhole, ChevronDown, ChevronUp } from "lucide-react";
import { hexToBytes } from "../hex.js";

interface OrganizerKeyInputProps {
  onImport: (secretKey: Uint8Array | null) => void;
  disabled?: boolean;
}

/**
 * Lets the organizer paste back the secret key they saved when deploying
 * this match (see DeployApp.tsx). Collapsed by default — most visitors are
 * participants, not the organizer.
 */
export function OrganizerKeyInput({
  onImport,
  disabled = false,
}: OrganizerKeyInputProps) {
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
        aria-controls="organizer-key-panel"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        <LockKeyhole aria-hidden="true" size={14} />
        <span>I&apos;m the organizer</span>
        {open ? (
          <ChevronUp aria-hidden="true" size={14} />
        ) : (
          <ChevronDown aria-hidden="true" size={14} />
        )}
      </button>
      {open && (
        <div id="organizer-key-panel" className="key-input-body">
          <div className="deploy-field">
            <label htmlFor="organizer-key">Organizer secret key</label>
            <input
              id="organizer-key"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled}
              placeholder="Paste the key saved when you deployed this match"
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? "organizer-key-error" : undefined}
            />
          </div>
          {error && (
            <p id="organizer-key-error" role="alert" className="deploy-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
