// Klira Server - Token 2022 Support
import { PublicKey } from "@solana/web3.js";
import { connection, rpc } from "./app";
import {
  ExtensionType,
  getAccountLen,
  getExtensionTypes,
  Mint,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import { get_quote } from "./jup";
import { logger } from "./utils";

export async function get_rent_amount(mint: PublicKey) {
  try {
    const account = await connection.getAccountInfo(mint);

    let data: Mint;
    try {
      data = unpackMint(mint, account, TOKEN_2022_PROGRAM_ID);
    } catch (err) {
      logger.error("unpackMint failed", { error: (err as Error).message });
      throw new Error(
        `Invalid mint or wrong program ID for ${mint.toBase58()}`
      );
    }

    const extensions = getExtensionTypes(data.tlvData);

    const account_extensions: ExtensionType[] = [ExtensionType.ImmutableOwner];

    if (extensions.length > 0) {
      extensions.forEach((ext) => {
        if (ext === 14) {
          // TransferHook,
          account_extensions.push(ExtensionType.TransferHookAccount);
        }

        if (ext === 26) {
          // PausableConfig = 26,
          account_extensions.push(ExtensionType.PausableAccount);
        }
      });
    }

    const len = getAccountLen(account_extensions);
    const rent_amount = await rpc.getMinimumBalanceForRentExemption(len);
    return rent_amount;
  } catch (err) {
    logger.error(`Failed to get rent amount for ${mint.toBase58()}`, {
      error: (err as Error).message,
    });
    throw new Error(
      `Failed to get rent amount for ${mint.toBase58()}: ${
        (err as Error).message
      }`
    );
  }
}

export async function get_rent_quote(mint: PublicKey) {
  try {
    const rent = await get_rent_amount(mint);
    const targetRent = BigInt(rent);
    logger.info(`Target rent: ${targetRent}`);

    // Step 1: Get initial rate to estimate
    const initialInput = 1000000n; // Use a larger initial amount for better precision
    const { outAmount: initialOutput } = await get_quote(
      mint.toString(),
      "So11111111111111111111111111111111111111112",
      Number(initialInput)
    );
    const rate = Number(initialOutput) / Number(initialInput);
    logger.info(`Rate: ${rate} output per input lamport`);

    // Step 2: Calculate estimated input
    const estimatedInput = BigInt(Math.ceil(Number(targetRent) / rate));
    logger.info(`Estimated input needed: ${estimatedInput}`);

    // Step 3: Test the estimated amount and adjust linearly
    let currentInput = estimatedInput;
    let { inAmount: estIn, outAmount: estOut } = await get_quote(
      mint.toString(),
      "So11111111111111111111111111111111111111112",
      Number(currentInput)
    );
    let currentOutput = BigInt(estOut);
    let currentInAmount = BigInt(estIn);

    // Initial check for a good starting point
    const MAX_ITERATIONS = 50;
    if (currentOutput <= targetRent) {
      logger.debug("Estimated output too low, increasing...");
      const step = BigInt(
        Math.max(1, Math.floor(Number(estimatedInput) * 0.0001))
      ); // Smaller step
      let iterations = 0;
      while (currentOutput <= targetRent) {
        if (++iterations > MAX_ITERATIONS) {
          throw new Error(
            "get_rent_quote: exceeded max iterations while increasing input"
          );
        }
        currentInput += step;
        const { outAmount: testOutAmount, inAmount: testInAmount } =
          await get_quote(
            mint.toString(),
            "So11111111111111111111111111111111111111112",
            Number(currentInput)
          );
        currentOutput = BigInt(testOutAmount);
        currentInAmount = BigInt(testInAmount);
      }
    } else {
      logger.debug("Estimated output too high, decreasing...");
      const step = BigInt(
        Math.max(1, Math.floor(Number(estimatedInput) * 0.0001))
      ); // Smaller step
      let iterations = 0;
      while (currentOutput > targetRent) {
        if (++iterations > MAX_ITERATIONS) {
          throw new Error(
            "get_rent_quote: exceeded max iterations while decreasing input"
          );
        }
        currentInput -= step;
        if (currentInput <= 0n) break;
        const { outAmount: testOutAmount, inAmount: testInAmount } =
          await get_quote(
            mint.toString(),
            "So11111111111111111111111111111111111111112",
            Number(currentInput)
          );
        currentOutput = BigInt(testOutAmount);
        currentInAmount = BigInt(testInAmount);
      }
      // Revert to the last known good value
      currentInput += step;
      const { outAmount: finalOut, inAmount: finalIn } = await get_quote(
        mint.toString(),
        "So11111111111111111111111111111111111111112",
        Number(currentInput)
      );
      currentOutput = BigInt(finalOut);
      currentInAmount = BigInt(finalIn);
    }

    // Store the boundary values for binary search
    let high = currentInput;
    let { outAmount: highOut } = await get_quote(
      mint.toString(),
      "So11111111111111111111111111111111111111112",
      Number(high)
    );

    let low = high - 1n; // The input that will be too low

    // Step 4: Perform a binary search for high precision with buffer constraint
    const MAX_BUFFER = 1000n; // Maximum allowed buffer above target
    let bestMatchInAmount = high;
    let bestMatchOutAmount = BigInt(highOut);

    while (low <= high) {
      const mid = low + (high - low) / 2n;
      if (mid <= 0n) break;

      const { outAmount: midOutAmount } = await get_quote(
        mint.toString(),
        "So11111111111111111111111111111111111111112",
        Number(mid)
      );
      const midOutput = BigInt(midOutAmount);

      if (midOutput >= targetRent) {
        const buffer = midOutput - targetRent;

        // Check if this meets our buffer constraint
        if (buffer <= MAX_BUFFER) {
          // This is a valid candidate within buffer limits
          bestMatchInAmount = mid;
          bestMatchOutAmount = midOutput;
          high = mid - 1n; // Try for even tighter match
        } else {
          // Buffer too large, need less input
          high = mid - 1n;
        }
      } else {
        // Output is too low, need to increase the input
        low = mid + 1n;
      }
    }

    // Verify the final result meets all constraints
    if (
      bestMatchOutAmount >= targetRent &&
      bestMatchOutAmount - targetRent <= MAX_BUFFER
    ) {
      logger.info("Final result", {
        inputAmount: bestMatchInAmount.toString(),
        outputAmount: bestMatchOutAmount.toString(),
        targetAmount: targetRent.toString(),
        bufferAboveTarget: (bestMatchOutAmount - targetRent).toString(),
      });
      return {
        inAmount: bestMatchInAmount,
        outAmount: bestMatchOutAmount,
        rent,
      };
    } else {
      logger.warn(
        "Could not find a suitable amount within buffer constraints (max 1000 lamports)."
      );
      return null;
    }
  } catch (err) {
    logger.error("Error in get_rent_quote", { error: (err as Error).message });
    throw err;
  }
}
