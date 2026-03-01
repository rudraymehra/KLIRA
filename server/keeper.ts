// Klira Server - Keeper Service
// Automatically monitors open orders, fills when price conditions are met,
// and expires orders past their expiration time.
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { bn } from "@lightprotocol/stateless.js";

import { payer, rpc, SOL_MINT } from "./app";
import { acquireOrderLock, releaseOrderLock } from "./lib/order-lock";
import {
  getOpenOrders,
  updateOrderStatus,
  markOrderChecked,
  type TrackedOrder,
} from "./order-store";
import { parseEscrowFromBuffer } from "./lib/escrow";
import {
  determineFillType,
  get_best_slippage,
  get_price,
  get_swap_instruction,
} from "./jup";
import { create_token_ata } from "./instructions/create_ata";
import { fill, fill_wsol } from "./instructions/fill";
import { expire, expire_wsol } from "./instructions/expire";
import {
  calculate_target_ratio,
  logger,
  metrics,
  ratioMet,
  retryOperation,
  safeToNumber,
} from "./utils";
import { bot } from "./alert";

// Configuration
const KEEPER_INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS) || 15_000; // 15 seconds
const MAX_CONSECUTIVE_FAILURES = 10;
const COOLDOWN_AFTER_FAILURE_MS = 60_000; // 1 minute cooldown per failed order

let keeperRunning = false;
let keeperInterval: NodeJS.Timeout | null = null;
let keeperStopped = false;

async function sendTelegramAlert(message: string) {
  try {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (chatId && bot) {
      await bot.telegram.sendMessage(Number(chatId), message);
    }
  } catch {
    // Silently fail - alerts are best-effort
  }
}

async function processExpiredOrder(order: TrackedOrder): Promise<boolean> {
  const address = new PublicKey(order.escrowAddress);

  logger.info("Processing expired order", {
    escrowAddress: order.escrowAddress,
    maker: order.maker,
    pair: `${order.inputSymbol}/${order.outputSymbol}`,
  });

  try {
    // Verify the account still exists on-chain
    const compressed_account = await retryOperation(
      () => rpc.getCompressedAccount(bn(address.toBytes())),
      3,
      1000,
      "getCompressedAccount"
    );

    if (!compressed_account?.data?.data) {
      // Account gone - already filled or expired by someone else
      logger.info("Order already settled on-chain", {
        escrowAddress: order.escrowAddress,
      });
      await updateOrderStatus(order.escrowAddress, "settled");
      return true;
    }

    const escrow_data = parseEscrowFromBuffer(compressed_account.data.data);

    // Create ATA if needed
    await create_token_ata(compressed_account, escrow_data, "keeper");

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

    await updateOrderStatus(order.escrowAddress, "expired", signature);
    metrics.successfulExpires++;

    logger.info("Order expired successfully", {
      escrowAddress: order.escrowAddress,
      signature,
    });

    await sendTelegramAlert(
      `Order expired: ${order.inputSymbol}/${order.outputSymbol}\n` +
        `Maker: ${order.maker.slice(0, 8)}...\n` +
        `Tx: ${signature}`
    );

    return true;
  } catch (error) {
    logger.error("Failed to expire order", {
      escrowAddress: order.escrowAddress,
      error: (error as Error).message,
    });
    metrics.failedExpires++;
    return false;
  }
}

