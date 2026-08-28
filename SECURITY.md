# Security Policy

## Overview

PrivatePredict is a privacy-preserving football prediction application built on Midnight.

The application uses a commit-and-reveal design to keep a user's prediction confidential until the user chooses to reveal it. Privacy, smart-contract correctness, and secure handling of secrets are core project requirements.

PrivatePredict is currently a Buildathon prototype. It uses mock points only and does not support real-money betting, deposits, withdrawals, token payouts, or financial transactions.

## Supported versions

During the Buildathon, only the latest code on the `main` branch is actively maintained.

| Version | Supported |
|---|---|
| `main` | Yes |
| Historical commits | No |

## Reporting a vulnerability

Do not publicly disclose security vulnerabilities through GitHub Issues, discussions, social media, or the Buildathon comments section.

Instead, contact the repository owner privately through the GitHub profile associated with this repository. Include:

- A clear description of the issue
- Steps to reproduce it
- The affected component or file
- The potential security or privacy impact
- Suggested mitigation, if available
- Screenshots, logs, or proof-of-concept code only when it does not reveal another user's private data

Please do not include seed phrases, private keys, API secrets, unrevealed predictions, salts, wallet backups, or personal data in vulnerability reports.

## Security principles

### Contract-enforced rules

The Compact contract is the source of truth for:

- Match lifecycle transitions
- Prediction submission deadlines
- Commitment storage
- Commitment reveal verification
- Result publication authority
- Mock-point scoring
- Single-claim protections
- Authorization checks

The frontend is not trusted to determine authorization, ownership, scoring, match status, or result validity.

### Privacy boundary

Private until a user chooses to reveal:

- Prediction outcome: `HOME`, `DRAW`, or `AWAY`
- Random salt used to create a commitment
- User-local private state

Public on the Midnight ledger:

- Match ID
- Match deadline
- Match lifecycle status
- Prediction commitment
- Match result after publication
- Reveal status
- Mock points or leaderboard score

### Commitment safety

PrivatePredict intends to use a persistent cryptographic commitment for each prediction.

- Generate a new random salt for every prediction.
- Never reuse a salt.
- Never store an unrevealed prediction or salt in the public ledger.
- Never send a prediction or salt to a conventional backend before reveal.
- Never log prediction values or salts before reveal.
- Never include private data in URLs, browser analytics, screenshots, or Git commits.

### Secret handling

Never commit any of the following to GitHub:

```text
.env
.env.local
.env.production
wallet seed phrase
recovery phrase
private key
API key
RPC credential
database password
prediction salt
unrevealed prediction
user-local private state
```

Use environment variables for non-public configuration values. Commit an `.env.example` file containing variable names only, never real secrets.

### Input validation

All user-controlled values must be validated in the Compact contract and, where applicable, in TypeScript:

- Prediction outcomes must be allowlisted: `HOME`, `DRAW`, or `AWAY`
- Match IDs must follow the expected type and length limits
- Deadlines must be valid
- Match state transitions must be valid
- Results must be valid
- Duplicate submissions must be rejected
- Duplicate reveals and score claims must be rejected

Client-side validation improves user experience but is never a security boundary.

### Dependency security

Before each Buildathon submission:

```bash
npm audit
bun audit
```

Review high- and critical-severity findings and update dependencies where practical. Do not blindly apply breaking dependency updates without testing the application afterward.

### Local development security

- Run the proof server locally or on infrastructure you control.
- Do not expose the proof-server port publicly.
- Do not use public Wi-Fi for wallet or private-state operations without appropriate protection.
- Lock your computer when unattended.
- Use a separate test wallet for development and testnet activities.
- Store wallet recovery phrases offline and never in cloud notes, screenshots, source code, or chat messages.

## Out of scope

The following are outside PrivatePredict’s Wave 1 scope:

- Real-money wagering
- Deposits and withdrawals
- Token issuance
- Token transfers
- External sports-data oracle security
- Complete wallet-level anonymity
- Full protection against transaction-timing or network-level metadata analysis
- Recovery of a lost prediction salt or lost private state

## Responsible disclosure acknowledgement

Good-faith vulnerability reports will be reviewed and acknowledged when possible. Please allow reasonable time for investigation and remediation before sharing security details publicly.