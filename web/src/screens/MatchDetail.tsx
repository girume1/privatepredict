import { useEffect, useState } from "react";
import { MatchState, PredictionState } from "@privatepredict/contract";
import {
  MatchStateTimeline,
  matchStateLabel,
} from "../components/MatchStateTimeline.js";
import { PrivacyPanel } from "../components/PrivacyPanel.js";
import { PredictionSelector } from "../components/PredictionSelector.js";
import { CommitPredictionDialog } from "../components/CommitPredictionDialog.js";
import { RevealPredictionDialog } from "../components/RevealPredictionDialog.js";
import { OrganizerControls } from "../components/OrganizerControls.js";
import { HowItWorks } from "../components/HowItWorks.js";
import { EmptyState } from "../components/EmptyState.js";
import { useTransactionFlow } from "../useTransactionFlow.js";
import { bytesToHex, truncateHex } from "../hex.js";
import type {
  Match,
  Outcome,
  PredictionStatus,
  PrivacyStage,
} from "../types.js";

type ActionResult = { ok: boolean; txHash?: string; error?: string };

/** How long the "Confirmed" state is shown before the dialog closes itself. */
const SUCCESS_VIEW_MS = 1_500;

interface MatchDetailProps {
  match: Match | null;
  predictionStatus: PredictionStatus | null;
  /**
   * Wallet connection is app-level state, independent of whether a match is
   * configured — WalletConnect itself lives in App.tsx, not here. This
   * screen only needs to know whether it can show prediction/reveal actions.
   */
  walletConnected: boolean;
  /**
   * True when the connected identity's imported organizer secret key
   * matches this deployment's organizer (see OrganizerKeyInput/App.tsx).
   * Organizer controls are shown alongside participant controls, not in
   * place of them — an organizer can also hold their own participant slot
   * in the same session.
   */
  isOrganizer: boolean;
  onSubmitPrediction: (outcome: Outcome) => Promise<ActionResult>;
  onRevealPrediction: () => Promise<ActionResult>;
  onCloseMatch: () => Promise<ActionResult>;
  onPublishResult: (result: Outcome) => Promise<ActionResult>;
}

function formatDeadline(ms: number): string {
  return new Date(ms).toLocaleString();
}

/**
 * Maps the on-chain slot stage to the Privacy Panel. The panel also
 * receives ownsPrediction, so it decides how much personal copy ("your…")
 * it can truthfully show to this viewer.
 */
function privacyStageFor(
  predictionState: PredictionState | undefined,
): PrivacyStage {
  if (predictionState === PredictionState.REVEALED) {
    return "revealed";
  }
  if (predictionState === PredictionState.COMMITTED) {
    return "committed";
  }
  return "before-commitment";
}

