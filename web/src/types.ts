import type { Outcome } from "@privatepredict/api";
import type { MatchState, PredictionState } from "@privatepredict/contract";

export type TxPhase =
  "idle" | "proving" | "awaiting_wallet" | "submitted" | "success" | "error";

export type PrivacyStage = "before-commitment" | "committed" | "revealed";

/**
 * One deployed contract represents exactly one match — there is no list of
 * matches in Wave 1 (see .kiro/specs/privatepredict-wave1/requirements.md,
 * Requirement 6).
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
  revealedPrediction: Outcome | null;
  /** Only meaningful once a commitment exists (predictionState !== NO_COMMITMENT). */
  commitment: Uint8Array | null;
};

export type { Outcome, MatchState, PredictionState };
