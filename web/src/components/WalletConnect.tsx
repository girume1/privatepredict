import { Wallet } from "lucide-react";
import { truncateHex } from "../hex.js";

interface WalletConnectProps {
  connected: boolean;
  address: string | null;
  connecting?: boolean;
  error?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * Presentational only — does not call any Midnight wallet API itself.
 * Minimal wallet status pill + connect/disconnect control.
 */
export function WalletConnect({
  connected,
  address,
  connecting = false,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  return (
    <div className="wallet-connect">
      {connected && address ? (
        <>
          <span
            className="wallet-connect-address"
            aria-label={`Connected wallet: ${address}`}
          >
            <span className="wallet-connect-dot" aria-hidden="true" />
            {/* Truncated address is its own text node so tests can getByText */}
            {truncateHex(address)}
          </span>
          <button type="button" className="button-quiet" onClick={onDisconnect}>
            Disconnect
          </button>
        </>
      ) : (
        <button type="button" onClick={onConnect} disabled={connecting}>
          <Wallet aria-hidden="true" size={15} />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
      {error && (
        <p role="alert" className="wallet-connect-error">
          {error}
        </p>
      )}
    </div>
  );
}
