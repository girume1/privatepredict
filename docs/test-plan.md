# Test Plan

## Wave 1 verified implementation note

The checklists below are corrected to match the real, currently-passing
test suites, not an aspirational multi-match design. There is no
`createMatch` circuit, no per-match/per-user collection, and no
leaderboard — "different users can commit to the same match" and similar
multi-participant cases below do not apply to Wave 1's one-commitment-per-
deployment ledger. See `docs/data-model.md`.

## Contract tests (`contract/test/prediction-board.test.ts` — 15/15 passing)

### Match lifecycle and authorization

- The organizer (matching the secret key passed to `initialState`) can
  close an `OPEN` match.
- A non-organizer cannot close the match.
- A non-`OPEN` match cannot be closed again.
- The organizer can publish a result once the match is `CLOSED`.
- A non-organizer cannot publish a result.
- A result cannot be published before the match is `CLOSED`.
- A published result cannot be changed.

### Prediction submission

- A participant can submit exactly one commitment while the match is
  `OPEN` and `predictionState` is `NO_COMMITMENT`.
- A second submission is rejected once a commitment already exists.
- `submitPrediction` accepts only the commitment — never the salt or the
  readable prediction — as a circuit parameter.

### Reveal and scoring

- A correct prediction and salt reveal successfully once the result is
  published, and award 3 points.
- An incorrect (but valid) prediction and salt reveal successfully and
  award 0 points.
- A wrong salt or wrong prediction fails to match the stored commitment
  and is rejected.
- Reveal before the result is published is rejected, even with the
  correct prediction and salt.
- A commitment cannot be revealed twice.
- Reveal from an identity that does not match the original committer
  (`predictionOwner`) is rejected.

## API tests (`api/src/*.test.ts` — 12/12 passing)

- Commitment generation matches the contract's exported
  `computeCommitment` circuit exactly.
- Outcome encoding/decoding round-trips `HOME`/`DRAW`/`AWAY` correctly and
  rejects invalid values.
- Private-state creation and the organizer/participant key witnesses
  behave as expected.
- Errors from failed circuit calls surface as typed, human-readable
  errors — never raw Compact runtime errors.

## Frontend tests (`web/src/**/*.test.tsx` — 111/111 passing)

- Local state (pending prediction/salt) is never rendered, logged, or sent
  anywhere before an explicit reveal.
- `CommitPredictionDialog`/`RevealPredictionDialog` never get stuck after a
  successful or failed transaction — always dismissible once the
  transaction reaches a terminal state.
- `OrganizerControls` only renders for the organizer identity, gates Close
  Match on the (client-side-only) deadline, and surfaces failures without
  pretending success.
- `MatchDetail` shows the correct action/message for every
  `(matchState, predictionState, walletConnected)` combination, including
  the deadline-passed courtesy message on the participant submission path.
- `PrivacyPanel` reflects the correct public/private split at each
  lifecycle stage.

## Verified live on Midnight Preview testnet

Deploy → commit `HOME` → close → publish `DRAW` → reveal → **0 points**,
via a real Lace wallet and a local Docker proof server. This exercised the
full corrected lifecycle plus the on-chain organizer-authorization and
ownership/commitment checks — not just the simulator. See `DEPLOYMENT.md`.

**Not yet run live**: a matching prediction/result pair producing the
3-point correct-prediction branch. Unit-tested only until it is.
