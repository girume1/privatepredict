# PrivatePredict Architecture

## Wave 1 verified implementation note

One contract deployment represents exactly one match, with one commitment
slot — there is no match registry, no `createMatch` circuit, and nothing
for a leaderboard to aggregate. The diagram and component table below are
accurate at the architectural level; see `docs/data-model.md` and
`docs/api-spec.md` for the verified concrete shapes, and `DEPLOYMENT.md`
for what has actually been run live on the Midnight Preview testnet versus
only unit-tested.

## Overview

PrivatePredict is a privacy-preserving football prediction application built on Midnight.

The system is a direct exercise of Midnight's dual-ledger model — public,
on-chain state alongside private, participant-held state, connected by
zero-knowledge-provable circuits rather than a trusted server holding
secrets. Concretely:

- **Public ledger state** (the compiled contract's generated `Ledger`
  type): match identifier, team names, deadline, lifecycle status, the
  organizer's public key, the prediction commitment, and — once revealed —
  the outcome and score. See `docs/data-model.md` for the exact shape.
- **Private local state** (`PrivatePredictPrivateState`): the
  participant's and organizer's secret keys, used only inside pure
  circuits (`participantId`, `organizerPublicKey`, `computeCommitment`) to
  prove a fact about the public state — e.g. "the caller closing this
  match holds the organizer's secret key" — without ever putting the
  secret itself on-chain.

`submitPrediction` (commitment-only) and `revealPrediction`
(commitment-plus-ownership verification) are this pattern applied to a
football prediction.

```text
React + TypeScript frontend
        |
        | prepare private prediction and random salt locally
        v
Midnight TypeScript API / generated Compact contract API
        |
        | generate proof through local proof server
        v
Compact contract on Midnight
        |
        v
Public Midnight ledger
```

## Components

| Component | Responsibility |
|---|---|
| React frontend | Creates predictions locally, displays matches, guides commit/reveal flow |
| TypeScript contract API | Calls generated Compact contract APIs and manages transaction state |
| Compact contract | Enforces match lifecycle, commitment storage, reveal verification, and mock scoring |
| Local private state | Stores prediction and random salt until the user reveals |
| Midnight ledger | Stores public match data, commitments, results, and mock points |
| Proof server | Generates zero-knowledge proofs locally for contract transactions |

## Design principles

- The frontend is not trusted for authorization or scoring.
- The Compact contract validates all state changes.
- Predictions and salts remain private until the user chooses to reveal.
- No real-money bets, deposits, withdrawals, or token payouts are supported.