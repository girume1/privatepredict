/**
 * Lace (or any compatible Midnight wallet) connection, adapted from the
 * verified pattern in the official Midnight bulletin-board example's
 * `bboard-ui/src/contexts/BrowserDeployedBoardManager.ts`.
 *
 * Simplified relative to that reference: bboard-ui tracks a collection of
 * board deployments (deploy-or-join, many at once). PrivatePredict Wave 1
 * only ever has one match per contract deployment. Participants join the
 * pre-deployed contract at `VITE_PREDICTION_BOARD_ADDRESS`
 * (`connectAndJoin`); the organizer deploys new matches through the
 * separate `deploy.html`/`DeployApp.tsx` entry point (`connectAndDeploy`),
 * not through the participant app (`index.html`/`App.tsx`) — see that
 * file's own doc comment for why deployment reuses this browser/Lace path
 * rather than a Node-side wallet integration.
 */
import {
  type ConnectedAPI,
  type InitialAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { createProofProvider } from "@midnight-ntwrk/midnight-js-types";
import {
  type ContractAddress,
  fromHex,
  toHex,
} from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  Transaction,
  type Binding,
  type FinalizedTransaction,
  type Proof,
  type SignatureEnabled,
  type TransactionId,
} from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { UnboundTransaction } from "@midnight-ntwrk/midnight-js-types";
import semver from "semver";
import {
  PredictionBoardAPI,
  createPrivatePredictPrivateState,
  generateSecretKey,
  predictionBoardPrivateStateKey,
  type PredictionBoardCircuitKeys,
  type PredictionBoardProviders,
  type PrivatePredictPrivateState,
} from "@privatepredict/api";
import { persistentPrivateStateProvider } from "../persistentPrivateStateProvider.js";

const COMPATIBLE_CONNECTOR_API_VERSION = "4.x";
const WALLET_DETECT_TIMEOUT_MS = 1_000;
const WALLET_ENABLE_TIMEOUT_MS = 5_000;

function getFirstCompatibleWallet(): InitialAPI | undefined {
  if (!window.midnight) {
    return undefined;
  }
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === "object" &&
      "apiVersion" in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
}

/** Polls for a compatible wallet, then connects. */
async function connectToWallet(networkId: string): Promise<ConnectedAPI> {
  // Required by the SDK before any wallet/contract operation — matches
  // contract/test/prediction-board.test.ts's own setNetworkId("undeployed")
  // call, just with the real network id instead of the test-only one.
  // Confirmed necessary the hard way: omitting this throws "Network ID has
  // not been configured" from deep inside the SDK on the very first
  // operation that needs it.
  setNetworkId(networkId);

  const detected = await pollUntil(
    getFirstCompatibleWallet,
    WALLET_DETECT_TIMEOUT_MS,
  );
  if (!detected) {
    throw new Error(
      "Could not find Midnight Lace wallet. Extension installed?",
    );
  }

  const connectedAPI = await withTimeout(
    detected.connect(networkId),
    WALLET_ENABLE_TIMEOUT_MS,
    "Midnight Lace wallet has failed to respond. Extension enabled?",
  );

  return connectedAPI;
}

