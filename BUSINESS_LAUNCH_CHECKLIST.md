# Klira: Business Launch Checklist

> Complete step-by-step guide to take Klira from current state to a production business serving real users.
>
> **Current state**: Code is audited, security-hardened, and tested (237 tests passing). Infrastructure files exist but deployment is not live. Smart contract is deployed on devnet/mainnet but has architectural issues that need addressing.

---

## PHASE 0: IMMEDIATE ACTIONS (Do Today)

These are things only you (the founder) can do. They cannot be automated.

### Step 0.1: Rotate the Helius API Key

**Why**: The old API key `c991f045-...` is permanently in your git history. Even though we removed it from all files, anyone who clones your repo can find it in old commits. If this key has mainnet access, someone could abuse your RPC quota or worse.

**How**:
1. Go to https://www.helius.dev/
2. Log into your dashboard
3. Navigate to API Keys section
4. Delete or regenerate the compromised key
5. Create a new key
6. Update your local `.env` file with the new key:
   ```
   RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_NEW_KEY
   ```
7. If you run anchor tests locally, also set:
   ```
   TEST_MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_NEW_KEY
   TEST_DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_NEW_KEY
   ```

**Time**: 5 minutes

---

### Step 0.2: Set Up a Secrets Manager

**Why**: Your server's payer wallet private key is currently stored as a JSON array in a `.env` file. If someone gets access to your server, they drain your funds instantly. A secrets manager encrypts secrets at rest and provides audit logs of who accessed what.

**Options (pick one)**:

| Option | Cost | Best For |
|--------|------|----------|
| **Doppler** (recommended) | Free tier available | Startups, easy setup |
| AWS Secrets Manager | ~$0.40/secret/month | If already on AWS |
| HashiCorp Vault | Free (self-hosted) | Maximum control |
| Railway/Render env vars | Included in hosting | If using these platforms |

**How (Doppler example)**:
1. Sign up at https://doppler.com
2. Create a project called `klira`
3. Create environments: `development`, `staging`, `production`
4. Add all your secrets from `.env` to the Doppler dashboard
5. Install the Doppler CLI: `brew install dopplerhq/cli/doppler`
6. To run your server with injected secrets:
   ```bash
   doppler run -- node dist/server/app.js
   ```
7. Update your PM2 config to use Doppler:
   ```js
   script: "doppler run -- node dist/server/app.js"
   ```

**Time**: 30 minutes

---

### Step 0.3: Fund the Payer Wallet

**Why**: The keeper service uses this wallet to pay for fill and expire transactions. If it runs out of SOL, all orders stop being processed.

**How**:
1. Find your payer wallet address (the public key from your KEY env var)
2. Send SOL to it. Recommended amounts:
   - **Devnet testing**: Use `solana airdrop 2` (free)
   - **Mainnet launch**: Start with 2-5 SOL (~$300-750 at current prices)
   - **Production steady-state**: Keep 10+ SOL, set up monitoring alerts when balance drops below 1 SOL
3. The keeper uses approximately 0.005-0.01 SOL per fill/expire transaction

**Time**: 5 minutes

---

## PHASE 1: SMART CONTRACT HARDENING (Week 1)

The smart contract audit found 5 critical and 5 high-severity issues. These are **deal-breakers** for any serious user or investor because the smart contract holds user funds.

### Step 1.1: Create a Program Config Account

**Why**: Currently, the fee rate (10 BPS), fee account address, and merkle tree address are all hardcoded directly in the Rust code. This means:
- You cannot change fees without redeploying the entire program
- If your fee account keypair is compromised, you cannot redirect fees
- If the merkle tree fills up, you cannot switch to a new one

**What to do**:
1. Create a new Anchor account struct called `ProtocolConfig`:
   ```rust
   #[account]
   pub struct ProtocolConfig {
       pub authority: Pubkey,        // admin who can update config
       pub fee_bps: u16,             // fee in basis points (e.g., 10 = 0.1%)
       pub fee_account: Pubkey,      // where fees are sent
       pub address_tree: Pubkey,     // Light Protocol merkle tree
       pub paused: bool,             // emergency pause switch
   }
   ```
2. Create an `initialize_config` instruction that only the deployer can call
3. Create an `update_config` instruction gated by the authority
4. Update all instructions that currently use hardcoded values to read from this config account instead
5. Remove all hardcoded values from `constants.rs`

