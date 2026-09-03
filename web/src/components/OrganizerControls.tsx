import { useEffect, useState } from "react";
import { MatchState } from "@privatepredict/contract";
import { TransactionStatus } from "./TransactionStatus.js";
import type { Match, Outcome, TxPhase } from "../types.js";

type ActionResult = { ok: boolean; txHash?: string; error?: string };

interface OrganizerControlsProps {
  match: Match;
  onCloseMatch: () => Promise<ActionResult>;
  onPublishResult: (result: Outcome) => Promise<ActionResult>;
}

const OUTCOMES: Outcome[] = ["HOME", "DRAW", "AWAY"];

/**
 * Organizer-only actions, shown alongside the participant view when the
 * connected identity matches this deployment's organizer (see
 * PredictionBoardDerivedState.isOrganizer in @privatepredict/api).
 *
 * The close-match deadline gate here is a client-side convenience only —
 * the contract itself does not enforce deadlines (no verified on-chain
 * clock primitive in Compact 0.31.1). Said so explicitly in the UI rather
 * than implying it's a security guarantee.
 */
export function OrganizerControls({
  match,
  onCloseMatch,
  onPublishResult,
}: OrganizerControlsProps) {
  const [closePhase, setClosePhase] = useState<TxPhase>("idle");
  const [closeError, setCloseError] = useState<string | undefined>();
  const [selectedResult, setSelectedResult] = useState<Outcome | "">("");
  const [publishPhase, setPublishPhase] = useState<TxPhase>("idle");
  const [publishError, setPublishError] = useState<string | undefined>();

  // Date.now() is impure — read it in an effect, not during render (React's
  // purity rules), and re-check on an interval so the button enables itself
  // once the deadline passes without needing an external re-render trigger.
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  useEffect(() => {
    const check = () => setDeadlinePassed(Date.now() >= match.deadline);
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [match.deadline]);

  const canClose =
    match.matchState === MatchState.OPEN &&
    deadlinePassed &&
    closePhase !== "proving";
  const canPublish =
    match.matchState === MatchState.CLOSED &&
    selectedResult !== "" &&
    publishPhase !== "proving";

  async function handleClose() {
    setClosePhase("proving");
    setCloseError(undefined);
    const result = await onCloseMatch();
    if (result.ok) {
      setClosePhase("success");
    } else {
      setClosePhase("error");
      setCloseError(result.error ?? "The transaction failed.");
    }
  }

  async function handlePublish() {
    if (!selectedResult) {
      return;
    }
    setPublishPhase("proving");
    setPublishError(undefined);
    const result = await onPublishResult(selectedResult);
    if (result.ok) {
      setPublishPhase("success");
    } else {
      setPublishPhase("error");
      setPublishError(result.error ?? "The transaction failed.");
    }
  }

  return (
    <div className="organizer-controls">
      <h2>Organizer controls</h2>

      {match.matchState === MatchState.OPEN && (
        <div className="organizer-action">
          <button type="button" onClick={handleClose} disabled={!canClose}>
            Close Match
          </button>
          {!deadlinePassed && (
            <p className="organizer-hint">
              Enabled once the deadline passes. This is a client-side
              convenience only — the contract itself does not enforce the
              deadline.
            </p>
          )}
          <TransactionStatus phase={closePhase} errorMessage={closeError} />
        </div>
      )}

      {match.matchState === MatchState.CLOSED && (
        <div className="organizer-action">
          <label htmlFor="organizer-result-select">Match result</label>
          <select
            id="organizer-result-select"
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value as Outcome | "")}
            disabled={publishPhase === "proving"}
          >
            <option value="">Select a result…</option>
            {OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </select>
          <button type="button" onClick={handlePublish} disabled={!canPublish}>
            Publish Result
          </button>
          <TransactionStatus phase={publishPhase} errorMessage={publishError} />
        </div>
      )}

      {match.matchState === MatchState.RESULT_PUBLISHED && (
        <p>Result published.</p>
      )}
    </div>
  );
}
