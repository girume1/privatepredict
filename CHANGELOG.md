# Changelog

All notable changes to PrivatePredict are documented in this file.

This project follows a three-Wave Buildathon development process. Each Wave submission will clearly describe newly completed Midnight-related functionality, technical changes, testing improvements, product changes, and feedback incorporated since the previous Wave.

## [Unreleased]

### Changed

- Ownership-scoped participant UI: personal copy ("Your commitment", "Your prediction has been submitted…", the reveal summary) and the Reveal Prediction action are now gated on the connected identity actually owning the match's single on-chain commitment slot (`isPredictionOwner`) and on locally-held reveal data (`hasLocalPrediction`). A viewer who does not own the slot sees neutral copy and no reveal action — never another participant's commitment or revealed prediction framed as their own. The Privacy Panel likewise distinguishes owner vs. observer content.
- A disconnected slot owner now sees a "reconnect your wallet to reveal" prompt once the result is published, instead of no guidance at all.
- The match list now validates added addresses as full 64-hex-character contract addresses instead of accepting any even-length hex string.
- The pasted organizer secret key is cleared from the UI on disconnect and on switching matches, so it can no longer be silently merged into a different match's persisted private state on the next connect.
- `web/` unit suite extended from 111 to 150 tests (ownership gating, reveal-data gating, dialog backdrop/focus behavior, address-length validation, the transaction-modal state machine, and organizer/participant view separation).

### Fixed

- Pending prediction/salt (`{prediction, salt}`) is now persisted to `localStorage` only **after** `submitPrediction` succeeds on-chain, not before. Previously, a failed transaction would leave stale pending data behind — if a different wallet then connected to the same contract address in the same browser, it would find that data and incorrectly show a "Reveal Prediction" button. On failure the pending data is now actively cleared.
- Participant controls (prediction selector, status cards, "Match closed — waiting for result", reveal button, score summary) are now hidden when the connected identity is the organizer (`isOrganizer === true`). Previously both organizer and participant sections rendered together, causing confusing duplicate status messages and a reveal button the organizer should never see.
- ESLint `react-hooks` violations in `PredictionSelector.tsx`: `Math.random()` was called inside `useRef()` on every render (impure function during render), and `groupName.current` was read during render (ref access during render). Fixed by replacing `useRef` with `useState(() => ...)` so the random value is generated once via the initializer, and referencing the state value directly in JSX.
- Prettier formatting drift in `MatchSkeleton.tsx`, `OrganizerKeyInput.test.tsx`, `ParticipantKeyInput.test.tsx`, `index.css`, `MatchDetail.test.tsx`, `MatchDetail.tsx`, `WalletContext.tsx` — all reformatted to match the project config. CI lint now passes clean.

- Transaction modals and organizer actions now follow one strict state machine (`useTransactionFlow`): `submitting → proving → pending → confirmed/failed`. Terminal `success`/`error` states come only from the real wallet/transaction promise. The 30-second wait is purely presentational — it escalates to "pending / still processing" and never marks a transaction as failed, and a result that lands after the wait still updates the UI. While unresolved the modal is not dismissible and Confirm/Cancel stay disabled, so a slow transaction can never be duplicated; a definitive failure re-enables the action as "Try Again"; a confirmed success shows "Confirmed" and then closes the modal automatically. This replaces the earlier timeout-flips-to-error behaviour, which could mislabel an in-flight transaction as failed.
- Leaked `state$` subscriptions: each connect now unsubscribes the previous match's ledger subscription (and disconnect unsubscribes it), preventing stale emissions from a previous match overwriting the currently selected match's derived state, and stopping indexer handle leaks across reconnects.
- Dialog focus handling: the open/close effect no longer re-runs (yanking focus to the element behind the modal) whenever a parent re-render passes a new `onDismiss` identity; backdrop clicks now dismiss when allowed, and clicks inside the dialog never do.
- Commit-dialog copy corrected to match the `localStorage` persistence fix: reveal requires returning to the same browser and device (where the prediction/salt are stored), not "keeping the wallet connected".
- Production browser bundle: added shims for Node's `assert` (called unconditionally by `@subsquid/scale-codec`) and `isomorphic-ws` (whose browser entry lacks the named `WebSocket` export the indexer provider reads), wired via `resolve.alias` in `web/vite.config.ts`. Without them, codec assertions throw and indexer live updates break in built output — `vite build` now completes with zero externalization warnings.

### Planned

- Live-verify the correct-prediction (3-point) branch on Midnight Preview testnet — unit-tested, not yet run live.
- Demo video and final Wave 1 submission materials.
- Accessibility, mobile/responsive, and copy polish pass.

## [Wave 1]

### Added

