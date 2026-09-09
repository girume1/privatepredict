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

  return (
    <div className="match-detail">
      <h1 className="match-detail-heading">
        {match.teamA} <span className="match-detail-vs">vs</span> {match.teamB}
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

      {/* ── Result published banner ── */}
      {match.matchState === MatchState.RESULT_PUBLISHED &&
        match.matchResult && (
          <StatusCard
            icon={<CheckCircle2 size={20} />}
            title={`Result: ${match.matchResult}`}
            variant="info"
          />
        )}

      {/* ── OPEN state: no prediction yet ── */}
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

      {/* ── Owner committed, match closed ── */}
      {predictionState === PredictionState.COMMITTED &&
        isOwner &&
        match.matchState === MatchState.CLOSED && (
          <StatusCard
            icon={<Clock size={20} />}
            title="Match closed — waiting for result"
            body="Your prediction is safe. You'll be able to reveal it once the result is published."
            variant="info"
          />
        )}

      {/* ── Owner committed, result published — reveal action ── */}
      {predictionState === PredictionState.COMMITTED &&
        isOwner &&
        match.matchState === MatchState.RESULT_PUBLISHED &&
        (!walletConnected ? (
          <StatusCard
            icon={<Wallet size={20} />}
            title="Reconnect your wallet to reveal"
            body="The result is published. Reconnect to reveal your prediction and see your score."
            variant="info"
          />
        ) : hasLocalPrediction ? (
          <div className="reveal-action">
            <StatusCard
              icon={<Eye size={20} />}
              title="Ready to reveal"
              body="The result is published. Reveal your prediction to verify it on-chain and claim your score."
              variant="info"
            />
            <button type="button" onClick={() => setRevealOpen(true)}>
              Reveal Prediction
            </button>
          </div>
        ) : (
          <StatusCard
            icon={<AlertTriangle size={20} />}
            title="Reveal data not found in this browser"
            body="The original prediction and salt are not available here, so this prediction cannot be revealed from this device."
            variant="warning"
          />
        ))}

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
