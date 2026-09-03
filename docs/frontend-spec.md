# Frontend Specification

## Wave 1 verified implementation note

The screens/components below are corrected to match what's actually built
in `web/src/`. There is no `MatchCard` or `Leaderboard` component, and no
contract-level match list — the contract still holds exactly one match and
one participant's prediction per deployment (see
`.kiro/specs/privatepredict-wave1/requirements.md`, Requirement 10). What
*is* built is a purely off-chain, local `MatchList` for switching between
several independently-deployed matches — see `docs/data-model.md` and
`DEPLOYMENT.md`'s "Multiple matches" section for exactly what that does
and does not change.

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
| `MatchList` | Local, off-chain list of saved match contract addresses — add, remove, and select one to view (`web/src/matchRegistry.ts` backs it with `localStorage`) |
| `WalletConnect` | Connects the user's wallet and shows connection state |
| `OrganizerKeyInput` | Lets the organizer paste back the secret key saved at deploy time |
| `MatchDetail` | The selected match's screen: header, lifecycle timeline, prediction/reveal actions, organizer controls, privacy panel |
| `MatchStateTimeline` | Visualizes `OPEN` → `CLOSED` → `RESULT_PUBLISHED` |
| `PredictionSelector` | Lets a connected participant select `HOME`, `DRAW`, or `AWAY` locally, before the deadline |
| `CommitPredictionDialog` | Confirms private commitment submission; never renders the salt |
| `RevealPredictionDialog` | Confirms voluntary reveal after result publication |
| `OrganizerControls` | Close Match and Publish Result, shown only when the connected identity's organizer key matches this deployment |
| `TransactionStatus` | Shows proof generation, wallet confirmation, success, or error |
| `PrivacyPanel` | Explains what remains private and what is public, per lifecycle stage |
| `EmptyState` | Shown when no match is configured, or wallet isn't connected |
| `Dialog` | Shared focus-trapping modal primitive used by both commit/reveal dialogs |

## Privacy Panel

The Privacy Panel updates based on `predictionState`, matching
`docs/privacy-model.md`:

Before commitment:

```text
Private: selected prediction, future random salt
Public: nothing submitted yet
```

After commitment, before reveal:

```text
Private: plaintext prediction, salt
Public: match identifier, submission timing, commitment
Privacy limitation: wallet address and transaction timing may remain
observable; commitment does not provide complete anonymity.
```

After reveal:

```text
Private: no active unrevealed prediction data
Public: revealed prediction, match result, verified commitment outcome, mock score
```

## UX rules

- Never describe a commitment as complete anonymity.
- Explain that a salt must be safely retained to reveal later, and that it
  cannot be recovered if lost — Wave 1's private state is persisted in
  `localStorage` on that one device/browser only, with no cross-device
  recovery (see `docs/privacy-model.md`).
- Disable invalid UI actions, but rely on the contract to enforce rules —
  the deadline gates on both `OrganizerControls` and `PredictionSelector`
  are explicitly client-side convenience only, not enforcement.
- Display useful transaction errors — never raw Compact runtime errors.
- Make mobile layout and keyboard navigation part of Wave 1. **Not yet
  audited** — see the Wave 1 polish checklist in `CHANGELOG.md`'s
  Unreleased section.
