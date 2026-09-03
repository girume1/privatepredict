# Design Document

## Verified Wave 1 status (2026-09-02)

This design predates a contract compatibility audit that found the
originally-compiled contract privacy-unsafe (it accepted the prediction
`salt` as a public `submitPrediction` parameter — an observer could brute-force
the three possible commitments and learn the prediction before reveal) and
lifecycle-inverted (reveal happened before the result was published, and
organizer actions had no authorization check). The contract has since been
redesigned, recompiled against the installed Compact 0.31.1 toolchain, and
verified with 15/15 passing tests. `api/` scaffolding (commitment/outcome/crypto
utilities) exists and is tested (12/12 passing); the private-state manager,
API facade, and all of `web/` remain unbuilt. Sections below are corrected
in place where they described something now known to be wrong, and marked
**DEFERRED** where they describe something the verified contract cannot
support at all (multi-match, leaderboard) rather than something merely not
yet built.

## Overview

PrivatePredict Wave 1 is a three-layer monorepo: a compiled Compact smart contract on Midnight, a TypeScript API package that wraps the Midnight SDK, and a React + Vite frontend. There is no HTTP backend — all on-chain reads and writes go through the Midnight SDK directly from the browser. Private state (prediction + salt) lives exclusively in the Midnight SDK's participant-local LevelDB store, never in any server (this LevelDB-in-browser assumption is itself unverified — see the API Layer section below).

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  web/src  (React 18 + Vite + React Router)   │   │
│  │  Routes: / (single demo match, not a list)   │   │
│  │          /leaderboard — DEFERRED, contract   │   │
│  │          has no multi-participant data       │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │ calls                            │
│  ┌────────────────▼─────────────────────────────┐   │
│  │  api/src  (TypeScript facade)                │   │
│  │  commitment.ts  private-state.ts  index.ts   │   │
│  └────┬───────────────────────┬─────────────────┘   │
│       │ pureCircuits          │ SDK providers        │
│       │ (no proof needed)     │                      │
│  ┌────▼──────────────┐  ┌────▼──────────────────┐   │
│  │  Midnight SDK     │  │  LevelDB private state │   │
│  │  (wallet, proofs, │  │  (prediction + salt    │   │
│  │   ledger reads)   │  │   persist across tabs) │   │
│  └────────┬──────────┘  └───────────────────────┘   │
│           │ ZK proofs + transactions                 │
└───────────┼─────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────┐
│  Midnight Network — PUBLIC TESTNET for the Wave 1    │
│  demo (network ID / indexer / proof service / contract│
│  address all env-configured, never hard-coded)       │
│  PredictionBoard contract (public ledger)            │
│  ProofServer  http://localhost:6300  (Docker) — local │
│  dev/debug only, not the demo target                 │
└─────────────────────────────────────────────────────┘
```

(Corrected: the original diagram implied a purely local proof-server demo.
Per the project's network policy, Wave 1's primary demo target is the
Midnight public testnet, never mainnet; a local proof server remains useful
for development.)

**Data boundary:** prediction bytes and salt never cross the browser boundary. Only the commitment (a hash) is submitted on-chain.

---

## Repository Layout

```
privatepredict/
├── contract/                           ← DONE: renamed, redesigned, 15/15 tests pass
│   ├── package.json                   ← renamed @privatepredict/contract, bboard references removed
│   ├── src/
│   │   ├── prediction-board.compact   ← corrected: commitment-only submit, organizer auth, reveal-after-publish, points
│   │   ├── prediction-board-witnesses.ts ← extended with organizerSecretKey
│   │   ├── index.ts                   ← minimal re-export, no deployment/client wiring yet
│   │   └── managed/prediction-board/  ← recompiled with real proving keys
│   └── test/
│       ├── prediction-board.test.ts   ← rewritten for corrected lifecycle + auth + ownership
│       ├── prediction-board-simulator.ts
│       └── utils.ts
├── api/                                ← PARTIAL: primitives done (12/12 tests), orchestration/private-state not started
│   ├── package.json
│   └── src/
│       ├── outcome.ts                 ← encode/decodeOutcome (verified pad(32,str) layout)
│       ├── crypto.ts                  ← generateSecretKey / generateSalt
│       ├── commitment.ts              ← computeCommitment (delegates to pureCircuits)
│       ├── errors.ts                  ← typed PrivatePredictError/error codes
│       ├── privateState.ts            ← re-exports contract's private-state type only
│       └── index.ts                   ← barrel export
│   (still missing: savePendingPrediction/getPendingPrediction/clearPendingPrediction,
│    the submitPrediction/revealPrediction orchestration functions, and any
│    wallet/provider/network code — all deferred, not yet approved)
├── web/                                 ← NOT STARTED, does not exist
│   ├── package.json                   ← NEW
│   ├── vite.config.ts                 ← NEW
│   ├── index.html                     ← NEW
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── context/
│       │   └── WalletContext.tsx
│       ├── screens/
│       │   ├── MatchList.tsx
│       │   ├── MatchDetail.tsx
│       │   └── Leaderboard.tsx
│       └── components/
│           ├── WalletConnect.tsx
│           ├── MatchCard.tsx
│           ├── MatchStateTimeline.tsx
│           ├── PredictionSelector.tsx
│           ├── CommitPredictionDialog.tsx
│           ├── RevealPredictionDialog.tsx
│           ├── TransactionStatus.tsx
│           ├── PrivacyPanel.tsx
│           └── EmptyState.tsx
└── docs/                              ← already exists
```

---

## Contract Layer

### Responsibilities
- Enforce match lifecycle state machine on-chain, **including organizer authorization** (verified: `closeMatch`/`publishResult` assert the caller's derived key matches the stored `organizer`)
- Store commitments (not raw predictions) on public ledger; `submitPrediction` accepts the commitment only — no `salt` parameter, ever
- Verify commitment during reveal using the same hash as `pureCircuits.computeCommitment`, and verify the revealing caller matches the original committer (`predictionOwner`)
- Award MockPoints (3 correct / 0 incorrect) **at reveal**, not at result publication — reveal only happens after the result is already public, so this is the first point at which both values are known together

### Key types (from `index.d.ts`, regenerated)

```typescript
enum MatchState    { OPEN = 0, CLOSED = 1, RESULT_PUBLISHED = 2 }
enum PredictionState { NO_COMMITMENT = 0, COMMITTED = 1, REVEALED = 2 }

