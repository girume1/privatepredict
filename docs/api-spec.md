# TypeScript API Specification

## Wave 1 verified implementation note

The "Intended functions" list below (`createMatch`, `getMatches`,
`getMyPredictionStatus`, `getLeaderboard`) describes a multi-match API that
does not exist. The verified `api/src/index.ts` (`PredictionBoardAPI`) is a
per-deployment facade: one instance represents one already-deployed (or
newly deployed) match, not a registry of many. There is no `createMatch`
call, no match list, and no leaderboard query — see
`contract/src/managed/prediction-board/contract/index.d.ts` for the ledger
shape this is built on.

## Principle

The TypeScript layer connects the React interface to the generated APIs from the compiled Compact contract.

No ordinary backend receives predictions or salts before reveal.

## Client responsibilities

- Connect to the user's Midnight-compatible wallet.
- Read public match state from the Midnight ledger.
- Generate a unique random 32-byte salt locally.
- Create and persist a local prediction record.
- Calculate the commitment using the generated contract-compatible mechanism.
- Submit the commitment transaction.
- Request local proof generation through the proof server.
- Reveal only when the user explicitly confirms.

## Verified API (`@privatepredict/api`)

```ts
class PredictionBoardAPI {
  static deploy(
    providers: PredictionBoardProviders,
    matchId: Uint8Array,
    teamA: string,
    teamB: string,
    deadline: bigint,
    organizerSecretKey: Uint8Array,
  ): Promise<PredictionBoardAPI>;

  static join(
    providers: PredictionBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<PredictionBoardAPI>;

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<PredictionBoardDerivedState>;

  submitPrediction(commitment: Uint8Array): Promise<void>;
  closeMatch(): Promise<void>;
  publishResult(result: Uint8Array): Promise<void>;
  revealPrediction(prediction: Uint8Array, salt: Uint8Array): Promise<void>;
}
```

`state$` combines public ledger state with the locally-held identity keys
into a `PredictionBoardDerivedState`, including `isOrganizer` and
`isPredictionOwner` booleans computed by recomputing the relevant public
key/ID from the local secret key and comparing to the ledger — never by
trusting a client-side flag.

Deploying (creating a match) and joining (participating in one) are both
handled by this one class; there is no separate multi-match "list" or
"create" endpoint, because there is nothing to list — a browser session is
connected to exactly one contract address at a time.

## Local state safety

- Store salts and unrevealed predictions only in the user's local private-state mechanism.
- Do not log, send, upload, or commit salts.
- Do not put private predictions in URLs, query strings, analytics events, or browser-console logs.
- Provide a clear backup/recovery warning before the user submits a commitment.
- **Wave 1 wraps the verified official reference's in-memory private-state
  provider** (`web/src/inMemoryPrivateStateProvider.ts`) **with a
  `localStorage`-backed layer** (`web/src/persistentPrivateStateProvider.ts`),
  scoped per contract address. This was added after the in-memory-only
  version demonstrably lost the participant's identity and pending
  prediction on a real testnet reconnect — see `DEPLOYMENT.md`. Persisted
  data still never leaves the device; it just survives a reload or
  reconnect instead of being wiped by one.
