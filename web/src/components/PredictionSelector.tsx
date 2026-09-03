import { useState } from "react";
import type { Outcome } from "../types.js";

interface PredictionSelectorProps {
  onSubmit: (outcome: Outcome) => void;
  disabled?: boolean;
}

const OPTIONS: Outcome[] = ["HOME", "DRAW", "AWAY"];

export function PredictionSelector({
  onSubmit,
  disabled = false,
}: PredictionSelectorProps) {
  const [selected, setSelected] = useState<Outcome | null>(null);

  return (
    <fieldset className="prediction-selector" disabled={disabled}>
      <legend>Your prediction</legend>
      <div className="prediction-selector-options" role="radiogroup">
        {OPTIONS.map((outcome) => (
          <button
            key={outcome}
            type="button"
            role="radio"
            aria-checked={selected === outcome}
            className={
              selected === outcome
                ? "prediction-option selected"
                : "prediction-option"
            }
            onClick={() => setSelected(outcome)}
          >
            {outcome}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={selected === null}
        onClick={() => selected && onSubmit(selected)}
      >
        Submit Prediction
      </button>
    </fieldset>
  );
}