- Compact contract `PredictionBoard` (`contract/src/prediction-board.compact`), redesigned from an initial privacy-defective draft to a commitment-only submission and reveal-after-publish lifecycle (see "Fixed" below). Circuits: `submitPrediction(commitment)`, `closeMatch()`, `publishResult(result)`, `revealPrediction(prediction, salt)`. One contract deployment represents exactly one match — there is no `createMatch` circuit and no multi-match registry.
- Organizer authorization on `closeMatch`/`publishResult`, and prediction-ownership verification on `revealPrediction`, both via witness-based recompute-and-compare checks against ledger state.
- Mock scoring: 3 points for a correct revealed prediction, 0 for incorrect.
- `contract/test/prediction-board.test.ts` — 15/15 tests against the real compiled contract, covering the corrected lifecycle plus organizer-auth and ownership negative paths.
- `api/` — `PredictionBoardAPI` (deploy/join, per-circuit call methods, a derived-state observable combining public ledger state with locally-held identity keys) and commitment/outcome/crypto/private-state primitives. 12/12 tests passing.
- `web/` — React + Vite participant app (`index.html`/`App.tsx`) and a separate organizer-only deploy tool (`deploy.html`/`DeployApp.tsx`). Components: `WalletConnect`, `MatchStateTimeline`, `PredictionSelector`, `CommitPredictionDialog`, `RevealPredictionDialog`, `OrganizerControls`, `OrganizerKeyInput`, `PrivacyPanel`, `EmptyState`, `TransactionStatus`. 75/75 tests passing.
- Lace wallet integration (`web/src/wallet/connect.ts`, `WalletContext.tsx`): wallet detection and API-version compatibility check, provider wiring (indexer, proving via the connected wallet, wallet-provided balancing/submission), matching the verified official Midnight bulletin-board reference pattern.
- In-memory private-state provider for the browser (`web/src/inMemoryPrivateStateProvider.ts`) — deliberately not persisted across reloads, matching the verified reference implementation rather than inventing untested persistence.
- Environment-driven network configuration (`web/.env.example`) — no hard-coded network IDs, indexer URLs, proof-service URLs, or contract addresses in source.
- `DEPLOYMENT.md` — full organizer + participant workflow for deploying and running a match end to end.
- Live deploy → commit `HOME` → close → publish `DRAW` → reveal → **0 points**, run successfully against the real Midnight Preview testnet (Lace wallet + local Docker proof server), confirming the full corrected lifecycle and the organizer-authorization/ownership checks work on-chain, not just in simulation.
- A purely off-chain, local match list (`web/src/matchRegistry.ts`, `MatchList.tsx`) letting a participant save and switch between several independently-deployed match addresses in one browser. The contract itself is unchanged — still one match per deployment — this is a frontend-only convenience, not a multi-match contract redesign; see `DEPLOYMENT.md`'s "Multiple matches" section.

### Changed

- Corrected `.kiro/specs/privatepredict-wave1/{requirements,design,tasks}.md` against verified contract and API reality, removing unverified assumptions (`createMatch`, multi-match, leaderboard/point aggregation, browser LevelDB, sending salt to `submitPrediction`).
- Corrected `docs/contract-spec.md` and `docs/privacy-model.md` to state the verified single-match lifecycle, the real commitment formula (`persistentHash`, not `persistentCommit`), and the absence of on-chain deadline enforcement.

### Fixed

- **Privacy defect**: the originally generated contract's `submitPrediction(newCommitment, salt)` accepted the salt as a public circuit parameter, which — with only three possible outcomes — would let an observer compute all three possible commitments and infer the prediction before the match. Redesigned to a commitment-only `submitPrediction(commitment)`.
- **Inverted lifecycle**: the originally generated contract allowed reveal before the result was published. Redesigned so reveal is only accepted once `matchState == RESULT_PUBLISHED`.
- **Missing organizer authorization**: `closeMatch`/`publishResult` had no caller check. Added witness-based organizer-key verification.
- A dialog-dismiss bug where a successfully completed commit/reveal transaction left the confirmation dialog stuck with no way to dismiss it.
- A WASM/Vite initialization failure (`__wbindgen_start`) and a duplicate-WASM-module bug (`expected instance of LedgerParameters`) that blocked every real on-chain transaction from the browser — both root-caused against the installed SDK's actual bundling behavior, not guessed at.
- A missing `setNetworkId()` call in the browser wallet path that silently blocked every wallet/contract operation.
- **Repeated data loss on reconnect**: switching a tab from participant to organizer (disconnect, then reconnect with the organizer key) silently generated a fresh, unrelated participant identity and wiped the pending `{prediction, salt}` pair, since nothing was persisted for `join()`'s `existing ?? generate fresh` fallback to find. Hit twice during real testnet demos, surfacing as "Your local prediction data could not be found" with no way to recover the original salt. Fixed by wrapping the private-state provider in a `localStorage`-backed layer, scoped per contract address (`web/src/persistentPrivateStateProvider.ts`, `web/src/pendingPrediction.ts`), and by making `connectAndJoin` merge the organizer key into an existing persisted identity instead of overwriting it. Root-caused by reading `midnight-js-contracts`' actual `findDeployedContract`/`deployContract` source, not guessed. Unit-tested; not yet re-verified live — see `DEPLOYMENT.md`.

### Security

- Defined secret-handling rules; confirmed no salts, unrevealed predictions, or private keys are logged, transmitted, or committed.
- Confirmed no real-money betting, deposits, withdrawals, or token payouts are in scope.
- Documented, rather than silently assumed, that the contract has no on-chain deadline enforcement (no time/clock primitive in Compact 0.31.1) — both the organizer's and participant's client-side deadline gates are explicitly labeled convenience-only.
- Documented that private state (pending prediction/salt, imported organizer key) is memory-only per browser tab, with no cross-session recovery; losing it before reveal makes that commitment permanently unrevealable.

## [Wave 2] — Planned

### Planned

- Support multiple matches and prediction rounds
- Add user prediction history
- Add a public mock-points leaderboard
- Improve wallet connection and transaction feedback
- Expand Compact contract test coverage
- Improve frontend usability based on Wave 1 feedback
- Document all meaningful changes from Wave 1

## [Wave 3] — Planned

### Planned

- Add privacy-aware leagues
- Explore optional selective disclosure of prediction history
- Improve mobile responsiveness and accessibility
- Perform user/product validation with target communities
- Improve onboarding and deployment documentation
- Define an adoption and business viability roadmap
- Document all meaningful changes from Wave 2
