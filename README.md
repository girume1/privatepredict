# PrivatePredict

> A privacy-preserving football prediction dApp built with Midnight, Compact, TypeScript, and React.

PrivatePredict lets football fans commit to predictions privately before a match and later prove that they made the correct prediction. It prevents early copying of picks while giving users a verifiable, tamper-resistant record that their prediction existed before the match result was known.

> **Status:** Wave 1 MVP implemented and exercised live on the Midnight Preview testnet — see [Verification status](#verification-status) below for exactly what has and has not been run against real testnet infrastructure.

> **Live demo:** [privatepredict.vercel.app](https://privatepredict.vercel.app) — the real UI, hosted and reachable by anyone. Browsing the match list works with no setup. Connecting a wallet and actually submitting/revealing a prediction still requires your own Lace wallet (funded on Preview testnet) and your own local Docker proof server — see [DEPLOYMENT.md](./DEPLOYMENT.md) — hosting the frontend doesn't remove that requirement, since Midnight's own architecture requires proving to happen locally with your private data.

## Problem

Most football prediction platforms require users to reveal their picks before an event. This creates three problems:

- Users can copy popular predictions instead of making independent choices.
- Platforms can read, expose, or potentially manipulate predictions before a match.
- Users must trust a central platform to determine whether a prediction was submitted before the result.

## Solution

PrivatePredict uses Midnight's privacy-enabled smart contracts and zero-knowledge technology to create a commit-and-reveal prediction flow.

1. A user selects `HOME`, `DRAW`, or `AWAY`, entirely in the browser.
2. The application generates a unique random 32-byte salt locally.
3. The user submits a cryptographic commitment (and only the commitment) before the match deadline.
4. The public ledger stores the commitment, never the readable prediction or the salt.
5. The organizer closes the match and publishes the result.
6. The user reveals the original prediction and salt; the contract verifies the commitment and awards a mock score.

PrivatePredict provides **prediction confidentiality and verifiable timing**. It does not claim complete anonymity.

## Architecture

PrivatePredict is a direct exercise of Midnight's public/private ledger model, not just a UI wrapped around an ordinary contract.

```text
┌─────────────────────────────────────────────┐
│         React + TypeScript frontend          │
│  (web/ — participant app + organizer tool)   │
└───────────────────┬─────────────────────────┘
                    │ prepare prediction + random salt locally
                    │ salt never leaves the browser before reveal
                    ▼
┌─────────────────────────────────────────────┐
│     API layer (@privatepredict/api)          │
│  typed circuit calls, derived public/        │
│  private state observable (RxJS state$)      │
└───────────────────┬─────────────────────────┘
                    │ proof generated locally via
                    │ Lace wallet + local Docker proof server
                    ▼
┌─────────────────────────────────────────────┐
│   Compact contract (PredictionBoard)         │
│   on Midnight — enforces lifecycle,          │
│   commitment storage, reveal verification    │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
         Public Midnight ledger
```

**Public ledger state** (the generated `Ledger` type) holds exactly what's meant to be shared: match identifier, team names, deadline, lifecycle status, the organizer's public key, the prediction commitment, and — once revealed — the outcome and score. See `docs/data-model.md` for the exact verified shape, transcribed from the compiled contract's own generated types, not guessed.

**Private local state** (`PrivatePredictPrivateState`) holds the participant's and organizer's secret keys, used only inside zero-knowledge circuits (`participantId`, `organizerPublicKey`, `computeCommitment`) to prove a fact about the public state — "the caller closing this match holds the organizer's secret key," "this revealed prediction hashes to the stored commitment" — without ever putting the secret itself on-chain.

This public/private split, connected by ZK-provable circuits instead of a trusted server holding secrets, is Midnight's core proposition. `submitPrediction`/`revealPrediction` are exactly that pattern, applied to a football prediction instead of a generic example. See `docs/architecture.md` for the full component diagram.

**One deployment holds exactly one prediction slot.** The ledger carries a single `commitment`/`predictionOwner` pair (see `docs/data-model.md`), so one match accepts one participant's prediction. The UI is ownership-scoped accordingly: a participant who does not own the slot sees neutral copy ("this match's prediction slot is already held by another participant") and no reveal action — never another user's commitment or revealed prediction framed as their own.

## Verification status

Three different levels of confidence apply to different parts of this project. Don't conflate them.

| Behavior | Status |
|---|---|
| Contract lifecycle, organizer authorization, ownership checks, commitment verification | **Unit-tested** — `contract/test/prediction-board.test.ts`, 15/15 passing against the real compiled contract |
| API primitives (commitment/outcome encoding, private-state handling) | **Unit-tested** — `api/test/*.test.ts`, 12/12 passing |
| Frontend components and flows | **Unit-tested** — `web/src/**/*.test.{ts,tsx}`, 150/150 passing (components, flows, persistence, ownership gating, accessibility) |
| Deploy → commit `HOME` → close → publish `DRAW` → reveal → **0 points** | **Verified live** on Midnight Preview testnet, via a real Lace wallet and a local Docker proof server. See `DEPLOYMENT.md`'s "Testnet lessons learned" for exactly what that run surfaced. |
| Deploy → commit → close → publish the *same* outcome → reveal → **3 points** | **Verified live** on Midnight Preview testnet. |
| `localStorage`-persisted identity/pending prediction surviving a reconnect or reload | **Verified live** on Midnight Preview testnet. The two-tab organizer workaround is no longer needed. |
| On-chain deadline enforcement | **Does not exist**, verified by inspection of the installed Compact 0.31.1 toolchain (no time/clock primitive compiles). `deadline` is stored for display only. Both the organizer's Close Match button and the participant's prediction selector apply a client-side deadline gate as a UX convenience — neither is a security boundary. |
| Browsing/switching between several matches | **Available, off-chain only.** The frontend keeps a local list of independently-deployed match addresses (`web/src/matchRegistry.ts`) so a participant can switch between them — but each match is still its own separate contract deployment. |
| A real multi-match contract (one deployment, many matches), leaderboard, prediction history across matches | **Deferred to Wave 2.** The compiled contract has no `createMatch` circuit and no collection of matches or participants — one contract deployment is exactly one match. Do not assume these exist. |

## For judges: how to evaluate this submission

1. **Confirm the contract compiles** (the technical gate):
   ```bash
   cd contract && npm run compact
   ```
2. **Run the test suites** — all currently pass:
   ```bash
   cd contract && npm test   # 15/15 — lifecycle, organizer auth, ownership, scoring
   cd ../api && npm test     # 12/12 — commitment/outcome/private-state primitives
   cd ../web && npm test     # 150/150 — components, flows, persistence, ownership gating, accessibility
   ```
3. **Read the contract directly** — `contract/src/prediction-board.compact` is short and readable. The privacy-relevant circuits are `submitPrediction` (commitment-only, no salt) and `revealPrediction` (commitment + ownership verification).
4. **See it run against real Midnight testnet infrastructure**: see `DEPLOYMENT.md` for exactly what has been run live, with real detail on what broke and how it was fixed.
5. **Read `DEPLOYMENT.md`'s "Testnet lessons learned"** for evidence this was actually exercised against live infrastructure, not just simulated.
6. **Check the verification table above** for a precise, non-inflated account of what's unit-tested vs. verified live vs. still pending — nothing here is claimed as working without saying which category it falls into.

## Privacy model

### Public on the Midnight ledger

- Match identifier, team names, and deadline
- Match lifecycle status (`OPEN` / `CLOSED` / `RESULT_PUBLISHED`)
- The organizer's public key
- Prediction commitment and the address that submitted it
- Published match result
- Whether the commitment has been revealed
- Mock score once revealed

### Private until reveal

- The user's prediction: `HOME`, `DRAW`, or `AWAY`
- The unique random salt used to create the commitment
- User-local private state (participant and, if applicable, organizer secret keys)

### Privacy limitations

- Wallet addresses and transaction timing may remain observable.
- Revealing a prediction intentionally makes it, and the salt, public.
- The application does not claim full anonymity.
- Users must retain access to the browser and device they submitted from to reveal their original prediction.
- **Private state (pending prediction/salt, participant/organizer identity) is stored in that browser's `localStorage`, scoped per match contract address, on that device only.** It survives a page reload and reconnecting the wallet. It is never transmitted anywhere and there is still no cross-device recovery — clearing site data, using a different browser, or using a different device loses it permanently for that commitment.

## Commitment flow

PrivatePredict uses Midnight's `persistentHash` primitive for a prediction commitment, matching the verified contract's exported `computeCommitment` circuit:

```text
commitment = persistentHash<Vector<2, Bytes<32>>>([prediction, salt])
```

The contract stores only `commitment`. The salt is never a circuit parameter, ledger field, log entry, or network payload before reveal.

During reveal, the user provides the original prediction and salt. The Compact contract recomputes the commitment and accepts the reveal only if it matches the stored value.

```text
User selects prediction privately
        │
        ▼
Frontend creates a unique random salt locally
        │
        ▼
Frontend computes prediction commitment
        │
        ▼
Compact contract stores commitment on Midnight
        │
        ▼
Organizer closes the match and publishes the result
        │
        ▼
User reveals prediction and salt
        │
        ▼
Compact contract verifies commitment and awards mock points
```

## Match lifecycle

```text
OPEN → CLOSED → RESULT_PUBLISHED
```

## Prediction lifecycle

```text
NO_COMMITMENT → COMMITTED → REVEALED
```

## Wave 1 scope

- [x] A compiling Compact contract (`contract/src/prediction-board.compact`)
- [x] Match creation via contract deployment (`initialState` — there is no `createMatch` circuit)
- [x] Private, commitment-only prediction submission
- [x] Organizer-authorized match closing and result publication
- [x] Prediction reveal, commitment verification, and mock-point scoring
- [x] Contract simulation and test cases (15/15 passing)
- [x] TypeScript integration layer (`api/`, 12/12 tests passing)
- [x] React interface (`web/`, 150/150 tests passing)
- [x] Privacy Panel showing public versus private data at each lifecycle stage
- [x] Ownership-scoped participant UI — personal copy and reveal actions appear only for the participant who owns the match's single commitment slot; any other viewer sees neutral copy, never another user's data framed as theirs
- [x] An off-chain, local match list so a participant can browse and switch between several independently-deployed matches, with no contract change (`web/src/matchRegistry.ts`, `MatchList.tsx`)
- [x] Production-bundle hardening — browser shims for Node `assert` and `isomorphic-ws` so codec assertions and indexer live updates keep working in built output (`web/src/shims/`)
- [x] Accessibility pass — WCAG AA contrast, keyboard navigation, ARIA landmarks, native radio inputs, live regions, screen reader announcements
- [x] Participant key input — returning participants can restore their identity from a backed-up key without losing their pending prediction
- [x] Live deploy/commit/close/publish/reveal run on Midnight Preview testnet (incorrect-prediction / 0-point branch)
- [x] Live run of the correct-prediction (3-point) branch on testnet
- [ ] Demo video and final submission materials

## Buildathon roadmap

### Wave 1 — Private commitment MVP

Build the core commit-and-reveal flow for a single football match. One contract deployment represents exactly one match — there is no multi-match registry.

### Wave 2 — Private league experience

Add multiple matches, prediction history, competition rounds, improved wallet interaction, a leaderboard, stronger test coverage, and usability improvements informed by Wave 1 feedback. None of this exists yet.

### Wave 3 — Selective disclosure and adoption

Add privacy-aware leagues, optional selective disclosure, improved accessibility and mobile experience, product validation, onboarding, and a viable adoption roadmap.

## Technology

- [Midnight Network](https://midnight.network/)
- [Compact](https://docs.midnight.network/compact) smart contracts (compiler v0.31.1)
- Zero-knowledge proofs, proved via a local Docker proof server and the connected Lace wallet
- TypeScript (strict mode, ES2022)
- React 19 + Vite 8 (Rolldown-based)
- RxJS 7 for reactive derived state
- npm workspaces (`contract`, `api`, `web`)
- Lace wallet (Midnight-compatible)
- Vitest for all three test suites
- GitHub Actions CI

## Project structure

```text
privatepredict/
├── .github/
│   └── workflows/
│       └── ci.yml                       # CI: typecheck, lint, build, test across all workspaces
├── contract/                            # Midnight Compact smart contract (one match per deployment)
│   ├── src/
│   │   ├── prediction-board.compact     # Contract source: lifecycle, circuits, commitment, scoring
│   │   ├── prediction-board-witnesses.ts# TypeScript mirror of private witness functions
│   │   ├── index.ts                     # Exports compiled contract bindings
│   │   └── managed/                     # Compiled artifacts: generated JS bindings, ZK keys, zkir
│   └── test/
│       ├── prediction-board.test.ts     # 15/15 tests against the real compiled contract
│       ├── prediction-board-simulator.ts# Simulation harness
│       └── utils.ts
├── api/                                 # TypeScript integration layer (npm workspace)
│   └── src/
│       ├── index.ts                     # PredictionBoardAPI: deploy/join, state$ observable, circuit calls
│       ├── common-types.ts              # PredictionBoardProviders, contract types
│       ├── commitment.ts                # computeCommitment — delegates to pureCircuits
│       ├── crypto.ts                    # generateSecretKey(), generateSalt()
│       ├── outcome.ts                   # HOME/DRAW/AWAY ↔ Bytes<32> encoding
│       ├── privateState.ts              # PrivatePredictPrivateState shape + factory
│       └── errors.ts                    # PrivatePredictError with typed error codes
├── web/                                 # React + Vite frontend (npm workspace)
│   ├── index.html                       # Participant app entry point
│   ├── deploy.html                      # Organizer-only deployment tool entry point
│   ├── vite.config.ts                   # Build config: WASM handling, browser shims, Rolldown dedupe
│   ├── .env.example                     # VITE_NETWORK_ID / VITE_PREDICTION_BOARD_ADDRESS
│   └── src/
│       ├── main.tsx                     # Participant app bootstrap
│       ├── deploy-main.tsx              # Organizer deploy tool bootstrap
│       ├── App.tsx                      # Participant app shell (match list + wallet + MatchDetail)
│       ├── DeployApp.tsx                # Organizer deployment UI
│       ├── useTransactionFlow.ts        # Single-flight TX state machine (submitting→proving→pending→confirmed/failed)
│       ├── matchRegistry.ts             # Off-chain local match list (localStorage)
│       ├── pendingPrediction.ts         # Persisted {prediction, salt} per contract address
│       ├── persistentPrivateStateProvider.ts  # localStorage-backed private state (scoped per address)
│       ├── inMemoryPrivateStateProvider.ts    # Reference in-memory provider (base layer)
│       ├── types.ts                     # Shared TypeScript types
│       ├── hex.ts                       # Hex encode/decode utilities
│       ├── globals.ts                   # process.env + Buffer polyfills for SDK compatibility
│       ├── vite-env.d.ts                # Vite environment type declarations
│       ├── index.css                    # Global styles
│       ├── wallet/
│       │   ├── WalletContext.tsx        # React context: all wallet state + circuit action handlers
│       │   └── connect.ts              # Lace wallet detection, provider wiring, connectAndJoin/Deploy
│       ├── screens/
│       │   ├── MatchDetail.tsx          # Main match screen (participant + organizer views, ownership-gated)
│       │   └── MatchDetail.test.tsx
│       ├── components/
│       │   ├── Brand.tsx                # Logo / brand mark
│       │   ├── Dialog.tsx               # Accessible modal dialog base
│       │   ├── EmptyState.tsx           # Empty / no-match placeholder
│       │   ├── HowItWorks.tsx           # Explainer section
│       │   ├── MatchList.tsx            # Off-chain match list with address input
│       │   ├── MatchSkeleton.tsx        # Loading skeleton while ledger data arrives
│       │   ├── MatchStateTimeline.tsx   # Visual match lifecycle timeline
│       │   ├── CommitPredictionDialog.tsx   # Commit flow modal
│       │   ├── RevealPredictionDialog.tsx   # Reveal flow modal
│       │   ├── PredictionSelector.tsx   # HOME / DRAW / AWAY picker (native radio inputs)
│       │   ├── OrganizerControls.tsx    # Close match + publish result controls
│       │   ├── OrganizerKeyInput.tsx    # Organizer secret key paste input
│       │   ├── ParticipantKeyInput.tsx  # Returning participant key restore input
│       │   ├── PrivacyPanel.tsx         # Per-stage public vs. private data breakdown
│       │   ├── ScoreReveal.tsx          # Score reveal card (correct / incorrect)
│       │   ├── StatusCard.tsx           # Lifecycle state message cards with icons
│       │   ├── TransactionStatus.tsx    # TX progress indicator
│       │   ├── WalletConnect.tsx        # Wallet connect / disconnect button
│       │   └── *.test.tsx               # Co-located component tests (all components above have tests)
│       ├── shims/
│       │   ├── assert.ts               # Browser shim: full Node assert API (required by @subsquid/scale-codec)
│       │   └── isomorphic-ws.ts        # Browser shim: named WebSocket export (required by indexer provider)
│       └── test/
│           └── setup.ts                # Vitest global test setup (@testing-library/jest-dom)
├── docs/
│   ├── architecture.md                 # Component diagram, dual-ledger public/private split
│   ├── data-model.md                   # Exact Ledger and private-state shapes from generated types
│   ├── privacy-model.md                # What's public vs. private, commitment scheme, limitations
│   ├── contract-spec.md                # Circuit-by-circuit contract behavior (verified Wave 1 implementation)
│   ├── api-spec.md                     # PredictionBoardAPI surface and local-state safety rules
│   ├── frontend-spec.md                # Screens, components, Privacy Panel per-stage content
│   └── test-plan.md                    # What each test suite covers, verified live vs. unit-tested
├── vercel.json                         # Vercel deployment configuration
├── package.json                        # Workspace root (orchestrates contract, api, web)
├── package-lock.json
├── DEPLOYMENT.md                       # Full organizer + participant testnet workflow
├── CHANGELOG.md                        # Wave-by-wave progress history
├── SECURITY.md                         # Security and privacy policy
├── LICENSE                             # Apache License 2.0
└── README.md
```

## Further documentation

| Doc | Covers |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Full organizer + participant testnet workflow, exact verification status, real testnet lessons learned |
| [docs/architecture.md](./docs/architecture.md) | Component diagram and the dual-ledger public/private split in more detail |
| [docs/privacy-model.md](./docs/privacy-model.md) | What's public vs. private, the commitment scheme, and privacy limitations |
| [docs/contract-spec.md](./docs/contract-spec.md) | Circuit-by-circuit contract behavior, verified against the real compiled contract |
| [docs/data-model.md](./docs/data-model.md) | The exact `Ledger` and private-state shapes, transcribed from generated types |
| [docs/api-spec.md](./docs/api-spec.md) | The `PredictionBoardAPI` surface and local-state safety rules |
| [docs/frontend-spec.md](./docs/frontend-spec.md) | Screens, components, and the Privacy Panel's per-stage content |
| [docs/test-plan.md](./docs/test-plan.md) | What each test suite covers, and what's verified live vs. unit-tested only |
| [CHANGELOG.md](./CHANGELOG.md) | Wave-by-wave history, including bugs found and fixed |
| [SECURITY.md](./SECURITY.md) | Security and secret-handling policy |

## Local development

### Prerequisites

- Ubuntu, Linux, macOS, or Windows via WSL 2
- Git
- Node.js 22 or newer, with npm
- Docker Desktop
- Midnight Compact developer tools (`compact` CLI, v0.31.1 verified)
- A Midnight-compatible Lace wallet, funded via the official Preview testnet faucet, for wallet-connected testing

### Verify local tools

```bash
git --version
node --version
npm --version
docker --version
compact --version
```

> **Toolchain pinning note:** the tracked compiled artifacts in
> `contract/src/managed/` were produced by Compact compiler **0.31.1**
> (language version 0.23.0 — see
> `contract/src/managed/prediction-board/compiler/contract-info.json`). A
> newer CLI installed locally will still build the project, but recompiling
> the contract regenerates those artifacts and the ZK keys, and requires
> re-running the contract tests plus redeploying before anything built
> against the old artifacts can be assumed to work.

### Install dependencies

```bash
npm install
```

### Compile the contract and run all tests

```bash
# Contract
cd contract
npm run compact    # compiles prediction-board.compact via the Compact CLI
npm test           # 15/15 contract simulation tests
npm run typecheck
npm run lint

# API
cd ../api
npm test           # 12/12
npm run typecheck
npm run lint

# Web
cd ../web
npm test           # 150/150
npm run typecheck
npm run lint
```

Or run the full CI pipeline locally from the contract workspace:

```bash
cd contract && npm run ci   # compact → typecheck → lint → build → test
```

### Run the local proof server

Required before any wallet-connected action — Lace itself depends on it:

```bash
docker run -d -p 6300:6300 \
  midnightntwrk/proof-server:8.1.0 \
  midnight-proof-server -v
```

> Confirm the exact image tag against the [current Midnight docs](https://docs.midnight.network/) before use — tags may change across SDK releases.

Verify it's running:

```bash
docker ps
```

### Deploy and run a full match on testnet

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full organizer + participant workflow against the Midnight Preview testnet, including the exact environment configuration confirmed to work and the real issues encountered along the way.

## Security

Read [SECURITY.md](./SECURITY.md) before contributing or running the application.

Never commit:

- Wallet seed phrases
- Private keys or organizer/participant secret keys
- API keys
- `.env` files (only commit `.env.example` with placeholders)
- Prediction salts
- Unrevealed user predictions
- User-local private state

## License

The Midnight-related code in this project is licensed under the [Apache License 2.0](./LICENSE).

## Buildathon attribution

Built for the Midnight privacy-first application Buildathon.

GitHub topics:

```text
midnightntwrk midnight compact typescript zero-knowledge privacy web3 football
```
