# Changelog

All notable changes to PrivatePredict are documented in this file.

This project follows a three-Wave Buildathon development process. Each Wave submission will clearly describe newly completed Midnight-related functionality, technical changes, testing improvements, product changes, and feedback incorporated since the previous Wave.

## [Unreleased]

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
