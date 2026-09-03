# Deploying and running a PrivatePredict match

This covers the full organizer + participant workflow for Wave 1: deploy a
match, wait for predictions, close it, publish the result, and reveal.

Wave 1 scope reminder: one contract deployment is exactly one match. There
is no multi-match registry and no `createMatch` circuit — creating a new
match means deploying a new contract instance.

## Verification status

**Verified live**, on the Midnight Preview testnet, via a real Lace wallet
and a local Docker proof server: deploy → commit `HOME` → close → publish
`DRAW` → reveal → **0 points**. That run exercised the full corrected
lifecycle, the on-chain organizer-authorization check on `closeMatch`/
`publishResult`, and the on-chain ownership/commitment check on
`revealPrediction`.

**Not yet verified live**: a matching commit/result pair producing the
**3-point** correct-prediction branch. The scoring rule itself is
unit-tested (`contract/test/prediction-board.test.ts`), but it has not yet
been exercised against real testnet infrastructure — don't present it as
demo-proven until it has been.

## Prerequisites

- A Midnight-compatible Lace wallet extension installed in your browser,
  connected to the Midnight testnet, funded via the official testnet
  faucet. Confirm the network identifier in Lace's own settings before
  deploying — see "Testnet lessons learned" below; `preview` is what this
  project has actually confirmed working, not a value to assume blindly.
- **A local Midnight proof server, running via Docker, before you attempt
  any wallet-connected action.** Lace itself requires this to generate
  proofs — it is not optional infrastructure:
  ```bash
  docker run -d -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
  ```
  Confirm the exact image tag against current Midnight docs if this one has
  moved on. Verify it's running with `docker ps` before proceeding.
- Node.js and the repo's dependencies installed (`npm install` at the repo
  root).
- `web/.env.local` (copied from `web/.env.example`) with `VITE_NETWORK_ID`
  set. `VITE_PREDICTION_BOARD_ADDRESS` isn't known yet at this point —
  that's what deploying produces.

## Step 1 — Organizer: deploy the match

`web/deploy.html` is a separate, organizer-only tool — it is not linked
from the participant app and reuses the exact same verified Lace connection
code as the participant app, just calling `deploy` instead of `join`.

```bash
cd web
npm run dev
```

Open `http://localhost:5173/deploy.html`. Fill in the home team, away team,
and submission deadline, then click **Connect Wallet & Deploy**. Lace will
prompt you to approve the connection and the transaction.

**On success, the page shows two values. Save both immediately — neither is
recoverable if lost:**

1. **Contract address** — share this with participants; it's how they join
   the match. Either set it as `VITE_PREDICTION_BOARD_ADDRESS` in
   `web/.env.local` (pre-populates the app's match list — convenient for a
   single-match demo), or just send it to participants directly and have
   them paste it into the main app's match list themselves (see Step 2) —
   the app can hold several matches at once this way, each still backed by
   its own separate contract deployment. See "Multiple matches" below.
2. **Organizer secret key** — a 64-character hex string. This proves you're
   the organizer for every future session. It's still worth saving it
   durably yourself (see below) rather than relying on the browser, but as
   of this fix it's also persisted in that browser's `localStorage`
   (`web/src/persistentPrivateStateProvider.ts`), scoped to this match's
   contract address, so it now survives a page reload on the same
   device/browser. If you lose it entirely (different device, cleared site
   data), you can no longer close this match or publish its result, ever —
   deploy a new match instead.

Store the organizer secret key somewhere durable and private (a password
manager, not a chat message or a committed file) — treat it the same as a
wallet seed phrase.

## Step 2 — Participants: submit predictions

Participants open the main app (`http://localhost:5173/`). If
`VITE_PREDICTION_BOARD_ADDRESS` was set, this match is already in their
match list; otherwise they paste the contract address you shared and give
it a label, then select it from the list. From there: connect their own
Lace wallet, select HOME/DRAW/AWAY, and confirm the commit dialog. Only the
commitment goes on-chain — the prediction and salt stay local to that
browser, persisted in `localStorage` scoped to this match's contract
address (`web/src/pendingPrediction.ts`), so reloading the page or
reconnecting before reveal no longer loses it. Losing it is now limited to
genuinely losing the device/browser (clearing site data, a different
browser or device) — see "Testnet lessons learned" below for why this was
added.

## Step 3 — Organizer: close the match

Return to the main app (`http://localhost:5173/`, not `deploy.html` —
closing and publishing are participant-app actions, gated on your
identity, not separate tooling). Before connecting, expand **"I'm the
organizer"** and paste the organizer secret key you saved in Step 1, then
click **Connect Wallet**. Once connected, an **Organizer controls** section
appears (alongside the normal participant view — being the organizer
doesn't hide your own participant controls, in case you're also
predicting).

