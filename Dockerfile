# ── Build stage ───────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json klira.ts klira.json tokens.json ./
COPY server/ ./server/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

RUN npx tsc

# ── Production stage ─────────────────────────────────────
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY klira.json tokens.json ./

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

USER node

RUN mkdir -p data logs

CMD ["node", "dist/server/app.js"]

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/v1/health || exit 1