**Files to modify**:
- `programs/klira/src/constants.rs` — remove hardcoded FEE_ACCOUNT, PROTOCOL_VAULT_BUMP
- `programs/klira/src/instructions/fill_order.rs` — read fee_bps and fee_account from config
- `programs/klira/src/instructions/fill_wsol_order.rs` — same
- `programs/klira/src/instructions/create_token_account.rs` — read address_tree from config
- `programs/klira/src/instructions/cancel_order.rs` — same
- All other instruction files that use the hardcoded merkle tree string

**Time**: 2-3 days of Rust development

---

### Step 1.2: Add Maker Verification in Fill Instructions

**Why**: In `fill_order.rs`, the `maker` account is marked as `UncheckedAccount`. While Light Protocol's CPI does verify compressed account data, there is no explicit check that the maker address passed to the instruction matches the maker stored in the escrow. A sophisticated attacker could potentially exploit this.

**What to do**:
1. After deserializing the compressed escrow data, add:
   ```rust
   require!(
       escrow_account.maker == ctx.accounts.maker.key(),
       CustomError::InvalidMaker
   );
   ```
2. Do this in both `fill_order.rs` and `fill_wsol_order.rs`
3. Add `InvalidMaker` to your custom error enum

**Time**: 1-2 hours

---

### Step 1.3: Fix the Typo and Validation Gaps

**Why**: The variable `ouput_mint` is misspelled throughout the codebase (should be `output_mint`). More importantly, account validation at index [4] in Jupiter route validation is missing.

**What to do**:
1. Rename `ouput_mint` to `output_mint` in all Rust files (search and replace)
2. In `utils.rs`, add validation for the missing account index [4] in `validate_exact_out_route`
3. Use `checked_*` arithmetic consistently and validate divisors are non-zero

**Time**: 3-4 hours

---

### Step 1.4: Add Emergency Pause Mechanism

**Why**: If a vulnerability is discovered after mainnet launch, you need a way to immediately stop all order creation and filling without waiting for a program redeploy.

**What to do**:
1. Add a `paused` boolean to your ProtocolConfig (from Step 1.1)
2. Add a check at the top of every instruction:
   ```rust
   require!(!config.paused, CustomError::ProtocolPaused);
   ```
3. Create a `pause` and `unpause` instruction gated by the config authority
4. Keep `cancel_order` working even when paused (users should always be able to withdraw)

**Time**: 2-3 hours

---

### Step 1.5: Set Up Multisig for Upgrade Authority

**Why**: Right now, whoever has the deployer keypair can upgrade the program to do anything — including draining all user funds. A multisig requires multiple people to approve upgrades, protecting users.

**How**:
1. Create a Squads multisig at https://squads.so
2. Add 2-3 trusted team members as signers
3. Set threshold to 2-of-3 (or 3-of-5 for more security)
4. Transfer the program's upgrade authority to the multisig:
   ```bash
   solana program set-upgrade-authority <PROGRAM_ID> \
     --new-upgrade-authority <SQUADS_MULTISIG_ADDRESS>
   ```
5. **WARNING**: Test this on devnet first. If you set the wrong address, you lose the ability to upgrade forever.

**Time**: 1-2 hours

---

### Step 1.6: Get a Security Audit

**Why**: No serious DeFi user will deposit funds into an unaudited smart contract. This is the single most important step for business credibility.

**Options**:

| Auditor | Cost | Timeline | Reputation |
|---------|------|----------|------------|
| OtterSec | $30K-100K | 4-8 weeks | Top tier, Solana native |
| Neodyme | $20K-60K | 3-6 weeks | Excellent, Solana focused |
| Sec3 (formerly Soteria) | $15K-40K | 2-4 weeks | Good, automated + manual |
| Community audit via Code4rena | $10K-30K | 2-3 weeks | Good, crowdsourced |
| Trail of Bits | $50K-150K | 6-12 weeks | Best in class, slow |

**Recommended path for a startup**:
1. Start with Sec3's automated tool (free tier available): https://pro.sec3.dev
2. Fix everything it finds
3. Then engage OtterSec or Neodyme for a manual audit
4. Budget $20K-40K minimum

**Time**: 2-8 weeks (external dependency)

---

## PHASE 2: DATABASE MIGRATION (Week 2)

### Step 2.1: Set Up PostgreSQL