**If you are also the participant who submitted a prediction**, switching
to the organizer identity in the same tab (disconnect, then reconnect with
the organizer key) used to permanently destroy your ability to reveal —
`disconnect()` cleared the in-memory pending `{prediction, salt}` pair and
a fresh, unrelated participant identity was generated on every reconnect,
with nothing persisted anywhere. That's the bug behind the "Your local
prediction data could not be found" error documented below.

As of the `localStorage`-persistence fix (`web/src/pendingPrediction.ts`,
`web/src/persistentPrivateStateProvider.ts`), the same tab reconnecting as
organizer should now restore your original participant identity and
pending prediction automatically when you later reconnect as a plain
participant again — this is unit-tested but **has not yet been
re-verified against a real live testnet reconnect**; until it has, using a
second browser tab for organizer actions (keeping the original participant
tab idle, not disconnected) remains the safer choice.

Click **Close Match**. This is enabled once the deadline you set has
passed — that gate is a client-side convenience only. The contract itself
does not enforce deadlines (no verified on-chain clock primitive exists in
the installed Compact 0.31.1 toolchain), so nothing stops you from closing
early by other means; the UI just doesn't offer an early-close button.

The same convenience-only gate also applies on the participant side: once
a match's deadline passes, the main app stops offering the prediction
selector for it (a "the submission deadline has passed" message is shown
instead), even though the match is still `OPEN` on-chain until you actually
close it. It's cosmetic, not a security boundary — see `MatchDetail.tsx`.

## Step 4 — Organizer: publish the result

Once the match is `CLOSED`, the same Organizer controls section shows a
result dropdown. Select the actual outcome (HOME/DRAW/AWAY) and click
**Publish Result**.

## Step 5 — Participants: reveal

Participants who committed a prediction can now reveal it — the app only
allows this once the result is published (not merely once the match is
closed), so a prediction can never be exposed before the outcome is known.
On success, the contract verifies the commitment, sets `points` to `3` or
`0`, and the match detail view shows the participant's revealed prediction
alongside the published result and their score.

## Multiple matches

The contract itself still has no multi-match support — every match is a
separate contract deployment, exactly as described above and in
`docs/data-model.md`. What Wave 1 does add is a purely **off-chain, local**
match list in the frontend (`web/src/matchRegistry.ts`,
`MatchList.tsx`): the app lets a participant save several deployed match
addresses (each with a label) and switch between them, without any
contract-level change or re-verification.

- Contract addresses are already public information — organizers share
  them out of band (Step 1 above) — so persisting them in the browser's
  `localStorage` carries no privacy risk, unlike the salt/secret-key state
  discussed elsewhere in this document.
- The list is per-browser only. It is not synced anywhere, and adding a
  match in one browser doesn't make it appear in another's list — everyone
  who wants to see a match still needs to be given (or paste in) its
  address themselves.
- Selecting a different match via **Switch match** disconnects the current
  wallet session for the previous match. That no longer discards its
  pending prediction/salt or identity, though — both are now restored
  automatically the next time you reconnect to that same contract address.

## Testnet lessons learned (from a real deployment)

Everything below was found the hard way, against a real Lace wallet and a
real Midnight testnet deployment — not inferred from docs alone. Recorded
here so the next person (or session) doesn't have to rediscover it.

- **The working network is `preview`, not `preprod`.** The official
  Midnight bulletin-board reference example's own config used `preprod`,
  which produced a "Network ID mismatch" error from Lace. Lace's own
  network settings (gear icon in the extension panel) showed the account
  was actually on `preview` — that's what a funded Midnight testnet wallet
  is likely to already be using. Always confirm in Lace's own UI rather
  than trusting a reference project's config; network naming isn't
  guaranteed stable across SDK releases.
- **The proof server is mandatory, not optional, and Lace tells you so
  directly** — a banner in the Lace panel states plainly that sending
  assets/transactions on Midnight requires a local proof server via
  Docker. Our code deliberately delegates proving to the connected wallet
  (`connectedAPI.getProvingProvider(...)` in `web/src/wallet/connect.ts`,
  chosen over the deprecated `proverServerUri` field), and the wallet in
  turn needs that local proof server to do the actual work. See
  Prerequisites above for the exact command.
- **A missing `setNetworkId()` call silently blocked every wallet
  operation** until it was added. The Midnight SDK requires this be called
  once, globally, before any wallet/contract operation — our own contract
  tests already did this (`setNetworkId("undeployed")`) but the browser
  wallet code never carried the same call over. Fixed in
  `web/src/wallet/connect.ts`.
