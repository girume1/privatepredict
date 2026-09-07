import { Trophy, XCircle } from "lucide-react";
import type { Outcome } from "../types.js";

interface ScoreRevealProps {
  prediction: Outcome;
  result: Outcome;
  points: number;
}

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
          ? `Correct prediction — ${points} point${points !== 1 ? "s" : ""}`
          : "Incorrect prediction — 0 points"
      }
    >
      <span className="score-reveal-icon" aria-hidden="true">
        {correct ? <Trophy size={32} /> : <XCircle size={32} />}
      </span>
      <div className="score-reveal-content">
        <p className="score-reveal-result">
          {correct ? "Correct prediction!" : "Incorrect prediction"}
        </p>
        <p className="score-reveal-points">
          {correct ? `+${points} point${points !== 1 ? "s" : ""}` : "0 points"}
        </p>
        <dl className="score-reveal-detail">
          <div>
            <dt>Your prediction</dt>
            <dd>{prediction}</dd>
          </div>
          <div>
            <dt>Match result</dt>
            <dd>{result}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
