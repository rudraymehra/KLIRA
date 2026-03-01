#!/bin/bash
set -e

echo "=========================================="
echo "  Klira — Development Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── 1. Check prerequisites ──────────────────────────
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js is required. Install from https://nodejs.org/"
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 20 ] || fail "Node.js 20+ required (you have $(node -v))"
check "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || fail "npm is required"
check "npm $(npm -v)"

# ── 2. Install dependencies ─────────────────────────
echo ""
echo "Installing dependencies..."
npm install
check "Root dependencies installed"

cd frontend
npm install
cd ..
check "Frontend dependencies installed"

# ── 3. Set up environment files ──────────────────────
echo ""
echo "Setting up environment files..."

if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example — YOU MUST edit it (see below)"
else
  check ".env already exists"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  warn "frontend/.env.local created — YOU MUST edit it (see below)"
else
  check "frontend/.env.local already exists"
fi

# ── 4. Generate payer wallet (if needed) ─────────────
echo ""
if [ ! -f payer.json ]; then
  if command -v solana-keygen >/dev/null 2>&1; then
    echo "Generating devnet payer wallet..."
    solana-keygen new --outfile payer.json --no-bip39-passphrase --force
    PUBKEY=$(solana-keygen pubkey payer.json)
    check "Payer wallet generated: $PUBKEY"
    echo ""
    warn "Fund this wallet with devnet SOL:"
    echo "   Visit https://faucet.solana.com and paste: $PUBKEY"
    echo "   Or run: solana airdrop 2 $PUBKEY --url devnet"
    echo ""
    echo "Then paste the contents of payer.json into the KEY field in .env:"
    echo "   KEY=$(cat payer.json)"
  else
    warn "solana-keygen not found — you need to create payer.json manually"
    echo "   Install Solana CLI: sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""
    echo "   Then run: solana-keygen new --outfile payer.json"
  fi
else
  check "payer.json already exists"
fi

# ── 5. Database setup ────────────────────────────────
echo ""
echo "Setting up database..."

if command -v docker >/dev/null 2>&1; then
  echo "Docker found. Starting PostgreSQL..."
  docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres 2>/dev/null || true
  sleep 3
  check "PostgreSQL container started"
elif command -v psql >/dev/null 2>&1; then
  check "PostgreSQL CLI found (assuming local install is running)"
else
  warn "No Docker or PostgreSQL found. You need one of:"
  echo "   Option A: Install Docker and run 'docker compose up -d postgres'"
  echo "   Option B: Install PostgreSQL locally (brew install postgresql@14)"
fi

# Run Prisma migration
if grep -q "DATABASE_URL" .env 2>/dev/null; then
  echo "Running database migration..."
  npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init 2>/dev/null || true
  npx prisma generate
  check "Prisma client generated"
else
  warn "DATABASE_URL not set in .env — skipping migration (will use JSON file store)"
fi

# ── 6. Build check ───────────────────────────────────
echo ""
echo "Running build checks..."
npx tsc --noEmit && check "Server TypeScript compiles" || fail "Server TypeScript has errors"

cd frontend
npm run build >/dev/null 2>&1 && check "Frontend builds successfully" || warn "Frontend build failed (check env vars)"
cd ..

# ── Done ─────────────────────────────────────────────
echo ""
echo "=========================================="
echo -e "${GREEN}  Setup complete!${NC}"
echo "=========================================="
echo ""
echo "Before you start, make sure you've edited:"
echo "  1. .env           — Add your RPC_URL, KEY, KEEPER_API_KEY"
echo "  2. frontend/.env.local — Add your NEXT_PUBLIC_SOLANA_RPC_URL"
echo ""
echo "To start the server:"
echo "  npx ts-node server/app.ts"
echo ""
echo "To start the frontend (separate terminal):"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
