import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Dialog } from "./Dialog.js";
import { TransactionStatus } from "./TransactionStatus.js";
import type { Outcome, TxPhase } from "../types.js";
import { isBusyPhase } from "../useTransactionFlow.js";

interface CommitPredictionDialogProps {
  outcome: Outcome;
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  txPhase: TxPhase;
  txHash?: string;
  errorMessage?: string;
}

const TITLE_ID = "commit-prediction-dialog-title";

export function CommitPredictionDialog({
  outcome,
  open,
  onConfirm,
  onDismiss,
  txPhase,
  txHash,
  errorMessage,
}: CommitPredictionDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const isPending = isBusyPhase(txPhase);
  // Terminal-but-retryable error state: Confirm becomes "Try Again" and is
  // re-enabled; terminal success auto-closes via the parent shortly after.
  const confirmLabel = txPhase === "error" ? "Try Again" : "Confirm";

  return (
    <Dialog
      open={open}
      onDismiss={onDismiss}
      // While the transaction is unresolved the modal must not be
      // dismissible: leaving and re-confirming would submit a duplicate
      // while the original call is still in flight.
      dismissible={!isPending}
      labelledBy={TITLE_ID}
    >
      <h2 id={TITLE_ID}>
        <LockKeyhole aria-hidden="true" size={18} /> Commit prediction:{" "}
        {outcome}
      </h2>
      <ul>
        <li>A commitment will be submitted to the blockchain.</li>
        <li>
          Your readable prediction will remain private until you choose to
          reveal it.
        </li>
        <li>
          Your prediction and its secret are stored only in this browser, on
          this device — reveal later from the same browser and device.
        </li>
      </ul>
      <label>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          disabled={isPending}
        />
        I understand I must reveal from the same browser and device where I
        submitted.
      </label>
      <TransactionStatus
        phase={txPhase}
        txHash={txHash}
        errorMessage={errorMessage}
      />
      <div className="dialog-actions">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!acknowledged || isPending}
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onDismiss} disabled={isPending}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
