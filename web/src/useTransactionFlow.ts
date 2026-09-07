import { useCallback, useEffect, useRef, useState } from "react";
import type { TxPhase } from "./types.js";

export type TransactionActionResult = {
  ok: boolean;
  txHash?: string;
  error?: string;
};

/** How long "submitting…" is shown before "proving…". */
const SUBMIT_TO_PROVING_DELAY_MS = 1_000;
/**
 * After this long with no promise resolution the UI escalates to the
 * "pending / still processing" state. It is purely presentational: it does
 * NOT mark the transaction as failed, and the eventual promise resolution
 * still drives the terminal state.
 */
export const PENDING_THRESHOLD_MS = 30_000;

export function isBusyPhase(phase: TxPhase): boolean {
  return phase === "submitting" || phase === "proving" || phase === "pending";
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Drives one wallet transaction through its UI lifecycle:
 *
 * - `start(action)` is the only entry point. It sets `submitting`
 *   synchronously, before the first awaited tick, so a Confirm button
 *   derived from `isBusyPhase(phase)` disables the instant the user clicks.
 * - Terminal `success`/`error` states come exclusively from the action's
 *   promise. Timers never produce a terminal state — the 30s threshold only
 *   escalates presentation to `pending` ("still processing") while the
 *   promise is unresolved.
 * - While a flow is busy (`busyRef`), further `start` calls are ignored, so
 *   a slow or stalled transaction can never be duplicated from this screen.
 * - On a definitive failure the flow returns to a retryable state: `error`
 *   is terminal-but-idle, so the caller re-enables its action button and
 *   the user can `start` again.
 *
 * The escaping hatch for a truly stalled transaction (one whose promise
 * never settles) is a page reload: contract state transitions are
 * idempotent and the app restores local data on reconnect.
 */
export function useTransactionFlow() {
  const [phase, setPhaseState] = useState<TxPhase>("idle");
  const [error, setErrorState] = useState<string | undefined>(undefined);
  const phaseRef = useRef<TxPhase>("idle");
  const busyRef = useRef(false);
  const startedAtRef = useRef(0);

  const setPhase = useCallback((next: TxPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const setError = useCallback((message?: string) => {
    setErrorState(message);
  }, []);

  // Escalates presentation while a call is in flight. Delays are computed
  // against the attempt's start time so phase changes (submitting →
  // proving) never reset the 30s clock.
  useEffect(() => {
    if (!isBusyPhase(phase)) {
      return;
    }
    const elapsed = Date.now() - startedAtRef.current;
    const provingDelay = Math.max(0, SUBMIT_TO_PROVING_DELAY_MS - elapsed);
    const pendingDelay = Math.max(0, PENDING_THRESHOLD_MS - elapsed);
    const provingTimer = window.setTimeout(() => {
      if (phaseRef.current === "submitting") {
        setPhase("proving");
      }
    }, provingDelay);
    const pendingTimer = window.setTimeout(() => {
      const current = phaseRef.current;
      if (current === "submitting" || current === "proving") {
        setPhase("pending");
      }
    }, pendingDelay);
    return () => {
      window.clearTimeout(provingTimer);
      window.clearTimeout(pendingTimer);
    };
  }, [phase, setPhase]);

  const start = useCallback(
    async (
      action: () => Promise<TransactionActionResult>,
    ): Promise<TransactionActionResult | undefined> => {
      // Single-flight: while any attempt is unresolved, further starts are
      // ignored so the same transaction can never be submitted twice.
      if (busyRef.current) {
        return undefined;
      }
      busyRef.current = true;
      setError(undefined);
      startedAtRef.current = Date.now();
      setPhase("submitting");

      let result: TransactionActionResult;
      try {
        result = await action();
      } catch (e) {
        result = { ok: false, error: toMessage(e) };
      } finally {
        busyRef.current = false;
      }

      if (result.ok) {
        setPhase("success");
      } else {
        setPhase("error");
        setError(result.error ?? "The transaction failed. Please try again.");
      }
      return result;
    },
    [setError, setPhase],
  );

  const reset = useCallback(() => {
    busyRef.current = false;
    startedAtRef.current = 0;
    setError(undefined);
    setPhase("idle");
  }, [setError, setPhase]);

  return { phase, error, busy: isBusyPhase(phase), start, reset };
}
