import { ShieldCheck } from "lucide-react";
import type { PrivacyStage } from "../types.js";

interface PrivacyPanelProps {
  predictionState: PrivacyStage;
}

const STAGE_LABEL: Record<PrivacyStage, string> = {
  "before-commitment": "before commitment",
  committed: "committed",
  revealed: "revealed",
};

const CONTENT: Record<PrivacyStage, { private: string[]; public: string[] }> = {
  "before-commitment": {
    private: ["Your selected prediction", "A future random salt"],
    public: ["Nothing has been submitted yet"],
  },
  committed: {
    private: ["Your plaintext prediction", "Your salt"],
    public: ["Match identifier", "Submission timing", "Your commitment"],
  },
  revealed: {
    private: ["No active unrevealed prediction data"],
    public: ["Your revealed prediction", "The match result", "Your score"],
  },
};

/** Purely presentational — no business logic, no API calls. */
export function PrivacyPanel({ predictionState }: PrivacyPanelProps) {
  const stageLabel = STAGE_LABEL[predictionState];
  const content = CONTENT[predictionState];

  return (
    <div className="privacy-panel">
      <h2>
        <ShieldCheck aria-hidden="true" size={18} /> Privacy
      </h2>
      <div className="privacy-panel-columns">
        <section
          role="region"
          aria-label={`Private information — ${stageLabel}`}
        >
          <h3>Private</h3>
          <ul>
            {content.private.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section
          role="region"
          aria-label={`Public information — ${stageLabel}`}
        >
          <h3>Public</h3>
          <ul>
            {content.public.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
      <p className="privacy-panel-limitation">
        This does not provide complete anonymity. Your wallet address and
        transaction timing may remain observable.
      </p>
    </div>
  );
}
