# Implementation Plan: PrivatePredict Wave 1

## Overview

Build out the three layers of the PrivatePredict monorepo — contract housekeeping, TypeScript API, and React frontend — in bottom-up order. The contract is already compiled; Wave 1 completes the surrounding infrastructure so a judge can clone, run the proof server, and walk through a full commit-and-reveal flow from a browser.

All code is TypeScript / React 18 + Vite as specified in the design.

## Verified Wave 1 status (2026-09-02)

Sections 1 and 2 below are now **done**, but not as originally written: the
contract went through a compatibility audit that found it privacy-unsafe
(salt sent as a public `submitPrediction` parameter) and lifecycle-inverted
(reveal before result publication, no organizer authorization). It was
redesigned, recompiled, and verified (15/15 tests). Section 3 (API types and
commitment utility) is **partially done** with corrected signatures/encoding
(12/12 tests). Sections 4 onward (private state, API facade, all of `web/`,
docs) are **not started**, and some items within them (`createMatch`,
`getMatches`, `getLeaderboard`) are **not buildable at all** against the
verified contract without a contract redesign — see `requirements.md`
Requirements 6, 7, 14 for the specifics. Task text below is corrected in
place; see `requirements.md`/`design.md` for the full reasoning.

---

## Tasks

- [x] 1. Monorepo and package housekeeping
  - [x] 1.1 Update `contract/package.json` to rename all `bboard` references
    - **Done, corrected:** the real compiler command is `compact compile src/prediction-board.compact ./src/managed/prediction-board` (not `compactc ...` — `compactc.bin` is the compiler binary, `compact compile` is the CLI wrapper actually on `PATH`, verified as `compact 0.31.1`)
    - `"name"` set to `"@privatepredict/contract"`, `"private": true` added
    - No `bboard` string remains anywhere in the file — verified
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 1.2 Update root `package.json` workspaces array
    - Already had `"contract"`, `"api"`, `"web"` from the start
    - _Requirements: 1.5_

  - [x] 1.3 Create `api/package.json`
    - **Corrected:** `"main": "./dist/index.js"` / `"types": "./dist/index.d.ts"` (not `"./src/index.ts"` — a `.ts` file is not a valid `main` entry without a build step)
    - `@privatepredict/contract` added as `"*"` (not `"workspace:*"` — npm workspaces, not pnpm/Yarn; verified `npm install` at the repo root correctly symlinks it)
    - _Requirements: 2.1, 2.3_

  - [ ] 1.4 Create `web/package.json` — **not started**
    - Set `"name": "@privatepredict/web"`, `"type": "module"`
    - Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`
    - Dependencies: `react@18.3.1`, `react-dom@18.3.1`, `react-router-dom@6.26.2`
    - DevDependencies: `vite@5.4.8`, `@vitejs/plugin-react@4.3.2`, `typescript@5.6.3`
    - Workspace dependencies: `@privatepredict/contract: "*"`, `@privatepredict/api: "*"` (corrected from `workspace:*`, same reason as 1.3)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 1.5 Create `web/vite.config.ts` and `web/index.html`
    - `vite.config.ts`: use `@vitejs/plugin-react`, resolve workspace packages
    - `index.html`: root entry point mounting `<div id="root">`, script tag pointing to `src/main.tsx`
    - _Requirements: 2.4, 2.5_

- [x] 2. Contract simulation test helpers
  - [x] 2.1 Create `contract/test/utils.ts`
    - Export `randomBytes(length: number): Uint8Array` via `crypto.getRandomValues`
    - **Corrected:** does not itself validate the 1–65536 range or throw `RangeError` — the test suite only ever calls it with a fixed `32`, so this guard was skipped as unneeded for Wave 1's actual usage
    - _Requirements: 3.14_

  - [x] 2.2 Create `contract/test/prediction-board-simulator.ts`
    - **Corrected implementation strategy:** rather than a hand-rolled `LedgerState` object replaying circuit logic, the simulator drives the real compiled contract via `contract.impureCircuits.*` and `@midnight-ntwrk/compact-runtime`'s `CircuitContext` — zero drift from what's actually enforced on-chain
    - Constructor: `(participantSecretKey, matchId, teamA, teamB, deadline, organizerSecretKey)`; private state holds **both** keys (corrected — the organizer's circuits need a witness now too)
    - `getLedger(): Ledger` returns the live ledger read, including `points`
    - `submitPrediction(commitment)` — **no `salt` parameter** (the privacy fix); throws `"Match is not open for predictions"` / `"Prediction already submitted"` on misuse
    - `closeMatch()` — requires the organizer secret key to derive the stored `organizer` value; throws `"Match is not open"` / `"Only the organizer can close the match"`; succeeds with no prediction submitted (corrected — no longer requires `COMMITTED`)
    - `publishResult(result)` — requires `matchState === CLOSED` and organizer auth; throws `"Match is not closed"` / `"Only the organizer can publish the result"`; **no longer depends on `predictionState`** — this now happens before reveal
    - `revealPrediction(prediction, salt)` — requires `matchState === RESULT_PUBLISHED` (corrected from `CLOSED`) and a matching participant secret key (ownership check, new); recomputes the commitment, sets `points` to `3`/`0`; throws `"Result not yet published"` / `"Only the original participant can reveal this prediction"` / `"Invalid prediction or salt"`
    - Added `setParticipantSecretKey`/`setOrganizerSecretKey` helpers, not in the original design, needed to test the new authorization/ownership failure paths
    - _Requirements: 3.1–3.15_

  - [x] 2.3 Write tests for simulator state machine soundness (Property 4)
    - **Property 4, corrected order:** every valid transition sequence is **submit → close → publishResult → reveal**, not submit → close → reveal → publishResult
    - Every out-of-order call throws the exact corrected error message from Requirement 3
    - **Verified as part of the 15/15 passing suite**, not as a separate optional property test

  - [x] 2.4 Write tests for reveal integrity (Property 5)
    - `revealPrediction(wrongPrediction, salt)` throws `'Invalid prediction or salt'` when a valid commitment is stored and `matchState` is `RESULT_PUBLISHED` (corrected from `CLOSED`)
    - **Verified**, plus new tests for the ownership-check and organizer-authorization failure paths that didn't exist in the original design
    - _Requirements: 3.6, 3.8, 3.9, 3.11, 3.12_

  - [x] 2.5 Checkpoint — run `npm test` in `contract/`
    - **Verified: 15/15 tests passing**, plus `typecheck`, `lint`, and `build` all exit 0.

- [x] 3. API layer — types and commitment/outcome/crypto utilities
  - [x] 3.1 Create shared types — **corrected: split across three files, not one `types.ts`**
    - `Outcome` in `api/src/outcome.ts`; `PrivatePredictErrorCode`/`PrivatePredictError` class in `api/src/errors.ts` — matching CLAUDE.md's exact error codes
    - `TransactionResult`, `Match`, `PredictionStatus` **not created yet** — they belong to the not-yet-built facade (task 5)
    - `LeaderboardEntry` **not created — deferred**, not implementable against the verified contract (Requirement 14)
    - _Requirements: 6.6, 6.7_

  - [x] 3.2 Create `api/src/outcome.ts`, `api/src/crypto.ts`, `api/src/commitment.ts` — **corrected: three files, not one `commitment.ts`**
    - `encodeOutcome(outcome: Outcome): Uint8Array` — UTF-8 bytes, left-aligned, zero-padded to 32 bytes (verified against Compact's own `pad(32, str)` layout via a compiled probe circuit; **not** the originally-proposed big-endian `0`/`1`/`2`)
    - `decodeOutcome(bytes: Uint8Array): Outcome | null` — inverse; returns `null` (not a throw) on invalid input
    - `generateSalt(): Uint8Array`, `generateSecretKey(): Uint8Array` — both 32 bytes via `crypto.getRandomValues` (`generateSecretKey` added — needed for the organizer key too)
    - `computeCommitment(prediction, salt): Uint8Array` — delegates to `pureCircuits.computeCommitment`; **does not validate input length** — open gap, not implemented
    - _Requirements: 4.1–4.6_

  - [x] 3.3 Write tests for commitment round-trip (Property 1)
    - **Verified** in `api/test/commitment.test.ts`: matches `pureCircuits.computeCommitment` by construction, plus distinctness checks for different predictions/salts
    - _Requirements: 4.1_

  - [x] 3.4 Write tests for encoding round-trip (Property 2)
    - **Verified** in `api/test/outcome.test.ts`: `decodeOutcome(encodeOutcome(x)) === x` for all three outcomes, plus the verified `pad()` byte-layout check and null-on-invalid-input cases
    - **Not implemented:** length-guard throws — `computeCommitment`/`encodeOutcome` don't validate input length (see 3.2)
    - _Requirements: 4.4, 4.5, 4.6_

- [ ] 4. API layer — private state manager (**not started**)
  - [ ] 4.1 Create `api/src/privateState.ts` (filename corrected: camelCase, not `private-state.ts` — currently only re-exports the contract's private-state type)
    - Export class `PrivateStateManager` accepting `MidnightPrivateStateProvider` in constructor
    - **Corrected — no `matchId` parameter** on any method: one contract deployment is one match, so there is one pending prediction to track, not a map (see Requirement 6)
    - `savePendingPrediction(prediction, salt)` — overwrite existing; reject if provider unavailable
    - `getPendingPrediction()` — return `{ prediction, salt }` or `null`; reject if provider unavailable
    - **Before building this**, verify the Midnight SDK's LevelDB private-state provider actually works in-browser (only verified so far in Node, via contract tests) — this was an explicitly flagged unverified assumption
    - `clearPendingPrediction(matchId)` — no-op (never reject) if key not found
    - Helper: `toHex(bytes: Uint8Array): string`
    - _Requirements: 5.1–5.8_

  - [ ]* 4.2 Write property test for local-state isolation (Property 3)
    - **Corrected — no `matchId` key**: `savePendingPrediction(p, s)` followed by `getPendingPrediction()` returns the saved values; overwrite semantics hold
    - Use an in-memory mock provider
    - _Requirements: 5.2, 5.3, 5.5_

- [ ] 5. API layer — main facade (**not started**)
  - [ ] 5.1 Create `api/src/index.ts` with initialisation and guard helpers
    - Module-level singletons: `_contract`, `_wallet`, `_privateState`
    - `initApi(wallet, provider)` — instantiate `PrivateStateManager` and contract handle
    - Guard helpers: `requireWallet()`, `wrapCircuitError(err)` using the real `PrivatePredictError` class from `api/src/errors.ts` (already built). **No `requireMatchId`** — there is no `matchId` parameter anywhere in this API (see Requirement 6)
    - _Requirements: 7.4, 7.5, 8.3_

  - [ ] 5.2 Implement read operations in `api/src/index.ts`
    - **Corrected — no multi-match reads:** `getMatch()` reads the one match this deployed contract represents (identified by `VITE_PREDICTION_BOARD_ADDRESS`), not `getMatches()` over a registry that doesn't exist
    - `getMyPredictionStatus(walletAddress)` — populate `predictionState`, `hasLocalPrediction`, `revealedPrediction` (no `matchId` param)
    - **Removed: `getLeaderboard()`** — deferred, not implementable against the verified contract (Requirement 14)
    - Convert `Ledger.deadline` (bigint seconds) to `number` ms; include the new `points` field in the returned `Match`
    - _Requirements: 6.1, 6.3, 6.5, 6.6_

  - [ ] 5.3 Implement organizer write operations in `api/src/index.ts`
    - **Removed: `createMatch`** — a new match means deploying a new contract instance (`initialState`), not calling a repeatable write function
    - `closePredictions(organizerSecretKey)` — guard wallet, call `closeMatch` circuit (no `matchId`)
    - `publishResult(result, organizerSecretKey)` — guard wallet, encode result via `encodeOutcome`, call circuit (no `matchId`). **Note the corrected order**: this must happen before `revealPrediction`, not after
    - All return `{ status: 'success', txHash }` on success; use `wrapCircuitError` on assertion failure
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 5.4 Implement participant write operations in `api/src/index.ts`
    - `submitPrediction(outcome)` — no `matchId`; wallet → encode → salt → commitment → save → circuit (commitment only, no salt) → return; abort with `LOCAL_STATE_SAVE_FAILED` if save throws; preserve local state on circuit failure
    - `revealPrediction()` — no `matchId`; wallet → check `matchState === RESULT_PUBLISHED` → getPendingPrediction (return `NO_LOCAL_PREDICTION` if null) → circuit (which itself checks reveal ownership) → clearPendingPrediction → return, **including the `points` value** the contract just set (new — didn't exist in the original design)
    - _Requirements: 8.1, 8.2, 8.4–8.10_

  - [ ]* 5.5 Write unit tests for API guard logic (Property 6)
    - **Property 6: Submit guard ordering**
    - When `savePendingPrediction` rejects, the Compact `submitPrediction` circuit is never invoked
    - Cover: `WALLET_NOT_CONNECTED`, `LOCAL_STATE_SAVE_FAILED` abort ordering, `NO_LOCAL_PREDICTION` (no `INVALID_MATCH_ID` case — no `matchId` parameter exists)
    - Use mocked SDK and provider
    - _Requirements: 7.4, 8.2, 8.4, 8.8_

  - [ ] 5.6 Checkpoint — run API unit tests
    - **Note:** tests actually live in `api/test/`, not `api/src/` as originally written (matches the pattern already established in `contract/`). Current primitives (outcome/crypto/commitment): 12/12 passing. This checkpoint's facade tests are pending 5.1–5.5.

- [ ] 6. Frontend scaffolding
  - [ ] 6.1 Create `web/src/main.tsx` entry point
    - Mount `<App />` into `document.getElementById('root')` using `ReactDOM.createRoot`
    - _Requirements: 2.4, 2.5_

  - [ ] 6.2 Create `web/src/context/WalletContext.tsx`
    - Define `WalletContextValue` type: `wallet`, `walletAddress` (truncated first6…last4 or null), `connect()`, `disconnect()`, `connectionError`
    - `connect()` — invoke Midnight wallet API with a 5-second timeout; on timeout show "Midnight-compatible wallet extension is required"; on user-rejection show "connection was declined"
    - `disconnect()` — clear wallet state
    - Export `WalletProvider`, `WalletContext`, `useWallet`
    - _Requirements: 9.1–9.7_

  - [ ] 6.3 Create `web/src/App.tsx` with routing
    - Wrap routes in `<WalletProvider>`
    - **Corrected routes:** `/` → `<MatchDetail />` directly — no `<MatchList />` (nothing to list, Requirement 10) and no `/leaderboard` (nothing to rank, Requirement 14)
    - Use `react-router-dom` `BrowserRouter` + `Routes` + `Route`
    - _Requirements: 11.1_

- [ ] 7. Shared UI components
  - [ ] 7.1 Create `web/src/components/EmptyState.tsx`
    - Accept `message: string` prop; render accessible empty-state markup
    - _Requirements: 10.3_

  - [ ] 7.2 Create `web/src/components/WalletConnect.tsx`
    - Read from `WalletContext`; show "Connect Wallet" button when disconnected; show truncated address + "Disconnect" when connected
    - Keyboard-accessible; visible focus indicators; WCAG 2.1 AA contrast
    - All interactive controls activatable via Enter and Space
    - _Requirements: 9.1–9.7, 17.2, 17.5_

  - [ ] 7.3 Create `web/src/components/MatchStateTimeline.tsx`
    - Accept `current: MatchState` prop
    - Render three nodes: OPEN, CLOSED, RESULT_PUBLISHED — active node visually distinct
    - _Requirements: 11.2_

  - [ ] 7.4 Create `web/src/components/MatchCard.tsx`
    - Accept `match: Match`, `predictionState?: PredictionState`, `onClick: () => void`
    - Display: home team, away team, deadline (formatted date/time), `MatchState` label, `PredictionState` (only when prop provided)
    - Omit `PredictionState` when `predictionState` is `undefined` (wallet disconnected)
    - _Requirements: 10.5, 10.8_

  - [ ] 7.5 Create `web/src/components/TransactionStatus.tsx`
    - Accept `phase: TxPhase`, `txHash?`, `errorMessage?`, `onRetry?`
    - Render distinct label + icon/colour for each phase: `idle`, `proving`, `awaiting_wallet`, `submitted`, `success`, `error`
    - After 10 s in `proving`, show "Generating zero-knowledge proof. This may take a moment."
    - After 30 s in `proving`, transition to `error` and call `onRetry`
    - On `success`: show checkmark + `txHash` abbreviated as first6…last4
    - On `error`: show human-readable `errorMessage` or generic fallback; never expose raw Compact runtime strings
    - Wrap in `aria-live="polite"` region for screen reader announcements
    - _Requirements: 12.5, 12.6, 12.7, 12.10, 13.3, 16.1–16.7_

  - [ ] 7.6 Create `web/src/components/PrivacyPanel.tsx`
    - Accept `predictionState: 'before-commitment' | 'committed' | 'revealed'`
    - Render two `<section role="region">` elements:
      - `aria-label="Public information — {predictionState}"`
      - `aria-label="Private information — {predictionState}"`
    - Content per stage as defined in Requirements 15.2–15.4
    - Never describe commitment as complete anonymity; include note about wallet address / timing observability
    - _Requirements: 15.1–15.7_

  - [ ] 7.7 Create `web/src/components/PredictionSelector.tsx`
    - Accept `onSubmit: (outcome: Outcome) => void`, `disabled?: boolean`
    - Display three selectable options: HOME, DRAW, AWAY; highlight selected
    - Enable "Submit Prediction" button only when an outcome is selected
    - Remain fully within visible viewport when mobile soft keyboard opens
    - _Requirements: 12.1, 12.2, 17.4_

  - [ ] 7.8 Create `web/src/components/CommitPredictionDialog.tsx`
    - Accept `outcome`, `open`, `onConfirm`, `onDismiss`, `txPhase`, `txHash?`, `errorMessage?`
    - Show three notices on open: blockchain submission, prediction remains private until reveal, must retain wallet to reveal
    - Include confirmation checkbox: "I understand I must keep my wallet connected to reveal my prediction later."
    - Confirmation button enabled only when checkbox is checked
    - Embed `<TransactionStatus>` for proof + wallet phases
    - On dismiss without confirming: close dialog, preserve selected outcome in parent
    - Never pass or display salt value — salt lives inside the API only (Property 7)
    - On `error` result: show `errorMessage`, offer "Try Again" returning user to `PredictionSelector`
    - _Requirements: 12.3–12.9, 15.1_

  - [ ] 7.9 Create `web/src/components/RevealPredictionDialog.tsx`
    - Accept `open`, `onConfirm`, `onDismiss`, `txPhase`, `txHash?`, `errorMessage?`
    - Show confirmation prompt explaining prediction and salt will become permanently public on-chain
    - Embed `<TransactionStatus>` for proof + wallet phases
    - Prevent dismissal while transaction is in progress
    - On `error: 'NO_LOCAL_PREDICTION'`: show "Your local prediction data could not be found. Reveal is not possible without the original prediction and salt."
    - On other errors: show error message, keep dialog open, keep confirm available for retry
    - _Requirements: 13.1–13.8_

- [ ] 8. Frontend screens
  - [ ] 8.1 **Removed.** `web/src/screens/MatchList.tsx` is not a Wave 1 build target — see Requirement 10's status note. `App.tsx` (task 6.3) routes `/` straight to `MatchDetail` instead.

  - [ ] 8.2 Create `web/src/screens/MatchDetail.tsx`
    - On mount: call `getMatch()` and `getMyPredictionStatus(walletAddress)` in parallel (no `id`/`matchId` param — one deployed match, Requirement 6)
    - Display: `teamA`, `teamB`, formatted `deadline`, `MatchState`, `matchResult` (only when `RESULT_PUBLISHED`)
    - Render `<MatchStateTimeline current={matchState} />`
    - Render `<PrivacyPanel>` mapped to current `predictionState`
    - Apply action matrix from design — 7 state combinations, each mapping to the correct rendered action
    - Wire `<PredictionSelector>` → `<CommitPredictionDialog>` → `submitPrediction` API call → update view on success
    - Wire `<RevealPredictionDialog>` → `revealPrediction` API call → update view with revealed prediction + `points` on success (only reachable once `matchState` is `RESULT_PUBLISHED` — corrected precondition)
    - _Requirements: 11.1–11.10, 12.1–12.10, 13.1–13.8, 15.1_

  - [ ] 8.3 **Deferred.** `web/src/screens/Leaderboard.tsx` is not implementable against the verified contract — see Requirement 14. Do not build this screen or its route in Wave 1.

- [ ] 9. Checkpoint — full build and test pass
  - Run `npm test` at monorepo root; all contract and API tests must pass without a running proof server. **Partially verified already**: `contract` (15/15) and `api` (12/12) both pass; `web` doesn't exist yet so there's nothing to add here until it does.
  - Run `npm run build` in `web/`; confirm `dist/index.html` and at least one `.js` bundle are produced.
  - Confirm no `bboard` string appears anywhere in `contract/` build output. **Verified already** for the current `contract/` build.
  - Ask the user if questions arise.

- [ ] 10. Documentation
  - [x] 10.0 Correct `docs/contract-spec.md` and `docs/privacy-model.md` for false privacy/timing claims (not in the original task list — added because the contract redesign made the original text inaccurate)
    - Stated plainly that no on-chain deadline enforcement exists (verified: no time primitive in Compact 0.31.1)
    - Corrected the commitment formula to `persistentHash([prediction, salt])`
    - Dropped the unqualified "verifiable timing" claim from the privacy model
  - [ ] 10.1 Update `README.md` with demo instructions
    - Step-by-step: installing prerequisites, deploying/connecting to the configured contract, running contract tests, starting the frontend, connecting a Midnight-compatible **testnet** wallet, funding it via the official faucet, executing the demo flow (corrected from a local-proof-server-only flow — see Requirement 18)
    - _Requirements: 18.1_

  - [ ] 10.2 Create `docs/architecture.md`
    - Enumerate fields on the public Midnight ledger
    - Enumerate fields in participant-local private state
    - Describe how the system transitions between storage contexts during commit-and-reveal
    - _Requirements: 18.3_

  - [ ] 10.3 Update `CHANGELOG.md`
    - Add a dated entry under `[Wave 1]` listing each delivered feature and component by name
    - _Requirements: 18.4_

- [ ] 11. Final checkpoint — repository hygiene
  - Verify no committed secrets, seed phrases, private keys, prediction salts, or `.env` credential files exist in the repository
  - Ensure `npm test` at monorepo root passes with no running node or proof server
  - Ask the user if questions arise.
  - _Requirements: 18.2, 18.6_

---

## Notes

- Tasks marked `*` are optional and can be skipped for a faster MVP; they test correctness properties and unit-level edge cases
- Each task references specific requirements for full traceability
- The commit-and-reveal demo (Requirement 18.5) requires a live proof server and Midnight wallet — this is verified manually, not as a coding task
- Salt generation, storage, and transmission are all handled inside the API layer; React components never receive salt values (Property 7 enforced by construction)
- `TransactionStatus` timeouts (10 s for ZK proof message, 30 s for auto-error) are managed with `useEffect`-scoped timers that clear on unmount
- All interactive elements must meet WCAG 2.1 AA contrast and be keyboard-navigable with Tab/Enter/Space; modals must trap focus until dismissed

---

## Task Dependency Graph

**Corrected:** waves 0–3 (`1.1`–`4.1`... i.e. everything through the API
utilities) are **done**. `8.1` (MatchList) and `8.3` (Leaderboard) are
removed from wave 8 below — they are not Wave 1 build targets (Requirements
10, 14). `10.0` (doc corrections) has been completed out of order, since it
was needed to keep `docs/` honest as soon as the contract changed, not
because the original wave ordering called for it here.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"], "status": "1.1-1.3 done, 1.4-1.5 not started" },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"], "status": "done" },
    { "id": 2, "tasks": ["2.3", "2.4", "3.2"], "status": "done" },
    { "id": 3, "tasks": ["2.5", "3.3", "3.4", "4.1"], "status": "2.5/3.3/3.4 done, 4.1 not started" },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["5.5", "5.6", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7"] },
    { "id": 8, "tasks": ["7.8", "7.9"] },
    { "id": 9, "tasks": ["8.2"] },
    { "id": 10, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
