# TypeScript API Specification

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

## Intended functions

```ts
createMatch(matchId, deadline): Promise<TransactionResult>
submitPrediction(matchId, prediction): Promise<TransactionResult>
publishResult(matchId, result): Promise<TransactionResult>
revealPrediction(matchId): Promise<TransactionResult>
getMatches(): Promise<Match[]>
getMyPredictionStatus(matchId): Promise<PredictionStatus>
getLeaderboard(): Promise<LeaderboardEntry[]>
```

## Local state safety

- Store salts and unrevealed predictions only in the user's local private-state mechanism.
- Do not log, send, upload, or commit salts.
- Do not put private predictions in URLs, query strings, analytics events, or browser-console logs.
- Provide a clear backup/recovery warning before the user submits a commitment.