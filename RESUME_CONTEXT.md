# Klira Setup - Resume Context

> This document captures the full state of the Klira project setup as of Feb 22, 2026.
> Use this to resume work on a different machine. Give this entire file to Claude.

---

## What Is Klira?

Klira is a rent-free limit order trading protocol on Solana. It uses Light Protocol ZK compression to store orders without paying Solana account rent. A backend keeper bot monitors prices via Jupiter and auto-fills orders when conditions are met.

**Three parts:** Rust smart contract (Anchor) + Express.js backend server + Next.js frontend

**GitHub repo:** `git@github.com:rudraymehra/ELARA.git` (branch: `main`)

---

## Steps Completed (1-9 + 14)

### Step 1: npm install
- Done. `@prisma/client` and `prisma` added to package.json and installed.

### Step 2: Helius API Key
- Devnet: `https://devnet.helius-rpc.com/?api-key=***REMOVED***`
- Mainnet: `https://mainnet.helius-rpc.com/?api-key=***REMOVED***`
- Set in both `klira/.env` (RPC_URL) and `klira/frontend/.env.local` (NEXT_PUBLIC_SOLANA_RPC_URL)

### Step 3: Solana Payer Wallet
- File: `klira/payer.json`
- Public key: `BgNBRbFhNNUmznZNum7MJLBHnAKqWzPzyjw9QrbGWqa5`
- Seed phrase: `color real column twenty erase acquire nominee boat maximum village danger wrestle`
- Balance: **5 SOL** on devnet (airdropped via faucet.solana.com)
- NEVER commit payer.json to git

### Step 4: KEEPER_API_KEY
- Value: `***REMOVED***`
- Set in `klira/.env`

### Step 5: Server .env File
- Created at `klira/.env` with all values filled in
- Full contents:
  ```
  RPC_URL=https://devnet.helius-rpc.com/?api-key=***REMOVED***
  KEY=[87,126,201,197,177,156,118,139,...] (full payer keypair)
  KEEPER_API_KEY=***REMOVED***
  POSTGRES_PASSWORD=***REMOVED***
  DATABASE_URL=postgresql://klira:***REMOVED***@localhost:5432/klira
  ALLOWED_ORIGINS=http://localhost:3000
  LOG_LEVEL=info
  NODE_ENV=development
  PORT=4000
  KEEPER_INTERVAL_MS=15000
  ```

### Step 6: PostgreSQL Database
- Installed via Homebrew (PostgreSQL 14), NOT Docker
- Service: `brew services start postgresql@14` (already running)
- User: `klira` / Password: `***REMOVED***`
- Database: `klira`
- Tables created: orders, fills, transactions, metrics, _prisma_migrations
- **On new laptop:** You'll need PostgreSQL installed. Run:
  ```bash
  brew install postgresql@14
  brew services start postgresql@14
  psql postgres -c "CREATE USER klira WITH PASSWORD '***REMOVED***' CREATEDB;"
  psql postgres -c "CREATE DATABASE klira OWNER klira;"
  ```

### Step 7: Prisma Migration
- Migration applied: `20260221223014_init`
- Prisma Client generated
- Migration files in `prisma/migrations/`
- **On new laptop:** After setting up PostgreSQL, run:
  ```bash
  cd klira
  npm install
  npx prisma migrate dev
  ```

### Step 8: Server Starts Successfully
- Tested: `npx ts-node server/app.ts`
- All health checks pass:
  - Order store: PostgreSQL (Prisma) ✓
  - Payer initialized ✓
  - RPC connection OK ✓
  - Payer balance OK (5 SOL) ✓
  - Jupiter API OK ✓
  - Health endpoint: `http://localhost:4000/v1/health` returns `{"status":"healthy"}`

### Step 9: Frontend .env.local
- File: `klira/frontend/.env.local`
- Contents:
  ```
  NEXT_PUBLIC_SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=***REMOVED***
  NEXT_PUBLIC_SOLANA_NETWORK=devnet
  NEXT_PUBLIC_API_URL=http://localhost:4000
  ```

