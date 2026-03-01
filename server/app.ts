// Klira Server - Main Application Entry Point
import * as dotenv from "dotenv";
dotenv.config();

import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Klira } from "../klira";
import IDL from "../klira.json";
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";

import express, { Router } from "express";
import helmet from "helmet";
import { bn, createRpc } from "@lightprotocol/stateless.js";
import { parseEscrowFromBuffer } from "./lib/escrow";
import { acquireOrderLock, releaseOrderLock } from "./lib/order-lock";
import {
  determineFillType,
  ensureDexLabelsLoaded,
  get_best_slippage,
  get_price,
  get_swap_instruction,
} from "./jup";
import { create_token_ata } from "./instructions/create_ata";
import { fill, fill_wsol } from "./instructions/fill";
import { expire, expire_wsol } from "./instructions/expire";
import {
  calculate_target_ratio,
  errorHandler,
  logger,
  metrics,
  ratioMet,
  requestLogger,
  retryOperation,
  safeToNumber,
} from "./utils";
import { bot, stopAlerts } from "./alert";
import {
  addOrder,
  getAllOrders,
  getOrderCount,
  getOrdersByWallet,
  updateOrderStatus,
  type TrackedOrder,
} from "./order-store";
import { startKeeper, stopKeeper } from "./keeper";
import { publicLimiter, internalLimiter } from "./middleware/rateLimit";
import { requireApiKey } from "./middleware/auth";
import {
  createOrderSchema,
  orderQuerySchema,
  fillExpireBodySchema,
  validateBody,
  validateQuery,
} from "./middleware/validate";

if (bot) {
  bot.use((ctx, next) => {
    logger.debug("Telegram message received", { message: ctx.message });
    return next();
  });
}

if (!process.env.KEY) {
  logger.error("Missing required environment variable: KEY");
  process.exit(1);
}

if (!process.env.RPC_URL) {
  logger.error("Missing required environment variable: RPC_URL");
  process.exit(1);
}

if (!process.env.KEEPER_API_KEY) {
  logger.warn("KEEPER_API_KEY not set — fill/expire endpoints will reject all requests");
}

const url = process.env.RPC_URL;

export const connection = new Connection(url);

export const rpc = createRpc(url, url, url);

export let payer: Keypair;
try {
  const secret = JSON.parse(process.env.KEY!);
  payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  logger.info("Payer initialized", { publicKey: payer.publicKey.toString() });
} catch (error) {
  logger.error("Failed to initialize payer keypair", {
    error: (error as Error).message,
  });
  process.exit(1);
}

const provider = new AnchorProvider(connection, new Wallet(payer), {});
export const program = new Program<Klira>(IDL as Klira, provider);

export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

const app = express();
app.set('trust proxy', 1);

// ── Security headers ────────────────────────────────────
app.use(helmet());

// ── Request body size limits ────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── CORS - allow configured frontend origins ────────────
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || "http://localhost:3000"
  ).split(",");
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(requestLogger);

// ── Health check (unversioned, for load balancers) ──────
app.get("/", (req, res) => {
  res.send("Klira Trading Server");
});

// ── API v1 Router ───────────────────────────────────────
const v1 = Router();

// ── Order Registration ──────────────────────────────────
v1.post(
  "/orders",
  publicLimiter,
  validateBody(createOrderSchema),
  async (req, res) => {
    try {
      const {
        escrowAddress,
        uniqueId,
        maker,
        inputMint,
        outputMint,
        inputSymbol,
        outputSymbol,
        makingAmount,
        takingAmount,
        expiredAt,
      } = req.body;

      const order: TrackedOrder = {
        escrowAddress,
        uniqueId: uniqueId || "",
        maker,
        inputMint,
        outputMint,
        inputSymbol: inputSymbol || "",
        outputSymbol: outputSymbol || "",
        makingAmount,
        takingAmount,
        expiredAt: expiredAt || 0,
        createdAt: Date.now(),
        status: "open",
      };

      await addOrder(order);
      res.status(201).json({ success: true, escrowAddress });
    } catch (error) {
      logger.error("Failed to register order", {
        error: (error as Error).message,
      });
      res.status(500).json({ error: "Failed to register order" });
    }
  }
);

