# Requirements Document

## Introduction

PrivatePredict Wave 1 delivers a complete end-to-end privacy-preserving football prediction experience on the Midnight Network. The feature set covers: contract simulation test helpers that make the existing test suite pass; a TypeScript API layer that bridges the React frontend to the compiled Compact `PredictionBoard` contract; a React web frontend with match list, prediction submission, reveal, leaderboard, and privacy panel screens; and the repository housekeeping needed to make the monorepo build cleanly (renaming `bboard` references in `contract/package.json`, adding `web/package.json`).

The contract itself is already compiled and tested conceptually. Wave 1 completes the surrounding layers so a judge can clone the repo, run the proof server locally, and walk through the full commit-and-reveal flow from a browser.

## Verified Wave 1 status (2026-09-02)

This document was written before the contract went through a compatibility
audit against the actual compiled `PredictionBoard` contract and the
installed Compact 0.31.1 compiler. That audit found the contract as originally
compiled was privacy-unsafe (it accepted the prediction `salt` as a public
parameter to `submitPrediction`, before reveal) and had an inverted lifecycle
(reveal happened before the result was published, and organizer actions had
no authorization check at all). The contract has since been redesigned,
recompiled, and verified; `api/` scaffolding has started on top of it. Status
per requirement, updated as work lands:

| Req | Status | Note |
|---|---|---|
| 1 | **Done** | `contract/package.json` renamed, scripts corrected |
| 2 | Not started | `web/` still does not exist |
| 3 | **Done, corrected** | Simulator built; acceptance criteria below rewritten for the corrected lifecycle |
| 4 | **Partially done, corrected** | Built as `outcome.ts`/`crypto.ts`/`commitment.ts`, not one `commitment.ts`; encoding and validation differ from the original text — see corrected criteria below |
| 5 | Not started | No SDK private-state provider wired up yet; only the private-state *type* exists (re-exported in `api/src/privateState.ts`) |
| 6 | **Blocked by contract scope** | `getMatches`/`getLeaderboard` assume a multi-match registry and cross-participant aggregation the contract does not have — see note below |
| 7 | **Partially blocked** | `createMatch` does not exist — a match is created by *deploying* the contract, not by calling a circuit. `closePredictions`/`publishResult` map to real circuits, now organizer-authorized |
| 8 | Partially started | Low-level primitives (`computeCommitment`, salt/secret generation) exist in `api/`; the orchestration functions described here (`submitPrediction`, `revealPrediction` at the API layer) are not yet written |
| 9–13, 15–17 | Not started | Frontend does not exist yet; designs below are still the intended target, pending Requirement 6/7's contract-scope caveats |
| 14 | **Deferred, contract does not support this** | No leaderboard/cross-participant data model exists in the ledger — see note below |
| 18 | Partially true today | `npm test` at the root already passes with no network (18.2); the rest is pending `web/` |

## Glossary

- **PredictionBoard**: The compiled Compact smart contract that enforces the match lifecycle and commitment/reveal rules. One contract deployment represents exactly one match — there is no multi-match registry or `createMatch` circuit.
- **Organizer**: The privileged secret-key holder, established at contract deployment (`initialState`), who may close the match and publish its result. Authorization is enforced on-chain: `closeMatch`/`publishResult` recompute `organizerPublicKey(localOrganizerSecretKey())` and assert it equals the stored `organizer` value.
- **Participant**: A wallet holder who submits a prediction commitment to the one match this contract deployment represents.
- **Match**: A football event identified by a unique 32-byte `matchId`, with two team names, a deadline, and a lifecycle state. Exactly one match exists per contract deployment.
- **MatchState**: On-chain enum with values `OPEN`, `CLOSED`, and `RESULT_PUBLISHED`.
- **PredictionState**: Per-participant on-chain enum with values `NO_COMMITMENT`, `COMMITTED`, and `REVEALED`.
- **Commitment**: The cryptographic value `computeCommitment(prediction, salt)` stored on-chain instead of the readable prediction.
- **Salt**: A unique random 32-byte value generated locally by the frontend; never transmitted before reveal.
- **Prediction**: One of three possible outcomes encoded as a `Uint8Array`: `HOME`, `DRAW`, or `AWAY`.
- **PrivateState**: The Midnight SDK's participant-local storage that holds the secret key, prediction, and salt between commitment and reveal.
- **Simulator**: A test-only TypeScript class that replays contract circuit logic without a running Midnight node.
- **ProofServer**: The local Docker service at `http://localhost:6300` that generates ZK proofs for contract transactions.
- **API**: The TypeScript module in `api/src/` that wraps the generated Compact contract API and exposes application-level functions.
- **Frontend**: The React + TypeScript application in `web/src/`.
- **TransactionResult**: A typed union `{ status: 'success' | 'error'; txHash?: string; error?: string }` returned by every API write function.
- **LeaderboardEntry**: A record `{ participantId: string; points: number; revealedCount: number }` returned by the API.
- **MockPoints**: Non-monetary score awarded by the contract: 3 for a correct prediction, 0 for an incorrect one.

---

## Requirements

### Requirement 1: Contract Package Naming Cleanup

**User Story:** As a developer, I want the contract package to use PrivatePredict names throughout, so that the monorepo builds without referencing the abandoned Bulletin Board example.

#### Acceptance Criteria