### Step 14: LICENSE
- MIT License created at `klira/LICENSE`
- Copyright: Rudraym Mehra

---

## Steps Remaining (10-13, 15-18)

### Step 10: Telegram Alerts — IN PROGRESS
**Status:** Not started. User chose "Help me set it up."

**What to do:**
1. Open Telegram, search `@BotFather`
2. Send `/newbot`
3. Name: `Klira Alert Bot`
4. Username: `klira_alerts_bot` (or any name ending in `bot`)
5. Copy the token BotFather gives you
6. Start a chat with your new bot, send "hello"
7. Open: `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
8. Find `"chat":{"id":NUMBERS}` — that's your Chat ID
9. Add both to `klira/.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

### Step 11: Security Email
**Status:** Not done.

**What to do:**
- Set up `security@klira.xyz` email (or any email)
- Update `SECURITY.md` with the email address
- Options: domain email forwarding, or just use a dedicated Gmail

### Step 12: Clean Git History (Remove Leaked Secrets)
**Status:** Not done.

**What to do:**
- The old test files had a hardcoded Helius API key and indexer IP `***REMOVED***`
- Code was fixed (replaced with env vars), but old values still in git history
- Steps:
  ```bash
  brew install bfg
  echo "OLD_HELIUS_KEY_HERE" > ~/secrets.txt
  echo "***REMOVED***" >> ~/secrets.txt
  bfg --replace-text ~/secrets.txt
  git reflog expire --expire=now --all && git gc --prune=now --aggressive
  git push --force
  rm ~/secrets.txt
  ```
- Also regenerate the Helius API key after cleaning history

### Step 13: GitHub CI/CD Secrets
**Status:** Not done.

**What to do:**
- Repo exists: `github.com/rudraymehra/ELARA`
- Go to repo Settings > Secrets and variables > Actions
- Since user chose Railway/Render, the deploy.yml may not be needed (these platforms auto-deploy from GitHub)
- If using Railway: connect the repo in Railway dashboard, set env vars there

### Step 15: Sentry (Error Reporting)
**Status:** Not started. User chose "Help me set it up."

**What to do:**
1. Go to https://sentry.io, sign up (free)
2. Create project, select "Next.js"
3. Copy the DSN string
4. Add to `klira/frontend/.env.local`:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://abc@xyz.ingest.sentry.io/123
   ```
5. Install SDK:
   ```bash
   cd klira/frontend
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

### Step 16: Fund Devnet Wallets for Integration Tests
**Status:** Payer wallet funded (5 SOL). Test wallets not funded separately.

**What to do:**
- Set env vars for tests:
  ```bash
  export TEST_INDEXER_URL=http://localhost:8784
  export TEST_DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=***REMOVED***
  ```
- May need Light Protocol test validator for integration tests

### Step 17: Deploy (Railway/Render)
**Status:** Not done. User chose Railway/Render.

**What to do for Railway:**
1. Go to https://railway.app, sign up with GitHub
2. Click "New Project" > "Deploy from GitHub Repo"
3. Select `rudraymehra/ELARA`
4. Set root directory to `klira` (or configure as monorepo)
5. Add all env vars from `.env` in the Railway dashboard
6. Add a PostgreSQL plugin in Railway (gives you a DATABASE_URL automatically)
7. Set build command: `npm install && npx prisma generate && npx tsc`
8. Set start command: `node dist/server/app.js`
9. Railway auto-deploys on every push to main

**For frontend (Vercel):**
1. Go to https://vercel.com, sign up with GitHub
2. Import the repo, set root directory to `klira/frontend`
3. Add the NEXT_PUBLIC_ env vars
4. Auto-deploys on push

### Step 18: Security Audit & Legal
**Status:** Not needed yet. Do before mainnet.

- Security audit: OtterSec, Neodyme, Halborn ($30K-$80K+)
- Terms of Service & Privacy Policy: crypto/DeFi lawyer ($2K-$10K)

---

