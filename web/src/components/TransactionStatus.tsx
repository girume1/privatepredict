import { useEffect, useState } from "react";
import { LoaderCircle, CircleCheck, CircleAlert } from "lucide-react";
import type { TxPhase } from "../types.js";

interface TransactionStatusProps {
  phase: TxPhase;
  txHash?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

const PROVING_MESSAGE_DELAY_MS = 10_000;
const PROVING_TIMEOUT_MS = 30_000;

const PHASE_LABEL: Record<TxPhase, string> = {
  idle: "",
  proving: "Generating zero-knowledge proof",
  awaiting_wallet: "Waiting for wallet confirmation",
  submitted: "Transaction submitted",
  success: "Success",
  error: "Something went wrong",
};

function truncate(hash: string): string {
  return hash.length <= 10 ? hash : `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Owns the 10s/30s proving timers as local state. It is only ever rendered
 * while `phase === "proving"`, so a fresh attempt gets a fresh instance
 * (and fresh timers) via ordinary mount/unmount — no need to reset state
 * synchronously inside an effect body.
 */
function ProvingProgress({ onRetry }: { onRetry?: () => void }) {
  const [status, setStatus] = useState<"normal" | "slow" | "timedOut">(
    "normal",
  );

  useEffect(() => {
    const slowTimer = window.setTimeout(
      () => setStatus("slow"),
      PROVING_MESSAGE_DELAY_MS,
    );
    const timeoutTimer = window.setTimeout(
      () => setStatus("timedOut"),
      PROVING_TIMEOUT_MS,
    );
    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, []);

  if (status === "timedOut") {
    return (
      <div>
        <p className="transaction-status-row">
          <CircleAlert aria-hidden="true" size={18} />
          Proof generation timed out.
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    );
  }
  if (status === "slow") {
    return <p>Generating zero-knowledge proof. This may take a moment.</p>;
  }
  return null;
}

export function TransactionStatus({
  phase,
  txHash,
  errorMessage,
  onRetry,
}: TransactionStatusProps) {
  if (phase === "idle") {
    return null;
  }

  const isPending =
    phase === "proving" || phase === "awaiting_wallet" || phase === "submitted";

  return (
    <div className="transaction-status" aria-live="polite">
      {isPending && (
        <p className="transaction-status-row">
          <LoaderCircle aria-hidden="true" size={18} className="spin" />
          {PHASE_LABEL[phase]}
        </p>
      )}
      {phase === "proving" && <ProvingProgress onRetry={onRetry} />}
      {phase === "success" && (
        <p className="transaction-status-row">
          <CircleCheck aria-hidden="true" size={18} />
          Success
          {txHash && <span> — {truncate(txHash)}</span>}
        </p>
      )}
      {phase === "error" && (
        <div>
          <p className="transaction-status-row">
            <CircleAlert aria-hidden="true" size={18} />
            {errorMessage ?? "The transaction failed. Please try again."}
          </p>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