function pollUntil<T>(
  fn: () => T | undefined,
  timeoutMs: number,
  intervalMs = 100,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const value = fn();
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(undefined);
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

/**
 * Races `promise` against a deadline: resolves with its value, or rejects
 * with `timeoutMessage` if it settles too late (or never — a hung proof
 * server or unresponsive wallet must not block the caller forever). The
 * underlying promise keeps running; only the caller's await is released.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(timeoutMessage)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

async function createProviders(
  connectedAPI: ConnectedAPI,
): Promise<PredictionBoardProviders> {
  const config = await connectedAPI.getConfiguration();
  const zkConfigProvider =
    new FetchZkConfigProvider<PredictionBoardCircuitKeys>(
      window.location.origin,
      fetch.bind(window),
    );
  const provingProvider = await connectedAPI.getProvingProvider(
    zkConfigProvider.asKeyMaterialProvider(),
  );
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();

  return {
    privateStateProvider: persistentPrivateStateProvider<
      typeof predictionBoardPrivateStateKey,
      PrivatePredictPrivateState
    >(),
    zkConfigProvider,
    proofProvider: createProofProvider(provingProvider),
    publicDataProvider: indexerPublicDataProvider(
      config.indexerUri,
      config.indexerWsUri,
    ),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () =>
        shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (
        tx: UnboundTransaction,
        _ttl?: Date,
      ): Promise<FinalizedTransaction> => {
        const serializedTx = toHex(tx.serialize());
        const received =
          await connectedAPI.balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          "signature",
          "proof",
          "binding",
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };
}

export type WalletConnection = {
  readonly walletAddress: string;
  readonly api: PredictionBoardAPI;
};

/**
 * Connects to a Lace-compatible wallet and joins the pre-deployed
 * PredictionBoard contract at `contractAddress`.
 *
 * `organizerSecretKey`, when given, is the key the organizer saved when
 * deploying this match (see DeployApp.tsx) — pre-seeding the private-state
 * provider with it before `.join()` reads private state means `.join()`
 * picks it up instead of generating a fresh, unrelated one. Without it, a
 * fresh random key is generated as usual, which is correct for a plain
 * participant but would never satisfy the contract's organizer check.
 *
 * Merges rather than overwrites: the private-state provider is now
 * persisted per contract address (see persistentPrivateStateProvider.ts),
 * so a browser that already holds a real participant identity for this
 * address (from an earlier submission) must keep it — only the organizer
 * key is set fresh. Only a genuinely first-ever connection for this address
 * gets a freshly generated participant key.
 */
export async function connectAndJoin(
  networkId: string,
  contractAddress: ContractAddress,
  organizerSecretKey?: Uint8Array,
): Promise<WalletConnection> {
  const connectedAPI = await connectToWallet(networkId);
  const providers = await createProviders(connectedAPI);

  if (organizerSecretKey) {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existing = await providers.privateStateProvider.get(
      predictionBoardPrivateStateKey,
    );
    await providers.privateStateProvider.set(
      predictionBoardPrivateStateKey,
      createPrivatePredictPrivateState(
        existing?.participantSecretKey ?? generateSecretKey(),
        organizerSecretKey,
      ),
    );
  }

  const { shieldedAddress } = await connectedAPI.getShieldedAddresses();
  const api = await PredictionBoardAPI.join(providers, contractAddress);

  return { walletAddress: shieldedAddress, api };
}

export type DeployResult = {
  readonly walletAddress: string;
  readonly contractAddress: ContractAddress;
};

/**
 * Connects to a Lace-compatible wallet and deploys a new PredictionBoard
 * contract (i.e. creates a new match). Organizer-only tooling — see
 * `deploy.html`/`DeployApp.tsx`, not part of the participant-facing app.
 *
 * Deliberately reuses the same verified Lace connection path as
 * `connectAndJoin` rather than a separate Node-side wallet integration: the
 * low-level shielded/unshielded/dust wallet SDK required for a from-scratch
 * Node wallet has no working reference compatible with the installed SDK
 * version, so building against it directly would be unverifiable guessing.
 */
export async function connectAndDeploy(
  networkId: string,
  matchId: Uint8Array,
  teamA: string,
  teamB: string,
  deadline: bigint,
  organizerSecretKey: Uint8Array,
): Promise<DeployResult> {
  const connectedAPI = await connectToWallet(networkId);
  const providers = await createProviders(connectedAPI);
  const { shieldedAddress } = await connectedAPI.getShieldedAddresses();
  const api = await PredictionBoardAPI.deploy(
    providers,
    matchId,
    teamA,
    teamB,
    deadline,
    organizerSecretKey,
  );

  return {
    walletAddress: shieldedAddress,
    contractAddress: api.deployedContractAddress,
  };
}