type Ledger = {
  matchId: Uint8Array;       // 32 bytes
  teamA: string;
  teamB: string;
  deadline: bigint;          // Unix seconds — display only, NOT enforced on-chain (no verified time primitive in Compact 0.31.1)
  matchState: MatchState;
  matchResult: { is_some: boolean; value: Uint8Array };
  organizer: Uint8Array;
  predictionState: PredictionState;
  commitment: Uint8Array;
  predictionOwner: Uint8Array;
  revealedPrediction: { is_some: boolean; value: Uint8Array };
  points: bigint;            // NEW — 0 or 3, meaningful once predictionState is REVEALED
}
```

### Match state machine (corrected)

```
OPEN ──submitPrediction(commitment)──────────► OPEN (predictionState: COMMITTED)
     ──closeMatch() [organizer-authorized]───► CLOSED
CLOSED ──publishResult(result) [organizer-authorized]──► RESULT_PUBLISHED
RESULT_PUBLISHED ──revealPrediction(prediction, salt) [ownership-checked]──► RESULT_PUBLISHED (predictionState: REVEALED, points set)
```

The original design had `revealPrediction` before `publishResult` — that
inverted order meant a participant would reveal before the actual result was
known, defeating the point of the commit/reveal scheme. It is corrected here.

### Contract initialisation

`Contract.initialState(ctx, matchId, teamA, teamB, deadline, organizerSecretKey)` — unchanged.

The organizer public key is derived on-chain via `pureCircuits.organizerPublicKey(organizerSecretKey)`. The **same** derivation is now re-checked inside `closeMatch`/`publishResult` via a new `localOrganizerSecretKey` witness, which is how authorization is actually enforced (it wasn't, originally).

---

## Test Simulator (`contract/test/prediction-board-simulator.ts`)

**Status: Done, corrected — see the actual file rather than this stale
snippet.** The simulator does not reimplement circuit logic in a parallel
TypeScript state machine as originally sketched below; instead it drives the
*real compiled contract* (`contract.impureCircuits.*`) through
`@midnight-ntwrk/compact-runtime`'s `CircuitContext`, so there is zero risk of
the test double drifting from what the contract actually enforces. It also
holds **both** a `participantSecretKey` and an `organizerSecretKey` in
private state (the corrected contract needs both), with
`setParticipantSecretKey`/`setOrganizerSecretKey` helpers to swap either mid-test
for exercising authorization/ownership failure paths — capabilities the
original design didn't need because the original contract had no
authorization to test.

The original design also asserted the commitment scheme was
**SHA-256(prediction ∥ salt)**, calling that "the hash primitive exposed by
the Compact runtime." That was never verified and should not have been
stated as fact — Compact's `persistentHash` may or may not be SHA-256
internally. The actual implementation sidesteps needing to know: both the
contract's `computeCommitment` circuit and `api/src/commitment.ts` delegate
to the same compiled `pureCircuits.computeCommitment`, so correctness follows
from using one shared implementation, not from replicating a hash algorithm
in TypeScript.

The obsolete code samples that previously appeared here (a hand-rolled
`LedgerState`/`PredictionBoardSimulator` class simulating circuit logic with
`node:crypto`'s `createHash`, and a `utils.ts` with an explicit
1–65536-byte `RangeError` guard) have been removed from this document — they
do not match `contract/test/prediction-board-simulator.ts` or
`contract/test/utils.ts` as built. Read those files directly; they are the
source of truth, not this design doc.

---

## API Layer (`api/src/`)

**Status: Utilities done and tested (12/12); orchestration/facade/private-state not started.**

### Shared types

**Corrected:** there is no single `api/src/types.ts`. `Outcome` lives in
`api/src/outcome.ts`, and the error taxonomy lives in `api/src/errors.ts` as
a `PrivatePredictError` class (not a discriminated-union type), matching
CLAUDE.md's specified error codes exactly:
`WALLET_NOT_CONNECTED | INVALID_MATCH_ID | LOCAL_STATE_SAVE_FAILED | NO_LOCAL_PREDICTION | CIRCUIT_CALL_FAILED`.
`TransactionResult`, `Match`, `PredictionStatus` do not exist yet — they
belong to the not-yet-built API facade. `LeaderboardEntry` is **deferred**,
not merely unbuilt — see Requirement 14's contract-scope note; there is
nothing for that type to represent yet.

### Commitment and outcome utilities (`api/src/commitment.ts`, `api/src/outcome.ts`, `api/src/crypto.ts`)

**Corrected from the original single-file, big-endian-`0`/`1`/`2` design.**
The encoding was chosen by first compiling a throwaway probe circuit
(`pad(32, "HOME")`) against the installed Compact 0.31.1 compiler and reading
back the actual bytes, rather than picking an arbitrary scheme — it turned
out to be UTF-8 bytes, left-aligned, zero-padded to 32 bytes, which is also
what the contract's own domain-separation tags (e.g. `"pp:pid:"`) use. As
built:

```typescript
// api/src/outcome.ts
export type Outcome = 'HOME' | 'DRAW' | 'AWAY';
export function encodeOutcome(outcome: Outcome): Uint8Array;   // pad(32, outcome)-equivalent
export function decodeOutcome(bytes: Uint8Array): Outcome | null; // null, not a throw, on no match or wrong length

