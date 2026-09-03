# Data Model

## Wave 1 verified implementation note

Everything below is transcribed directly from the compiled contract's
generated `Ledger` type
(`contract/src/managed/prediction-board/contract/index.d.ts`), not aspired
to. There is one flat ledger per contract deployment — no per-match or
per-participant collections, no `predictionKey` hashing scheme, and no
separate `PredictionRecord`/score-record structures. One deployment holds
exactly one match and exactly one commitment slot.

## Enums

```ts
enum MatchState { OPEN = 0, CLOSED = 1, RESULT_PUBLISHED = 2 }
enum PredictionState { NO_COMMITMENT = 0, COMMITTED = 1, REVEALED = 2 }
```

`HOME` / `DRAW` / `AWAY` are not a ledger enum — they are encoded/decoded
outcome bytes handled entirely off-chain by `api/src/outcome.ts`
(`encodeOutcome`/`decodeOutcome`); the contract only ever sees
`Uint8Array` prediction/result values.

## Ledger (public, on-chain)

```ts
type Ledger = {
  matchId: Uint8Array;
  teamA: string;
  teamB: string;
  deadline: bigint;
  matchState: MatchState;
  matchResult: { is_some: boolean; value: Uint8Array };
  organizer: Uint8Array;               // organizer's public key
  predictionState: PredictionState;
  commitment: Uint8Array;
  predictionOwner: Uint8Array;         // committer's participant ID
  revealedPrediction: { is_some: boolean; value: Uint8Array };
  points: bigint;
};
```

There is exactly one `commitment`/`predictionOwner` pair per deployment —
Wave 1 supports one participant's prediction per match, not many.

## User-local private data

Held in `PrivatePredictPrivateState` (`api/src/privateState.ts`), and only
ever in that browser tab's memory — see `docs/privacy-model.md`:

```ts
type PrivatePredictPrivateState = {
  participantSecretKey: Uint8Array;
  organizerSecretKey: Uint8Array;
};
```

The pending `{ prediction, salt }` pair awaiting reveal is held separately,
in `web/src/wallet/WalletContext.tsx`'s `pendingRef` — not part of the
contract's private-state schema, since it isn't needed by any witness, only
by the reveal call's plain arguments.

## Identity derivation

Public keys/IDs are always recomputed from the local secret key via pure
circuits, never trusted as a stored client-side flag:

```text
organizerPublicKey(organizerSecretKey) -> Uint8Array   -- compared to ledger.organizer
participantId(participantSecretKey, matchId) -> Uint8Array -- compared to ledger.predictionOwner
computeCommitment(prediction, salt) -> Uint8Array       -- compared to ledger.commitment
```
