-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'filled', 'expired', 'cancelled', 'settled');

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "escrow_address" TEXT NOT NULL,
    "unique_id" TEXT NOT NULL DEFAULT '',
    "maker" TEXT NOT NULL,
    "input_mint" TEXT NOT NULL,
    "output_mint" TEXT NOT NULL,
    "input_symbol" TEXT NOT NULL DEFAULT '',
    "output_symbol" TEXT NOT NULL DEFAULT '',
    "making_amount" TEXT NOT NULL,
    "taking_amount" TEXT NOT NULL,
    "expired_at" BIGINT NOT NULL DEFAULT 0,
    "created_at" BIGINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'open',
    "fill_tx_signature" TEXT,
    "last_checked" BIGINT,
    "fail_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fills" (
    "id" SERIAL NOT NULL,
    "escrow_address" TEXT NOT NULL,
    "tx_signature" TEXT NOT NULL,
    "fill_type" TEXT NOT NULL,
    "swap_amount" BIGINT NOT NULL,
    "out_amount" BIGINT NOT NULL,
    "filled_at" BIGINT NOT NULL,

    CONSTRAINT "fills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "tx_signature" TEXT NOT NULL,
    "tx_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "created_at" BIGINT NOT NULL,
    "confirmed_at" BIGINT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" BIGINT NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_escrow_address_key" ON "orders"("escrow_address");

-- CreateIndex
CREATE INDEX "orders_maker_idx" ON "orders"("maker");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_maker_status_idx" ON "orders"("maker", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fills_tx_signature_key" ON "fills"("tx_signature");

-- CreateIndex
CREATE INDEX "fills_escrow_address_idx" ON "fills"("escrow_address");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_signature_key" ON "transactions"("tx_signature");

-- CreateIndex
CREATE INDEX "transactions_tx_type_idx" ON "transactions"("tx_type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "metrics_name_timestamp_idx" ON "metrics"("name", "timestamp");
