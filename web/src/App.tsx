import { useState } from "react";
import { WalletProvider, useWallet } from "./wallet/WalletContext.js";
import { WalletConnect } from "./components/WalletConnect.js";
import { OrganizerKeyInput } from "./components/OrganizerKeyInput.js";
import { MatchList } from "./components/MatchList.js";
import { Brand } from "./components/Brand.js";
import { MatchDetail } from "./screens/MatchDetail.js";
import { addMatch, loadSavedMatches, removeMatch } from "./matchRegistry.js";
import type { SavedMatch } from "./matchRegistry.js";
import { PredictionState } from "@privatepredict/contract";
import type { Match, PredictionStatus } from "./types.js";

/**
 * Wave 1 has exactly one route: the single match this deployed contract
 * represents (see .kiro/specs/privatepredict-wave1/requirements.md,
 * Requirement 10 — there is no match list or leaderboard to route to).
 */
export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

function AppContent() {
  const wallet = useWallet();
  const { derivedState } = wallet;
  const [organizerSecretKey, setOrganizerSecretKey] =
    useState<Uint8Array | null>(null);
  const [matches, setMatches] = useState<SavedMatch[]>(() =>
    loadSavedMatches(
      import.meta.env.VITE_PREDICTION_BOARD_ADDRESS || undefined,
    ),
  );
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  function handleSwitchMatch() {
    if (wallet.connected) {
      wallet.disconnect();
    }
    // The imported organizer secret key belongs to the previous match's
    // deployment. Without clearing it here it would silently be merged into
    // the next match's persisted private state on connect (see connect.ts).
    setOrganizerSecretKey(null);
    setSelectedAddress(null);
  }

  function handleDisconnect() {
    wallet.disconnect();
    setOrganizerSecretKey(null);
  }

  if (!selectedAddress) {
    return (
      <main>
        <Brand tagline />
        <MatchList
          matches={matches}
          onSelect={setSelectedAddress}
          onAdd={(address, label) => setMatches(addMatch(address, label))}
          onRemove={(address) => setMatches(removeMatch(address))}
        />
      </main>
    );
  }

  const match: Match | null = derivedState
    ? {
        matchId: derivedState.matchId,
        teamA: derivedState.teamA,
        teamB: derivedState.teamB,
        deadline: Number(derivedState.deadline) * 1000,
        matchState: derivedState.matchState,
        matchResult: derivedState.matchResult,
        points: Number(derivedState.points),
      }
    : null;

  const predictionStatus: PredictionStatus | null = derivedState
    ? {
        predictionState: derivedState.predictionState,
        hasLocalPrediction: wallet.hasLocalPrediction,
        isPredictionOwner: derivedState.isPredictionOwner,
        revealedPrediction: derivedState.revealedPrediction,
        commitment:
          derivedState.predictionState === PredictionState.NO_COMMITMENT
            ? null
            : derivedState.commitment,
      }
    : null;

  return (
    <main>
      <div className="app-toolbar">
        <Brand />
        <button type="button" onClick={handleSwitchMatch}>
          Switch match
        </button>
      </div>
      <WalletConnect
        connected={wallet.connected}
        address={wallet.walletAddress}
        connecting={wallet.connecting}
        error={wallet.error}
        onConnect={() =>
          wallet.connect(selectedAddress, organizerSecretKey ?? undefined)
        }
        onDisconnect={handleDisconnect}
      />
      {!wallet.connected && (
        <OrganizerKeyInput
          onImport={setOrganizerSecretKey}
          disabled={wallet.connecting}
        />
      )}
      <MatchDetail
        match={match}
        predictionStatus={predictionStatus}
        walletConnected={wallet.connected}
        isOrganizer={derivedState?.isOrganizer ?? false}
        onSubmitPrediction={wallet.submitPrediction}
        onRevealPrediction={wallet.revealPrediction}
        onCloseMatch={wallet.closeMatch}
        onPublishResult={wallet.publishResult}
      />
    </main>
  );
}