- **A real WASM/Vite initialization bug**, not a hypothetical one: without
  specific handling in `web/vite.config.ts` (`vite-plugin-wasm`, disabled
  minification, manual chunking, a custom resolver), the browser throws
  `Uncaught ReferenceError: Failed to read the '__wbindgen_start' property
  from 'Module'` the moment `@midnight-ntwrk/compact-runtime`'s WASM
  dependency initializes — the page never renders. See the extensive
  comment block at the top of that file for the full reasoning; don't
  strip that configuration out without understanding why each piece is
  there.
- **A second, subtler WASM bug**: Vite's dependency pre-bundler was
  creating *two separate copies* of `@midnight-ntwrk/ledger-v8`'s WASM
  module (reached via different import paths — directly in `connect.ts`
  vs. transitively through `midnight-js-contracts`), which surfaced as
  `expected instance of LedgerParameters` deep inside `partitionTranscript`
  on the very first real `callTx` (submitting a prediction — `deploy`
  doesn't exercise the same code path, so it worked before this was
  fixed). Fixed with `resolve.dedupe` in `web/vite.config.ts`, forcing a
  single canonical instance regardless of import path. Confirmed by the
  production build going from two differently-hashed
  `midnight_ledger_wasm_bg-*.wasm` files down to one.
- **The compiled contract's proving/verifier keys must be served from the
  same origin as the web app**, or `FetchZkConfigProvider` fails with
  `ZKConfigurationReadError`. It fetches `<origin>/keys/<circuit>.prover`,
  `<origin>/keys/<circuit>.verifier`, and `<origin>/zkir/<circuit>.bzkir`
  via plain HTTP — verified by reading its source, not assumed. Wired up
  via `web/package.json`'s `sync-zk-config` script (runs automatically via
  `predev`/`prebuild`), which copies
  `contract/src/managed/prediction-board/{keys,zkir}` into
  `web/public/{keys,zkir}` — Vite serves `public/` verbatim at the root in
  both dev and the production build. `contract/src/managed/` stays the
  single source of truth; the `web/public/` copies are gitignored and
  regenerated on demand. **If you ever see this error again, it almost
  certainly means the contract was recompiled and the dev server wasn't
  restarted** (the `predev` hook only runs on a fresh start, not on
  hot-reload).
- **In-memory-only private state caused a real, repeated data-loss bug,
  not just a theoretical one.** Twice during real testnet demos, switching
  a tab from participant to organizer (disconnect, then reconnect with the
  organizer key) silently generated a brand-new random participant
  identity and wiped the pending `{prediction, salt}` pair, because
  `PredictionBoardAPI.join()`'s own fallback (`existing ?? generate
  fresh`) had nothing persisted to find as "existing." Reveal then failed
  with "Your local prediction data could not be found," with no way to
  recover the original salt. Root-caused by reading
  `midnight-js-contracts`' actual `findDeployedContract`/`deployContract`
  source (not guessed): both unconditionally call
  `privateStateProvider.set()` with whatever `initialPrivateState` was
  computed, which meant wrapping the private-state provider with a
  `localStorage`-backed layer (`web/src/persistentPrivateStateProvider.ts`)
  was enough to fix it with no changes needed to `join()`/`deploy()`
  themselves. The pending prediction/salt got the same treatment
  (`web/src/pendingPrediction.ts`). Both are scoped per contract address,
  never transmitted anywhere, and `connectAndJoin` was also fixed to merge
  the organizer key into an existing persisted identity rather than
  overwriting it (see that function's doc comment in
  `web/src/wallet/connect.ts`). **This fix is unit-tested but not yet
  re-verified against a live testnet reconnect** — treat the two-tab
  workaround in Step 3 as still the safer choice until it has been.

## Known Wave 1 limitations, stated plainly

- **No persistence across a lost device/browser.** The participant's
  pending prediction/salt and both organizer/participant identity keys are
  persisted in that browser's `localStorage`, scoped per contract address
  (see the testnet lesson above) — they survive a reload or reconnect on
  the same device, but there is still no cross-device or cross-browser
  recovery. Losing the browser profile or clearing site data before reveal
  makes that commitment permanently unrevealable.
- **No on-chain deadline enforcement.** Documented in Step 3 above and in
  `docs/privacy-model.md`/`docs/contract-spec.md` — don't rely on the
  deadline as a security boundary.
- **No leaderboard, no multi-match list.** Out of scope for Wave 1 by
  design — see `.kiro/specs/privatepredict-wave1/requirements.md`,
  Requirements 6, 10, and 14.