**Why**: The current `data/orders.json` file is a ticking time bomb:
- No concurrent access safety (if two requests write simultaneously, data corrupts)
- No backup mechanism
- Cannot scale beyond one server
- No query capability (filtering 10,000 orders means loading all of them into memory)
- No transaction history or audit trail

**How**:

1. **Choose a provider**:
   | Provider | Cost | Best For |
   |----------|------|----------|
   | Supabase | Free tier (500MB) | Quick start, nice dashboard |
   | Railway | $5/month | Simple, good DX |
   | Neon | Free tier (512MB) | Serverless, scales to zero |
   | AWS RDS | ~$15/month | Production grade |

2. **Install Prisma**:
   ```bash
   npm install prisma @prisma/client --save
   npx prisma init
   ```

3. **Create the schema** in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }

   model Order {
     id              String   @id @default(cuid())
     escrowAddress   String   @unique
     uniqueId        String   @default("")
     maker           String
     inputMint       String
     outputMint      String
     inputSymbol     String   @default("")
     outputSymbol    String   @default("")
     makingAmount    String
     takingAmount    String
     expiredAt       BigInt   @default(0)
     createdAt       DateTime @default(now())
     status          String   @default("open")
     fillTxSignature String?
     lastChecked     DateTime?
     failCount       Int      @default(0)

     @@index([maker])
     @@index([status])
     @@index([createdAt])
   }

   model Transaction {
     id            String   @id @default(cuid())
     orderId       String
     type          String   // "fill", "expire", "cancel"
     signature     String   @unique
     status        String   // "pending", "confirmed", "failed"
     createdAt     DateTime @default(now())
     confirmedAt   DateTime?

     @@index([orderId])
   }

   model Metric {
     id        String   @id @default(cuid())
     key       String
     value     Float
     timestamp DateTime @default(now())

     @@index([key, timestamp])
   }
   ```

4. **Run migration**:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Rewrite `server/order-store.ts`** to use Prisma instead of JSON file:
   - Replace `loadOrders()` with `prisma.order.findMany()`
   - Replace `saveOrders()` with individual `prisma.order.update()`
   - Replace `getOpenOrders()` with `prisma.order.findMany({ where: { status: "open" } })`
   - Replace `addOrder()` with `prisma.order.create()`
   - This eliminates the "load everything, modify, save everything" pattern

6. **Migrate existing data**:
   ```bash
   # Write a one-time script to read orders.json and insert into PostgreSQL
   node scripts/migrate-json-to-postgres.js
   ```

**Time**: 1-2 days

---

### Step 2.2: Set Up Redis (Optional but Recommended)

**Why**: Redis enables:
- Job queues for failed fill retries (instead of the current simple failCount)
- Rate limiting that works across multiple server instances
- Real-time WebSocket pub/sub for order updates
- Session storage if you add user accounts later

**How**:
1. Add to your docker-compose (already done) or use a managed service:
   - **Upstash**: Free tier, serverless Redis
   - **Railway**: $5/month addon
   - **Redis Cloud**: Free 30MB tier

2. Install BullMQ for job queues:
   ```bash
   npm install bullmq
   ```

3. Create a fill retry queue in `server/queues/fillQueue.ts`:
   ```typescript
   import { Queue, Worker } from "bullmq";

   const fillQueue = new Queue("fill-retries", {
     connection: { url: process.env.REDIS_URL }
   });

   // When a fill fails, add to retry queue with exponential backoff
   export async function scheduleFillRetry(escrowAddress: string, attempt: number) {
     await fillQueue.add("retry-fill", { escrowAddress }, {
       delay: Math.min(attempt * 30000, 300000), // 30s, 60s, 90s... max 5min
       attempts: 5,
     });
   }
   ```

**Time**: 4-6 hours

---

## PHASE 3: DEPLOYMENT (Week 2-3)

### Step 3.1: Choose Your Hosting

**Recommendation for a Solana startup**:

| Component | Provider | Cost/month | Why |
|-----------|----------|------------|-----|
| Server (backend) | Railway or Render | $7-20 | Easy Docker deploy, auto-scaling |
| Frontend | Vercel | Free | Built for Next.js, global CDN |
| Database | Supabase or Neon | Free-$25 | Managed Postgres, backups included |
| Redis | Upstash | Free-$10 | Serverless, pay-per-request |
| Domain | Namecheap/Cloudflare | $10/year | `.xyz` domains are cheap |
| SSL | Cloudflare (free) | $0 | Auto HTTPS |
| Monitoring | BetterStack | Free tier | Uptime + status page |

**Total estimated cost**: $20-60/month to start

---

### Step 3.2: Set Up the Domain

**How**:
1. Buy a domain (e.g., `klira.xyz` or `klira.finance`)
2. Set up Cloudflare as your DNS provider (free plan)
3. Point DNS records:
   - `app.klira.xyz` → Vercel (frontend)
   - `api.klira.xyz` → Railway/Render (backend)
4. Enable "Full (Strict)" SSL mode in Cloudflare
5. Update your CORS config in `.env`:
   ```
   ALLOWED_ORIGINS=https://app.klira.xyz
   ```

**Time**: 1-2 hours

---

### Step 3.3: Deploy the Backend

**Option A: Railway (Recommended for ease)**
1. Push your code to GitHub
2. Connect Railway to your GitHub repo
3. Railway auto-detects the Dockerfile and builds
4. Set environment variables in Railway dashboard (copy from `.env.example`)
5. Railway gives you a URL like `klira-server-production.up.railway.app`
6. Add a custom domain: `api.klira.xyz`

**Option B: VPS (More control, cheaper)**
1. Get a VPS (Hetzner $5/month, DigitalOcean $6/month)
2. SSH in and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Clone your repo, copy `.env`:
   ```bash
   git clone https://github.com/your-org/klira.git
   cd klira
   cp .env.example .env
   # Edit .env with production values
   ```
4. Start with docker-compose:
   ```bash
   docker compose up -d
   ```
5. Set up Caddy as a reverse proxy for auto-HTTPS:
   ```bash
   apt install caddy
   # Edit /etc/caddy/Caddyfile:
   # api.klira.xyz {
   #   reverse_proxy localhost:4000
   # }
   caddy reload
   ```

**Time**: 2-4 hours

---

### Step 3.4: Deploy the Frontend

1. Push your frontend code to GitHub
2. Go to https://vercel.com and import the repository
3. Set the root directory to `frontend`
4. Add environment variables:
   ```
   NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_NEW_KEY
   NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
   NEXT_PUBLIC_API_URL=https://api.klira.xyz
   NEXT_PUBLIC_APP_VERSION=v1.0.0
   ```
5. Deploy. Vercel will give you a URL
6. Add your custom domain: `app.klira.xyz`

**Time**: 30 minutes

---

### Step 3.5: Complete the CI/CD Pipeline

**Why**: The current `deploy.yml` has placeholder `echo` commands. You need real deployment.

**How**: Update `.github/workflows/deploy.yml` to:
1. Build and push Docker image to GitHub Container Registry (GHCR)
2. SSH into your server and pull the new image, or trigger Railway/Render redeploy

For Railway, add this to deploy.yml:
```yaml
- name: Deploy to Railway
  run: |
    curl -X POST "${{ secrets.RAILWAY_DEPLOY_WEBHOOK }}"
