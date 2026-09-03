import { useState } from "react";
import { LockKeyhole } from "lucide-react";
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
    <details className="organizer-key-input">
      <summary>
        <LockKeyhole aria-hidden="true" size={16} /> I&apos;m the organizer
      </summary>
      <div className="deploy-field">
        <label htmlFor="organizer-key">Organizer secret key</label>
        <input
          id="organizer-key"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste the key saved when you deployed this match"
        />
      </div>
      {error && (
        <p role="alert" className="deploy-error">
          {error}
        </p>
      )}
    </details>
  );
}
