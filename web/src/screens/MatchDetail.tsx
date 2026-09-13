import { useEffect, useState } from "react";
import { MatchState, PredictionState } from "@privatepredict/contract";
import {
  Clock,
  LockKeyhole,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Wallet,
  ShieldOff,
} from "lucide-react";
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
import { StatusCard } from "../components/StatusCard.js";
import { ScoreReveal } from "../components/ScoreReveal.js";
import { MatchSkeleton } from "../components/MatchSkeleton.js";
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
  walletConnected: boolean;
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
): PrivacyStage {
  if (predictionState === PredictionState.REVEALED) return "revealed";
  if (predictionState === PredictionState.COMMITTED) return "committed";
  return "before-commitment";
}

/**
 * Returns the tooltip for the reveal button when it is locked.
 * Returns null when the button should be fully active (no tooltip needed).
 */
function revealButtonTooltip(
  matchState: MatchState,
  hasLocalPrediction: boolean,
): string | null {
  if (matchState === MatchState.CLOSED) {
    return "Waiting for the organizer to publish the result";
  }
  if (matchState === MatchState.RESULT_PUBLISHED && !hasLocalPrediction) {
    return "Reveal data not found — the original prediction and salt are required";
  }
  return null;
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

  const commitPhase = commitFlow.phase;
  const commitError = commitFlow.error;
  const startCommit = commitFlow.start;
  const resetCommit = commitFlow.reset;
  const revealPhase = revealFlow.phase;
  const revealError = revealFlow.error;
  const startReveal = revealFlow.start;
  const resetReveal = revealFlow.reset;

  useEffect(() => {
    if (commitPhase !== "success") return;
    const t = window.setTimeout(() => {
      resetCommit();
      setPendingOutcome(null);
    }, SUCCESS_VIEW_MS);
    return () => window.clearTimeout(t);
  }, [commitPhase, resetCommit]);

  useEffect(() => {
    if (revealPhase !== "success") return;
    const t = window.setTimeout(() => {
      resetReveal();
      setRevealOpen(false);
    }, SUCCESS_VIEW_MS);
    return () => window.clearTimeout(t);
  }, [revealPhase, resetReveal]);

  const deadline = match?.deadline;
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  useEffect(() => {
    if (deadline === undefined) return;
    const check = () => setDeadlinePassed(Date.now() >= deadline);
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Wallet connected but ledger data not yet arrived — show skeleton
  if (walletConnected && !match) {
    return <MatchSkeleton />;
  }

  // No wallet and no match — generic prompt
  if (!match) {
    return (
      <StatusCard
        icon={<Wallet size={20} />}
        title="Connect a wallet to load this match"
        variant="muted"
      />
    );
  }

  const predictionState =
    predictionStatus?.predictionState ?? PredictionState.NO_COMMITMENT;
  const isOwner = predictionStatus?.isPredictionOwner ?? false;
  const hasLocalPrediction = predictionStatus?.hasLocalPrediction ?? false;

  function handleCommitConfirm() {
    if (!pendingOutcome) return;
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

  // Reveal button state — shown for owner once committed, locked until
  // result is published and local data is available.
  const showRevealButton =
    !isOrganizer &&
    isOwner &&
    predictionState === PredictionState.COMMITTED &&
    walletConnected;

  const revealTooltip = showRevealButton
    ? revealButtonTooltip(match.matchState, hasLocalPrediction)
    : null;

  const revealButtonActive =
    showRevealButton &&
    match.matchState === MatchState.RESULT_PUBLISHED &&
    hasLocalPrediction;

  // Reconnect prompt — shown separately when wallet is disconnected but
  // the owner has a committed prediction and the result is already out.
  const showReconnectPrompt =
    !isOrganizer &&
    isOwner &&
    predictionState === PredictionState.COMMITTED &&
    !walletConnected &&
    match.matchState === MatchState.RESULT_PUBLISHED;

  return (
    <div className="match-detail">
      {/* ── Lifecycle tracker — leads the screen (Version B) ── */}
      <MatchStateTimeline current={match.matchState} />

      {/* ── Condensed match summary row ── */}
      <div className="match-summary-row">
        <h1 className="match-detail-heading">
          {match.teamA} <span className="match-detail-vs">vs</span>{" "}
          {match.teamB}
        </h1>
        <p className="match-summary-meta">
          <Clock size={13} aria-hidden="true" />
          {formatDeadline(match.deadline)}
          <span className="status-badge">
            {matchStateLabel(match.matchState)}
          </span>
        </p>
      </div>

      {/* ── Match info — compact, collapses commitment to a chip ── */}
      <dl className="match-info-card">
        <div>
          <dt>Match ID</dt>
          <dd>
            <code>{truncateHex(bytesToHex(match.matchId))}</code>
          </dd>
        </div>
        {predictionStatus?.commitment && (
          <div>
            <dt>{isOwner ? "Your commitment" : "Commitment"}</dt>
            <dd>
              <span className="commitment-chip">
                {truncateHex(bytesToHex(predictionStatus.commitment))}
              </span>
            </dd>
          </div>
        )}
      </dl>

      {/* ── Result published banner ── */}
      {match.matchState === MatchState.RESULT_PUBLISHED &&
        match.matchResult && (
          <StatusCard
            icon={<CheckCircle2 size={20} />}
            title={`Result: ${match.matchResult}`}
            variant="info"
          />
        )}

      {isOrganizer && (
        <OrganizerControls
          match={match}
          onCloseMatch={onCloseMatch}
          onPublishResult={onPublishResult}
        />
      )}

      {/* ── Participant-only section ── */}
      {!isOrganizer && (
        <>
          {/* ── OPEN: no prediction yet ── */}
          {match.matchState === MatchState.OPEN &&
            predictionState === PredictionState.NO_COMMITMENT &&
            (!walletConnected ? (
              <StatusCard
                icon={<Wallet size={20} />}
                title="Connect your wallet to submit a prediction"
                variant="muted"
              />
            ) : deadlinePassed ? (
              <StatusCard
                icon={<Clock size={20} />}
                title="Submission deadline has passed"
                body="This app no longer offers new predictions here. The match stays OPEN on-chain until the organizer closes it — the contract itself does not enforce deadlines."
                variant="warning"
              />
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

          {/* ── CLOSED: no prediction submitted ── */}
          {match.matchState === MatchState.CLOSED &&
            predictionState === PredictionState.NO_COMMITMENT && (
              <StatusCard
                icon={<LockKeyhole size={20} />}
                title="Submission window has closed"
                variant="muted"
              />
            )}

          {/* ── Slot held by someone else ── */}
          {predictionState === PredictionState.COMMITTED && !isOwner && (
            <StatusCard
              icon={<ShieldOff size={20} />}
              title="This match's prediction slot is held by another participant"
              body="It cannot be submitted to or revealed from this browser."
              variant="muted"
            />
          )}

          {/* ── Owner committed, awaiting result ── */}
          {predictionState === PredictionState.COMMITTED &&
            isOwner &&
            match.matchState === MatchState.OPEN && (
              <StatusCard
                icon={<LockKeyhole size={20} />}
                title="Your prediction is committed"
                body="Locked on-chain and private — awaiting the result. You can reveal once the organizer publishes it."
                variant="success"
              />
            )}

          {/* ── Reconnect prompt — disconnected owner, result published ── */}
          {showReconnectPrompt && (
            <StatusCard
              icon={<Wallet size={20} />}
              title="Reconnect your wallet to reveal"
              body="The result is published. Reconnect to reveal your prediction and see your score."
              variant="info"
            />
          )}

          {/* ── Reveal button — present for owner from COMMITTED onward,
                locked (aria-disabled) until result is published + local data
                available, active only when both conditions are met ── */}
          {showRevealButton && (
            <div className="reveal-action">
              {match.matchState === MatchState.RESULT_PUBLISHED &&
                hasLocalPrediction && (
                  <StatusCard
                    icon={<Eye size={20} />}
                    title="Ready to reveal"
                    body="The result is published. Reveal your prediction to verify it on-chain and claim your score."
                    variant="info"
                  />
                )}
              {match.matchState === MatchState.RESULT_PUBLISHED &&
                !hasLocalPrediction && (
                  <StatusCard
                    icon={<AlertTriangle size={20} />}
                    title="Reveal data not found in this browser"
                    body="The original prediction and salt are not available here, so this prediction cannot be revealed from this device."
                    variant="warning"
                  />
                )}
              <button
                type="button"
                aria-disabled={!revealButtonActive ? "true" : undefined}
                title={revealTooltip ?? undefined}
                onClick={
                  revealButtonActive ? () => setRevealOpen(true) : undefined
                }
              >
                Reveal prediction
              </button>
            </div>
          )}

          {/* ── Revealed: score summary ── */}
          {predictionState === PredictionState.REVEALED &&
            isOwner &&
            predictionStatus?.revealedPrediction &&
            match.matchResult && (
              <ScoreReveal
                prediction={predictionStatus.revealedPrediction}
                result={match.matchResult}
                points={match.points}
              />
            )}

          {predictionState === PredictionState.REVEALED && !isOwner && (
            <StatusCard
              icon={<CheckCircle2 size={20} />}
              title="This match has been revealed"
              body="The slot was revealed by its owner. The published result is shown above."
              variant="muted"
            />
          )}
        </>
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
