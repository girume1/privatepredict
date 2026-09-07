import { LoaderCircle, CircleCheck, CircleAlert } from "lucide-react";
import type { TxPhase } from "../types.js";
import { isBusyPhase } from "../useTransactionFlow.js";

interface TransactionStatusProps {
  phase: TxPhase;
  txHash?: string;
  errorMessage?: string;
}

const BUSY_COPY: Partial<Record<TxPhase, string>> = {
  submitting: "Submitting transaction…",
  proving:
    "Generating zero-knowledge proof — this can take up to a minute. Approve the request in your wallet when prompted.",
  pending:
    "Still processing — this is taking longer than expected. Your transaction has not failed. Keep this window open; you can reload the page to check on-chain state — your data is saved on this device.",
};

const DEFAULT_ERROR = "The transaction failed. Please try again.";

function truncate(hash: string): string {
  return hash.length <= 10 ? hash : `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/**
 * Purely presentational: it maps the caller-owned TxPhase to copy/icons.
 * It owns no timers and can never decide success or failure — the parent's
 * useTransactionFlow drives those from the real transaction promise.
 *
 * Accessibility notes:
 * - The aria-live container is ALWAYS rendered (never conditionally unmounted)
 *   so that screen readers register it before any content is inserted. A
 *   live region that mounts at the same time as its content is inserted will
 *   not be announced by most AT.
 * - aria-atomic="true" ensures the whole message is read as a unit.
 * - aria-live="assertive" on errors so failures interrupt and are announced
 *   immediately rather than waiting for the polite queue.
 * - aria-busy signals to AT that the region is actively loading.
 */
export function TransactionStatus({
  phase,
  txHash,
  errorMessage,
}: TransactionStatusProps) {
  const isPending = isBusyPhase(phase);

  return (
    <div
      className="transaction-status"
      aria-live={phase === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      aria-busy={isPending}
      aria-relevant="additions text"
    >
      {phase !== "idle" && (
        <>
          {isPending && (
            <p className="transaction-status-row">
              <LoaderCircle aria-hidden="true" size={18} className="spin" />
              {BUSY_COPY[phase]}
            </p>
          )}
          {phase === "success" && (
            <p className="transaction-status-row">
              <CircleCheck aria-hidden="true" size={18} />
              Confirmed
              {txHash && <span> — {truncate(txHash)}</span>}
            </p>
          )}
          {phase === "error" && (
            <p className="transaction-status-row">
              <CircleAlert aria-hidden="true" size={18} />
              {errorMessage ?? DEFAULT_ERROR}
            </p>
          )}
        </>
      )}
    </div>
  );
}