async function processFillableOrder(order: TrackedOrder): Promise<boolean> {
  const address = new PublicKey(order.escrowAddress);

  try {
    // Verify the account still exists on-chain
    const compressed_account = await retryOperation(
      () => rpc.getCompressedAccount(bn(address.toBytes())),
      3,
      1000,
      "getCompressedAccount"
    );

    if (!compressed_account?.data?.data) {
      // Account gone - already filled or expired
      logger.info("Order already settled on-chain", {
        escrowAddress: order.escrowAddress,
      });
      await updateOrderStatus(order.escrowAddress, "settled");
      return true;
    }

    let escrow_data = parseEscrowFromBuffer(compressed_account.data.data);
    const inputMint = escrow_data.tokens.inputMint;
    const outputMint = escrow_data.tokens.outputMint;

    // Check if price conditions are met
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
      // Price not favorable yet
      return false;
    }

    logger.info("Price condition met, attempting fill", {
      escrowAddress: order.escrowAddress,
      pair: `${order.inputSymbol}/${order.outputSymbol}`,
      targetRatio: target_ratio,
      currentRatio: current_ratio,
    });

    // Create ATA if needed
    let ata_created = outputMint.equals(SOL_MINT)
      ? false
      : await create_token_ata(compressed_account, escrow_data, "keeper");

    if (ata_created) {
      const updated = await retryOperation(
        () => rpc.getCompressedAccount(bn(address.toBytes())),
        3,
        1000,
        "getCompressedAccount"
      );
      if (updated?.data?.data) {
        escrow_data = parseEscrowFromBuffer(updated.data.data);
      }
    }

    // Determine fill type
    const fill_data = await determineFillType(
      escrow_data,
      inputMint,
      outputMint
    );
    const swapAmount = safeToNumber(
      escrow_data.amount.makingAmount.div(new BN(fill_data.divisor)),
      "swapAmount"
    );

    // Find best slippage
    const { best_slippage, excludedDexLabels } = await get_best_slippage(
      escrow_data,
      swapAmount
    );

    const slippage = (best_slippage ?? 50) + 5;

    // Get swap instruction
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
      throw new Error("Swap quote not found");
    }

    // Try direct routes if too many ALTs
    if (swapResult.alt.length > 2) {
      const directResult = await get_swap_instruction(
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
        directResult?.instruction_data &&
        directResult.alt.length <= swapResult.alt.length
      ) {
        swapResult = directResult;
      }
    }

    // Build and send fill transaction
    let tx: VersionedTransaction;

    if (outputMint.equals(SOL_MINT)) {
      tx = await fill_wsol(
        address,
        fill_data.fill_type === "partial" ? "partial" : "full",
        swapResult.instruction_data,
        swapResult.accounts,
        swapResult.alt
      );
    } else {
      tx = await fill(
        address,
        fill_data.fill_type === "partial" ? "partial" : "full",
        swapResult.instruction_data,
        swapResult.accounts,
        swapResult.alt
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

    await updateOrderStatus(order.escrowAddress, "filled", sig);
    metrics.successfulFills++;

    logger.info("Order filled successfully", {
      escrowAddress: order.escrowAddress,
      signature: sig,
      fillType: fill_data.fill_type,
    });

    await sendTelegramAlert(
      `Order FILLED: ${order.inputSymbol} -> ${order.outputSymbol}\n` +
        `Maker: ${order.maker.slice(0, 8)}...\n` +
        `Type: ${fill_data.fill_type}\n` +
        `Tx: ${sig}`
    );

    return true;
  } catch (error) {
    logger.error("Failed to fill order", {
      escrowAddress: order.escrowAddress,
      error: (error as Error).message,
    });
    metrics.failedFills++;
    return false;
  }
}

async function keeperLoop() {
  if (keeperRunning || keeperStopped) return;
  keeperRunning = true;

  try {
    const openOrders = await getOpenOrders();

    if (openOrders.length === 0) {
      keeperRunning = false;
      return;
    }

    logger.info(`Keeper cycle: ${openOrders.length} open orders`);

    for (const order of openOrders) {
      if (keeperStopped) break;

      // Skip orders that have failed too many times recently
      if (
        order.failCount &&
        order.failCount >= MAX_CONSECUTIVE_FAILURES &&
        order.lastChecked &&
        Date.now() - order.lastChecked < COOLDOWN_AFTER_FAILURE_MS
      ) {
        continue;
      }

      if (!acquireOrderLock(order.escrowAddress)) {
        logger.debug("Order locked, skipping", { escrowAddress: order.escrowAddress });
        continue;
      }

      try {
        // Check if expired
        if (order.expiredAt > 0 && order.expiredAt <= Date.now()) {
          const success = await processExpiredOrder(order);
          await markOrderChecked(order.escrowAddress, !success);
          continue;
        }

        // Try to fill
        const filled = await processFillableOrder(order);
        await markOrderChecked(order.escrowAddress, !filled);

        // Small delay between orders to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (error) {
        logger.error("Keeper error processing order", {
          escrowAddress: order.escrowAddress,
          error: (error as Error).message,
        });
        await markOrderChecked(order.escrowAddress, true);
      } finally {
        releaseOrderLock(order.escrowAddress);
      }
    }
  } catch (error) {
    logger.error("Keeper loop error", { error: (error as Error).message });
  } finally {
    keeperRunning = false;
  }
}

export function startKeeper() {
  keeperStopped = false;

  logger.info("Keeper service started", {
    intervalMs: KEEPER_INTERVAL_MS,
    maxFailures: MAX_CONSECUTIVE_FAILURES,
  });

  // Run immediately, then on interval
  setTimeout(keeperLoop, 5000); // 5s delay to let server fully start
  keeperInterval = setInterval(keeperLoop, KEEPER_INTERVAL_MS);
}

export function stopKeeper() {
  keeperStopped = true;
  if (keeperInterval) {
    clearInterval(keeperInterval);
    keeperInterval = null;
  }
  logger.info("Keeper service stopped");
}
