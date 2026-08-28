# Frontend Specification

## Screens

- Home / match list
- Match detail
- Submit prediction
- Reveal prediction
- Leaderboard
- Privacy explanation

## Components

| Component | Purpose |
|---|---|
| `WalletConnect` | Connects the user wallet and shows connection state |
| `MatchCard` | Shows match, deadline, status, and user prediction state |
| `PredictionSelector` | Lets a user select HOME, DRAW, or AWAY locally |
| `CommitPredictionDialog` | Confirms private commitment submission |
| `RevealPredictionDialog` | Confirms voluntary reveal after result publication |
| `TransactionStatus` | Shows proof generation, wallet confirmation, success, or error |
| `Leaderboard` | Displays mock points and public scoring data |
| `PrivacyPanel` | Explains what remains private and what is public |
| `MatchStateTimeline` | Visualizes OPEN → CLOSED → RESULT_PUBLISHED |
| `EmptyState` | Explains the app when no matches exist |

## Privacy Panel

The Privacy Panel must update based on the user action.

Before commitment:

```text
Private: selected prediction, future random salt
Public: nothing submitted yet
```

After commitment:

```text
Private: readable prediction and salt
Public: match ID, submission timing, commitment
```

After reveal:

```text
Private: salt should no longer be displayed
Public: revealed prediction, verified result, mock score
```

## UX rules

- Never describe a commitment as complete anonymity.
- Explain that a salt must be safely retained to reveal later.
- Disable invalid UI actions, but rely on the contract to enforce rules.
- Display useful transaction errors.
- Make mobile layout and keyboard navigation part of Wave 1.