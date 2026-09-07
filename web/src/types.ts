import type { Outcome } from "@privatepredict/api";
import type { MatchState, PredictionState } from "@privatepredict/contract";

/**
 * UI transaction lifecycle. `submitting`/`proving`/`pending` are
 * in-progress presentation states; `success` and `error` are terminal and
 * are set ONLY from the real wallet/transaction promise — never from the
 * 30s presentation timer, which merely escalates `proving` → `pending`
 * ("still processing") while the promise is still unresolved.
 */
export type TxPhase =
  "idle" | "submitting" | "proving" | "pending" | "success" | "error";

/**
 * The match slot's prediction stage. The panel additionally takes an
 * ownsPrediction flag so it can present honest content: personal "your
 * prediction/salt" copy is shown to the slot owner only, and neutral
 * wording to any other viewer.
 */
export type PrivacyStage = "before-commitment" | "committed" | "revealed";

/**
 * One deployed contract represents exactly one match with one commitment
 * slot — there is no on-chain match registry in Wave 1 (see
 * docs/data-model.md and docs/architecture.md).
 */
export type Match = {
  matchId: Uint8Array;
  teamA: string;
  teamB: string;
  deadline: number; // ms since epoch
  matchState: MatchState;
  matchResult: Outcome | null;
  points: number;
};

export type PredictionStatus = {
  predictionState: PredictionState;
  hasLocalPrediction: boolean;
  /**
   * True when this browser's locally-held participant key is the one that
   * owns the match's single on-chain commitment slot. Personal copy and
   * reveal affordances must be gated on this — the ledger's prediction
   * state is global, not "yours".
   */
  isPredictionOwner: boolean;
  revealedPrediction: Outcome | null;
  /** Only meaningful once a commitment exists (predictionState !== NO_COMMITMENT). */
  commitment: Uint8Array | null;
};

export type { Outcome, MatchState, PredictionState };