```

For Vercel, frontend deploys automatically on push to main.

**Time**: 1-2 hours

---

### Step 3.6: Set Up Monitoring

**Why**: You need to know immediately if your server goes down, the keeper stops filling orders, or the payer wallet runs out of SOL.

1. **Uptime Monitoring** (BetterStack — free tier):
   - Monitor `https://api.klira.xyz/v1/health` every 60 seconds
   - Get alerts via Slack/email/SMS when it goes down
   - Create a public status page at `status.klira.xyz`

2. **Error Tracking** (Sentry — free tier):
   ```bash
   npm install @sentry/node
   ```
   Add to `server/app.ts`:
   ```typescript
   import * as Sentry from "@sentry/node";
   Sentry.init({ dsn: process.env.SENTRY_DSN });
   ```
   Add to frontend:
   ```bash
   cd frontend && pnpm add @sentry/nextjs
   ```

3. **Payer Wallet Balance Alert**:
   Add a check in your keeper loop:
   ```typescript
   const balance = await rpc.getBalance(payer.publicKey);
   if (balance < 0.5 * LAMPORTS_PER_SOL) {
     await sendTelegramAlert("WARNING: Payer wallet balance low: " + balance / LAMPORTS_PER_SOL + " SOL");
   }
   ```

4. **Log Shipping** (optional):
   - Use Datadog, Loki, or BetterStack Logs to ship Winston logs
   - This lets you search logs from a dashboard instead of SSHing into the server

