import { useEffect, useState } from "react";
import { MatchState } from "@privatepredict/contract";
import { TransactionStatus } from "./TransactionStatus.js";
import { useTransactionFlow } from "../useTransactionFlow.js";
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
 *
 * Each action runs through useTransactionFlow, so the same rules apply as
 * in the participant dialogs: the action button disables immediately on
 * click, a 30s wait only escalates to the "still processing" state (never
 * a failure), and the terminal state comes from the real transaction
 * promise. While a call is unresolved the button stays disabled; after a
 * definitive failure it re-enables for a retry.
 */
export function OrganizerControls({
  match,
  onCloseMatch,
  onPublishResult,
}: OrganizerControlsProps) {
  const closeFlow = useTransactionFlow();
  const publishFlow = useTransactionFlow();
  const [selectedResult, setSelectedResult] = useState<Outcome | "">("");

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

  // An action is actionable only from rest (idle) or after a definitive
  // failure (error). It stays disabled through submitting/proving/pending
  // AND success, so a success that the ledger has not yet reflected cannot
  // be accidentally re-submitted.
  const isActionable = (phase: TxPhase) =>
    phase === "idle" || phase === "error";

  const canClose =
    match.matchState === MatchState.OPEN &&
    deadlinePassed &&
    isActionable(closeFlow.phase);
  const canPublish =
    match.matchState === MatchState.CLOSED &&
    selectedResult !== "" &&
    isActionable(publishFlow.phase);

  function handleClose() {
    void closeFlow.start(onCloseMatch);
  }

  function handlePublish() {
    if (!selectedResult) {
      return;
    }
    void publishFlow.start(() => onPublishResult(selectedResult));
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
          <TransactionStatus
            phase={closeFlow.phase}
            errorMessage={closeFlow.error}
          />
        </div>
      )}

      {match.matchState === MatchState.CLOSED && (
        <div className="organizer-action">
          <label htmlFor="organizer-result-select">Match result</label>
          <select
            id="organizer-result-select"
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value as Outcome | "")}
            disabled={!isActionable(publishFlow.phase)}
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
          <TransactionStatus
            phase={publishFlow.phase}
            errorMessage={publishFlow.error}
          />
        </div>
      )}

      {match.matchState === MatchState.RESULT_PUBLISHED && (
        <p>Result published.</p>
      )}
    </div>
  );
}
