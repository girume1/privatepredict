# Privacy Model

## Privacy goal

PrivatePredict prevents other users and the platform from reading a user's prediction before the user chooses to reveal it.

It provides prediction confidentiality. It does not claim complete anonymity or identity unlinkability.

**Wave 1 limitation:** "verifiable timing" here means the commitment can only
be produced after a participant knows their own prediction and salt, and can
only be revealed after the organizer publishes a result — it is not an
on-chain deadline guarantee. No verified time/clock primitive exists in the
installed Compact 0.31.1 toolchain, so the contract does not and cannot
enforce the submission deadline on-chain; `deadline` is stored for display
only. Do not present client-side deadline checks as a security guarantee.

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

For each prediction, the user creates, entirely on-device:

```text
commitment = persistentHash([prediction, salt])
```

matching the verified contract's exported `computeCommitment` circuit. The
contract stores only the commitment, never the readable prediction, and the
`submitPrediction` circuit accepts the commitment only — the salt is never a
circuit parameter, ledger field, log entry, or network payload before reveal.

At reveal time, the contract recomputes the commitment using the supplied prediction and salt. The reveal is accepted only when it matches the stored commitment.

## Privacy limitations

- Wallet addresses and transaction timing may be observable.
- Revealing a prediction intentionally makes it known.
- Private values must never be logged, sent to an ordinary backend, or committed to Git.
- The random salt must never be reused.
- **Private state is `localStorage`-persisted, scoped per contract address, on the participant's own device.** The pending `{prediction, salt}` pair and the participant/organizer identity keys are held in `web/src/pendingPrediction.ts` and `web/src/persistentPrivateStateProvider.ts` respectively — both survive a page reload and a wallet disconnect/reconnect for that same match. This was a deliberate fix after an earlier in-memory-only design (matching the official reference implementation as-is) demonstrably lost this data on reconnect/reload during real testnet use — see `DEPLOYMENT.md`'s "Testnet lessons learned." Persisting it changes nothing about who can see it: it is still never transmitted anywhere, only written to the browser's own local storage. There is still no cross-device or cross-browser recovery — clearing site data or switching devices loses it permanently for that commitment.

## Verification status

The commit → close → publish → reveal flow above, including the
commitment-verification step, has been run live on the Midnight Preview
testnet (an incorrect-prediction, 0-point case). See `DEPLOYMENT.md` for
what is and is not yet verified live versus only unit-tested.