**Time**: 2-3 hours

---

## PHASE 4: LEGAL & COMPLIANCE (Week 3)

### Step 4.1: Terms of Service

**Why**: Without a ToS, you have no legal protection if a user loses funds due to a bug, market conditions, or their own mistake. This is non-negotiable for a DeFi product.

**What to include**:
- Users are responsible for their own trades
- No guarantee of order execution
- Protocol fees are non-refundable
- The protocol is provided "as-is" without warranty
- Limitation of liability
- Governing jurisdiction
- Users must comply with local laws (including not being in sanctioned countries)

**How**:
- **Budget option**: Use a template from https://www.termsfeed.com ($50-100) and customize
- **Recommended option**: Hire a crypto-native lawyer for $2K-5K to draft custom ToS
  - Anderson Kill, Debevoise, or Fenwick & West for US
  - Paradigm's legal team has published open-source templates

**Time**: 1 day (template) or 1-2 weeks (custom legal)

---

### Step 4.2: Privacy Policy

**Why**: If you collect any data (wallet addresses, IP addresses, order history), you need a privacy policy. GDPR applies even if you're not in the EU.

**What to include**:
- What data you collect (wallet addresses, order data, IP addresses via server logs)
- How you use it (order processing, analytics)
- How long you retain it
- Users' rights (deletion, export)
- No KYC statement (if applicable)

**Time**: 1 day

---

### Step 4.3: Risk Disclaimers

**Why**: DeFi is inherently risky. You need visible disclaimers on your frontend.

**What to add to the frontend**:
- A banner on the trade page: "This protocol is unaudited. Use at your own risk."
  (Remove this after getting audited, replace with "Audited by [firm]")
- A disclaimer modal on first visit that users must accept
- A link to ToS and Privacy Policy in the footer

**Time**: 2-3 hours to implement

---

### Step 4.4: OFAC Compliance (If Serving US Users)

**Why**: US law prohibits providing financial services to sanctioned countries/individuals. Major DeFi protocols (Uniswap, Aave) block OFAC-listed wallet addresses.

**Options**:
- **Minimum**: Block IP addresses from sanctioned countries (Cuba, Iran, North Korea, Syria, Russia)
  - Use Cloudflare's country-based firewall rules (free)
- **Better**: Integrate a wallet screening API like Chainalysis or TRM Labs
  - These check if a wallet address has interacted with sanctioned entities
  - Cost: $500-2000/month

**Time**: 1-2 hours (IP blocking) or 1-2 days (wallet screening)

---

## PHASE 5: ANALYTICS & BUSINESS METRICS (Week 3-4)

### Step 5.1: User Analytics

**Why**: You need to know how many people are using your product, where they drop off, and what features they use.

**Recommended**: PostHog (free tier — 1M events/month)

1. Sign up at https://posthog.com
2. Install in frontend:
   ```bash
   cd frontend && pnpm add posthog-js
   ```
3. Initialize in your app layout:
   ```typescript
   import posthog from "posthog-js";
   posthog.init("YOUR_POSTHOG_KEY", { api_host: "https://app.posthog.com" });
   ```
4. Track key events:
   - Wallet connected
   - Order created (with pair and amount)
   - Order cancelled
   - Page views (automatic)

**Time**: 1-2 hours

---

### Step 5.2: Business Dashboard

**Why**: You need real-time visibility into your protocol's health and revenue.

**Key metrics to track**:

| Metric | How to Calculate | Where |
|--------|-----------------|-------|
| Daily Active Wallets | Unique `maker` addresses per day | PostgreSQL query |
| Daily Order Volume (USD) | Sum of order values (need price feed) | PostgreSQL + Jupiter price API |
| Revenue (fees collected) | Sum of fee transfers to fee account | On-chain query to fee account |
| Fill Success Rate | Successful fills / total fill attempts | Server metrics endpoint |
| Average Fill Time | Time from order creation to fill | PostgreSQL query |
| Keeper Uptime | Health check success rate | BetterStack |
| Payer Wallet Balance | Current SOL balance | On-chain query |

**How**: Create a `/v1/admin/metrics` endpoint (authenticated) that returns these. Or use Grafana + PostgreSQL datasource for dashboards.

**Time**: 1-2 days

