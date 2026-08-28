# PrivatePredict

> A privacy-preserving football prediction dApp built with Midnight, Compact, TypeScript, and React.

PrivatePredict lets football fans commit to predictions privately before a match and later prove that they made the correct prediction. It prevents early copying of picks while giving users a verifiable, tamper-resistant record that their prediction existed before the match result was known.

> **Status:** Wave 1 — architecture, privacy design, and Midnight development environment setup.

## Problem

Most football prediction platforms require users to reveal their picks before an event. This creates three problems:

- Users can copy popular predictions instead of making independent choices.
- Platforms can read, expose, or potentially manipulate predictions before a match.
- Users must trust a central platform to determine whether a prediction was submitted before the result.

## Solution

PrivatePredict uses Midnight’s privacy-enabled smart contracts and zero-knowledge technology to create a commit-and-reveal prediction flow.

1. A user selects `HOME`, `DRAW`, or `AWAY`.
2. The application generates a unique random secret locally.
3. The user submits a cryptographic commitment before the match deadline.
4. The public ledger stores the commitment, not the readable prediction.
5. After the result is published, the user can reveal the prediction.
6. The Compact contract verifies the commitment and awards mock points.

PrivatePredict provides **prediction confidentiality and verifiable timing**. It does not claim complete anonymity.

## Privacy model

### Public on the Midnight ledger

- Match identifier and deadline
- Match lifecycle status
- Prediction commitment
- Published match result
- Reveal status
- Mock leaderboard points

### Private until reveal

- User prediction: `HOME`, `DRAW`, or `AWAY`
- Unique random salt used to create the commitment
- User-local private state

### Privacy limitations

- Wallet addresses and transaction timing may remain observable.
- Revealing a prediction intentionally makes it public.
- The application does not claim full anonymity.
- Users must retain their salt to reveal their original prediction.

## Commitment flow

PrivatePredict intends to use Midnight's `persistentCommit` primitive for a prediction commitment.

```text
commitment = persistentCommit(
  { matchId, prediction },
  randomSalt
)
```

The contract stores only `commitment`.

During reveal, the user provides the original prediction and salt. The Compact contract recomputes the commitment and accepts the reveal only if it matches the stored value.

```text
User selects prediction privately
        |
        v
Frontend creates a unique random salt locally
        |
        v
Frontend creates prediction commitment
        |
        v
Compact contract stores commitment on Midnight
        |
        v
Match result is published
        |
        v
User reveals prediction and salt
        |
        v
Compact contract verifies commitment and awards mock points
```

## Match lifecycle

```text
OPEN → CLOSED → RESULT_PUBLISHED
```

## Prediction lifecycle

```text
NOT_SUBMITTED → COMMITTED → REVEALED → SCORED
```

## Wave 1 scope

Wave 1 focuses on a complete, small, reliable end-to-end flow:

- [ ] A compiling Compact contract
- [ ] Match creation with a prediction deadline
- [ ] Private prediction commitment submission
- [ ] Match closing and result publication
- [ ] Prediction reveal and commitment verification
- [ ] Mock-point scoring
- [ ] Contract simulation and test cases
- [ ] TypeScript integration
- [ ] Basic React interface
- [ ] Privacy Panel showing public versus private data
- [ ] Demo video and submission materials

## Buildathon roadmap

### Wave 1 — Private commitment MVP

Build the core commit-and-reveal flow for a single football match.

### Wave 2 — Private league experience

Add multiple matches, prediction history, competition rounds, improved wallet interaction, a leaderboard, stronger test coverage, and usability improvements informed by Wave 1 feedback.

### Wave 3 — Selective disclosure and adoption

Add privacy-aware leagues, optional selective disclosure, improved accessibility and mobile experience, product validation, onboarding, and a viable adoption roadmap.

## Technology

- [Midnight Network](https://midnight.network/)
- [Compact](https://docs.midnight.network/compact) smart contracts
- Zero-knowledge proofs
- TypeScript
- React
- Bun
- Docker proof server

## Project structure

```text
privatepredict/
├── contract/             # Compact contract source code and contract tests
├── api/                  # TypeScript contract integration layer
├── web/                  # React frontend
├── docs/                 # Architecture, privacy, API, frontend, and test specifications
├── CHANGELOG.md          # Wave-by-wave progress history
├── SECURITY.md           # Security and privacy policy
├── LICENSE               # Apache License 2.0
└── README.md
```

## Local development

### Prerequisites

- Ubuntu, Linux, macOS, or Windows via WSL 2
- Git
- Node.js 22 or newer
- Bun
- Docker Desktop with Docker Compose
- Midnight Compact developer tools
- Midnight-compatible wallet for later network testing

### Verify local tools

```bash
git --version
node --version
npm --version
bun --version
docker --version
docker compose version
compact --version
compact check
```

### Run the local proof server

```bash
docker run -p 6300:6300 \
  midnightntwrk/proof-server:8.1.0 \
  midnight-proof-server -v
```

Verify that it is running:

```bash
curl http://localhost:6300/
```

Expected response:

```json
{
  "status": "ok"
}
```

## Security

Read [SECURITY.md](./SECURITY.md) before contributing or running the application.

Never commit:

- Wallet seed phrases
- Private keys
- API keys
- `.env` files
- Prediction salts
- Unrevealed user predictions
- User-local private state

## License

The Midnight-related code in this project is licensed under the [Apache License 2.0](./LICENSE).

## Buildathon attribution

Built for the Midnight privacy-first application Buildathon.

GitHub topics:

```text
midnightntwrk midnight compact typescript zero-knowledge privacy web3 football
```