# Frontend Specification

## Wave 1 verified implementation note

The screens/components below are corrected to match what's actually built
in `web/src/`. There is no `MatchCard` or `Leaderboard` component, and no
contract-level match list — the contract still holds exactly one match and
one participant's prediction per deployment (see `docs/data-model.md`).
What *is* built is a purely off-chain, local `MatchList` for switching
between several independently-deployed matches — see `docs/data-model.md`
and `DEPLOYMENT.md`'s "Multiple matches" section for exactly what that
does and does not change.

## Screens

- `index.html` / `App.tsx` — the participant-facing route: a local match
  list to pick or add a match address (`MatchList`), then that match's
  wallet connect, detail view, and commit/reveal flow.
- `deploy.html` / `DeployApp.tsx` — a **separate, organizer-only** entry
  point for deploying a new match (i.e. deploying a new contract instance).
  Not linked from the participant app.

## Components (`web/src/components/`, `web/src/screens/`)

| Component | Purpose |
|---|---|
| `MatchList` | Local, off-chain list of saved match contract addresses — add (validated as a full 64-hex-character address), remove, and select one to view (`web/src/matchRegistry.ts` backs it with `localStorage`) |
| `WalletConnect` | Connects the user's wallet and shows connection state |
| `OrganizerKeyInput` | Lets the organizer paste back the secret key saved at deploy time; the pasted key is cleared from the UI on disconnect or match switch so it never leaks into another match's private state |
| `MatchDetail` | The selected match's screen: header, lifecycle timeline, prediction/reveal actions, organizer controls, privacy panel — all personal copy and reveal actions gated on `isPredictionOwner` and locally-held reveal data |
| `MatchStateTimeline` | Visualizes `OPEN` → `CLOSED` → `RESULT_PUBLISHED` |
| `PredictionSelector` | Lets a connected participant select `HOME`, `DRAW`, or `AWAY` locally, before the deadline |
| `CommitPredictionDialog` | Confirms private commitment submission; never renders the salt |
| `RevealPredictionDialog` | Confirms voluntary reveal after result publication |
| `OrganizerControls` | Close Match and Publish Result, shown only when the connected identity's organizer key matches this deployment |
| `TransactionStatus` | Shows proof generation, wallet confirmation, success, or error; reports the 30s proving timeout to the parent so a stuck call becomes dismissible |
| `PrivacyPanel` | Explains what remains private and what is public, per lifecycle stage and per viewer (owner vs. observer) |
| `EmptyState` | Shown when no match is configured, or the wallet isn't connected |
| `Dialog` | Shared focus-trapping modal primitive used by both commit/reveal dialogs; dismissible via Escape or backdrop click when allowed |

## Ownership-scoped copy (single prediction slot)

One deployment holds exactly one commitment slot. Because the ledger's
`predictionState`/`commitment`/`revealedPrediction` describe that slot —
not "the connected user" — `MatchDetail` receives `isPredictionOwner` and
`hasLocalPrediction` and gates all personal affordances on them:

- Only the slot owner sees "Your commitment", "Your prediction has been
  submitted…", the Reveal Prediction button, and the revealed
  prediction/result/points summary.
- A non-owner sees neutral copy ("this match's single prediction slot is
  already held by another participant") and no reveal action.
- The Reveal Prediction button additionally requires locally-held reveal
  data (`hasLocalPrediction`); when it is missing, an explanation is shown
  instead of an action that cannot succeed.

## Privacy Panel

The Privacy Panel updates based on `predictionState` *and* whether this
viewer owns the slot, matching `docs/privacy-model.md`:

Before commitment (slot free — same for every viewer):

```text
Private: selected prediction, future random salt
Public: nothing submitted yet
```

After commitment, before reveal (slot owner):

```text
Private: plaintext prediction, salt
Public: match identifier, submission timing, commitment
Privacy limitation: wallet address and transaction timing may remain
observable; commitment does not provide complete anonymity.
```

After reveal (slot owner):

```text
Private: no active unrevealed prediction data
Public: revealed prediction, match result, verified commitment outcome, mock score
```

For a viewer who does not own the committed/revealed slot, the panel shows
neutral content instead — private: "Nothing of yours — this browser does
not hold the keys for this slot"; public: the other participant's
on-chain commitment/reveal data, attributed to them, never to the viewer.

## UX rules

- Never describe a commitment as complete anonymity.
- Transaction state is driven by the real transaction promise, never by
  frontend timers: the 30-second wait only escalates the copy to "still
  processing / taking longer than expected" while the call stays pending —
  it never marks the transaction as failed. Success shows "Confirmed" and
  closes the modal; a definitive failure re-enables the action as
  "Try Again". While a transaction is unresolved the dialog is not
  dismissible and cannot be re-confirmed (no duplicate submissions).
- Explain that a salt must be safely retained to reveal later, and that it
  cannot be recovered if lost — Wave 1's private state is persisted in
  `localStorage` on that one device/browser only, with no cross-device
  recovery (see `docs/privacy-model.md`).
- Disable invalid UI actions, but rely on the contract to enforce rules —
  the deadline gates on both `OrganizerControls` and `PredictionSelector`
  are explicitly client-side convenience only, not enforcement.
- Never offer an action that cannot succeed: the reveal button requires
  both slot ownership and locally-held reveal data; the match list rejects
  addresses that are not full 64-hex-character contract addresses.
- Display useful transaction errors — never raw Compact runtime errors.
- Make mobile layout and keyboard navigation part of Wave 1. **Not yet
  audited** — see the Wave 1 polish checklist in `CHANGELOG.md`'s
  Unreleased section.
