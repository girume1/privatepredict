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
 * Presentational only — does not call any Midnight wallet API itself. The
 * actual wallet connection logic is deferred until it can be built against
 * verified SDK declarations (see CLAUDE.md's "Do not fabricate Midnight SDK
 * APIs" rule); this component just renders whatever state it's given.
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
          <span className="wallet-connect-address">
            <Wallet aria-hidden="true" size={16} />
            {truncateHex(address)}
          </span>
          <button type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        </>
      ) : (
        <button type="button" onClick={onConnect} disabled={connecting}>
          <Wallet aria-hidden="true" size={16} />
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
