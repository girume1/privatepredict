import { Check, X, Trophy } from "lucide-react";
import type { Outcome } from "../types.js";

interface ScoreRevealProps {
  prediction: Outcome;
  result: Outcome;
  points: number;
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  HOME: "Home",
  DRAW: "Draw",
  AWAY: "Away",
};

/**
 * The climax screen shown after a participant successfully reveals their
 * prediction. Gives the correct/incorrect outcome visual weight — this is
 * the moment the whole commit-and-reveal flow has been building toward.
 */
export function ScoreReveal({ prediction, result, points }: ScoreRevealProps) {
  const correct = points > 0;

  return (
    <div
      className={`score-reveal ${correct ? "score-reveal--correct" : "score-reveal--incorrect"}`}
      role="status"
      aria-label={
        correct
          ? `Correct prediction — +${points} point${points !== 1 ? "s" : ""}`
          : "Incorrect prediction — 0 points"
      }
    >
      {/* Hero row: icon + big points display */}
      <div className="score-reveal-hero">
        <div className="score-reveal-hero-icon" aria-hidden="true">
          {correct ? <Trophy size={28} /> : <X size={22} strokeWidth={2.5} />}
        </div>
        <div className="score-reveal-hero-text">
          <p className="score-reveal-verdict-label" aria-hidden="true">
            {correct ? "Verified correct" : "Incorrect prediction"}
          </p>
          <p className="score-reveal-points-badge">
            {correct
              ? `+${points} point${points !== 1 ? "s" : ""}`
              : "0 points"}
          </p>
        </div>
      </div>

      {/* Prediction vs result */}
      <dl className="score-reveal-detail">
        <div>
          <dt>Your prediction</dt>
          <dd>{OUTCOME_LABELS[prediction]}</dd>
        </div>
        <div>
          <dt>Match result</dt>
          <dd>{OUTCOME_LABELS[result]}</dd>
        </div>
      </dl>

      {/* Midnight verification steps */}
      <div className="score-reveal-checks" aria-label="Verification steps">
        <div className="score-reveal-check score-reveal-check--pass">
          <Check size={12} strokeWidth={3} aria-hidden="true" />
          Commitment verified on-chain
        </div>
        <div className="score-reveal-check score-reveal-check--pass">
          <Check size={12} strokeWidth={3} aria-hidden="true" />
          Prediction verified against commitment
        </div>
        <div
          className={`score-reveal-check ${correct ? "score-reveal-check--pass" : "score-reveal-check--fail"}`}
        >
          {correct ? (
            <Check size={12} strokeWidth={3} aria-hidden="true" />
          ) : (
            <X size={12} strokeWidth={3} aria-hidden="true" />
          )}
          {correct ? "Result matched" : "Result mismatch"}
        </div>
      </div>
    </div>
  );
}