## Code Changes Made (Previous Session + This Session)

### Bug Fixes Applied:
- Fixed all async/await issues in order-store (functions are now async)
- Fixed slippage `||` to `??` in app.ts and keeper.ts
- Fixed circular dependency crash: `protocolConfig` in fill.ts, expire.ts, create_ata.ts changed from top-level to lazy `getProtocolConfig()` function
- Fixed Telegram bot crash (bot is now nullable)
- Fixed env var mismatch (API_KEY → KEEPER_API_KEY)
- Fixed `as any` type casts for Anchor IDL mismatches in instruction files
- Fixed missing awaits in test files
- Replaced leaked indexer IP with env var in all test files

### New Files Created:
- `klira/.env` — server environment config
- `klira/LICENSE` — MIT license
- `klira/prisma/schema.prisma` — database schema
- `klira/prisma/migrations/` — database migration
- `klira/docker-compose.yml` — Docker setup (PostgreSQL + Redis)
- `klira/Dockerfile` — multi-stage Docker build
- `klira/.github/workflows/ci.yml` — CI pipeline
- `klira/.github/workflows/deploy.yml` — Deploy pipeline
- `klira/server/order-store.ts` — Dual backend (Prisma + JSON)
- `klira/server/keeper.ts` — Keeper service
- `klira/server/middleware/` — Rate limiting, auth, validation
- `klira/server/lib/` — Shared utilities (escrow.ts, accounts.ts)
- `klira/server/__tests__/` — Server unit tests
- `klira/payer.json` — Server payer wallet (DO NOT COMMIT)

### Files Modified:
- All instruction files (fill.ts, expire.ts, create_ata.ts)
- server/app.ts, server/alert.ts, server/utils.ts
- Smart contract Rust files (state.rs, lib.rs, all instruction files)
- All test files, .gitignore, package.json, Dockerfile
- frontend/.env.local

---

## Build & Test Status (All Passing)

```
Server TypeScript (tsc --noEmit):     ✓ 0 errors
Server unit tests (34 tests):         ✓ All pass
Frontend Next.js build:               ✓ Compiled, 6 pages
Frontend unit tests (183 tests):      ✓ All pass
Server health check:                  ✓ All systems healthy
```

---

## Quick Start on New Laptop

```bash
# 1. Clone the repo
git clone git@github.com:rudraymehra/ELARA.git
cd ELARA/klira

# 2. Install dependencies
npm install

# 3. Copy the .env file (from this laptop or recreate from values above)
# Make sure .env has all values from Step 5

# 4. Copy payer.json (from this laptop — NEVER put in git)
# Or regenerate: solana-keygen new --outfile payer.json
# Then fund: go to faucet.solana.com, paste public key, airdrop 5 SOL

# 5. Start PostgreSQL
brew install postgresql@14
brew services start postgresql@14
psql postgres -c "CREATE USER klira WITH PASSWORD '***REMOVED***' CREATEDB;"
psql postgres -c "CREATE DATABASE klira OWNER klira;"

# 6. Run Prisma migration
npx prisma migrate dev

# 7. Start the server
npx ts-node server/app.ts

# 8. In another terminal, start the frontend
cd frontend
npm install
npm run dev

# 9. Open http://localhost:3000 in browser
```

---

## Important: Files That Must NOT Be Committed

- `klira/.env` (contains private keys and passwords)
- `klira/payer.json` (Solana wallet private key)
- `klira/frontend/.env.local` (contains API key)

These are all in `.gitignore` already, but double-check before pushing.

---

## What To Tell Claude on the New Laptop

> "I'm setting up the Klira project. Here's my resume context: [paste this file or point to RESUME_CONTEXT.md]. Steps 1-9 and 14 are done. I need to continue with Step 10 (Telegram), Step 11 (Security email), Step 12 (Clean git history), Step 13 (GitHub CI/CD), Step 15 (Sentry), Step 16 (Test wallets), Step 17 (Railway deploy), and Step 18 (Audit/legal). I also need to commit all changes."