// api/src/crypto.ts
export function generateSecretKey(): Uint8Array;   // 32 random bytes — added; the original design had no organizer-key generator
export function generateSalt(): Uint8Array;        // 32 random bytes

// api/src/commitment.ts
import { pureCircuits } from '@privatepredict/contract';
export function computeCommitment(prediction: Uint8Array, salt: Uint8Array): Uint8Array {
  return pureCircuits.computeCommitment(prediction, salt); // delegates, does not reimplement the hash
}
```

**Open gap, not implemented:** the original design's explicit 32-byte
length-guard errors (`"prediction and salt must each be exactly 32 bytes"`,
`"Invalid prediction bytes"`) do not exist. `decodeOutcome` returning `null`
for the wrong length is the only length-related guard today.

### Private state manager (`api/src/privateState.ts`) — NOT STARTED

**Corrected path:** the file that exists today is `api/src/privateState.ts`
(camelCase), not `private-state.ts` (kebab-case) as originally named — a
minor inconsistency with the rest of `api/`'s kebab-free single-word
filenames, noted here rather than silently changed. Today it only
re-exports the contract's `PrivatePredictPrivateState` type and
`createPrivatePredictPrivateState` factory; none of the code below exists.

Pending predictions are intended to be stored in the Midnight SDK's private
state provider, keyed by hex-encoded matchId, for browser-restart
persistence through LevelDB without any network transmission. **This is a
design intent, not a verified fact**: whether the SDK's LevelDB-backed
provider (`@midnight-ntwrk/midnight-js-level-private-state-provider`, already
a `contract/` dependency) works unmodified inside a browser — as opposed to
the Node environment the contract tests run in — has not been checked
against official docs or a real browser yet. Verify that before building
this, per CLAUDE.md's explicit caveat about this exact assumption.

```typescript
// DESIGN INTENT — not yet built, not yet verified against real SDK behavior
type PendingEntry = { prediction: Uint8Array; salt: Uint8Array };

export class PrivateStateManager {
  constructor(private readonly provider: MidnightPrivateStateProvider) {}