v1.get(
  "/orders",
  publicLimiter,
  validateQuery(orderQuerySchema),
  async (req, res) => {
    try {
      const query = res.locals.validatedQuery || req.query;
      const { wallet } = query;
      const limit = Math.min(Math.max(parseInt(query.limit as string) || 100, 1), 1000);
      const offset = Math.max(parseInt(query.offset as string) || 0, 0);

      if (wallet) {
        const orders = await getOrdersByWallet(wallet as string);
        res.json({ orders: orders.slice(offset, offset + limit), total: orders.length, limit, offset });
      } else {
        const [orders, total] = await Promise.all([
          getAllOrders(limit, offset),
          getOrderCount(),
        ]);
        res.json({ orders, total, limit, offset });
      }
    } catch (error) {
      logger.error("Failed to fetch orders", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch orders", detail: (error as Error).message });
    }
  }
);

v1.get("/health", publicLimiter, async (req, res) => {
  try {
    await Promise.race([
      connection.getSlot(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000)
      ),
    ]);

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    res.json(health);
  } catch (error) {
    logger.error("Health check failed", { error: (error as Error).message });
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    });
  }
});

v1.get("/metrics", requireApiKey, (req, res) => {
  res.json({
    ...metrics,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Fill endpoint (POST, authenticated) ─────────────────
v1.post(
  "/fill",
  internalLimiter,
  requireApiKey,
  validateBody(fillExpireBodySchema),
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const { requestId, startTime } = res.locals;
    const { order } = req.body;
    const escrowAddress = order as string;

    if (!acquireOrderLock(escrowAddress)) {
      res.status(409).json({ error: "Order is currently being processed" });
      return;
    }

    try {
      logger.info("Fill request started", { requestId, order });

      let address: PublicKey;
      try {
        address = new PublicKey(escrowAddress);
      } catch (e) {
        throw new Error("Invalid order address - not a valid PublicKey");
      }

      const compressed_account = await retryOperation(
        () => rpc.getCompressedAccount(bn(address.toBytes())),
        3,
        1000,
        "getCompressedAccount"
      );

      if (!compressed_account?.data?.data) {
        throw new Error("Compressed account not found or has no data");
      }

      const buffer = compressed_account?.data?.data!;
      let escrow_data = parseEscrowFromBuffer(buffer);

      const expiredAt = escrow_data.expiredAt.toNumber() * 1000;

      const inputMint = escrow_data.tokens.inputMint;
      const outputMint = escrow_data.tokens.outputMint;

      logger.info("Escrow data parsed", {
        requestId,
        maker: escrow_data.maker.toString(),
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        makingAmount: escrow_data.amount.makingAmount.toString(),
        takingAmount: escrow_data.amount.takingAmount.toString(),
        expiredAt: new Date(expiredAt).toISOString(),
      });

      if (expiredAt !== 0 && expiredAt <= Date.now()) {
        throw new Error("Order has expired");
      }

      let ata_created = escrow_data.tokens.outputMint.equals(SOL_MINT)
        ? false
        : await create_token_ata(compressed_account, escrow_data, requestId);

      if (ata_created) {
        const updated_compressed_account = await retryOperation(
          () => rpc.getCompressedAccount(bn(address.toBytes())),
          3,
          1000,
          "getCompressedAccount"
        );

        if (!updated_compressed_account?.data?.data) {
          throw new Error(
            "Failed to refetch compressed account after ATA creation"
          );
        }

        escrow_data = parseEscrowFromBuffer(
          updated_compressed_account.data.data
        );

        logger.info("Escrow data updated after ATA creation", {
          requestId,
          updatedMakingAmount: escrow_data.amount.makingAmount.toString(),
        });
      }

      const { current_ratio } = await get_price(
        inputMint.toString(),
        outputMint.toString()
      );

      const target_ratio = await calculate_target_ratio(
        safeToNumber(escrow_data.amount.makingAmount, "makingAmount"),
        safeToNumber(escrow_data.amount.takingAmount, "takingAmount"),
        inputMint.toString(),
        outputMint.toString()
      );

      if (!ratioMet(target_ratio, current_ratio)) {
        logger.info("Price conditions not met", {
          targetRatio: target_ratio,
          currentRatio: current_ratio,
          order: address.toString(),
        });
        throw new Error("Price conditions not met for this order");
      }

      const fill_data = await determineFillType(
        escrow_data,
        inputMint,
        outputMint
      );

      const swapAmount = safeToNumber(
        escrow_data.amount.makingAmount.div(new BN(fill_data.divisor)),
        "swapAmount"
      );

      const { best_slippage, excludedDexLabels } = await get_best_slippage(
        escrow_data,
        swapAmount
      );

      const slippage = (best_slippage ?? 50) + 5;

      let swapResult = await get_swap_instruction(
        inputMint.toString(),
        outputMint.toString(),
        swapAmount,
        "ExactIn",
        10,
        false,
        slippage,
        excludedDexLabels
      );

      if (!swapResult?.instruction_data) {
        throw new Error("Swap Quote not found to fill the order");
      }

      logger.info(`Initial swap - alt length: ${swapResult.alt.length}`);

      if (swapResult.alt.length > 2) {
        logger.info("Trying with direct routes");

        const directRouteResult = await get_swap_instruction(
          inputMint.toString(),
          outputMint.toString(),
          swapAmount,
          "ExactIn",
          10,
          true,
          slippage,
          excludedDexLabels
        );

        if (
          directRouteResult?.instruction_data &&
          directRouteResult.alt.length <= swapResult.alt.length
        ) {
          swapResult = directRouteResult;
          logger.info(
            `Direct route swap - alt length: ${swapResult.alt.length}`
          );
        } else {
          logger.info(
            "Direct route didn't improve ALT count, using original route"
          );
        }
      }

      if (
        !swapResult.instruction_data ||
        !swapResult.accounts ||
        !swapResult.alt
      ) {
        throw new Error(
          "Invalid swap instruction data: missing required fields"
        );
      }

      const finalInstructionData = swapResult.instruction_data;
      const finalAccounts = swapResult.accounts;
      const finalAlt = swapResult.alt;

      let tx: VersionedTransaction;

      if (outputMint.equals(SOL_MINT)) {
        tx = await fill_wsol(
          address,
          fill_data.fill_type === "partial" ? "partial" : "full",
          finalInstructionData,
          finalAccounts,
          finalAlt
        );
      } else {
        tx = await fill(
          address,
          fill_data.fill_type === "partial" ? "partial" : "full",
          finalInstructionData,
          finalAccounts,
          finalAlt
        );
      }

      tx.sign([payer]);

      const sig = await rpc.sendTransaction(tx);

      // Confirm the transaction before updating status
      const confirmConnection = new Connection(process.env.RPC_URL!);
      try {
        const latestBlockhash = await confirmConnection.getLatestBlockhash();
        await confirmConnection.confirmTransaction({
          signature: sig,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }, "confirmed");
      } catch (confirmErr) {
        logger.error("Transaction failed to confirm", { signature: sig, error: (confirmErr as Error).message });
        throw new Error(`Transaction sent but not confirmed: ${sig}`);
      }

      const responseTime = performance.now() - startTime;

      metrics.successfulFills++;
      await updateOrderStatus(escrowAddress, "filled", sig);

      logger.info("Fill transaction successful", {
        requestId,
        sig,
        responseTime: `${responseTime.toFixed(2)}ms`,
        order: address.toString(),
        fillType: fill_data.fill_type,
      });
      return res.status(200).json({ sig });
    } catch (error) {
      metrics.failedFills++;
      next(error);
    } finally {
      releaseOrderLock(escrowAddress);
    }
  }
);

// ── Expire endpoint (POST, authenticated) ───────────────
v1.post(
  "/expired",
  internalLimiter,
  requireApiKey,
  validateBody(fillExpireBodySchema),
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const { requestId, startTime } = res.locals;
    const { order } = req.body;
    const escrowAddress = order as string;

    if (!acquireOrderLock(escrowAddress)) {
      res.status(409).json({ error: "Order is currently being processed" });
      return;
    }

    try {
      logger.info("Expire request started", { requestId, order });

      let address: PublicKey;
      try {
        address = new PublicKey(escrowAddress);
      } catch (e) {
        throw new Error("Invalid order address - not a valid PublicKey");
      }

      let compressed_account = await retryOperation(
        () => rpc.getCompressedAccount(bn(address.toBytes())),
        3,
        1000,
        "getCompressedAccount"
      );

      if (!compressed_account?.data?.data) {
        throw new Error("Compressed account not found or has no data");
      }

      const buffer = compressed_account?.data?.data!;

      const escrow_data = parseEscrowFromBuffer(buffer);

      logger.info("Escrow data for expiry", {
        requestId,
        maker: escrow_data.maker.toString(),
        expiredAt: new Date(
          escrow_data.expiredAt.toNumber() * 1000
        ).toISOString(),
        isExpired: escrow_data.expiredAt.toNumber() * 1000 <= Date.now(),
      });

      if (escrow_data.expiredAt.eq(new BN(0))) {
        throw new Error("Escrow is never to be expired");
      }

      if (escrow_data.expiredAt.toNumber() * 1000 > Date.now()) {
        const timeUntilExpiry =
          escrow_data.expiredAt.toNumber() * 1000 - Date.now();
        throw new Error(
          `Escrow not expired yet. Time remaining: ${Math.floor(
            timeUntilExpiry / 1000
          )}s`
        );
      }

      await create_token_ata(compressed_account, escrow_data, requestId);

      let tx: VersionedTransaction;

      if (escrow_data.tokens.inputMint.equals(SOL_MINT)) {
        tx = await expire_wsol(address);
      } else {
        tx = await expire(address);
      }

      tx.sign([payer]);

      const signature = await rpc.sendTransaction(tx);

      // Confirm the transaction before updating status
      const confirmConnection = new Connection(process.env.RPC_URL!);
      try {
        const latestBlockhash = await confirmConnection.getLatestBlockhash();
        await confirmConnection.confirmTransaction({
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        }, "confirmed");
      } catch (confirmErr) {
        logger.error("Transaction failed to confirm", { signature, error: (confirmErr as Error).message });
        throw new Error(`Transaction sent but not confirmed: ${signature}`);
      }

      const responseTime = performance.now() - startTime;

      metrics.successfulExpires++;
      await updateOrderStatus(escrowAddress, "expired", signature);

      logger.info("Expire transaction successful", {
        requestId,
        signature,
        responseTime: `${responseTime.toFixed(2)}ms`,
        order: address.toString(),
      });

      return res.status(200).json({ signature });
    } catch (error) {
      metrics.failedExpires++;
      next(error);
    } finally {
      releaseOrderLock(escrowAddress);
    }
  }
);

// ── Mount versioned API ─────────────────────────────────
app.use("/v1", v1);

app.use(errorHandler);

// ── Startup health checks ───────────────────────────────
async function verifyDependencies(): Promise<void> {
  logger.info("Running startup health checks...");

  // Check RPC connection
  try {
    const slot = await Promise.race([
      connection.getSlot(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 15000)
      ),
    ]);
    logger.info("RPC connection OK", { slot });
  } catch (error) {
    logger.error("RPC connection FAILED — server cannot start", {
      error: (error as Error).message,
    });
    throw new Error("RPC connection failed at startup");
  }

  // Check payer balance
  try {
    const balance = await connection.getBalance(payer.publicKey);
    const solBalance = balance / 1e9;
    if (solBalance < 0.01) {
      logger.warn("Payer balance critically low", { solBalance });
    } else {
      logger.info("Payer balance OK", { solBalance });
    }
  } catch (error) {
    logger.warn("Could not check payer balance", {
      error: (error as Error).message,
    });
  }

  // Check Jupiter API and ensure DEX labels are loaded
  try {
    await ensureDexLabelsLoaded();
    logger.info("Jupiter API connection OK — DEX labels loaded");
  } catch (error) {
    logger.warn("Jupiter API health check failed — fills may not work", {
      error: (error as Error).message,
    });
  }
}

// ── Graceful Shutdown ───────────────────────────────────
let server: ReturnType<typeof app.listen>;
let isShuttingDown = false;

function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  server?.close(() => {
    logger.info("HTTP server closed");
  });

  // Stop the keeper loop
  stopKeeper();

  // Stop alert monitoring intervals
  stopAlerts();

  // Give in-flight requests time to complete
  setTimeout(() => {
    logger.info("Shutdown complete");
    process.exit(0);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Log unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", { reason, promise });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// ── Start server ────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;

async function start() {
  try {
    await verifyDependencies();
  } catch {
    logger.error("Startup health checks failed — exiting");
    process.exit(1);
  }

  server = app.listen(PORT, process.env.BIND_ADDRESS || "127.0.0.1", () => {
    logger.info("Klira Trading Server started", {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    });

    // Start the keeper loop after server is ready
    startKeeper();
  });

  server.on("error", (error) => {
    logger.error("Server error", { error: error.message });
  });
}

start();