1. THE `contract/package.json` SHALL set `"name"` to `"@privatepredict/contract"`.
2. THE `contract/package.json` `"build"` script SHALL reference `src/prediction-board.compact` in the source path and `./src/managed/prediction-board` as the output directory; neither the source path nor the output path SHALL contain the string `"bboard"`.
3. THE `contract/package.json` `"compact"` script SHALL compile `src/prediction-board.compact` into `src/managed/prediction-board`; the output directory SHALL exist and be non-empty after the script runs successfully.
4. WHEN `npm run build` is executed in the `contract/` workspace, THE Build_Script SHALL exit with code 0 AND produce no output containing the string `"bboard"`.
5. THE root `package.json` workspaces array SHALL include `"contract"`, `"api"`, and `"web"` as declared entries.
6. THE `contract/package.json` SHALL contain no occurrence of the string `"bboard"` in any field, including `name`, `scripts`, `main`, `module`, `types`, `exports`, or `files`.

---

### Requirement 2: Web Package Setup

**User Story:** As a developer, I want the `web/` workspace to have a valid `package.json` and Vite + React configuration, so that the frontend can be built and run as part of the monorepo.

#### Acceptance Criteria

1. THE `web/package.json` SHALL declare `"name": "@privatepredict/web"`, `"type": "module"`, and scripts `"dev"`, `"build"`, and `"preview"`.
2. THE `web/package.json` SHALL list `react`, `react-dom`, and `vite` as dependencies or devDependencies with pinned versions.
3. THE `web/package.json` SHALL list `@privatepredict/contract` and `@privatepredict/api` as local workspace dependencies using a plain version range or `"*"` — this repo uses npm workspaces, not pnpm/Yarn, and npm does not resolve the `"workspace:"` protocol prefix. (Verified: `api/package.json` already depends on `"@privatepredict/contract": "*"` and `npm install` at the repo root correctly symlinks it under `node_modules/@privatepredict/contract`.)
4. WHEN `npm run build` is executed in the `web/` workspace, THE Vite_Build SHALL produce a `dist/` directory containing `index.html` and at least one `.js` bundle file.
5. THE `web/` directory SHALL contain a `vite.config.ts` and a `web/index.html` entry point.
6. IF `npm run build` exits with a non-zero code in the `web/` workspace, THEN THE Build_Script SHALL output an error message to stderr and SHALL NOT produce a partial `dist/` directory.

---

### Requirement 3: Contract Simulation Test Helpers

**Status: Done, corrected.** The originally-assumed lifecycle (reveal before
result publication, no organizer authorization, salt accepted as a public
`submitPrediction` parameter) was a privacy defect and has been redesigned.
The acceptance criteria below describe what is actually implemented and
tested in `contract/src/prediction-board.compact` and
`contract/test/prediction-board-simulator.ts` (15/15 tests passing).

**User Story:** As a developer, I want `contract/test/prediction-board-simulator.ts` and `contract/test/utils.ts` to exist and implement the interfaces expected by the existing `prediction-board.test.ts`, so that `npm test` passes in the `contract/` workspace.

#### Acceptance Criteria

1. THE `PredictionBoardSimulator` class SHALL expose a constructor accepting `(participantSecretKey: Uint8Array, matchId: Uint8Array, teamA: string, teamB: string, deadline: bigint, organizerSecretKey: Uint8Array)`.
2. THE `PredictionBoardSimulator` class SHALL expose `getLedger(): Ledger` returning the current simulated ledger state, including a `points: bigint` field.
3. THE `PredictionBoardSimulator` class SHALL expose `submitPrediction(commitment: Uint8Array): Ledger` — no `salt` parameter — that transitions `predictionState` from `NO_COMMITMENT` to `COMMITTED` when `matchState` is `OPEN` and `predictionState` is `NO_COMMITMENT`. The salt is never a circuit parameter, before or after this call.
4. THE `PredictionBoardSimulator` class SHALL expose `closeMatch(): Ledger` that transitions `matchState` from `OPEN` to `CLOSED` when the currently-set organizer secret key's derived public key matches the stored `organizer` value, regardless of whether a prediction has been submitted.
5. THE `PredictionBoardSimulator` class SHALL expose `publishResult(result: Uint8Array): Ledger` that transitions `matchState` from `CLOSED` to `RESULT_PUBLISHED` and sets `matchResult` when the currently-set organizer secret key's derived public key matches the stored `organizer` value. This does not depend on `predictionState` — publishing the result happens before reveal, not after.
6. THE `PredictionBoardSimulator` class SHALL expose `revealPrediction(prediction: Uint8Array, salt: Uint8Array): Ledger` that, only when `matchState` is `RESULT_PUBLISHED` and `predictionState` is `COMMITTED`: verifies the currently-set participant secret key derives the stored `predictionOwner` (scoped to this `matchId`), recomputes `computeCommitment(prediction, salt)` and checks it equals the stored `commitment`, sets `revealedPrediction`, sets `points` to `3` if `prediction` equals the stored `matchResult` and `0` otherwise, and transitions `predictionState` to `REVEALED`.
7. THE `PredictionBoardSimulator` class SHALL expose `setParticipantSecretKey(key: Uint8Array)` and `setOrganizerSecretKey(key: Uint8Array)` to swap the locally-held secret key mid-test, for exercising authorization/ownership failure paths.
8. IF `revealPrediction` is called with a `prediction`/`salt` pair whose recomputed commitment does not match the stored commitment, THEN THE Simulator SHALL throw an error with the message `"Invalid prediction or salt"`.
9. IF `closeMatch` is called when `matchState` is not `OPEN`, THEN THE Simulator SHALL throw `"Match is not open"`. IF called with a non-matching organizer secret key, THEN THE Simulator SHALL throw `"Only the organizer can close the match"`.
10. IF `revealPrediction` is called when `matchState` is not `RESULT_PUBLISHED`, THEN THE Simulator SHALL throw `"Result not yet published"`.
11. IF `publishResult` is called when `matchState` is not `CLOSED`, THEN THE Simulator SHALL throw `"Match is not closed"`. IF called with a non-matching organizer secret key, THEN THE Simulator SHALL throw `"Only the organizer can publish the result"`.
12. IF `revealPrediction` is called with a participant secret key that does not match the stored `predictionOwner`, THEN THE Simulator SHALL throw `"Only the original participant can reveal this prediction"`.
13. IF `submitPrediction` is called when `matchState` is not `OPEN`, THEN THE Simulator SHALL throw `"Match is not open for predictions"`. IF `predictionState` is not `NO_COMMITMENT`, THEN THE Simulator SHALL throw `"Prediction already submitted"`.
14. THE `utils.ts` module SHALL export a `randomBytes(length: number): Uint8Array` function that returns a cryptographically random byte array of `length` bytes via `crypto.getRandomValues`. (As implemented, it does not itself validate the `1`–`65536` range from the original design; callers pass a fixed `32` throughout the test suite.)
15. WHEN `npm test` is executed in the `contract/` workspace, THE Vitest_Runner SHALL report all tests in `prediction-board.test.ts` as passing. **Verified: 15/15 passing.**

