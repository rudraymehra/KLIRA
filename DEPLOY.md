# Klira — Production Deployment Guide

Everything you need to go from code to live mainnet trading.

---

## Prerequisites

- [Rust](https://rustup.rs/) + [Anchor CLI](https://www.anchor-lang.com/docs/installation) v0.31+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) v1.18+
- [Node.js](https://nodejs.org/) v18+ and [pnpm](https://pnpm.io/)
- A funded Solana wallet (~5 SOL for deployment + operations)
- A [Helius](https://www.helius.dev/) RPC API key (required for Light Protocol compressed accounts)

---

## Step 1: Prepare Keys & Wallets

### 1a. Deployer wallet (one-time program deployment)
```bash
# Use your existing wallet or create a new one
solana-keygen new --outfile ~/.config/solana/deployer.json
solana config set --keypair ~/.config/solana/deployer.json
solana config set --url mainnet-beta

# Fund it (need ~3 SOL for program deployment)
# Transfer SOL from an exchange or another wallet
```

### 1b. Server payer wallet (ongoing fill/expire operations)
```bash
solana-keygen new --outfile payer.json

# Fund with ~1 SOL to start (the server uses this to pay for fill/expire txs)
# You'll need to top this up periodically
```

---

## Step 2: Get RPC Access

You **must** use a Helius RPC endpoint — it's the only provider that supports Light Protocol's compressed accounts.

1. Go to [helius.dev](https://www.helius.dev/)
2. Create an account and get a **mainnet** API key
3. Your RPC URL will be: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

---

## Step 3: Create Light Protocol Trees on Mainnet

The program uses Light Protocol ZK compression. You need to create the Merkle trees on mainnet.

```bash
# Install light-protocol CLI
npm install -g @lightprotocol/cli

# Create the state tree, address tree, and queues
# (This costs ~0.5 SOL)
light create-state-tree --rpc https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
light create-address-tree --rpc https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

After creation, update these addresses in:
- `programs/klira/src/utils.rs` — `STATE_TREE`, `STATE_QUEUE`, `ADDRESS_TREE`, `ADDRESS_QUEUE`
- `frontend/src/lib/program.ts` — Same constants
- `tests/utils/address.ts` — Same constants

---

## Step 4: Deploy the Program

```bash
cd klira

# Build the program
anchor build

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta --provider.wallet ~/.config/solana/deployer.json

# The program ID should already be KLRa8WndxF7bQpYm3V96TjHv2Zke5BscNh4GoCuRf1A
# If it changes, update it everywhere (lib.rs, Anchor.toml, frontend/src/lib/idl.ts, frontend/src/lib/program.ts)
```

---

## Step 5: Create the Address Lookup Table

The ALT reduces transaction sizes. Create one on mainnet with all the static accounts:

```bash
# Create ALT
solana address-lookup-table create --rpc-url https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Extend with all the protocol addresses (Light Protocol trees, program IDs, etc.)
# See tests/utils/fn.ts create_alt() for the list of addresses to add
```

Update `9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ` in:
- `frontend/src/lib/program.ts` → `ALT_ADDRESS`
- `server/instructions/fill.ts`
- `server/instructions/expire.ts`
- `server/instructions/create_ata.ts`

---

## Step 6: Configure Environment Variables

### Server (.env)
```bash
cp .env.example .env
```
Edit `.env`:
```
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
KEY=[...paste contents of payer.json...]
TELEGRAM_BOT_TOKEN=your_bot_token   # optional
TELEGRAM_CHAT_ID=your_chat_id       # optional
PORT=4000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
KEEPER_INTERVAL_MS=15000
```

### Frontend (.env.local)
```bash
cp frontend/.env.example frontend/.env.local
```
Edit `frontend/.env.local`:
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Step 7: Build & Run

### Server
```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build:server

# Run
pnpm run start:server
```

For production, use a process manager:
```bash
npm install -g pm2
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup
```

### Frontend
```bash
cd frontend
pnpm install
pnpm run build
pnpm run start
```

For production with Vercel:
```bash
# Push to GitHub and connect to Vercel
# Set environment variables in Vercel dashboard
```

### Docker (Alternative)
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your values — POSTGRES_PASSWORD is required

# Build and start all services (server + postgres + redis)
docker compose up -d --build

# Check server health
curl http://localhost:4000/v1/health

# View logs
docker compose logs -f server
```

---

## Step 8: Verify Everything Works

1. **Check server health**: `curl http://localhost:4000/v1/health`
2. **Check keeper is running**: Look for "Keeper service started" in logs
3. **Open frontend**: Navigate to your domain
4. **Place a test order**: Use a small amount first
5. **Monitor Telegram**: You should receive alerts on fills/expires

---

## Architecture Overview

```
┌──────────────┐     places order      ┌──────────────┐
│   Frontend   │ ──────────────────────>│   Solana     │
│   (Next.js)  │                        │   Program    │
│              │ ── POST /orders ──>    │              │
└──────────────┘                        └──────────────┘
                                              │
┌──────────────┐     keeper monitors          │
│   Server     │ <────────────────────────────┘
│   (Express)  │     fills/expires orders
│   + Keeper   │
│   + Telegram │
└──────────────┘
```

1. User places limit order via frontend → on-chain compressed escrow created
2. Frontend registers order with server (POST /orders)
3. Keeper loop every 15s:
   - Checks all open orders
   - Fetches current prices from Jupiter
   - If price condition met → fills order via Jupiter swap
   - If order expired → returns tokens to maker
4. Telegram alerts on fills, expires, and errors

---

## Monitoring

- **Health endpoint**: GET /health
- **Metrics endpoint**: GET /metrics
- **Telegram bot commands**: /health, /status, /info
- **Logs**: `logs/app.log` (5MB rotation, 3 files)

---

## Cost Estimates

| Action | Cost |
|--------|------|
| Program deployment | ~3 SOL (one-time) |
| Light Protocol trees | ~0.5 SOL (one-time) |
| ALT creation | ~0.01 SOL (one-time) |
| Fill transaction | ~0.002 SOL per fill |
| Expire transaction | ~0.001 SOL per expire |
| Server payer funding | Start with 1 SOL, top up as needed |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Compressed account not found" | Ensure RPC supports Light Protocol (Helius only) |
| "Swap Quote not found" | Token pair may have low liquidity, or dust amount |
| "Target Ratio greater than current" | Price hasn't reached the limit price yet |
| "CU exceeded" | Route too complex; the keeper will retry with direct routes |
| Server not filling orders | Check `data/orders.json` has open orders, check logs |
