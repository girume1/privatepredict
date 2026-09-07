# Compact Contract Specification

## Wave 1 verified implementation note

The circuits, per-call `matchId` parameters, and `createMatch`/`closePredictions`
functions described below are the target multi-match design, not what is
compiled today. The verified Wave 1 `contract/src/prediction-board.compact`
implements one match per contract deployment (via `initialState`, not
`createMatch`) with circuits `submitPrediction(commitment)`, `closeMatch()`,
`publishResult(result)`, `revealPrediction(prediction, salt)`. Two facts below
are corrected from this document's original claims, verified against the
installed Compact 0.31.1 compiler:

- **No on-chain deadline enforcement.** No time/block-clock primitive exists
  in this Compact version (confirmed by compiling probes for `time()`,
  `now()`, `blockTime()`, `secondsSinceEpoch()`, `currentTime()` — all
  unbound identifiers). `deadline` is stored for display only; nothing in the
  circuit rejects a late `submitPrediction`. This is a Wave 1 limitation, not
  a guarantee, and it must not be presented as one in the UI.
- **Commitment formula**: `commitment = persistentHash<Vector<2,Bytes<32>>>([prediction, salt])`,
  computed by the exported `computeCommitment` circuit — not
  `persistentCommit({ matchId, prediction }, salt)` as stated below.

**Testnet verification status**: the full lifecycle below — including the
organizer-authorization checks on `closeMatch`/`publishResult` and the
ownership/commitment check on `revealPrediction` — has been run live on the
Midnight Preview testnet for an *incorrect* prediction (0-point outcome).
The scoring rule's 3-point *correct*-prediction branch is unit-tested but
has not yet been run live. See `DEPLOYMENT.md`'s "Verification status".

## Contract name

`PredictionBoard`

## Goal

Enforce a privacy-preserving football prediction lifecycle:

```text
OPEN → CLOSED → RESULT_PUBLISHED
```

A prediction has its own lifecycle (matching the compiled
`PredictionState` enum; points are awarded at reveal, so there is no
separate scored state):

```text
NO_COMMITMENT → COMMITTED → REVEALED
```

## Ledger state

The final Compact implementation will store:

- Match configuration and status
- One prediction commitment per participant per match
- Reveal status per commitment
- Score-claim status per commitment
- Accumulated mock points per participant
- Organizer authorization data

## Exported circuit intent

```text
createMatch(matchId, deadline)
submitPrediction(matchId, commitment)
closePredictions(matchId)
publishResult(matchId, result)
revealPrediction(matchId, prediction, salt)
```

## Circuit rules

### createMatch

- Only the authorized organizer can call it.
- A match ID cannot be reused.
- The deadline must be valid.

### submitPrediction

- The match must exist.
- The match status must be OPEN.
- The current time must be before the deadline.
- The participant must not already have a commitment for this match.
- The stored value is a commitment, never the readable prediction.

### closePredictions

- Only the organizer can close a match.
- The match must be OPEN.
- The close action must occur at or after the deadline, or follow a clearly documented organizer policy.

### publishResult

- Only the organizer can publish a result.
- The match must be CLOSED.
- The result must be HOME, DRAW, or AWAY.
- A published result cannot be changed.

### revealPrediction

- The match must have a published result.
- A commitment must exist for the participant and match.
- The prediction must be HOME, DRAW, or AWAY.
- The circuit recomputes `persistentCommit({ matchId, prediction }, salt)`.
- The recomputed commitment must equal the stored commitment.
- The commitment cannot be revealed twice.
- The circuit awards mock points according to the scoring rule.

## Scoring rule

```text
Correct prediction: 3 points
Incorrect prediction: 0 points
```

## Non-goals for Wave 1

- Real-money betting
- Token transfers or payouts
- External sports-result oracles
- Full anonymity claims
- Complex multi-match leagues
- Private group membership