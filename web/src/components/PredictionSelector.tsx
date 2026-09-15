import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import type { Outcome } from "../types.js";

interface PredictionSelectorProps {
  onSubmit: (outcome: Outcome) => void;
  disabled?: boolean;
}

const OPTIONS: Outcome[] = ["HOME", "DRAW", "AWAY"];

const OPTION_SUB: Record<Outcome, string> = {
  HOME: "Home win",
  DRAW: "Level result",
  AWAY: "Away win",
};

/**
 * Accessible radio group for picking a prediction outcome.
 *
 * Uses native <input type="radio"> elements styled as cards rather than
 * <button role="radio"> — native radios get arrow-key navigation, correct
 * AT announcements, and checked-state management for free, with no custom
 * keyboard wiring required. The <fieldset>/<legend> provides the group
 * label.
 *
 * The radio accessible name comes from the aria-label on the <input>
 * (value: "HOME" / "DRAW" / "AWAY") to keep test-queried names stable,
 * while the visible label renders the premium card design.
 *
 * The group name is generated once via useState initializer (not useRef) to
 * avoid calling Math.random() — an impure function — on every render.
 */
export function PredictionSelector({
  onSubmit,
  disabled = false,
}: PredictionSelectorProps) {
  const [selected, setSelected] = useState<Outcome | null>(null);
  const [groupName] = useState(
    () => `prediction-${Math.random().toString(36).slice(2)}`,
  );

  return (
    <fieldset className="prediction-selector" disabled={disabled}>
      <legend>Your prediction</legend>
      <div className="prediction-selector-options">
        {OPTIONS.map((outcome) => (
          <label
            key={outcome}
            className={`prediction-option-label${selected === outcome ? " selected" : ""}`}
          >
            {/* aria-label keeps accessible name == outcome value ("HOME"/"DRAW"/"AWAY")
                so tests can getByRole("radio", { name: "HOME" }) */}
            <input
              type="radio"
              name={groupName}
              value={outcome}
              checked={selected === outcome}
              onChange={() => setSelected(outcome)}
              className="prediction-option-radio"
              disabled={disabled}
              aria-label={outcome}
            />
            <span className="prediction-option" aria-hidden="true">
              <span className="prediction-option-value">{outcome}</span>
              <span className="prediction-option-sub">
                {OPTION_SUB[outcome]}
              </span>
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={selected === null || disabled}
        onClick={() => selected && onSubmit(selected)}
      >
        <LockKeyhole aria-hidden="true" size={15} />
        Commit prediction
      </button>
      <p className="prediction-selector-hint">
        <LockKeyhole aria-hidden="true" size={13} />
        Your pick stays private until you reveal it after the result.
      </p>
    </fieldset>
  );
}