  async savePendingPrediction(prediction: Uint8Array, salt: Uint8Array): Promise<void> {
    // No matchId key needed — one contract deployment is one match, so
    // there is exactly one pending prediction to track, not a map.
    await this.provider.set('pending', { prediction, salt });
  }

  async getPendingPrediction(): Promise<PendingEntry | null> {
    return (await this.provider.get('pending')) ?? null;
  }

  async clearPendingPrediction(): Promise<void> {
    await this.provider.delete('pending');
  }
}
```

(Corrected from the original's `matchId`-keyed map: since there's one match
per deployment, per Requirement 6, there's nothing to key by.)

### Main API facade (`api/src/index.ts`) — NOT STARTED

**Status: not built.** The design below is corrected for known contract
facts but is otherwise still the intended shape, pending the private-state
manager above and wallet/provider work (explicitly not yet approved).

**Corrected initialisation pattern** (no `createMatch`/multi-match handle — one contract instance, matching Requirement 6/7):

```typescript
let _contract: DeployedContract | null = null;
let _wallet: MidnightWallet | null = null;
let _privateState: PrivateStateManager | null = null;

export function initApi(wallet: MidnightWallet, provider: MidnightPrivateStateProvider): void {
  _wallet = wallet;
  _privateState = new PrivateStateManager(provider);
  _contract = new Contract(/* witnesses referencing wallet's participant AND organizer keys, as applicable */);
}
```

**Guard helpers**, corrected to use the real `PrivatePredictError` class from `api/src/errors.ts` (already built) instead of the originally-sketched ad hoc error objects:

```typescript
import { PrivatePredictError } from './errors.js';

function requireWallet(): MidnightWallet {
  if (!_wallet) throw new PrivatePredictError('WALLET_NOT_CONNECTED', 'Connect a wallet first.');
  return _wallet;
}

function wrapCircuitError(err: unknown): TransactionResult {
  return { status: 'error', error: 'CIRCUIT_CALL_FAILED' };
}
```

(`requireMatchId` is removed — there is no `matchId` parameter to validate anywhere in this API, per Requirement 6/7/8's corrections.)

**Read operations** call `ledger(state)` on the indexed public state — no wallet needed.

**`submitPrediction` sequence (corrected — no matchId, no salt sent to the circuit, which was already true here and remains the one part of the original sequence that was privacy-correct):**

```
1. require wallet
2. encodeOutcome(outcome) → predictionBytes
3. generateSalt() → salt
4. computeCommitment(predictionBytes, salt) → commitment
5. await privateState.savePendingPrediction(predictionBytes, salt)
   → if this throws: return LOCAL_STATE_SAVE_FAILED (circuit NOT called)
6. await contract.submitPrediction(commitment)   ← commitment only, no salt
   → if this throws: preserve local state, return CIRCUIT_CALL_FAILED
7. return { status: 'success', txHash }
```

**`revealPrediction` sequence (corrected precondition — result must already be published, and the contract now checks reveal ownership itself):**

```
1. require wallet
2. require matchState === RESULT_PUBLISHED (surface a clear state error otherwise —
   the circuit will reject the call anyway, but a pre-check gives a better message)
3. pending = await privateState.getPendingPrediction()
   → if null: return NO_LOCAL_PREDICTION
4. await contract.revealPrediction(pending.prediction, pending.salt)
   → circuit itself verifies caller's participant key matches predictionOwner
   → if throws: preserve local state, return CIRCUIT_CALL_FAILED
5. await privateState.clearPendingPrediction()
6. return { status: 'success', txHash, points }   ← points did not exist in the original design
```

---

## Frontend Layer (`web/src/`) — NOT STARTED

### Routing

**Corrected for Wave 1 scope:** no `MatchList` (nothing to list — one
deployment is one match, Requirement 10) and no `/leaderboard` (nothing to
rank — Requirement 14, deferred to a contract redesign). `/` should redirect
straight to the one configured match's detail view.

```typescript
// App.tsx
<BrowserRouter>
  <WalletProvider>
    <Routes>
      <Route path="/" element={<MatchDetail />} />
      {/* /leaderboard intentionally omitted — see Requirement 14 */}
    </Routes>
  </WalletProvider>
</BrowserRouter>
```

### Wallet context

`WalletContext` is a React context that holds `wallet: MidnightWallet | null`, `walletAddress: string | null`, `connect()`, and `disconnect()`. `connect()` has a 5-second timeout after which it rejects with a "not detected" error. All screens read from this context; write operations pass the wallet to the API layer.

```typescript
type WalletContextValue = {
  wallet: MidnightWallet | null;
  walletAddress: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionError: string | null;
};
```

### `TransactionStatus` state machine

```
IDLE → PROVING → AWAITING_WALLET → SUBMITTED → SUCCESS
                                             → ERROR
