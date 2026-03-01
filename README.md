# Klira

A frictionless limit order protocol on Solana that removes rent costs, enabling CEX-like UX with fully on-chain self-custody.

## The Problem

On Solana, placing a limit order with current DeFi apps (Jupiter, Kamino) requires users to pay network rent (~0.005 SOL per order). This creates friction — new users are confused by rent, and placing 10 orders locks up ~$9 in SOL.

## The Solution

Klira eliminates rent by storing order data via Light Protocol ZK compression and holding user funds in a single shared vault. Users can set unlimited limit orders without locking up any SOL in rent.

### How It Works

1. **Place Order** — User deposits tokens into the Klira vault and sets a limit price
2. **Store On-Chain** — Order data is stored via ZK compression (no rent)
3. **Monitor** — Backend keeper watches prices via Jupiter
4. **Execute** — When price hits the target, keeper swaps via Jupiter and sends output tokens to user

## Tech Stack

- **Smart Contract**: Rust, Anchor, Light Protocol SDK
- **Backend (Keeper)**: TypeScript, Express.js, PostgreSQL, Prisma
- **Frontend**: TypeScript, Next.js 14, React 18, Tailwind CSS
- **Infra**: Docker, GitHub Actions CI/CD

## Project Structure

```
klira/
├── programs/klira/src/   # Anchor smart contract (Rust)
├── server/               # Backend keeper service (TypeScript)
├── frontend/             # Next.js frontend (TypeScript)
├── tests/                # Integration tests
├── prisma/               # Database schema & migrations
└── .github/workflows/    # CI/CD pipelines
```

## Quick Start

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **Helius API key** (free) — [helius.dev](https://www.helius.dev/) (needed for compressed account RPC support)
- **PostgreSQL** — via Docker (recommended) or local install
- Optional: Solana CLI (for wallet generation)

### Automated Setup

```bash
git clone git@github.com:rudraymehra/KLIRA.git && cd KLIRA
bash scripts/setup.sh
```

The setup script installs dependencies, creates env files, generates a payer wallet, runs DB migrations, and verifies the build.

### Manual Setup

```bash
# 1. Clone & install
git clone git@github.com:rudraymehra/KLIRA.git && cd KLIRA
npm install
cd frontend && npm install && cd ..

# 2. Environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local
# Edit both files — see env.example comments for guidance

# 3. Payer wallet (pays for keeper transactions)
solana-keygen new --outfile payer.json
# Fund on devnet: visit https://faucet.solana.com
# Paste the file contents into KEY= in .env

# 4. Database (pick one)
docker compose up -d postgres        # Option A: Docker
# OR install PostgreSQL locally       # Option B: brew install postgresql@14

# 5. Run migrations
npx prisma migrate deploy
npx prisma generate

# 6. Start server (terminal 1)
npx ts-node server/app.ts

# 7. Start frontend (terminal 2)
cd frontend && npm run dev

# 8. Open http://localhost:3000
```

### Docker (Full Stack)

```bash
cp .env.example .env
# Edit .env with your values

docker compose up -d
# Server: http://localhost:4000
# Health: http://localhost:4000/v1/health
```

Note: The Docker setup only runs the backend + database. For the frontend, use Vercel or run `cd frontend && npm run dev` locally.

## Environment Variables

### Server (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `RPC_URL` | Yes | Helius RPC URL (must support compressed accounts) |
| `KEY` | Yes | Payer wallet keypair (JSON array from payer.json) |
| `KEEPER_API_KEY` | Yes | Random string for internal API auth (`openssl rand -hex 32`) |
| `DATABASE_URL` | No | PostgreSQL connection string (falls back to JSON file) |
| `POSTGRES_PASSWORD` | Docker only | PostgreSQL password for docker-compose |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for alerts |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID for alerts |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Yes | Solana RPC URL (Helius recommended) |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Yes | `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_API_URL` | Yes | Backend server URL (`http://localhost:4000`) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error reporting DSN |

## Verification

After setup, verify everything works:

```bash
# Server health check
curl http://localhost:4000/v1/health
# Should return: {"status":"healthy",...}

# Run tests
npx jest --config jest.config.server.js    # 34 server tests
cd frontend && npm test                     # 183 frontend tests

# Type check
npx tsc --noEmit                           # Server
cd frontend && npx tsc --noEmit            # Frontend
```

## Deployment

- **Backend**: Railway or Render (Dockerfile included, `railway.toml` configured)
- **Frontend**: Vercel (set root directory to `klira/frontend`)
- See [DEPLOY.md](./DEPLOY.md) for detailed instructions

## Security

See [SECURITY.md](./SECURITY.md) for our security policy and how to report vulnerabilities.

## License

MIT License — see [LICENSE](./LICENSE)
