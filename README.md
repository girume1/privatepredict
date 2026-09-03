# PrivatePredict

> A privacy-preserving football prediction dApp built with Midnight, Compact, TypeScript, and React.

PrivatePredict lets football fans commit to predictions privately before a match and later prove that they made the correct prediction. It prevents early copying of picks while giving users a verifiable, tamper-resistant record that their prediction existed before the match result was known.

> **Status:** Wave 1 MVP implemented and exercised live on the Midnight Preview testnet — see [Verification status](#verification-status) below for exactly what has and has not been run against real testnet infrastructure.

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
React + TypeScript frontend
        |
        | prepare prediction + random salt locally — never sent anywhere
        v
API layer (@privatepredict/api) — typed circuit calls, derived public/private state
        |
        | proof generated locally, via the connected Lace wallet + a local proof server
        v
Compact contract (PredictionBoard) on Midnight
        |
        v
Public Midnight ledger
```

**Public ledger state** (the generated `Ledger` type) holds exactly what's meant to be shared: match identifier, team names, deadline, lifecycle status, the organizer's public key, the prediction commitment, and — once revealed — the outcome and score. See `docs/data-model.md` for the exact verified shape, transcribed from the compiled contract's own generated types, not guessed.

**Private local state** (`PrivatePredictPrivateState`) holds the participant's and organizer's secret keys, used only inside zero-knowledge circuits (`participantId`, `organizerPublicKey`, `computeCommitment`) to prove a fact about the public state — "the caller closing this match holds the organizer's secret key," "this revealed prediction hashes to the stored commitment" — without ever putting the secret itself on-chain.

This public/private split, connected by ZK-provable circuits instead of a trusted server holding secrets, is Midnight's core proposition. `submitPrediction`/`revealPrediction` are exactly that pattern, applied to a football prediction instead of a generic example. See `docs/architecture.md` for the full component diagram.

## Verification status

Three different levels of confidence apply to different parts of this project. Don't conflate them.

| Behavior | Status |
|---|---|
| Contract lifecycle, organizer authorization, ownership checks, commitment verification | **Unit-tested** — `contract/test/prediction-board.test.ts`, 15/15 passing against the real compiled contract |
| API primitives (commitment/outcome encoding, private-state handling) | **Unit-tested** — `api/src/*.test.ts`, 12/12 passing |
| Frontend components and flows | **Unit-tested** — `web/src/**/*.test.tsx`, 111/111 passing |
| Deploy → commit `HOME` → close → publish `DRAW` → reveal → **0 points** | **Verified live** on Midnight Preview testnet, via a real Lace wallet and a local Docker proof server. See `DEPLOYMENT.md`'s "Testnet lessons learned" for exactly what that run surfaced. |
| Deploy → commit → close → publish the *same* outcome → reveal → **3 points** | **Not yet verified live.** The scoring rule is unit-tested, but the correct-prediction branch has not yet been exercised against real testnet infrastructure. Do not treat it as demo-proven until it has been. |
| `localStorage`-persisted identity/pending prediction surviving a reconnect or reload | **Unit-tested, not yet re-verified live.** Fixes a real bug hit twice during live testnet demos (see `DEPLOYMENT.md`'s "Testnet lessons learned"). Until confirmed live, treat the two-tab organizer workaround as still the safer path. |
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
   cd ../web && npm test     # 111/111 — components, flows, persistence
   ```
3. **Read the contract directly** — `contract/src/prediction-board.compact` is short and readable. The privacy-relevant circuits are `submitPrediction` (commitment-only, no salt) and `revealPrediction` (commitment + ownership verification).
4. **See it run against real Midnight testnet infrastructure**: a demo video is being prepared for the Wave 1 submission; in the meantime, `DEPLOYMENT.md` documents exactly what has been run live, with real screenshots-worthy detail on what broke and how it was fixed.
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
        |
        v
Frontend creates a unique random salt locally
        |
        v
Frontend creates prediction commitment
        |
        v
Compact contract stores commitment on Midnight
        |
        v
Organizer closes the match and publishes the result
        |
        v
User reveals prediction and salt
        |
        v
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
- [x] React interface (`web/`, 111/111 tests passing)
- [x] Privacy Panel showing public versus private data at each lifecycle stage
- [x] An off-chain, local match list so a participant can browse and switch between several independently-deployed matches, with no contract change (`web/src/matchRegistry.ts`, `MatchList.tsx`)
- [x] Live deploy/commit/close/publish/reveal run on Midnight Preview testnet (incorrect-prediction branch)
- [ ] Live run of the correct-prediction (3-point) branch on testnet
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
- TypeScript (strict mode)
- React + Vite
- npm workspaces (`contract`, `api`, `web`)
- Lace wallet (Midnight-compatible)

## Project structure

```text
privatepredict/
├── contract/             # Compact contract source, compiled artifacts, and contract tests
├── api/                  # TypeScript contract integration layer (PredictionBoardAPI)
├── web/                  # React + Vite frontend (participant app + deploy.html organizer tool)
├── docs/                 # Architecture, privacy, API, frontend, and test specifications
├── .kiro/specs/          # Requirements/design/tasks, corrected against verified contract reality
├── DEPLOYMENT.md         # Full organizer + participant testnet workflow, and real testnet lessons
├── CHANGELOG.md          # Wave-by-wave progress history
├── SECURITY.md           # Security and privacy policy
├── LICENSE               # Apache License 2.0
└── README.md
```

## Further documentation

| Doc | Covers |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Full organizer + participant testnet workflow, exact verification status, real testnet lessons learned |
| [docs/architecture.md](./docs/architecture.md) | Component diagram and the dual-ledger public/private split in more detail |
| [docs/privacy-model.md](./docs/privacy-model.md) | What's public vs. private, the commitment scheme, and privacy limitations |
| [docs/contract-spec.md](./docs/contract-spec.md) | Circuit-by-circuit contract behavior, corrected against the real compiled contract |
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
- Docker Desktop with Docker Compose
- Midnight Compact developer tools (`compact` CLI, v0.31.1 verified)
- A Midnight-compatible Lace wallet, funded via the official Preview testnet faucet, for wallet-connected testing

### Verify local tools

```bash
git --version
node --version
npm --version
docker --version
docker compose version
compact --version
compact check
```

### Install dependencies

```bash
npm install
```

### Compile the contract and run tests

```bash
cd contract
npm run compact    # compiles prediction-board.compact via the real compact CLI
npm test           # 15/15 contract simulation tests
npm run typecheck
npm run lint
```

### Run the API and web tests

```bash
cd api && npm test         # 12/12
cd ../web && npm test       # 111/111
cd ../web && npm run typecheck
cd ../web && npm run lint
```

### Run the local proof server

Required before any wallet-connected action — Lace itself depends on it:

```bash
docker run -d -p 6300:6300 \
  midnightntwrk/proof-server:8.1.0 \
  midnight-proof-server -v
```

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