```

The component accepts a `phase: TxPhase` prop and an optional `txHash` / `errorMessage`. Each phase maps to a distinct label + icon. Transitions emit an `aria-live="polite"` announcement. A 10-second `setTimeout` from `PROVING` entry triggers the "This may take a moment" message. A 30-second `setTimeout` triggers an automatic error.

```typescript
type TxPhase = 'idle' | 'proving' | 'awaiting_wallet' | 'submitted' | 'success' | 'error';

interface TransactionStatusProps {
  phase: TxPhase;
  txHash?: string;
  errorMessage?: string;
  onRetry?: () => void;
}
```

### `PrivacyPanel` — purely presentational

```typescript
type PrivacyStage = 'before-commitment' | 'committed' | 'revealed';

interface PrivacyPanelProps {
  predictionState: PrivacyStage;
}

// Renders two <section role="region"> elements:
// aria-label="Public information — {predictionState}"
// aria-label="Private information — {predictionState}"
// Content per stage is a static data structure, no business logic.
```

### `MatchDetail` action matrix

| `matchState`     | `predictionState` | Wallet   | Rendered action                       |
|------------------|-------------------|----------|---------------------------------------|
| OPEN             | NO_COMMITMENT     | Connected    | `PredictionSelector`              |
| OPEN             | NO_COMMITMENT     | Disconnected | "Connect wallet to predict"       |
| OPEN             | COMMITTED         | Either   | "Prediction submitted, awaiting result" |
| CLOSED           | NO_COMMITMENT     | Either   | "Submission window closed"            |
| CLOSED           | COMMITTED         | Either   | "Match closed — result pending"       |
| RESULT_PUBLISHED | COMMITTED         | Connected    | `RevealPredictionDialog` trigger  |
| RESULT_PUBLISHED | REVEALED          | Either   | Revealed prediction + points          |

### `CommitPredictionDialog` — key constraint

The salt is generated inside the API call, never returned to the component. The dialog never has access to the salt value; it only receives the `TransactionResult`. This enforces Requirement 12.8 by construction.

---

## Error Handling

All API functions return `TransactionResult` or throw a typed `PrivatePredict_Error`. The frontend catches both forms:

```typescript
try {
  const result = await api.submitPrediction(matchId, outcome);
  if (result.status === 'error') handleApiError(result.error);
  else handleSuccess(result.txHash);
} catch (e) {
  const err = e as PrivatePredict_Error;
  if (err.code === 'WALLET_NOT_CONNECTED') showWalletPrompt();
  else showGenericError();
}
```

Raw Compact runtime errors are caught inside the API facade's `wrapCircuitError` helper and never surfaced as strings to the UI.

---

## Verification Strategy

(This section duplicated the "Testing Strategy" section further below in the
original document — both are corrected here for consistency.)

### Unit tests (Vitest, no network)

| File | What is tested | Status |
|---|---|---|
| `contract/test/prediction-board.test.ts` | Full state machine driven against the real compiled contract: all happy paths + error throws, including new organizer-authorization and reveal-ownership cases | **Done — 15/15 passing** |
| `api/test/outcome.test.ts`, `api/test/crypto.test.ts`, `api/test/commitment.test.ts` | Round-trip: `decodeOutcome(encodeOutcome(x)) === x` for all 3 outcomes (renamed from `decodePrediction`/`encodePrediction`); `computeCommitment` matches `pureCircuits.computeCommitment`; `generateSalt`/`generateSecretKey` return 32 bytes. **No length-guard tests** — that validation isn't implemented (open gap, Requirement 4.7) | **Done — 12/12 passing** |
| `api/test/privateState.test.ts` | save/get/clear/overwrite/absent-key semantics using an in-memory mock provider | Not started |
| `api/test/index.test.ts` | Guard logic: `WALLET_NOT_CONNECTED`, `LOCAL_STATE_SAVE_FAILED` abort ordering, `NO_LOCAL_PREDICTION` (no `INVALID_MATCH_ID` — no such parameter exists) | Not started |

### Integration / E2E — corrected sequence and network target

Running against the **Midnight public testnet** (corrected from a purely
local proof-server flow — see Requirement 18) with a connected wallet:
1. Organizer **deploys** the contract with the match's `matchId`/teams/deadline (there is no `createMatch` call against an already-running contract) → ledger shows `OPEN`
2. Participant submits a commitment → ledger shows `COMMITTED`, local state saved
3. Organizer closes the match (now organizer-authorized) → ledger shows `CLOSED`
4. Organizer publishes the result (now organizer-authorized) → ledger shows `RESULT_PUBLISHED`
5. **Only now** does the participant reveal (corrected order) → ledger shows `REVEALED`, local state cleared, `points` set to `3` or `0`

### Build verification

- `npm test` at repo root must pass with no running node or proof server. **Verified** for `contract` and `api`; `web` doesn't exist yet.
- `npm run build` in `web/` must produce a `dist/index.html` + at least one `.js` bundle
- No `bboard` string may appear in any output of `npm run build` in `contract/`. **Verified.**

---

## Package Configuration

### `contract/package.json` — **Done, corrected below to match what's actually verified**

`compactc` is not the installed command — the installed CLI is `compact`
(subcommand `compile`), verified as `compact 0.31.1`. There is also no
top-level `tsc && cp -r ...` one-liner; the real build script runs the
TypeScript build against `tsconfig.build.json` first, then copies the
managed output:

```json
{
  "name": "@privatepredict/contract",
  "private": true,
  "scripts": {
    "compact": "compact compile src/prediction-board.compact ./src/managed/prediction-board",
    "build": "rm -rf dist && tsc --project tsconfig.build.json && cp -Rf ./src/managed ./dist/managed && cp ./src/prediction-board.compact ./dist"
  }
}
```

### `api/package.json` — **Done, corrected below**

No `"main": "./src/index.ts"` (TypeScript source isn't a valid `main` entry
without a build step) and no `"workspace:*"` (npm, not pnpm/Yarn — see
Requirement 2.3):

```json
{
  "name": "@privatepredict/api",
  "type": "module",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "dependencies": {
    "@privatepredict/contract": "*"
  }
}
```

### `web/package.json` — **Not started**, left as the original design intent:

```json
{
  "name": "@privatepredict/web",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "6.26.2",
    "@privatepredict/contract": "*",
    "@privatepredict/api": "*"
  },
  "devDependencies": {
    "vite": "5.4.8",
    "@vitejs/plugin-react": "4.3.2",
    "typescript": "5.6.3"
  }
}
```

(`"workspace:*"` corrected to `"*"` here too, for the same npm-workspaces reason.)


## Data Models

### On-chain (public ledger)

Derived directly from `Ledger` in `contract/src/managed/prediction-board/contract/index.d.ts`.

| Field | Type | Notes |
|---|---|---|
| `matchId` | `Uint8Array` (32 bytes) | Unique match identifier |
| `teamA` | `string` | Home team name |
| `teamB` | `string` | Away team name |
| `deadline` | `bigint` | Unix timestamp in seconds. **Display only — not enforced on-chain**; no verified time/clock primitive exists in Compact 0.31.1 (confirmed: `time()`, `now()`, `blockTime()`, `secondsSinceEpoch()`, `currentTime()` are all unbound identifiers when compiled) |
| `matchState` | `MatchState` | `OPEN \| CLOSED \| RESULT_PUBLISHED` |
| `matchResult` | `{ is_some: boolean; value: Uint8Array }` | Set on `publishResult` — **before** reveal, not after |
| `organizer` | `Uint8Array` | Derived public key of organizer; now actually checked by `closeMatch`/`publishResult`, not just stored |
| `predictionState` | `PredictionState` | `NO_COMMITMENT \| COMMITTED \| REVEALED` |
| `commitment` | `Uint8Array` (32 bytes) | `persistentHash([prediction, salt])`, via `computeCommitment` |
| `predictionOwner` | `Uint8Array` | `participantId(secretKey, matchId)` — now actually checked by `revealPrediction`, not just stored |
| `revealedPrediction` | `{ is_some: boolean; value: Uint8Array }` | Set on `revealPrediction`, only after `RESULT_PUBLISHED` |
| `points` | `bigint` | **NEW** — `0` or `3`, set alongside `revealedPrediction` |

### Local private state (per participant, per browser) — NOT YET BUILT

Design intent, corrected to drop the `matchId` key (one match per
deployment — nothing to key by) and to note the encoding correction:

| Field | Type | Notes |
|---|---|---|
| `prediction` | `Uint8Array` (32 bytes) | `encodeOutcome` output — UTF-8 bytes, zero-padded (not `0`/`1`/`2` as originally proposed) |
| `salt` | `Uint8Array` (32 bytes) | `crypto.getRandomValues` — never transmitted |

Whether the Midnight SDK's LevelDB provider actually works in-browser (vs.
the Node environment used by contract tests) is unverified — see the API
Layer section above.

### API types — **corrected, and not all built yet**

```typescript
// api/src/outcome.ts — done
export type Outcome = 'HOME' | 'DRAW' | 'AWAY';