---

### Step 5.3: Revenue Tracking

**Why**: You need to prove revenue for investors or buyers.

**How**:
1. Your fee account is `feeSsye1xpD4zaxVh19n92abi3ZyWngAD47Z3ygPGPA`
2. You can query all incoming transfers to this account on-chain
3. Build a simple script that tallies fee revenue:
   ```bash
   solana transaction-history feeSsye1xpD4zaxVh19n92abi3ZyWngAD47Z3ygPGPA --limit 100
   ```
4. Or use Helius's enhanced transaction history API for richer data
5. Display cumulative revenue on your admin dashboard

**Time**: 2-4 hours

---

## PHASE 6: COMMUNITY & MARKETING (Week 4-5)

### Step 6.1: Landing Page

**Why**: Your current frontend goes straight to the trading app. You need a landing page that explains what Klira is and why it's special.

**Key messaging**:
- **Headline**: "Rent-Free Limit Orders on Solana"
- **Sub-headline**: "The first limit order protocol using ZK compression. No rent. No wasted SOL. Just trade."
- **Key differentiators**:
  1. Zero rent (vs Jupiter DCA which requires rent deposits)
  2. ZK compressed accounts (cheaper than regular Solana accounts)
  3. Self-custody (funds stay in your compressed escrow)
  4. Automated keeper fills when price conditions are met

**How**: Create a `/` landing page in your Next.js app, move the current app to `/app/trade`.

**Time**: 1-2 days

---

### Step 6.2: Social Presence

1. **Twitter/X**: Create `@klira_protocol`
   - Post: "Introducing Klira: rent-free limit orders on Solana, powered by ZK compression"
   - Thread explaining how ZK compression saves users money
   - Pin a link to your app

2. **Discord**: Create a server with channels:
   - `#announcements` (admin only)
   - `#general` (community chat)
   - `#support` (help requests)
   - `#feature-requests`
   - `#bug-reports`

3. **GitHub**: Make the repo public (after removing all secrets from git history)
   - Use `git filter-repo` or BFG Repo Cleaner to purge the Helius key from history:
     ```bash
     # Install BFG
     brew install bfg

     # Remove the API key from all history
     bfg --replace-text <(echo "c991f045-ba1f-4d71-b872-0ef87e7f039d==>REDACTED")
     git reflog expire --expire=now --all
     git gc --prune=now --aggressive
     git push --force
     ```

**Time**: 1 day

---

### Step 6.3: Documentation

**Why**: Developers and power users need documentation. It also signals professionalism.

**Recommended**: Docusaurus (free, self-hosted) or GitBook (free for OSS)

**Sections to write**:
1. **How Klira Works** — explain ZK compression, compressed accounts, the keeper
2. **User Guide** — how to place a limit order, how to cancel, how fills work
3. **API Reference** — document your REST endpoints for programmatic traders
4. **Fee Structure** — explain the 0.1% fee
5. **Security** — link to audit report (when available), explain the multisig setup
6. **FAQ** — common questions about order execution, timing, etc.

**Time**: 2-3 days

---

### Step 6.4: Apply for Grants

**Why**: Free money + ecosystem visibility.

