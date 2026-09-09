import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { type Subscription } from "rxjs";
import {
  generateSalt,
  computeCommitment,
  encodeOutcome,
  type Outcome,
  type PredictionBoardAPI,
  type PredictionBoardDerivedState,
} from "@privatepredict/api";
import { connectAndJoin, withTimeout } from "./connect.js";
import {
  savePending,
  loadPending,
  clearPending,
  type PendingPrediction,
} from "../pendingPrediction.js";

type ActionResult = { ok: boolean; txHash?: string; error?: string };

type WalletContextValue = {
  readonly connected: boolean;
  readonly connecting: boolean;
  readonly walletAddress: string | null;
  readonly error: string | null;
  readonly derivedState: PredictionBoardDerivedState | null;
  readonly hasLocalPrediction: boolean;
  connect: (
    contractAddress: string,
    organizerSecretKey?: Uint8Array,
    participantSecretKey?: Uint8Array,
  ) => Promise<void>;
  disconnect: () => void;
  submitPrediction: (outcome: Outcome) => Promise<ActionResult>;
  revealPrediction: () => Promise<ActionResult>;
  closeMatch: () => Promise<ActionResult>;
  publishResult: (result: Outcome) => Promise<ActionResult>;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * One `api.submitPrediction`/`api.revealPrediction` await spans the whole
 * pipeline: zk-config fetch and proof generation on the local proof
 * server, wallet balancing/signature dispatch, and on-chain submission.
 * If the proof server hangs or the wallet never responds, that promise
 * never settles and the modal's loader would spin forever — so every
 * call is raced against this deadline. The rejection surfaces as an
 * ActionResult error and releases the UI; the transaction may still
 * complete in the background, which the message is careful to say.
 */
const TX_TIMEOUT_MS = 30_000;
const TX_TIMEOUT_MESSAGE =
  "The transaction did not complete within 30 seconds — the wallet or local proof server may be unresponsive. It may still complete, so check the wallet before retrying.";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [derivedState, setDerivedState] =
    useState<PredictionBoardDerivedState | null>(null);
  const [hasLocalPrediction, setHasLocalPrediction] = useState(false);

  const apiRef = useRef<PredictionBoardAPI | null>(null);
  const contractAddressRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingPrediction | null>(null);
  /**
   * Tracks the live state$ subscription so reconnect/switch-match never
   * leaves the previous match's subscription (and its indexer connection)
   * running: a stale emission from an old match used to overwrite the
   * currently selected match's derived state via setDerivedState.
   */
  const stateSubscriptionRef = useRef<Subscription | null>(null);

  const connect = useCallback(
    async (
      contractAddress: string,
      organizerSecretKey?: Uint8Array,
      participantSecretKey?: Uint8Array,
    ) => {
      setConnecting(true);
      setError(null);
      try {
        const networkId = import.meta.env.VITE_NETWORK_ID;
        if (!networkId) {
          throw new Error("VITE_NETWORK_ID must be configured.");
        }
        if (!contractAddress) {
          throw new Error("No match selected.");
        }
        stateSubscriptionRef.current?.unsubscribe();
        stateSubscriptionRef.current = null;
        const connection = await connectAndJoin(
          networkId,
          contractAddress,
          organizerSecretKey,
          participantSecretKey,
        );
        apiRef.current = connection.api;
        contractAddressRef.current = contractAddress;
        // Restores a pending prediction/salt saved by an earlier session for
        // this same match — see pendingPrediction.ts for why this can no
        // longer be assumed lost on reconnect or reload.
        const restored = loadPending(contractAddress);
        pendingRef.current = restored;
        setHasLocalPrediction(restored !== null);
        setWalletAddress(connection.walletAddress);
        stateSubscriptionRef.current = connection.api.state$.subscribe({
          next: setDerivedState,
          error: (e: unknown) => setError(toMessage(e)),
        });
      } catch (e) {
        setError(toMessage(e));
      } finally {
        setConnecting(false);
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    stateSubscriptionRef.current?.unsubscribe();
    stateSubscriptionRef.current = null;
    apiRef.current = null;
    contractAddressRef.current = null;
    pendingRef.current = null;
    setWalletAddress(null);
    setDerivedState(null);
    setHasLocalPrediction(false);
    setError(null);
  }, []);

  const submitPrediction = useCallback(
    async (outcome: Outcome): Promise<ActionResult> => {
      const api = apiRef.current;
      if (!api) {
        return { ok: false, error: "Wallet not connected." };
      }
      try {
        const salt = generateSalt();
        const prediction = encodeOutcome(outcome);
        const commitment = computeCommitment(prediction, salt);
        const pending = { prediction, salt };
        pendingRef.current = pending;
        // Persisted per contract address (see pendingPrediction.ts) so a
        // later reconnect or page reload can still find it before reveal.
        if (contractAddressRef.current) {
          savePending(contractAddressRef.current, pending);
        }
        setHasLocalPrediction(true);
        // Do not race commit submission against a frontend timeout. The
        // caller must remain locked until the wallet/API promise settles so a
        // slow proof or wallet response cannot result in a duplicate commit.
        await api.submitPrediction(commitment);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toMessage(e) };
      }
    },
    [],
  );

  const revealPrediction = useCallback(async (): Promise<ActionResult> => {
    const api = apiRef.current;
    const pending = pendingRef.current;
    if (!api) {
      return { ok: false, error: "Wallet not connected." };
    }
    if (!pending) {
      return {
        ok: false,
        error:
          "Your local prediction data could not be found. Reveal is not possible without the original prediction and salt.",
      };
    }
    try {
      await withTimeout(
        api.revealPrediction(pending.prediction, pending.salt),
        TX_TIMEOUT_MS,
        TX_TIMEOUT_MESSAGE,
      );
      pendingRef.current = null;
      if (contractAddressRef.current) {
        clearPending(contractAddressRef.current);
      }
      setHasLocalPrediction(false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: toMessage(e) };
    }
  }, []);

  const closeMatch = useCallback(async (): Promise<ActionResult> => {
    const api = apiRef.current;
    if (!api) {
      return { ok: false, error: "Wallet not connected." };
    }
    try {
      await api.closeMatch();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: toMessage(e) };
    }
  }, []);

  const publishResult = useCallback(
    async (result: Outcome): Promise<ActionResult> => {
      const api = apiRef.current;
      if (!api) {
        return { ok: false, error: "Wallet not connected." };
      }
      try {
        await api.publishResult(encodeOutcome(result));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: toMessage(e) };
      }
    },
    [],
  );

  const value: WalletContextValue = {
    connected: walletAddress !== null,
    connecting,
    walletAddress,
    error,
    derivedState,
    hasLocalPrediction,
    connect,
    disconnect,
    submitPrediction,
    revealPrediction,
    closeMatch,
    publishResult,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
