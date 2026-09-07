import { Eye } from "lucide-react";
import { Dialog } from "./Dialog.js";
import { TransactionStatus } from "./TransactionStatus.js";
import type { TxPhase } from "../types.js";
import { isBusyPhase } from "../useTransactionFlow.js";

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
  const isPending = isBusyPhase(txPhase);
  const confirmLabel = txPhase === "error" ? "Try Again" : "Confirm Reveal";

  return (
    <Dialog
      open={open}
      onDismiss={onDismiss}
      // While the reveal is unresolved the modal must not be dismissible:
      // leaving and re-confirming could reveal twice while the original
      // call is still in flight.
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
          {confirmLabel}
        </button>
        <button type="button" onClick={onDismiss} disabled={isPending}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
