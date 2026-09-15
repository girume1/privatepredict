import { LockKeyhole } from "lucide-react";
import { MatchState } from "@privatepredict/contract";
import type { PrivacyStage } from "../types.js";

interface PrivacyPanelProps {
  predictionState: PrivacyStage;
  lifecycleStage?: MatchState;
  /**
   * When false, the on-chain slot is held by another participant, so the
   * "private" column must not claim anything of the viewer's is stored.
   */
  ownsPrediction?: boolean;
}

/**
 * Stage-aware note — single line that changes copy as the match moves through
 * its lifecycle. Deliberately brief so it reads as status, not documentation.
 */
const STAGE_NOTE: Record<PrivacyStage, string> = {
  "before-commitment":
    "Your pick and salt stay in this browser until you reveal.",
  committed: "Result not yet published. Your commitment is locked on-chain.",
  revealed: "Reveal to prove your commitment matched your pick.",
};

const LIFECYCLE_NOTE: Partial<Record<MatchState, string>> = {
  [MatchState.OPEN]: STAGE_NOTE["before-commitment"],
  [MatchState.CLOSED]: STAGE_NOTE.committed,
  [MatchState.RESULT_PUBLISHED]: STAGE_NOTE.revealed,
};

const OWNER_CONTENT: Record<
  "committed" | "revealed",
  { public: string[]; private: string[] }
> = {
  committed: {
    public: ["Match identifier", "Submission timing", "Your commitment"],
    private: ["Your plaintext prediction", "Your salt"],
  },
  revealed: {
    public: ["Your revealed prediction", "The match result", "Your score"],
    private: ["No active unrevealed prediction data"],
  },
};

const OBSERVER_CONTENT: Record<
  "committed" | "revealed",
  { public: string[]; private: string[] }
> = {
  committed: {
    public: [
      "Match identifier",
      "Submission timing",
      "Another participant's commitment",
    ],
    private: [
      "Nothing of yours — this browser does not hold the keys for this slot",
    ],
  },
  revealed: {
    public: [
      "Another participant's revealed prediction",
      "The match result",
      "Their score",
    ],
    private: [
      "Nothing of yours — this browser does not hold the keys for this slot",
    ],
  },
};

const BEFORE_CONTENT = {
  public: ["Nothing has been submitted yet"],
  private: ["Your selected prediction", "A future random salt"],
};

/** Purely presentational — no business logic, no API calls. */
export function PrivacyPanel({
  predictionState,
  lifecycleStage,
  ownsPrediction = true,
}: PrivacyPanelProps) {
  // "before-commitment" means the slot is still free — same panel for all.
  // Once committed/revealed, only the slot owner sees personal copy.
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
      : predictionState
    : "another participant's slot";

  const stageNote = lifecycleStage
    ? (LIFECYCLE_NOTE[lifecycleStage] ?? STAGE_NOTE[predictionState])
    : STAGE_NOTE[predictionState];

  return (
    <div className="privacy-panel">
      <h2>
        <LockKeyhole aria-hidden="true" size={13} />
        Privacy status
      </h2>
      <p className="privacy-stage-note">{stageNote}</p>
      <div className="privacy-panel-columns">
        {/* Public tile — teal (section:first-child in CSS) */}
        <section
          className="privacy-panel-section privacy-panel-section--public"
          role="region"
          aria-label={`Public information — ${stageLabel}`}
        >
          <h3>On-chain</h3>
          <ul>
            {content.public.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        {/* Private tile — violet (section:last-child in CSS) */}
        <section
          className="privacy-panel-section privacy-panel-section--private"
          role="region"
          aria-label={`Private information — ${stageLabel}`}
        >
          <h3>Private, local</h3>
          <ul>
            {content.private.map((item) => (
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
