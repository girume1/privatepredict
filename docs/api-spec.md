# TypeScript API Specification

This document describes the verified Wave 1 implementation of `@privatepredict/api`.
See `api/src/index.ts` for the canonical source.

For Wave 2 plans (multi-match registry, `getMatches`, `getLeaderboard`), see
`CHANGELOG.md`'s "Wave 2 — Planned" section.

## Principle

`@privatepredict/api` is a per-deployment facade over the compiled Compact
contract. One `PredictionBoardAPI` instance represents exactly one deployed
match — there is no match registry, no `createMatch` call, and no leaderboard
query. A browser session is connected to exactly one contract address at a time.

No conventional backend receives predictions or salts before reveal.

## Client responsibilities

- Connect to the user's Midnight-compatible wallet.
- Read public match state from the Midnight ledger via `state$`.
- Generate a unique random 32-byte salt locally (`generateSalt()`).
- Compute the commitment locally (`computeCommitment(prediction, salt)`).
- Persist the pending `{prediction, salt}` pair locally before submitting.
- Submit only the commitment on-chain (`submitPrediction(commitment)`).
- Reveal only when the user explicitly confirms and the result is published.

## API reference (`@privatepredict/api`)

### `PredictionBoardAPI`

```ts
class PredictionBoardAPI {
  /**
   * Deploys a new PredictionBoard contract — i.e. creates a new match.
   * Returns an API instance bound to the newly deployed contract address.
   */
  static deploy(
    providers: PredictionBoardProviders,
    matchId: Uint8Array,
    teamA: string,
    teamB: string,
    deadline: bigint,
    organizerSecretKey: Uint8Array,
  ): Promise<PredictionBoardAPI>;

  /**
   * Joins an already-deployed PredictionBoard contract at contractAddress.
   * Returns an API instance bound to that address.
   */
  static join(
    providers: PredictionBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<PredictionBoardAPI>;

  /** The address of the contract this instance is bound to. */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Observable combining public ledger state with locally-held identity keys.
   * Emits a new PredictionBoardDerivedState whenever either source changes.
   */
  readonly state$: Observable<PredictionBoardDerivedState>;

  /** Submit a commitment on-chain. The salt is never a parameter. */
  submitPrediction(commitment: Uint8Array): Promise<void>;

  /** Organizer-only. Transitions matchState from OPEN to CLOSED. */
  closeMatch(): Promise<void>;

  /** Organizer-only. Transitions matchState from CLOSED to RESULT_PUBLISHED. */
  publishResult(result: Uint8Array): Promise<void>;

  /**
   * Reveal the original prediction and salt. Only accepted once
   * matchState is RESULT_PUBLISHED and the caller is the original committer.
   */
  revealPrediction(prediction: Uint8Array, salt: Uint8Array): Promise<void>;
}
```

### `PredictionBoardDerivedState`

The shape emitted by `state$`, combining ledger state with locally-derived
identity checks:

```ts
type PredictionBoardDerivedState = {
  matchId: Uint8Array;
  teamA: string;
  teamB: string;
  deadline: bigint;
  matchState: MatchState;           // OPEN | CLOSED | RESULT_PUBLISHED
  matchResult: Outcome | null;      // null until published
  organizer: Uint8Array;
  predictionState: PredictionState; // NO_COMMITMENT | COMMITTED | REVEALED
  commitment: Uint8Array;
  points: bigint;
  revealedPrediction: Outcome | null; // null until revealed
  /** True when the locally-held organizer secret key matches this deployment's organizer. */
  isOrganizer: boolean;
  /** True when the locally-held participant secret key matches the committed prediction's owner. */
  isPredictionOwner: boolean;
};
```

`isOrganizer` and `isPredictionOwner` are computed by recomputing the relevant
public key/ID from the local secret key and comparing against the ledger value
— never by trusting a client-side flag.

### Utility exports

```ts
/** Generate a cryptographically random 32-byte secret key. */
function generateSecretKey(): Uint8Array;

/** Generate a cryptographically random 32-byte salt for a prediction commitment. */
function generateSalt(): Uint8Array;

/** Encode a HOME | DRAW | AWAY outcome as a Bytes<32> circuit value. */
function encodeOutcome(outcome: Outcome): Uint8Array;

/** Decode a Bytes<32> circuit value back to a HOME | DRAW | AWAY outcome. */
function decodeOutcome(bytes: Uint8Array): Outcome;

/** Compute persistentHash([prediction, salt]) — matches the contract's computeCommitment circuit. */
function computeCommitment(prediction: Uint8Array, salt: Uint8Array): Uint8Array;

/** Create a PrivatePredictPrivateState from a participant and organizer secret key. */
function createPrivatePredictPrivateState(
  participantSecretKey: Uint8Array,
  organizerSecretKey: Uint8Array,
): PrivatePredictPrivateState;
```

## Providers

`PredictionBoardProviders` wires up the four SDK providers required by the contract:

| Provider | Source | Role |
|---|---|---|
| `privateStateProvider` | `persistentPrivateStateProvider()` | Reads/writes private state (scoped per contract address, persisted in `localStorage`) |
| `zkConfigProvider` | `FetchZkConfigProvider` | Fetches ZK keys from the same origin as the web app |
| `proofProvider` | `createProofProvider(provingProvider)` | Delegates proof generation to the connected Lace wallet + local proof server |
| `publicDataProvider` | `indexerPublicDataProvider` | Reads public ledger state from the Midnight indexer |

## Local state safety

- Salts and unrevealed predictions are stored only in the user's local private-state
  (`web/src/persistentPrivateStateProvider.ts`, scoped per contract address,
  persisted in `localStorage`).
- Private data is never logged, sent to a backend, included in URLs, query strings,
  analytics events, or browser-console output.
- The pending `{prediction, salt}` pair is persisted in `localStorage` before the
  commitment transaction is submitted, so a reload or reconnect before reveal does
  not lose it (`web/src/pendingPrediction.ts`).
- Persisted data never leaves the device. Clearing site data, using a different
  browser, or using a different device permanently loses access to that pending
  prediction — there is no cross-device recovery.

## Error handling

Circuit call failures are wrapped in `PrivatePredictError` with typed error codes.
See `api/src/errors.ts`.