export function MatchDetail({
  match,
  predictionStatus,
  walletConnected,
  isOrganizer,
  onSubmitPrediction,
  onRevealPrediction,
  onCloseMatch,
  onPublishResult,
}: MatchDetailProps) {
  const [pendingOutcome, setPendingOutcome] = useState<Outcome | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  const commitFlow = useTransactionFlow();
  const revealFlow = useTransactionFlow();
  // Destructure the stable members so effects and JSX never depend on the
  // fresh hook object identity (which would re-arm timers on every render).
  const commitPhase = commitFlow.phase;
  const commitError = commitFlow.error;
  const startCommit = commitFlow.start;
  const resetCommit = commitFlow.reset;
  const revealPhase = revealFlow.phase;
  const revealError = revealFlow.error;
  const startReveal = revealFlow.start;
  const resetReveal = revealFlow.reset;

  // A real success (promise resolved) shows "Confirmed" briefly, then the
  // dialog closes and the on-chain derived state takes over the view.
  // resetCommit/resetReveal and the state setters are stable identities,
  // so each timer is armed exactly once when its phase reaches "success".
  useEffect(() => {
    if (commitPhase !== "success") {
      return;
    }
    const t = window.setTimeout(() => {
      resetCommit();
      setPendingOutcome(null);
    }, SUCCESS_VIEW_MS);
    return () => window.clearTimeout(t);
  }, [commitPhase, resetCommit, setPendingOutcome]);

  useEffect(() => {
    if (revealPhase !== "success") {
      return;
    }
    const t = window.setTimeout(() => {
      resetReveal();
      setRevealOpen(false);
    }, SUCCESS_VIEW_MS);
    return () => window.clearTimeout(t);
  }, [revealPhase, resetReveal, setRevealOpen]);

  // Date.now() is impure — read it in an effect, not during render, and
  // re-check on an interval so this flips without an external re-render
  // trigger. Mirrors OrganizerControls's own deadline gate: a client-side
  // convenience only, matching it here for UX consistency, not because the
  // contract enforces the deadline on submission either.
  const deadline = match?.deadline;
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  useEffect(() => {
    if (deadline === undefined) {
      return;
    }
    const check = () => setDeadlinePassed(Date.now() >= deadline);
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!match) {
    return (
      <EmptyState
        message={
          walletConnected
            ? "Waiting for this match's data from the ledger."
            : "Connect a wallet to load this match's details."
        }
      />
    );
  }

  const predictionState =
    predictionStatus?.predictionState ?? PredictionState.NO_COMMITMENT;
  const isOwner = predictionStatus?.isPredictionOwner ?? false;
  const hasLocalPrediction = predictionStatus?.hasLocalPrediction ?? false;

  function handleCommitConfirm() {
    if (!pendingOutcome) {
      return;
    }
    // start() sets the flow busy synchronously, so Confirm is disabled the
    // instant the user clicks and duplicate submissions are impossible.
    void startCommit(() => onSubmitPrediction(pendingOutcome));
  }

  function handleRevealConfirm() {
    void startReveal(onRevealPrediction);
  }

  function handleCommitDismiss() {
    resetCommit();
    setPendingOutcome(null);
  }

  function handleRevealDismiss() {
    resetReveal();
    setRevealOpen(false);
  }

  return (
    <div className="match-detail">
      <h1>
        {match.teamA} vs {match.teamB}
      </h1>
      <MatchStateTimeline current={match.matchState} />

      <dl className="match-info-card">
        <div>
          <dt>Match ID</dt>
          <dd>
            <code>{truncateHex(bytesToHex(match.matchId))}</code>
          </dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{formatDeadline(match.deadline)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className="status-badge">
              {matchStateLabel(match.matchState)}
            </span>
          </dd>
        </div>
        {predictionStatus?.commitment && (
          <div>
            <dt>{isOwner ? "Your commitment" : "Commitment"}</dt>
            <dd>
              <code>
                {truncateHex(bytesToHex(predictionStatus.commitment))}
              </code>
            </dd>
          </div>
        )}
      </dl>

      {isOrganizer && (
        <OrganizerControls
          match={match}
          onCloseMatch={onCloseMatch}
          onPublishResult={onPublishResult}
        />
      )}

      {match.matchState === MatchState.RESULT_PUBLISHED &&
        match.matchResult && <p>Result: {match.matchResult}</p>}

      {match.matchState === MatchState.OPEN &&
        predictionState === PredictionState.NO_COMMITMENT &&
        (!walletConnected ? (
          <p>Connect a wallet to submit a prediction.</p>
        ) : deadlinePassed ? (
          <p>
            The submission deadline has passed, so this app no longer offers new
            predictions here. This is a client-side convenience only — the
            contract itself does not enforce the deadline, and the match stays
            OPEN until the organizer closes it.
          </p>
        ) : (
          <>
            <HowItWorks />
            <PredictionSelector
              onSubmit={(outcome) => {
                resetCommit();
                setPendingOutcome(outcome);
              }}
            />
          </>
        ))}

      {match.matchState === MatchState.CLOSED &&
        predictionState === PredictionState.NO_COMMITMENT && (
          <p>The submission window has closed.</p>
        )}

      {predictionState === PredictionState.COMMITTED && !isOwner && (
        <p>
          This match&apos;s single prediction slot is already held by another
          participant, so it cannot be submitted to or revealed from this
          browser.
        </p>
      )}

      {predictionState === PredictionState.COMMITTED &&
        isOwner &&
        match.matchState === MatchState.OPEN && (
          <p>Your prediction has been submitted and is awaiting the result.</p>
        )}

      {predictionState === PredictionState.COMMITTED &&
        isOwner &&
        match.matchState === MatchState.CLOSED && (
          <p>
            The match is closed. Your prediction will be revealable once the
            result is published.
          </p>
        )}

      {predictionState === PredictionState.COMMITTED &&
        isOwner &&
        match.matchState === MatchState.RESULT_PUBLISHED &&
        (!walletConnected ? (
          <p>
            The result is published. Reconnect your wallet to reveal your
            prediction.
          </p>
        ) : hasLocalPrediction ? (
          <button type="button" onClick={() => setRevealOpen(true)}>
            Reveal Prediction
          </button>
        ) : (
          <p>
            Your reveal data (the original prediction and salt) is not available
            in this browser, so this prediction cannot be revealed from here.
          </p>
        ))}

      {predictionState === PredictionState.REVEALED && isOwner && (
        <p>
          You predicted {predictionStatus?.revealedPrediction}. Result:{" "}
          {match.matchResult}. Points: {match.points}.
        </p>
      )}

      {predictionState === PredictionState.REVEALED && !isOwner && (
        <p>
          This match&apos;s slot has already been revealed by another
          participant. The published result is shown above.
        </p>
      )}

      <PrivacyPanel
        predictionState={privacyStageFor(predictionState)}
        ownsPrediction={isOwner}
      />

      {pendingOutcome && (
        <CommitPredictionDialog
          outcome={pendingOutcome}
          open={pendingOutcome !== null}
          onConfirm={handleCommitConfirm}
          onDismiss={handleCommitDismiss}
          txPhase={commitPhase}
          errorMessage={commitError}
        />
      )}

      <RevealPredictionDialog
        open={revealOpen}
        onConfirm={handleRevealConfirm}
        onDismiss={handleRevealDismiss}
        txPhase={revealPhase}
        errorMessage={revealError}
      />
    </div>
  );
}
