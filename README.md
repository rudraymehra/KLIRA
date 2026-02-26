# Klira

A frictionless limit order app on Solana that removes rent costs, enabling CEX-like UX with fully on-chain self-custody.

## The Problem with Solana Limit Orders

On Solana, placing a limit order with current DeFi applications (e.g., Jupiter, Kamino) requires users to pay network rent (typically ~0.005 SOL) to create the necessary accounts for each order. This rent is locked up until the order is filled or canceled.

This creates significant friction:

- **Poor User Experience**: New users are often confused by rent, why they have to pay it, and the process of reclaiming it.
- **Capital Inefficiency**: Placing multiple orders is expensive. For example, 10 open orders could lock up 0.05 SOL (~$9), discouraging active trading strategies.

## Our Solution: Rent-Free Limit Orders

Klira eliminates rent by fundamentally changing how orders are stored and executed. We use on-chain data compression (Light Protocol ZK compression) to store order details and a single, shared vault to hold user funds.

This allows for a seamless, capital-efficient trading experience where users can set multiple orders without locking up any SOL in rent.

## Key Features

- **Zero Rent**: Place unlimited limit orders without paying rent.
- **CEX-like Experience**: Enjoy the fluid, frictionless trading experience of a centralized exchange, but fully decentralized and self-custodial.
- **Capital Efficiency**: Keep your SOL liquid instead of having it locked in rent-paying accounts.
- **Fully On-Chain**: All transactions are settled on the Solana blockchain, ensuring transparency and security.
- **Frictionless UX**: Simple and intuitive interface for placing and managing limit orders.

## How It Works

1. **Initialize Order**: A user deposits tokens into the main Klira protocol vault and specifies the parameters for their limit order (e.g., "Sell 100 SOL for USDC when the price hits $200").
2. **Store Order Data**: The order instructions are stored on-chain using Light Protocol ZK compression.
3. **Price Monitoring**: A backend keeper service continuously monitors asset prices.
4. **Execute Swap**: When an asset reaches the user's target price, the keeper swaps the tokens via Jupiter and sends the output tokens to the user.

## Technology Stack

- **Smart Contract**: Rust, Anchor Framework, Light Protocol SDK
- **Backend (Keeper)**: TypeScript, Express.js, Node.js
- **Frontend**: TypeScript, Next.js 14, React 18, Tailwind CSS
- **Infrastructure**: Docker, PostgreSQL, Redis, PM2, GitHub Actions CI/CD

## Project Structure

```
klira/
├── programs/klira/src/   # Anchor smart contract (Rust)
├── server/               # Backend keeper service (TypeScript)
├── frontend/             # Next.js frontend (TypeScript)
├── tests/                # Integration tests
├── prisma/               # Database schema
└── .github/workflows/    # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 20+
- Rust & Anchor CLI (for smart contract development)
- Solana CLI
- PostgreSQL 16 (or use Docker Compose)

### Installation

```bash
# Clone the repository
git clone <repo-url> && cd klira

# Install backend dependencies
npm ci

# Install frontend dependencies
cd frontend && pnpm install && cd ..

# Set up environment variables
cp .env.example .env
cp frontend/.env.example frontend/.env.local
# Edit both .env files with your configuration

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Run database migrations
npx prisma migrate deploy

# Build and start the server
npx tsc && node dist/server/app.js

# Start the frontend (in another terminal)
cd frontend && pnpm dev
```

See [DEPLOY.md](./DEPLOY.md) for full production deployment instructions.

## Security

See [SECURITY.md](./SECURITY.md) for our security policy and how to report vulnerabilities.

## License

All rights reserved. See LICENSE for details.
