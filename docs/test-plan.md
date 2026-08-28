# Test Plan

## Contract tests

### Match administration

- Organizer can create a valid match.
- Unauthorized user cannot create a match.
- Duplicate match ID is rejected.
- Invalid deadline is rejected.
- Organizer can close an open match.
- Unauthorized user cannot close a match.
- A non-open match cannot be closed again.
- Only organizer can publish a result.
- Result cannot be changed after publication.

### Prediction submission

- User can submit one valid commitment before the deadline.
- Submission to a nonexistent match fails.
- Submission after the deadline fails.
- Submission after closing fails.
- A second submission by the same user for the same match fails.
- Different users can commit to the same match.

### Reveal and scoring

- A correct prediction and salt reveal successfully.
- A wrong salt fails.
- A wrong prediction fails.
- A reveal without a stored commitment fails.
- Reveal before a result is published fails.
- A commitment cannot be revealed twice.
- A correct prediction adds 3 points.
- An incorrect prediction adds 0 points.
- A user cannot receive points twice.

## TypeScript tests

- Commitment generation matches the expected contract-compatible input.
- Local state saves prediction and salt safely.
- Local state is not sent to API calls before reveal.
- Invalid enum values are rejected.
- Transaction error messages are handled.

## End-to-end demo test

1. Organizer creates a match.
2. User selects HOME privately.
3. User submits the commitment.
4. A second account cannot read the prediction.
5. Organizer closes the match and publishes HOME.
6. User reveals the prediction and salt.
7. The score becomes 3 points.
8. The leaderboard reflects the verified score.