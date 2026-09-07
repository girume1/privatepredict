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
- Commitment storage
- Commitment reveal verification
- Result publication authority
- Mock-point scoring
- Single-claim protections (no duplicate submissions or reveals)
- Authorization checks (organizer and prediction-owner checks)

The frontend is not trusted to determine authorization, ownership, scoring, match status, or result validity.

**Documented exception — deadlines are *not* contract-enforced.** The verified Compact toolchain has no time/clock primitive, so `deadline` is stored for display only; client-side deadline gates are a UX convenience, not a security boundary (see `README.md`'s verification table and `docs/privacy-model.md`).

### Privacy boundary

Private until a user chooses to reveal:

- Prediction outcome: `HOME`, `DRAW`, or `AWAY`
- Random salt used to create a commitment
- User-local private state

User-local private state (the pending prediction/salt and the participant/organizer identity keys) is persisted in the browser's `localStorage`, scoped per match contract address, on that device only — it is never transmitted anywhere, and clearing site data loses it permanently (see `docs/privacy-model.md`).

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

Validation is layered, and the current Wave 1 reality is stated precisely:

- **Contract-enforced:** match state transitions, single commitment per deployment, organizer authorization, result publication only while `CLOSED`, reveal only after `RESULT_PUBLISHED`, and commitment recomputation at reveal.
- **API/UI-layer only (not yet contract-enforced):** prediction/result values are restricted to the allowlisted `HOME`/`DRAW`/`AWAY` encoding by `api/src/outcome.ts` and the organizer's result selector. The contract itself accepts any 32-byte value (`publishResult`'s documented Wave 2 TODO). Since a caller can bypass the UI, a non-canonical published result is possible today; its only effect is that no canonical prediction can score 3 points against it.
- **Client-side convenience only:** the submission deadline gate and match-address format checks (64 hex characters) in the web app.

Client-side validation improves user experience but is never a security boundary.

### Dependency security

Before each Buildathon submission:

```bash
npm audit
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