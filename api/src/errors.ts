/**
 * Typed error codes surfaced to the UI. Raw Compact/circuit runtime errors
 * must never reach end users directly (see CLAUDE.md "Development rules").
 */
export type PrivatePredictErrorCode =
  | "WALLET_NOT_CONNECTED"
  | "INVALID_MATCH_ID"
  | "LOCAL_STATE_SAVE_FAILED"
  | "NO_LOCAL_PREDICTION"
  | "CIRCUIT_CALL_FAILED";

export class PrivatePredictError extends Error {
  readonly code: PrivatePredictErrorCode;

  constructor(code: PrivatePredictErrorCode, message: string) {
    super(message);
    this.name = "PrivatePredictError";
    this.code = code;
  }
}
