# Compact Contract Specification

This document describes the verified Wave 1 implementation.
See `contract/src/prediction-board.compact` for the canonical source.

For Wave 2 plans (multi-match registry, `createMatch` circuit, per-participant
collections, leaderboard), see `CHANGELOG.md`'s "Wave 2 — Planned" section.

## Contract name

`PredictionBoard`

## Deployment model

One contract deployment represents exactly one match with one prediction slot.
There is no `createMatch` circuit — a new match is created by deploying a new
contract instance. See `DEPLOYMENT.md` for the full organizer workflow.

## Goal

Enforce a privacy-preserving football prediction lifecycle on-chain:

```text
OPEN → CLOSED → RESULT_PUBLISHED
```

A prediction has its own lifecycle (matching the compiled `PredictionState` enum):

```text
NO_COMMITMENT → COMMITTED → REVEALED
```

Points are awarded at reveal; there is no separate scored state.

## Ledger state

All fields are public on the Midnight ledger once set.

| Field | Type | Description |
|---|---|---|
| `matchId` | `Bytes<32>` | Unique match identifier, set at deployment |
| `teamA` | `Opaque<"string">` | Home team name |
| `teamB` | `Opaque<"string">` | Away team name |
| `deadline` | `Field` | Submission deadline (display only — see note below) |
| `matchState` | `MatchState` | Current match lifecycle state |
| `matchResult` | `Maybe<Bytes<32>>` | Published result once available |
| `organizer` | `Bytes<32>` | Organizer's derived public key |
| `predictionState` | `PredictionState` | Current prediction lifecycle state |
| `commitment` | `Bytes<32>` | Submitted prediction commitment |
| `predictionOwner` | `Bytes<32>` | Derived participant ID of the committer |
| `revealedPrediction` | `Maybe<Bytes<32>>` | Revealed prediction value once disclosed |
| `points` | `Field` | Mock points awarded at reveal (3 correct, 0 incorrect) |

**Deadline note:** `deadline` is stored for display only. The installed
Compact 0.31.1 toolchain has no time/clock primitive (confirmed by compiling
probes for `time()`, `now()`, `blockTime()`, `secondsSinceEpoch()`,
`currentTime()` — all unbound identifiers). Nothing in the contract rejects a
late `submitPrediction` or early `closeMatch`. Client-side deadline gates are
a UX convenience, not a security boundary.

## Witnesses (private inputs)

| Witness | Description |
|---|---|
| `localParticipantSecretKey()` | Returns the participant's local secret key — never put on-chain |
| `localOrganizerSecretKey()` | Returns the organizer's local secret key — never put on-chain |

## Pure circuits (exported, no state change)

### `participantId(secretKey, matchIdParam) → Bytes<32>`

Derives a participant identifier scoped to a specific match:

```text
persistentHash<Vector<3, Bytes<32>>>([pad(32, "pp:pid:"), matchIdParam, secretKey])
```

Uses `matchId` (already public) rather than the prediction salt, so identity
derivation never touches the pre-reveal secret.

### `computeCommitment(prediction, salt) → Bytes<32>`

Computes the prediction commitment:

```text
persistentHash<Vector<2, Bytes<32>>>([prediction, salt])
```

Only the commitment is stored on-chain. The salt is never a circuit parameter
before reveal.

### `organizerPublicKey(secretKey) → Bytes<32>`

Derives the organizer's public key from their secret key:

```text
persistentHash<Vector<2, Bytes<32>>>([pad(32, "pp:organizer:"), secretKey])
```

## Constructor

```text
constructor(matchIdParam, teamAParam, teamBParam, deadlineParam, organizerSecretKey)
```

Initializes all ledger fields. Derives and stores `organizer` from
`organizerSecretKey` — the secret key itself is never stored on-chain.
Sets `matchState = OPEN`, `predictionState = NO_COMMITMENT`, and both
`matchResult`/`revealedPrediction` to `none`.

## Impure circuits (state-changing transactions)

### `submitPrediction(newCommitment)`

**Preconditions:**
- `matchState == OPEN`
- `predictionState == NO_COMMITMENT`

**Effect:** Derives `predictionOwner` from the witness `localParticipantSecretKey()`
and `matchId`, stores `newCommitment`, sets `predictionState = COMMITTED`.

The salt is **not** a parameter — it never appears in the circuit call or the
public ledger before reveal. Only the commitment is submitted.

### `closeMatch()`

**Preconditions:**
- `matchState == OPEN`
- `organizer == organizerPublicKey(localOrganizerSecretKey())` — organizer-only

**Effect:** Sets `matchState = CLOSED`.

### `publishResult(result)`

**Preconditions:**
- `matchState == CLOSED`
- `organizer == organizerPublicKey(localOrganizerSecretKey())` — organizer-only

**Effect:** Sets `matchResult = some(result)`, sets `matchState = RESULT_PUBLISHED`.

**Wave 1 limitation:** `result` is accepted as any `Bytes<32>` value. The
contract does not restrict it to the canonical `HOME`/`DRAW`/`AWAY` encoding
defined in `api/src/outcome.ts`. The API and UI enforce the encoding, but a
caller bypassing the UI could publish a non-canonical value — this is a Wave 2
TODO in the contract source.

### `revealPrediction(prediction, salt)`

**Preconditions:**
- `matchState == RESULT_PUBLISHED`
- `predictionState == COMMITTED`
- `predictionOwner == participantId(localParticipantSecretKey(), matchId)` — original committer only
- `computeCommitment(prediction, salt) == commitment` — must match stored commitment

**Effect:** Sets `revealedPrediction = some(prediction)`, awards
`points = 3` if `prediction == matchResult.value` else `0`,
sets `predictionState = REVEALED`.

## Scoring rule

```text
Correct prediction (prediction == matchResult.value): 3 points
Incorrect prediction: 0 points
```

## Testnet verification status

| Scenario | Status |
|---|---|
| Deploy → commit `HOME` → close → publish `DRAW` → reveal → **0 points** | **Verified live** on Midnight Preview testnet |
| Deploy → commit → close → publish same outcome → reveal → **3 points** | **Unit-tested only** — not yet run live |

See `DEPLOYMENT.md`'s "Verification status" for full details.

## Non-goals for Wave 1

- Real-money betting, token transfers, or payouts
- External sports-result oracles
- On-chain deadline enforcement (no clock primitive in Compact 0.31.1)
- Result encoding enforcement in the contract (API/UI layer only)
- Multi-match support or leaderboard aggregation
- Full anonymity (wallet addresses and transaction timing remain observable)
- Private group membership