// api/src/errors.ts — done, as a class, not a union type
export type PrivatePredictErrorCode =
  | 'WALLET_NOT_CONNECTED' | 'INVALID_MATCH_ID' | 'LOCAL_STATE_SAVE_FAILED'
  | 'NO_LOCAL_PREDICTION' | 'CIRCUIT_CALL_FAILED';
export class PrivatePredictError extends Error {
  readonly code: PrivatePredictErrorCode;
}

// Not yet built — design intent only, corrected for one-match-per-deployment scope:
export type TransactionResult =
  | { status: 'success'; txHash: string }
  | { status: 'error'; error: PrivatePredictErrorCode };

export type Match = {
  matchId: Uint8Array;
  teamA: string;
  teamB: string;
  deadline: number;          // ms since epoch
  matchState: MatchState;
  matchResult: Outcome | null;
  organizer: Uint8Array;
  points: number;            // added — did not exist in the original ledger
};

export type PredictionStatus = {
  predictionState: PredictionState;
  hasLocalPrediction: boolean;
  revealedPrediction: Outcome | null;
};

// LeaderboardEntry: DEFERRED — see Requirement 14. Not implementable
// against the verified contract's single-participant ledger.
```

---

## Components and Interfaces

### `api/src/outcome.ts`, `api/src/crypto.ts`, `api/src/commitment.ts` — **done**, corrected

```typescript
// api/src/crypto.ts
export function generateSalt(): Uint8Array
// Returns 32 cryptographically random bytes via crypto.getRandomValues.
export function generateSecretKey(): Uint8Array
// Same, for participant/organizer secret keys. Not in the original design —
// added because the corrected contract needs an organizer secret key too.

