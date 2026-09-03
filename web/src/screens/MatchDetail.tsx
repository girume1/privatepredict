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
import { bytesToHex, truncateHex } from "../hex.js";
import type { Match, Outcome, PredictionStatus, TxPhase } from "../types.js";

type ActionResult = { ok: boolean; txHash?: string; error?: string };

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

function privacyStageFor(
  predictionState: PredictionState | undefined,
): "before-commitment" | "committed" | "revealed" {
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
  const [commitPhase, setCommitPhase] = useState<TxPhase>("idle");
  const [commitTxHash, setCommitTxHash] = useState<string | undefined>();
  const [commitError, setCommitError] = useState<string | undefined>();

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealPhase, setRevealPhase] = useState<TxPhase>("idle");
  const [revealTxHash, setRevealTxHash] = useState<string | undefined>();
  const [revealError, setRevealError] = useState<string | undefined>();

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
      <EmptyState message="Connect a wallet to load this match's details." />
    );
  }

  const predictionState =
    predictionStatus?.predictionState ?? PredictionState.NO_COMMITMENT;

  async function handleCommitConfirm() {
    if (!pendingOutcome) {
      return;
    }
    setCommitPhase("proving");
    setCommitError(undefined);
    const result = await onSubmitPrediction(pendingOutcome);
    if (result.ok) {
      setCommitPhase("success");
      setCommitTxHash(result.txHash);
    } else {
      setCommitPhase("error");
      setCommitError(result.error ?? "The transaction failed.");
    }
  }

  async function handleRevealConfirm() {
    setRevealPhase("proving");
    setRevealError(undefined);
    const result = await onRevealPrediction();
    if (result.ok) {
      setRevealPhase("success");
      setRevealTxHash(result.txHash);
    } else {
      setRevealPhase("error");
      setRevealError(result.error ?? "The transaction failed.");
    }
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
            <dt>Your commitment</dt>
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
                setPendingOutcome(outcome);
                setCommitPhase("idle");
                setCommitError(undefined);
              }}
            />
          </>
        ))}

      {match.matchState === MatchState.OPEN &&
        predictionState === PredictionState.COMMITTED && (
          <p>Your prediction has been submitted and is awaiting the result.</p>
        )}

      {match.matchState === MatchState.CLOSED &&
        predictionState === PredictionState.NO_COMMITMENT && (
          <p>The submission window has closed.</p>
        )}

      {match.matchState === MatchState.CLOSED &&
        predictionState === PredictionState.COMMITTED && (
          <p>
            The match is closed. Your prediction will be revealable once the
            result is published.
          </p>
        )}

      {match.matchState === MatchState.RESULT_PUBLISHED &&
        predictionState === PredictionState.COMMITTED &&
        walletConnected && (
          <button type="button" onClick={() => setRevealOpen(true)}>
            Reveal Prediction
          </button>
        )}

      {predictionState === PredictionState.REVEALED && (
        <p>
          You predicted {predictionStatus?.revealedPrediction}. Result:{" "}
          {match.matchResult}. Points: {match.points}.
        </p>
      )}

      <PrivacyPanel predictionState={privacyStageFor(predictionState)} />

      {pendingOutcome && (
        <CommitPredictionDialog
          outcome={pendingOutcome}
          open={pendingOutcome !== null}
          onConfirm={handleCommitConfirm}
          onDismiss={() => setPendingOutcome(null)}
          txPhase={commitPhase}
          txHash={commitTxHash}
          errorMessage={commitError}
        />
      )}

      <RevealPredictionDialog
        open={revealOpen}
        onConfirm={handleRevealConfirm}
        onDismiss={() => setRevealOpen(false)}
        txPhase={revealPhase}
        txHash={revealTxHash}
        errorMessage={revealError}
      />
    </div>
  );
}
