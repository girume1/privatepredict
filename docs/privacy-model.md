# Privacy Model

## Privacy goal

PrivatePredict prevents other users and the platform from reading a user's prediction before the user chooses to reveal it.

It provides prediction confidentiality and verifiable timing. It does not claim complete anonymity.

## Public ledger data

- Match identifier
- Submission deadline
- Match lifecycle status
- Published match result
- Prediction commitment
- Whether a commitment has been revealed
- Mock score or leaderboard points

## Private user-held data

- Prediction outcome: HOME, DRAW, or AWAY
- A unique random 32-byte salt for each commitment
- User-local private state needed by the application

## Commitment scheme

For each prediction, the user creates:

```text
commitment = persistentCommit(
  { matchId, prediction },
  salt
)
```

The contract stores the commitment, not the readable prediction.

At reveal time, the contract recomputes the commitment using the supplied prediction and salt. The reveal is accepted only when it matches the stored commitment.

## Privacy limitations

- Wallet addresses and transaction timing may be observable.
- Revealing a prediction intentionally makes it known.
- Private values must never be logged, sent to an ordinary backend, or committed to Git.
- The random salt must never be reused.