| Grant Program | Amount | Link |
|---------------|--------|------|
| Solana Foundation Grants | $5K-50K | https://solana.org/grants |
| Superteam | $1K-10K | https://superteam.fun |
| Light Protocol Ecosystem | Varies | Reach out directly (you're building on their stack) |
| Helius DEFI Grants | Varies | https://www.helius.dev |

**How**:
1. Write a 1-2 page proposal explaining Klira's innovation (ZK compression for limit orders)
2. Include metrics (users, volume, technical milestones)
3. Explain what the grant will fund (audit, infrastructure, marketing)
4. Apply to all of them simultaneously

**Time**: 1-2 days to write proposals

---

## PHASE 7: LAUNCH SEQUENCE (Week 5-6)

### Step 7.1: Soft Launch (Private Beta)

**Why**: Find bugs with real users before going public. Limit blast radius.

1. Deploy everything to mainnet
2. Invite 10-20 trusted users (friends, other devs, DeFi power users)
3. Give them a private link or invite code (your Telegram bot already has this)
4. Ask them to:
   - Place small limit orders ($10-50)
   - Try to cancel orders
   - Report any issues
5. Monitor Telegram alerts and server logs closely
6. Fix any issues that come up
7. Run for 1-2 weeks minimum

**Time**: 1-2 weeks

---

### Step 7.2: Public Launch

**Checklist before going public**:

- [ ] Smart contract audit completed (or at minimum, Sec3 automated scan clean)
- [ ] Multisig set up for program upgrades
- [ ] Protocol config account deployed (configurable fees, pause mechanism)
- [ ] PostgreSQL database running with backups enabled
- [ ] Frontend deployed on Vercel with custom domain
- [ ] Backend deployed with auto-restart and health monitoring
- [ ] Keeper running and processing orders successfully for 2+ weeks
- [ ] Payer wallet funded with 10+ SOL
- [ ] Terms of Service and Privacy Policy published
- [ ] Risk disclaimer visible on frontend
- [ ] Status page live (status.klira.xyz)
- [ ] Error tracking (Sentry) active
- [ ] Analytics (PostHog) active
- [ ] Telegram alerts working for fills/expires/errors
- [ ] Payer wallet low-balance alerts configured
- [ ] Social accounts created and first posts published
- [ ] Documentation live
- [ ] At least 20 successful test fills on mainnet

**Launch announcement**:
1. Post on Twitter with a thread explaining the product
2. Post in Solana Discord (`#showcase` channel)
3. Post on r/solana and r/defi
4. Reach out to Solana-focused media (The Block, Blockworks)
5. DM Solana influencers for amplification

---

## PHASE 8: GROWTH & REVENUE (Ongoing)

### Revenue Streams

1. **Protocol Fee (now)**: 0.1% per fill — this is live and working
2. **Premium API Access (month 2)**: Charge for programmatic trading API
3. **Priority Fills (month 3)**: Higher keeper frequency for premium users
4. **Advanced Order Types (month 4+)**: OCO, trailing stop, TWAP
5. **Referral Program (month 2+)**: Fee sharing with referrers

### Key Milestones

| Milestone | Target | Timeline |
|-----------|--------|----------|
| First 100 users | 100 unique wallets | Month 1-2 |
| First $100K volume | Cumulative order volume | Month 2-3 |
| First $1K revenue | Fee account balance | Month 3-4 |
| Audit complete | Published report | Month 2-3 |
| 1,000 monthly active users | PostHog | Month 4-6 |
| $1M monthly volume | On-chain data | Month 6-12 |

---

## QUICK REFERENCE: What's Already Done

| Item | Status |
|------|--------|
| Rate limiting (100 req/min public, 1000 internal) | DONE |
| API key auth on /fill and /expired | DONE |
| Input validation with Zod | DONE |
| Helmet.js security headers | DONE |
| CORS configuration | DONE |
| Winston structured logging | DONE |
| Telegram bot alerts | DONE |
| Graceful shutdown handlers | DONE |
| React Error Boundaries | DONE |
| Loading skeletons | DONE |
| Transaction confirmation toasts | DONE |
| Cancel confirmation dialog | DONE |
| String-based decimal arithmetic (no float precision bugs) | DONE |
| Atomic file writes for order store | DONE |
| Dockerfile + docker-compose | DONE |
| PM2 config with memory limits | DONE |
| CI/CD workflows (build + test) | DONE |
| Frontend tests (202 passing) | DONE |
| Server tests (35 passing) | DONE |
| Next.js upgraded (critical vuln fixed) | DONE |
| mocha upgraded (4 vulns fixed) | DONE |
| Hardcoded API keys removed from test files | DONE |
| .gitignore covering all env variants | DONE |
| .env.example fully documented | DONE |
| Docker-compose with env var creds + bound ports | DONE |

---

## COST ESTIMATE: Minimum Viable Launch

| Item | One-time | Monthly |
|------|----------|---------|
| Hosting (Railway) | $0 | $20 |
| Frontend (Vercel) | $0 | $0 |
| Database (Supabase) | $0 | $0-25 |
| Domain | $10 | $0 |
| Helius RPC (Pro) | $0 | $49 |
| Security audit (Sec3) | $15,000 | $0 |
| Legal (ToS template) | $100 | $0 |
| Monitoring (BetterStack) | $0 | $0 |
| Analytics (PostHog) | $0 | $0 |
| **Total** | **~$15,110** | **~$70-95** |

---

*Last updated: February 18, 2026*
*Generated from comprehensive code audit of the Klira project.*