// api/src/outcome.ts
export function encodeOutcome(outcome: Outcome): Uint8Array
// 32 bytes: outcome's UTF-8 bytes, left-aligned, zero-padded — verified
// against Compact's own pad(32, str) layout, not the original's big-endian 0/1/2.
export function decodeOutcome(bytes: Uint8Array): Outcome | null
// Inverse of encodeOutcome. Returns null (not a throw) on no match or wrong length.

// api/src/commitment.ts
export function computeCommitment(prediction: Uint8Array, salt: Uint8Array): Uint8Array
// Delegates to pureCircuits.computeCommitment — no length validation yet (open gap).
```

### `api/src/privateState.ts` — **not started**, design intent only

```typescript
export class PrivateStateManager {
  constructor(provider: MidnightPrivateStateProvider)

  // No matchId parameter — one match per deployment, nothing to key by.
  savePendingPrediction(prediction: Uint8Array, salt: Uint8Array): Promise<void>
  getPendingPrediction(): Promise<{ prediction: Uint8Array; salt: Uint8Array } | null>
  clearPendingPrediction(): Promise<void>
}
```

### `api/src/index.ts` (facade) — **not started**, corrected for verified contract scope

```typescript
export function initApi(wallet: MidnightWallet, provider: MidnightPrivateStateProvider): void

// Reads (no wallet required). No matchId anywhere — one deployment, one match:
export function getMatch(): Promise<Match>
export function getMyPredictionStatus(walletAddress: Uint8Array): Promise<PredictionStatus>
// getLeaderboard(): DEFERRED — see Requirement 14, not implementable against this contract.

// Organizer writes. No createMatch — a new match means deploying a new contract:
export function closePredictions(organizerSecretKey: Uint8Array): Promise<TransactionResult>
export function publishResult(result: Outcome, organizerSecretKey: Uint8Array): Promise<TransactionResult>

// Participant writes. revealPrediction now only succeeds once matchState is RESULT_PUBLISHED:
export function submitPrediction(outcome: Outcome): Promise<TransactionResult>
export function revealPrediction(): Promise<TransactionResult>
```

### `web/src/context/WalletContext.tsx`

```typescript
export type WalletContextValue = {
  wallet: MidnightWallet | null;
  walletAddress: string | null;   // truncated: first6…last4
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionError: string | null;
};
export const WalletContext = React.createContext<WalletContextValue>(...)
export function WalletProvider({ children }: { children: React.ReactNode }): JSX.Element
export function useWallet(): WalletContextValue
```

### React component interfaces

```typescript
// WalletConnect.tsx — reads from WalletContext, no props needed
export function WalletConnect(): JSX.Element

// MatchCard.tsx
interface MatchCardProps {
  match: Match;
  predictionState?: PredictionState;  // undefined when wallet disconnected
  onClick: () => void;
}

