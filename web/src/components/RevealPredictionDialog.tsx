import { Eye } from "lucide-react";
import { Dialog } from "./Dialog.js";
import { TransactionStatus } from "./TransactionStatus.js";
import type { TxPhase } from "../types.js";

interface RevealPredictionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  txPhase: TxPhase;
  txHash?: string;
  errorMessage?: string;
}

const TITLE_ID = "reveal-prediction-dialog-title";

export function RevealPredictionDialog({
  open,
  onConfirm,
  onDismiss,
  txPhase,
  txHash,
  errorMessage,
}: RevealPredictionDialogProps) {
  // "success" and "error" are terminal, not pending — a completed
  // transaction must not leave the dialog stuck with no way to dismiss it.
  const isPending =
    txPhase === "proving" ||
    txPhase === "awaiting_wallet" ||
    txPhase === "submitted";

  return (
    <Dialog
      open={open}
      onDismiss={onDismiss}
      dismissible={!isPending}
      labelledBy={TITLE_ID}
    >
      <h2 id={TITLE_ID}>
        <Eye aria-hidden="true" size={18} /> Reveal prediction
      </h2>
      <p>
        Confirming will permanently make your original prediction and salt
        publicly visible on-chain. This cannot be undone.
      </p>
      <TransactionStatus
        phase={txPhase}
        txHash={txHash}
        errorMessage={errorMessage}
      />
      <div className="dialog-actions">
        <button type="button" onClick={onConfirm} disabled={isPending}>
          Confirm Reveal
        </button>
        <button type="button" onClick={onDismiss} disabled={isPending}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
