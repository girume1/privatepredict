import { ShieldCheck } from "lucide-react";
import type { PrivacyStage } from "../types.js";

interface PrivacyPanelProps {
  predictionState: PrivacyStage;
  /**
   * When false, the on-chain slot is held by another participant, so the
   * "private" column must not claim anything of the viewer's is stored.
   */
  ownsPrediction?: boolean;
}

const OWNER_STAGE_LABEL: Record<"committed" | "revealed", string> = {
  committed: "committed",
  revealed: "revealed",
};

const OWNER_CONTENT: Record<
  "committed" | "revealed",
  { private: string[]; public: string[] }
> = {
  committed: {
    private: ["Your plaintext prediction", "Your salt"],
    public: ["Match identifier", "Submission timing", "Your commitment"],
  },
  revealed: {
    private: ["No active unrevealed prediction data"],
    public: ["Your revealed prediction", "The match result", "Your score"],
  },
};

const OBSERVER_CONTENT: Record<
  "committed" | "revealed",
  { private: string[]; public: string[] }
> = {
  committed: {
    private: [
      "Nothing of yours — this browser does not hold the keys for this slot",
    ],
    public: [
      "Match identifier",
      "Submission timing",
      "Another participant's commitment",
    ],
  },
  revealed: {
    private: [
      "Nothing of yours — this browser does not hold the keys for this slot",
    ],
    public: [
      "Another participant's revealed prediction",
      "The match result",
      "Their score",
    ],
  },
};

const BEFORE_CONTENT = {
  private: ["Your selected prediction", "A future random salt"],
  public: ["Nothing has been submitted yet"],
};

/** Purely presentational — no business logic, no API calls. */
export function PrivacyPanel({
  predictionState,
  ownsPrediction = true,
}: PrivacyPanelProps) {
  // "before-commitment" means the slot is still free, so the panel is the
  // same for every viewer. Once a slot is committed/revealed, only the slot
  // owner is shown personal copy ("your prediction/salt"); everyone else
  // sees neutral wording that attributes the on-chain data to its owner.
  const owned = predictionState === "before-commitment" || ownsPrediction;
  const content =
    predictionState === "before-commitment"
      ? BEFORE_CONTENT
      : owned
        ? OWNER_CONTENT[predictionState]
        : OBSERVER_CONTENT[predictionState];
  const stageLabel = owned
    ? predictionState === "before-commitment"
      ? "before commitment"
      : OWNER_STAGE_LABEL[predictionState]
    : "another participant's slot";

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