// MatchStateTimeline.tsx
interface MatchStateTimelineProps {
  current: MatchState;
}

// PredictionSelector.tsx
interface PredictionSelectorProps {
  onSubmit: (outcome: Outcome) => void;
  disabled?: boolean;
}

// CommitPredictionDialog.tsx
interface CommitPredictionDialogProps {
  outcome: Outcome;
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  txPhase: TxPhase;
  txHash?: string;
  errorMessage?: string;
}

// RevealPredictionDialog.tsx
interface RevealPredictionDialogProps {
  open: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  txPhase: TxPhase;
  txHash?: string;
  errorMessage?: string;
}

// TransactionStatus.tsx
type TxPhase = 'idle' | 'proving' | 'awaiting_wallet' | 'submitted' | 'success' | 'error';
interface TransactionStatusProps {
  phase: TxPhase;
  txHash?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

// PrivacyPanel.tsx — purely presentational
type PrivacyStage = 'before-commitment' | 'committed' | 'revealed';
interface PrivacyPanelProps {
  predictionState: PrivacyStage;
}

// EmptyState.tsx
interface EmptyStateProps {
  message: string;
}
```

---

## Correctness Properties

### Property 1: Commitment round-trip — **verified**

`computeCommitment(p, s)` returns a byte-for-byte identical result to `pureCircuits.computeCommitment(p, s)`, by construction (it delegates rather than reimplementing) — checked for sample inputs in `api/test/commitment.test.ts`.

**Validates: Requirement 4.1**

### Property 2: Encoding round-trip — **verified, function names corrected**

`decodeOutcome(encodeOutcome(x)) === x` for all `x` in `{HOME, DRAW, AWAY}` (renamed from `decodePrediction`/`encodePrediction`) — checked in `api/test/outcome.test.ts`.

**Validates: Requirement 4.4, 4.5, 4.6**

### Property 3: Local-state isolation — **not yet testable, not built**

`savePendingPrediction(p, s)` followed by `getPendingPrediction()` returns the saved values (no `matchId` parameter — corrected, see Requirement 5/6).

**Validates: Requirement 5.2, 5.3, 5.5**

### Property 4: Simulator state machine soundness — **verified, corrected**

Every valid transition sequence (**submit → close → publishResult → reveal** — corrected order, publish now happens before reveal) succeeds; every out-of-order call throws the exact error message specified in the corrected Requirement 3. All 15 tests in `contract/test/prediction-board.test.ts` pass, including new organizer-authorization and reveal-ownership negative cases that didn't exist in the original design.

**Validates: Requirement 3.3–3.15**

### Property 5: Reveal integrity — **verified, corrected**

`revealPrediction(wrongPrediction, salt)` throws `"Invalid prediction or salt"` when a valid commitment is stored and `matchState` is `RESULT_PUBLISHED` (corrected from `CLOSED` — reveal is no longer accepted merely once closed).

**Validates: Requirement 3.6, 3.8**

### Property 6: Submit guard ordering

When `savePendingPrediction` rejects, the Compact `submitPrediction` circuit is never invoked (verified via mock in unit tests).

**Validates: Requirements 8.2, 8.4**

### Property 7: Salt opacity

The `CommitPredictionDialog` component never receives the salt as a prop or return value; the API interface enforces this by construction.

**Validates: Requirements 12.8**
---

## Testing Strategy

| Layer | Tool | Scope | Status |
|---|---|---|---|
| Contract simulator | Vitest (no network) | All state transitions + error messages in `contract/test/prediction-board.test.ts` | **Done — 15/15 passing** |
| Outcome/crypto/commitment utilities | Vitest | Round-trip, distinctness, match against `pureCircuits` — in `api/test/*.test.ts` (not `api/src/*.test.ts` as originally written; length-guard tests don't exist, since that validation isn't implemented — Requirement 4.7) | **Done — 12/12 passing** |
| Private state manager | Vitest + in-memory mock provider | CRUD, overwrite, absent-key, storage-unavailable | Not started |
| API guard logic | Vitest + mocked SDK | `WALLET_NOT_CONNECTED`, `LOCAL_STATE_SAVE_FAILED` abort ordering (no `INVALID_MATCH_ID` case — no `matchId` parameter exists to validate) | Not started |
| React components | Manual / browser | Wallet connect/disconnect flow, dialog open/close, PrivacyPanel stage transitions | Not started |
| E2E demo | Manual with wallet on the **Midnight public testnet** (corrected from "local network" — see Requirement 18) | Full commit-then-reveal cycle | Not started |
