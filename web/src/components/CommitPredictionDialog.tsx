import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Dialog } from "./Dialog.js";
import { TransactionStatus } from "./TransactionStatus.js";
import type { Outcome, TxPhase } from "../types.js";

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
          You must retain your wallet connection to reveal your prediction
          later.
        </li>
      </ul>
      <label>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          disabled={isPending}
        />
        I understand I must keep my wallet connected to reveal my prediction
        later.
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
          Confirm
        </button>
        <button type="button" onClick={onDismiss} disabled={isPending}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
