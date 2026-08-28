# Data Model

## Enums

```text
PredictionOutcome:
- HOME
- DRAW
- AWAY

MatchStatus:
- OPEN
- CLOSED
- RESULT_PUBLISHED
```

## Public match data

```text
Match {
  matchId: Bytes<32> or another Compact-supported identifier
  deadline: time representation supported by the selected Compact version
  status: MatchStatus
  result: PredictionOutcome or an explicit unset value
  organizer: authorization reference
}
```

## Public prediction record

```text
PredictionRecord {
  commitment: Bytes<32>
  submitted: Boolean
  revealed: Boolean
  pointsAwarded: Boolean
}
```

## Public score record

```text
points[user] -> Uint
```

## User-local private data

```text
LocalPrediction {
  matchId: match identifier
  prediction: HOME | DRAW | AWAY
  salt: Bytes<32>
  commitment: Bytes<32>
}
```

## Keying strategy

The intended record identifier is unique per match and participant:

```text
predictionKey = persistentHash({ matchId, participantIdentity })
```

The final Compact representation must be selected after checking the current Compact collection and key-type syntax in the official examples.