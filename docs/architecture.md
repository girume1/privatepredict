# PrivatePredict Architecture

## Overview

PrivatePredict is a privacy-preserving football prediction application built on Midnight.

The system separates public, on-chain verification data from private user-held prediction data.

```text
React + TypeScript frontend
        |
        | prepare private prediction and random salt locally
        v
Midnight TypeScript API / generated Compact contract API
        |
        | generate proof through local proof server
        v
Compact contract on Midnight
        |
        v
Public Midnight ledger
```

## Components

| Component | Responsibility |
|---|---|
| React frontend | Creates predictions locally, displays matches, guides commit/reveal flow |
| TypeScript contract API | Calls generated Compact contract APIs and manages transaction state |
| Compact contract | Enforces match lifecycle, commitment storage, reveal verification, and mock scoring |
| Local private state | Stores prediction and random salt until the user reveals |
| Midnight ledger | Stores public match data, commitments, results, and mock points |
| Proof server | Generates zero-knowledge proofs locally for contract transactions |

## Design principles

- The frontend is not trusted for authorization or scoring.
- The Compact contract validates all state changes.
- Predictions and salts remain private until the user chooses to reveal.
- No real-money bets, deposits, withdrawals, or token payouts are supported.