---

### Requirement 4: Commitment Generation Utility

**Status: Partially done, corrected.** The original text assumed one file
(`api/src/commitment.ts`) and a big-endian `0`/`1`/`2` encoding for
predictions. As built, the utility is split across three files, and the
encoding was chosen by first verifying Compact's own `pad(32, <string>)`
byte layout against the installed 0.31.1 compiler (UTF-8 bytes, left-aligned,
zero-padded) rather than inventing an unrelated scheme. Explicit 32-byte
length-guard errors described below were **not** implemented — flagged as an
open gap, not silently dropped.

**User Story:** As a developer, I want a pure TypeScript commitment utility that matches the Compact contract's `computeCommitment` pure circuit output, so that the frontend can compute commitments locally without running a circuit.

#### Acceptance Criteria

1. THE `computeCommitment(prediction: Uint8Array, salt: Uint8Array): Uint8Array` function, in `api/src/commitment.ts`, SHALL delegate directly to `pureCircuits.computeCommitment` from `@privatepredict/contract`, guaranteeing a byte-for-byte identical result by construction rather than by a separately-maintained hash implementation. **Verified** by `api/test/commitment.test.ts`.
2. THE `generateSalt(): Uint8Array` function, in `api/src/crypto.ts`, SHALL return a cryptographically random 32-byte value generated by `crypto.getRandomValues`. **Done.**
3. THE `generateSecretKey(): Uint8Array` function, in `api/src/crypto.ts`, SHALL return a cryptographically random 32-byte value generated by `crypto.getRandomValues`, for participant and organizer secret keys. **Done** (not present in the original design, added because the corrected contract's organizer authorization requires an organizer secret key too).
4. THE `encodeOutcome(outcome: 'HOME' | 'DRAW' | 'AWAY'): Uint8Array` function, in `api/src/outcome.ts`, SHALL return a 32-byte value: the outcome string's UTF-8 bytes, left-aligned, zero-padded to 32 bytes — matching Compact's own `pad(32, "HOME")` byte layout (verified by compiling a probe circuit against the installed compact 0.31.1 compiler). **Done, encoding corrected from the original big-endian `0`/`1`/`2` proposal.**
5. THE `decodeOutcome(bytes: Uint8Array): 'HOME' | 'DRAW' | 'AWAY' | null` function, in `api/src/outcome.ts`, SHALL be the inverse of `encodeOutcome`, returning `null` (not throwing) for bytes that don't match any known outcome or aren't exactly 32 bytes. **Done — corrected from throwing to returning `null`; no call site was written yet that depends on the throwing behavior.**
6. THE round-trip property SHALL hold: for each valid outcome in `{ 'HOME', 'DRAW', 'AWAY' }`, `decodeOutcome(encodeOutcome(outcome))` returns the original outcome. **Verified** by `api/test/outcome.test.ts`.
7. **Open gap, not yet implemented:** neither `computeCommitment` nor `encodeOutcome`/`decodeOutcome` currently validates input length and throws a specific error message (e.g. `"prediction and salt must each be exactly 32 bytes"`). `decodeOutcome` returning `null` for wrong-length input is the only length-related guard in place today.

---

### Requirement 5: Local Private State Management

**Status: Not started.** Only the private-state *type* exists so far
(`api/src/privateState.ts` re-exports `PrivatePredictPrivateState`/
`createPrivatePredictPrivateState` from `@privatepredict/contract`, now
holding both `participantSecretKey` and `organizerSecretKey` fields since the
corrected contract needs an organizer witness too). None of the
`savePendingPrediction`/`getPendingPrediction`/`clearPendingPrediction`
functions below exist yet, and per CLAUDE.md's own listed caveat, the
assumption that the Midnight SDK's LevelDB private-state provider works
unmodified in a browser (not just Node, where the contract tests run it) has
not been verified — confirm that before building this requirement, not after.

**User Story:** As a participant, I want my prediction and salt stored only in my local private state and never transmitted to any external service before reveal, so that my prediction remains confidential until I choose to disclose it.

#### Acceptance Criteria

1. THE `PrivateState_Manager` in `api/src/private-state.ts` SHALL store prediction and salt values exclusively in the Midnight SDK's participant-local private state provider.
2. THE `PrivateState_Manager` SHALL expose a `savePendingPrediction(matchId: Uint8Array, prediction: Uint8Array, salt: Uint8Array): Promise<void>` function, where `matchId` is at most 32 bytes, `prediction` is at most 32 bytes, and `salt` is at most 32 bytes; if a prediction already exists for the given `matchId`, the stored values SHALL be overwritten with the new values.
3. THE `PrivateState_Manager` SHALL expose a `getPendingPrediction(matchId: Uint8Array): Promise<{ prediction: Uint8Array; salt: Uint8Array } | null>` function.
4. THE `PrivateState_Manager` SHALL expose a `clearPendingPrediction(matchId: Uint8Array): Promise<void>` function; if no prediction exists for the given `matchId`, the call SHALL complete without error and leave state unchanged.
5. IF `getPendingPrediction` is called for a `matchId` that has no stored prediction, THEN THE `PrivateState_Manager` SHALL return `null`.
6. THE `PrivateState_Manager` SHALL never include prediction or salt values in HTTP request bodies, query strings, URL fragments, console output, or telemetry events emitted to any external endpoint.
7. WHEN a participant's prediction and salt are stored via `savePendingPrediction`, THE `PrivateState_Manager` SHALL make them retrievable via `getPendingPrediction` for the same `matchId` after the current browser session ends and the browser is restarted.
8. IF the underlying private state provider is unavailable when `savePendingPrediction` or `getPendingPrediction` is called, THEN THE `PrivateState_Manager` SHALL reject the returned `Promise` with an error indicating the storage failure, leaving any previously stored state unchanged.

---

### Requirement 6: TypeScript API — Match Reads

**Status: Blocked by verified contract scope, corrected below.**
`getMatches()` and `getLeaderboard()` as originally written assume the ledger
holds a collection of matches and a collection of per-participant scores.
It does not: the deployed contract's ledger is a fixed set of scalar fields
for exactly *one* match and *one* participant slot (`matchId`, `commitment`,
`predictionOwner`, `points`, etc. are each a single value, not a map or
array). There is no indexer query that could return "all matches" or "all
participants' points" from this contract shape. Reading multiple matches
would require either deploying and tracking multiple contract instances
(each fully independent) or a redesigned multi-match ledger — both are
explicitly out of Wave 1 scope. Corrected criteria:

**User Story:** As a participant, I want the TypeScript API to expose functions that read public match state from the Midnight ledger, so that the frontend can display current match information without requiring a wallet.

#### Acceptance Criteria

1. **Corrected:** THE `API` SHALL export a `getMatch(): Promise<Match>` function (no `matchId` parameter) that reads the single match this contract deployment represents, identified by the deployed contract address configured via `VITE_PREDICTION_BOARD_ADDRESS`. There is no `getMatches()` — Wave 1 has exactly one deployed match to read, not a list.
2. **Removed:** a multi-match `getMatch(matchId)` returning `Match | null` does not apply — see 6.1.
3. THE `API` SHALL export a `getMyPredictionStatus(walletAddress: Uint8Array): Promise<PredictionStatus>` function (no `matchId` parameter, for the same reason as 6.1) that returns the prediction status for the participant identified by `walletAddress` against the one deployed match.
4. **Deferred — not supported by the verified contract.** `getLeaderboard()` requires per-participant scores aggregated across many participants; the ledger stores exactly one `predictionOwner`/`points` pair per deployment. This cannot be implemented against the current contract at all, in Wave 1 or by adding more API code — it requires a contract redesign (see Requirement 14).
5. WHEN the Midnight indexer is unreachable, THE `API` SHALL return a rejected `Promise` with a typed error containing a `code: 'NETWORK_ERROR'` field. (Unchanged; not yet implemented.)
6. THE `Match` type SHALL include `matchId: Uint8Array`, `teamA: string`, `teamB: string`, `deadline: number` (Unix timestamp in milliseconds), `matchState: MatchState`, `matchResult: MatchResult | null`, `organizer: Uint8Array`, and `points: number` fields, where each field maps directly to its corresponding field in the `Ledger` type without transformation. (`points` added — it did not exist in the original ledger and does now.)
7. THE `PredictionStatus` type SHALL include `predictionState: PredictionState`, `hasLocalPrediction: boolean`, and `revealedPrediction: string | null` fields, where `revealedPrediction` is `null` when no prediction has been revealed for the participant. (Unchanged.)
8. **Removed.** `LeaderboardEntry` is not implementable against the verified contract — see 6.4 and Requirement 14.

---

### Requirement 7: TypeScript API — Organizer Write Operations

**Status: Not started at the API layer; contract-layer facts corrected below.**
`createMatch` never existed as a circuit — a match is created by *deploying*
the contract with `initialState(matchId, teamA, teamB, deadline,
organizerSecretKey)`, which is a one-time deployment action, not a repeatable
write operation an already-running API would expose. `closePredictions` and
`publishResult` do map to real circuits (`closeMatch`, `publishResult`), and
both now require organizer authorization on-chain (they didn't originally —
that was part of the privacy/authorization defect this contract redesign
fixed). None of `matchId` parameters below apply, for the same one-match-per-deployment
reason as Requirement 6.

**User Story:** As an organizer, I want TypeScript API functions to close predictions and publish results, so that I can administer the match lifecycle through the contract.

#### Acceptance Criteria

1. **Removed.** There is no `createMatch` API function. Deploying a new match means deploying a new contract instance with `initialState(...)`, which is deployment/provider work, not an API write function.
2. THE `API` SHALL export a `closePredictions(organizerSecretKey: Uint8Array): Promise<TransactionResult>` function (no `matchId`) that calls the `closeMatch` circuit, which now asserts the caller's derived organizer public key matches the deployment's stored `organizer` value.
3. THE `API` SHALL export a `publishResult(result: 'HOME' | 'DRAW' | 'AWAY', organizerSecretKey: Uint8Array): Promise<TransactionResult>` function (no `matchId`), calling the `publishResult` circuit, which is also now organizer-authorized. **Note the lifecycle order**: this happens *before* `revealPrediction`, not after — see Requirement 8.
4. WHEN the wallet is not connected, THE `API` SHALL return `{ status: 'error', error: 'WALLET_NOT_CONNECTED' }` for all write operations without attempting a transaction. (Unchanged; not yet implemented.)
5. WHEN a contract circuit call fails due to an assertion violation, THE `API` SHALL return `{ status: 'error', error: 'CIRCUIT_CALL_FAILED' }` (using the typed error code from `api/src/errors.ts`) rather than propagating a raw Compact runtime error. (Corrected: `errors.ts` uses one `CIRCUIT_CALL_FAILED` code with a message, not a `<CIRCUIT_NAME>_FAILED` pattern per circuit.)
6. WHEN any organizer write operation completes successfully, THE `TransactionResult` SHALL be `{ status: 'success', txHash: string }` where `txHash` is a non-empty string. (Unchanged; not yet implemented — no `TransactionResult` type exists in `api/` yet.)
7. **Removed.** No `matchId` parameter exists on these functions to validate — see the status note above.

---

### Requirement 8: TypeScript API — Participant Write Operations

**Status: Primitives done, orchestration not started.** `generateSalt`,
`generateSecretKey`, `computeCommitment`, `encodeOutcome`/`decodeOutcome` all
exist and are tested. The orchestration functions described below
(`submitPrediction`, `revealPrediction` as single API-level calls that also
manage private state) do not exist yet — they depend on Requirement 5's
private-state manager, which isn't built. The contract-level facts are
corrected: `submitPrediction`'s circuit no longer takes a `salt` parameter at
all (that was the original privacy defect), and `revealPrediction` is now
only accepted once the organizer has published the result — not once the
match is merely closed.

**User Story:** As a participant, I want TypeScript API functions to submit a commitment and later reveal my prediction, so that I can participate in the commit-and-reveal flow from the frontend.

#### Acceptance Criteria

1. THE `API` SHALL export a `submitPrediction(outcome: 'HOME' | 'DRAW' | 'AWAY'): Promise<TransactionResult>` function (no `matchId` — see Requirement 6's status note).
2. WHEN `submitPrediction` is called with a valid `outcome`, THE `API` SHALL generate a fresh 32-byte salt via `generateSalt`, compute the commitment via `computeCommitment`, persist the prediction and salt locally via `savePendingPrediction` (Requirement 5, not yet built), and then call the `submitPrediction` circuit with the commitment only — never the salt — returning `{ status: 'success', txHash: string }` on completion.
3. **Removed** (no `matchId` to validate).
4. IF `savePendingPrediction` fails before the circuit call, THEN THE `API` SHALL abort the transaction without submitting to the contract and return `{ status: 'error', error: 'LOCAL_STATE_SAVE_FAILED' }`.
5. IF the `submitPrediction` circuit call fails after `savePendingPrediction` succeeds, THEN THE `API` SHALL preserve the locally saved prediction and salt and return `{ status: 'error', error: 'CIRCUIT_CALL_FAILED' }` so the participant can retry submission.
6. THE `API` SHALL export a `revealPrediction(): Promise<TransactionResult>` function (no `matchId`). **Corrected precondition:** the underlying circuit rejects this call unless the match's `matchState` is already `RESULT_PUBLISHED` — the API should surface a clear state error rather than attempt the call while the match is only `OPEN` or `CLOSED`.
7. WHEN `revealPrediction` is called with the result already published, THE `API` SHALL retrieve the stored prediction and salt via `getPendingPrediction` and pass them to the `revealPrediction` circuit, which also verifies the caller's participant secret key matches the original committer (`predictionOwner`) before accepting the reveal.
8. IF `getPendingPrediction` returns `null`, THEN THE `API` SHALL return `{ status: 'error', error: 'NO_LOCAL_PREDICTION' }` without calling the circuit.
9. WHEN the `revealPrediction` circuit call completes successfully, THE `API` SHALL call `clearPendingPrediction` to remove the now-public local state, then return `{ status: 'success', txHash: string }`. The contract also sets `points` to `3` or `0` at this point — the API should surface that value to the caller (e.g. as part of `TransactionResult` or a follow-up `getMatch()` read), which was not specified in the original design since the `points` field did not exist yet.
10. IF the `revealPrediction` circuit call fails, THEN THE `API` SHALL preserve the local prediction and salt without calling `clearPendingPrediction`, and return `{ status: 'error', error: 'CIRCUIT_CALL_FAILED' }`, so the participant can retry.

---

### Requirement 9: Wallet Connection

**User Story:** As a participant, I want the frontend to connect to my Midnight-compatible wallet, so that I can sign transactions and interact with the contract.

#### Acceptance Criteria

1. WHILE no wallet is connected, THE `WalletConnect` component SHALL display a "Connect Wallet" button as the sole wallet interaction control.
2. WHEN the user activates the "Connect Wallet" button, THE `WalletConnect` component SHALL invoke the Midnight wallet API and, on success, display the connected wallet address truncated to the first 6 characters followed by "…" and the last 4 characters.
3. IF the wallet connection attempt is rejected by the user, THEN THE `WalletConnect` component SHALL display an error message indicating that the connection was declined and prompt the user to try again.
4. IF a Midnight-compatible wallet extension is not detected within 5 seconds of the connection attempt, THEN THE `WalletConnect` component SHALL display an error message indicating that a Midnight-compatible wallet extension is required.
5. WHILE the wallet is connected, THE `WalletConnect` component SHALL display the truncated wallet address (first 6 characters, "…", last 4 characters) and a "Disconnect" control.
6. WHEN the user activates the "Disconnect" control, THE `WalletConnect` component SHALL terminate the wallet session and return to the disconnected state, displaying only the "Connect Wallet" button.
7. THE `WalletConnect` component SHALL remain operable via keyboard alone, with visible focus indicators on all interactive controls, and SHALL meet WCAG 2.1 AA contrast requirements for all visible states.

---

### Requirement 10: Match List Screen

**Status: Needs rescoping — depends on `getMatches()`, which Requirement 6
establishes does not exist against the verified contract.** One contract
deployment is one match, so there is nothing to list in Wave 1. This matches
CLAUDE.md's own UI intent for `/`: "Match list or selected demo-match entry
point" — the "selected demo-match entry point" half is the Wave 1-realistic
one. Recommend replacing this screen with a redirect straight to the single
configured match's detail view (Requirement 11) rather than building list
UI, loading states, and sorting for a collection that cannot have more than
one entry. The acceptance criteria below are left as the original,
list-shaped design intent for reference (useful if Wave 2 adds a real
multi-match registry), not as a Wave 1 build target.

**User Story:** As a participant, I want to see a list of available football matches with their status and my prediction state, so that I can decide which match to act on.

#### Acceptance Criteria

1. WHEN the `MatchList` screen loads, THE `MatchList` screen SHALL call `getMatches()` and display all matches returned in the response.
2. WHILE `getMatches()` is in progress, THE `MatchList` screen SHALL display a loading indicator and suppress the match list and `EmptyState` component.
3. IF `getMatches()` returns an empty list, THEN THE `MatchList` screen SHALL render the `EmptyState` component with a message explaining that no matches exist yet.
4. IF `getMatches()` returns an error, THEN THE `MatchList` screen SHALL display an error message indicating that matches could not be loaded and hide the loading indicator.
5. EACH `MatchCard` component SHALL display the home team name, away team name, deadline as a date and time, the `MatchState` label, and — if a wallet is connected — the participant's `PredictionState`.
6. WHEN the user selects a `MatchCard`, THE `MatchList` screen SHALL navigate to the Match Detail screen for the selected match.
7. THE `MatchList` screen SHALL display match cards sorted in descending order by deadline, with the latest deadline appearing first.
8. WHILE the wallet is disconnected, THE `MatchList` screen SHALL render each `MatchCard` in read-only mode, omitting the `PredictionState` field.

---

### Requirement 11: Match Detail Screen

**User Story:** As a participant, I want a dedicated match detail screen that shows the full match state and surfaces the correct action for my current prediction state, so that I always know what to do next.

#### Acceptance Criteria

1. THE `MatchDetail` screen SHALL display the match's `teamA`, `teamB`, formatted `deadline`, `MatchState`, and `matchResult`. IF `matchState` is not `RESULT_PUBLISHED`, THEN THE `MatchDetail` screen SHALL omit the `matchResult` field from the display.
2. THE `MatchStateTimeline` component SHALL render each of the three states (`OPEN`, `CLOSED`, `RESULT_PUBLISHED`) as distinct nodes, with the node corresponding to the current `matchState` rendered in a visually distinct style from the inactive nodes.
3. WHEN `matchState` is `OPEN` and the participant's `predictionState` is `NO_COMMITMENT` and the wallet is connected, THE `MatchDetail` screen SHALL render the `PredictionSelector` component.
4. WHEN `matchState` is `OPEN` and the participant's `predictionState` is `NO_COMMITMENT` and the wallet is not connected, THE `MatchDetail` screen SHALL display a prompt indicating that a wallet connection is required to submit a prediction and SHALL NOT render the `PredictionSelector` component.
5. WHEN `matchState` is `OPEN` and the participant's `predictionState` is `COMMITTED`, THE `MatchDetail` screen SHALL display a confirmation message indicating that the prediction has been submitted and is awaiting result publication.
6. WHEN the participant's `predictionState` is `COMMITTED` and `matchState` is `CLOSED`, THE `MatchDetail` screen SHALL display a message indicating that the match is closed and that the prediction will be revealable once the result is published.
7. WHEN the participant's `predictionState` is `COMMITTED` and `matchState` is `RESULT_PUBLISHED`, THE `MatchDetail` screen SHALL render the `RevealPredictionDialog` trigger.
8. WHEN the participant's `predictionState` is `REVEALED`, THE `MatchDetail` screen SHALL display the participant's revealed prediction, the `matchResult`, and the numeric points value awarded for that prediction.
9. THE `PrivacyPanel` component SHALL be rendered on the `MatchDetail` screen and SHALL display content corresponding to the participant's current `predictionState`: commitment guidance when `predictionState` is `NO_COMMITMENT`, privacy confirmation when `predictionState` is `COMMITTED`, and revealed summary when `predictionState` is `REVEALED`.
10. WHEN `matchState` is `CLOSED` and `predictionState` is `NO_COMMITMENT`, THE `MatchDetail` screen SHALL display a message indicating the submission window has closed.

---

### Requirement 12: Prediction Submission Flow

**User Story:** As a participant, I want to select a prediction outcome and submit a commitment privately, so that my prediction is recorded on-chain without being readable by others.

#### Acceptance Criteria

1. THE `PredictionSelector` component SHALL display three selectable options: `HOME`, `DRAW`, and `AWAY`.
2. WHEN the user selects an outcome, THE `PredictionSelector` component SHALL highlight the selected option and enable the "Submit Prediction" button.
3. WHEN the user activates "Submit Prediction", THE `CommitPredictionDialog` SHALL appear and display all three of the following notices: (a) a commitment will be submitted to the blockchain; (b) the readable prediction will remain private until the user chooses to reveal; (c) the user must retain their wallet connection to reveal their prediction later.
4. THE `CommitPredictionDialog` SHALL include a confirmation checkbox with the text "I understand I must keep my wallet connected to reveal my prediction later."
5. WHEN the user confirms in the `CommitPredictionDialog`, THE `TransactionStatus` component SHALL display a proof generation in-progress indicator followed by a wallet confirmation in-progress indicator, each as discrete visible steps.
6. WHEN `submitPrediction` returns `{ status: 'success' }`, THE `TransactionStatus` component SHALL display a success message and the `PredictionSelector` SHALL be replaced by a committed-state view reflecting `predictionState: COMMITTED`.
7. IF `submitPrediction` returns `{ status: 'error' }`, THEN THE `TransactionStatus` component SHALL display the `error` field value and offer a "Try Again" option that returns the user to the `PredictionSelector` with the previously selected outcome still highlighted.
8. THE `CommitPredictionDialog` SHALL never display the generated salt value to the user in plaintext.
9. WHEN the user dismisses the `CommitPredictionDialog` without confirming, THE dialog SHALL close and THE `PredictionSelector` SHALL retain the previously selected outcome with the "Submit Prediction" button still enabled.
10. IF proof generation exceeds 30 seconds without a result, THEN THE `TransactionStatus` component SHALL display an error message and offer a "Try Again" option that returns the user to the `PredictionSelector`.

---

### Requirement 13: Prediction Reveal Flow

**User Story:** As a participant, I want to reveal my committed prediction after the result is published, so that the contract can verify my commitment and award mock points.

#### Acceptance Criteria

1. THE `RevealPredictionDialog` SHALL display a confirmation prompt explaining that confirming will permanently make the original prediction value and salt publicly visible on-chain, and SHALL require an explicit user action to proceed.
2. WHEN the user confirms in the `RevealPredictionDialog`, THE `API` `revealPrediction` function SHALL be called with the locally stored prediction value and salt.
3. WHILE the reveal transaction is in progress, THE `TransactionStatus` component SHALL display each of the following states in sequence as they occur: proof generation, and wallet confirmation.
4. WHEN `revealPrediction` returns `{ status: 'success' }`, THE `MatchDetail` screen SHALL update to show the revealed prediction value, the published match result, and the awarded mock points as a numeric value.
5. IF `revealPrediction` returns `{ status: 'error', error: 'NO_LOCAL_PREDICTION' }`, THEN THE `RevealPredictionDialog` SHALL display the message "Your local prediction data could not be found. Reveal is not possible without the original prediction and salt."
6. IF `revealPrediction` returns `{ status: 'error' }` with an error value other than `'NO_LOCAL_PREDICTION'`, THEN THE `RevealPredictionDialog` SHALL display an error message indicating the reason for failure, keep the dialog open, and keep the confirm action available so the user may retry.
7. WHEN `revealPrediction` returns `{ status: 'success' }`, THE `PrivacyPanel` SHALL transition to a post-reveal state indicating that the salt is no longer displayed and that the prediction is now publicly visible.
8. IF the reveal transaction is in progress and the user attempts to close the `RevealPredictionDialog`, THEN THE `RevealPredictionDialog` SHALL prevent dismissal until the transaction either succeeds or returns an error.

---

### Requirement 14: Leaderboard Screen

**Status: Deferred — not buildable against the verified Wave 1 contract, at
any amount of API/frontend effort.** A leaderboard requires comparing scores
*across participants*, but the verified `PredictionBoard` ledger has exactly
one `predictionOwner` and one `points` value per contract deployment — there
is structurally nothing to rank. This is consistent with CLAUDE.md's Wave 1
scope, which lists "public leaderboard" and "aggregated points across users"
as explicit Wave 2+ items requiring a deliberate contract redesign (a
multi-participant ledger, e.g. a map from participant identifier to
commitment/points). Do not build this screen or route in Wave 1; the
acceptance criteria below remain as the Wave 2 design target once that
contract redesign is approved and built.

**User Story:** As a participant, I want to view a public leaderboard of mock points, so that I can see how my score compares with other participants.

#### Acceptance Criteria

1. WHEN the `Leaderboard` component mounts, THE `Leaderboard` component SHALL call `getLeaderboard()` and display all entries returned in the response.
2. EACH leaderboard row SHALL display the participant's identifier truncated to at most 20 characters, total mock points as a non-negative integer, and number of revealed predictions as a non-negative integer.
3. THE `Leaderboard` component SHALL display entries in descending order of mock points; entries with equal points SHALL be displayed in ascending order of participant identifier.
4. WHILE `getLeaderboard()` is in progress, THE `Leaderboard` component SHALL display a loading indicator and suppress any leaderboard rows.
5. IF `getLeaderboard()` returns an error, THEN THE `Leaderboard` component SHALL display an error message indicating that the leaderboard could not be loaded and hide the loading indicator.
6. IF `getLeaderboard()` returns an empty list, THEN THE `Leaderboard` component SHALL display a message indicating no scores have been recorded yet, and SHALL NOT render any leaderboard rows.
7. THE `Leaderboard` component SHALL not display the outcome, value, or any detail of any prediction that has not been publicly revealed on-chain.

---

### Requirement 15: Privacy Panel

**User Story:** As a participant, I want the Privacy Panel to accurately explain what data is public and what remains private at each stage of the prediction lifecycle, so that I understand the privacy properties of the system.

#### Acceptance Criteria

1. THE `PrivacyPanel` component SHALL accept a `predictionState: 'before-commitment' | 'committed' | 'revealed'` prop that controls displayed content.
2. WHEN `predictionState` is `'before-commitment'`, THE `PrivacyPanel` SHALL display: Private — selected prediction, future random salt; Public — nothing submitted yet.
3. WHEN `predictionState` is `'committed'`, THE `PrivacyPanel` SHALL display: Private — plaintext prediction and salt value; Public — match ID, submission timing, commitment.
4. WHEN `predictionState` is `'revealed'`, THE `PrivacyPanel` SHALL display: Private — no salt value; Public — revealed prediction, verified result, placeholder score.
5. THE `PrivacyPanel` SHALL never describe a commitment as providing complete anonymity.
6. THE `PrivacyPanel` SHALL include a note that wallet addresses and transaction timing may remain observable.
7. THE `PrivacyPanel` SHALL expose two `region` elements with `aria-label` values of `"Public information — <stage>"` and `"Private information — <stage>"` where `<stage>` reflects the current `predictionState`.

---

### Requirement 16: Transaction Status Display

**User Story:** As a participant, I want clear feedback on the progress and outcome of every transaction I initiate, so that I am never left uncertain about whether an action succeeded or failed.

#### Acceptance Criteria

1. THE `TransactionStatus` component SHALL display a distinct state for each of: proof generation in progress, wallet confirmation awaited, transaction submitted, success, and error; each state SHALL show a unique visible text label and a distinct icon or color indicator.
2. WHEN proof generation takes longer than 10 seconds, THE `TransactionStatus` component SHALL display the message "Generating zero-knowledge proof. This may take a moment."
3. WHEN a transaction succeeds, THE `TransactionStatus` component SHALL display a success label with a checkmark indicator and the transaction hash abbreviated as the first 6 characters, an ellipsis, and the last 4 characters.
4. WHEN a transaction fails and the `API` returns a non-empty error message, THE `TransactionStatus` component SHALL display that human-readable error message returned by the `API`.
5. WHEN a transaction fails and the `API` returns no error message, THE `TransactionStatus` component SHALL display a generic failure message prompting the user to retry.
6. THE `TransactionStatus` component SHALL not expose raw Compact runtime error strings to the user.
7. THE `TransactionStatus` component SHALL be accessible: each status transition SHALL update an `aria-live` region so screen readers announce the change.

---

### Requirement 17: Mobile Layout and Keyboard Navigation

**User Story:** As a participant using a mobile device or keyboard-only navigation, I want the application to be fully usable, so that I can participate regardless of my input method or screen size.

#### Acceptance Criteria

1. THE `Frontend` SHALL implement a responsive layout that adapts to viewport widths from 320px to 1280px such that all content, controls, and text remain readable and functional without requiring horizontal scrolling or overlapping elements.
2. THE `Frontend` SHALL ensure all interactive elements are reachable via sequential Tab key navigation in logical document order and activatable via the Enter or Space key, with a visible focus indicator rendered on each focused element.
3. THE `Frontend` SHALL display no horizontal scroll bars on viewports 320px wide or wider.
4. WHEN the soft keyboard opens on a mobile device during prediction selection, THE `PredictionSelector` component SHALL remain fully within the visible viewport area, with its input field and submission control unobscured and interactable.
5. THE `Frontend` SHALL meet WCAG 2.1 AA color contrast requirements for all text and interactive elements in their default, focused, and disabled states.
6. IF a keyboard user navigates to a modal or overlay, THEN THE `Frontend` SHALL confine Tab focus within that modal until it is dismissed, and SHALL return focus to the triggering element upon dismissal.

---

### Requirement 18: End-to-End Demo Readiness

**Status: Corrected network target.** This requirement originally assumed a
purely local devnet/proof-server demo. The project's network policy (set
after this document was written) targets the **Midnight public testnet** as
the primary Wave 1 demo, not mainnet and not a local-only network; a local
proof server may still be used for development/debugging. Criterion 5 below
is corrected accordingly. `npm test` at the root is already verified passing
with no network dependency (criterion 2) — that part was accurate.

**User Story:** As a judge, I want to be able to clone the repository, follow the README, and run a complete commit-and-reveal demo, so that I can verify the application works end-to-end.

#### Acceptance Criteria

1. THE `README.md` SHALL include step-by-step instructions for: installing prerequisites, deploying/connecting to the configured contract, running contract tests, starting the frontend, connecting a Midnight-compatible testnet wallet, funding it via the official testnet faucet, and executing the demo flow.
2. WHEN `npm test` is executed at the monorepo root, THE Test_Runner SHALL execute all contract and API tests and report results without requiring a running proof server or network connection. **Verified.**
3. THE `docs/architecture.md` SHALL contain all three of the following: (a) an enumeration of which data fields are stored on the public Midnight ledger; (b) an enumeration of which data fields are stored in participant-local private state; (c) a description of how the system transitions between those storage contexts during the commit-and-reveal protocol.
4. THE `CHANGELOG.md` SHALL contain a dated entry under `[Wave 1]` that lists each delivered feature or component by name.
5. **Corrected:** WHILE a Midnight-compatible wallet is connected to the **Midnight public testnet** (network ID, indexer URL, proof-service URL, and contract address all environment-configured — never hard-coded, per the project's network policy), WHEN a user follows the demo steps in the README, THE `Frontend` SHALL reach a state where both the commitment transaction and the reveal transaction have been confirmed on the public testnet.
6. THE repository SHALL contain no committed secrets, wallet seed phrases, private keys, prediction salts, or `.env` files containing credentials. **Verified so far**: only `.env.example` files with placeholders are permitted; none exist yet since no network code has been written.
