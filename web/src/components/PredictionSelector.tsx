import { useState } from "react";
import type { Outcome } from "../types.js";

interface PredictionSelectorProps {
  onSubmit: (outcome: Outcome) => void;
  disabled?: boolean;
}

const OPTIONS: Outcome[] = ["HOME", "DRAW", "AWAY"];

/**
 * Accessible radio group for picking a prediction outcome.
 *
 * Uses native <input type="radio"> elements styled as buttons rather than
 * <button role="radio"> — native radios get arrow-key navigation, correct
 * AT announcements, and checked-state management for free, with no custom
 * keyboard wiring required. The <fieldset>/<legend> provides the group
 * label. The selected value is tracked in React state so the Submit button
 * can be disabled until a choice is made.
 *
 * The group name is generated once via useState initializer (not useRef) to
 * avoid calling Math.random() — an impure function — on every render, and to
 * avoid reading a ref value during render (react-hooks/refs).
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
            <input
              type="radio"
              name={groupName}
              value={outcome}
              checked={selected === outcome}
              onChange={() => setSelected(outcome)}
              className="prediction-option-radio"
              disabled={disabled}
            />
            <span className="prediction-option">{outcome}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={selected === null || disabled}
        onClick={() => selected && onSubmit(selected)}
      >
        Submit Prediction
      </button>
    </fieldset>
  );
}
