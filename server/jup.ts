// Klira Server - Jupiter Integration
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import axios from "axios";
import { Escrow } from "./lib/escrow";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { payer, rpc } from "./app";
import { logger, safeToNumber, tokenMap } from "./utils";

export async function get_quote(
  input_mint: string,
  output_mint: string,
  amount: number,
  slippageBps: number = 0,
  platformFeeBps: number = 0
): Promise<{ inAmount: string; outAmount: string; swapUsdValue: string }> {
  const quote_url =
    `https://lite-api.jup.ag/swap/v1/quote?` +
    `inputMint=${input_mint}&outputMint=${output_mint}` +
    `&amount=${amount}&slippageBps=${slippageBps}&platformFeeBps=${platformFeeBps}`;

  const quote = await axios.get(quote_url, { timeout: 15000 });

  return {
    inAmount: quote.data.inAmount,
    outAmount: quote.data.outAmount,
    swapUsdValue: quote.data.swapUsdValue,
  };
}

const fee = new PublicKey("feeSsye1xpD4zaxVh19n92abi3ZyWngAD47Z3ygPGPA");

export async function get_swap_instruction(
  input_mint: string,
  output_mint: string,
  amount: number,
  swapMode: "ExactOut" | "ExactIn",
  platformFeeBps = 0,
  onlyDirectRoutes: boolean = false,
  slippageBps: number = 0,
  excludedDexLabels?: string[]
) {
  const fee_acc = await create_fee_ata(new PublicKey(input_mint));

  let quote_url =
    `https://lite-api.jup.ag/swap/v1/quote?` +
    `inputMint=${input_mint}&outputMint=${output_mint}` +
    `&amount=${amount}&swapMode=${swapMode}&slippageBps=${slippageBps}&onlyDirectRoutes=${onlyDirectRoutes}`;

  if (platformFeeBps !== 0) {
    quote_url += `&platformFeeBps=${platformFeeBps}`;
  }

  if (excludedDexLabels && excludedDexLabels.length > 0) {
    quote_url += `&excludeDexes=${excludedDexLabels.join(",")}`;
  }

  const quote = await axios.get(quote_url, { timeout: 15000 });

  if (quote.data.error) {
    throw new Error(`Jupiter quote API error: ${quote.data.error}`);
  }

  logger.debug("Route plan", { routePlan: quote.data.routePlan });

  let body = {
    userPublicKey: payer.publicKey.toString(),
    quoteResponse: quote.data,
    ...(platformFeeBps !== 0 ? { feeAccount: fee_acc.toString() } : {}),
    // NOTE: token account is the ata of fee and input mint
  };

  let config = {
    method: "post",
    maxBodyLength: 10 * 1024 * 1024,
    timeout: 15000,
    url: "https://lite-api.jup.ag/swap/v1/swap-instructions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: JSON.stringify(body),
  };
  const swap = await axios.request(config);

  if (swap.data.error || !swap.data.swapInstruction) {
    throw new Error(
      `Jupiter swap API error: ${swap.data.error || "missing swapInstruction"}`
    );
  }

  const instruction_data = swap.data.swapInstruction.data;
  const accounts = swap.data.swapInstruction.accounts.map((acc: any) => ({
    pubkey: new PublicKey(acc.pubkey),
    isWritable: acc.isWritable,
    isSigner: false,
  }));

  return {
    inAmount: quote.data.inAmount,
    outAmount: quote.data.outAmount,
    priceImpactPct: quote.data.priceImpactPct,
    instruction_data,
    accounts,
    alt: swap.data.addressLookupTableAddresses,
  };
}

export async function get_price(input_mint: string, output_mint: string) {
  const url = `https://lite-api.jup.ag/price/v3?ids=${input_mint},${output_mint}`;
  const res = await axios.get(url, { timeout: 15000 });

  const inputPrice = res.data[input_mint]?.usdPrice;
  const outputPrice = res.data[output_mint]?.usdPrice;

  if (!inputPrice || !outputPrice) {
    throw new Error("Could not fetch prices for given tokens");
  }

  const current_ratio = inputPrice / outputPrice;

  return { current_ratio, inputPrice, outputPrice };
}

export async function determineFillType(
  escrow_data: Escrow,
  inputMint: PublicKey,
  outputMint: PublicKey
): Promise<{
  fill_type: "full" | "partial";
  divisor: number;
}> {
  let tryInAmount = safeToNumber(
    escrow_data.amount.makingAmount,
    "makingAmount"
  );
  let tryTakingAmount =
    safeToNumber(escrow_data.amount.takingAmount, "takingAmount") * 0.999;
  let divisor = 1;

  let iterations = 0;
  const MAX_ITERATIONS = 20;
  while (
    tryInAmount > 0 &&
    tryTakingAmount > 0 &&
    iterations < MAX_ITERATIONS
  ) {
    iterations++;
    const { outAmount, swapUsdValue } = await get_quote(
      inputMint.toString(),
      outputMint.toString(),
      tryInAmount,
      0,
      10
    );

    if (5 > Number(swapUsdValue)) {
      throw new Error("dust transaction swap value is less than 5$");
    }

    if (Number(outAmount) >= tryTakingAmount) {
      return { fill_type: divisor === 1 ? "full" : "partial", divisor };
    }

    divisor *= 2;
    tryInAmount = Math.floor(tryInAmount / 2);
    tryTakingAmount = Math.floor(tryTakingAmount / 2);
  }

  throw new Error("Swap Quote not found to fill the order");
}

async function create_fee_ata(mint: PublicKey) {
  const token = tokenMap.get(mint.toString());

  if (!token) {
    throw new Error(`Token metadata not found for mint ${mint.toBase58()}`);
  }

  const ata = await getAssociatedTokenAddress(
    mint,
    fee,
    true,
    new PublicKey(token.tokenProgram)
  );

  const ata_exist = await rpc.getAccountInfo(ata);

  if (ata_exist !== null) return ata;

  logger.info("creating fee token account");

  return await createAssociatedTokenAccount(
    rpc,
    payer,
    mint,
    fee,
    { commitment: "processed" },
    new PublicKey(token.tokenProgram)
  );
}

const PROGRAM_ID_TO_LABEL = new Map<string, string>();

let dexLabelsPromise: Promise<void> | null = null;

export function ensureDexLabelsLoaded(): Promise<void> {
  if (!dexLabelsPromise) {
    dexLabelsPromise = loadProgramLabels();
  }
  return dexLabelsPromise;
}

// Kick off loading immediately but don't block module evaluation
ensureDexLabelsLoaded().catch((err) => {
  logger.error("Failed to load program labels", { error: err.message });
  dexLabelsPromise = null; // Allow retry on next call
});

async function loadProgramLabels(): Promise<void> {
  const url = "https://lite-api.jup.ag/swap/v1/program-id-to-label";
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch program labels: ${res.statusText}`);
  }

  const data: Record<string, string> = await res.json();
  PROGRAM_ID_TO_LABEL.clear();

  for (const [programId, label] of Object.entries(data)) {
    PROGRAM_ID_TO_LABEL.set(programId, label);
  }

  logger.info(`Loaded ${PROGRAM_ID_TO_LABEL.size} program labels.`);
}

export async function get_best_slippage(escrow: Escrow, input_amount: number) {
  let slippage_bps = 5;
  const exclude_dexes = new Set<string>();
  let best_slippage = null;

  while (slippage_bps <= 50) {
    const excludeDexesParam =
      exclude_dexes.size > 0
        ? `&excludeDexes=${Array.from(exclude_dexes).join(",")}`
        : "";

    const quote_url =
      `https://lite-api.jup.ag/swap/v1/quote?` +
      `inputMint=${escrow.tokens.inputMint.toString()}&outputMint=${escrow.tokens.outputMint.toString()}` +
      `&amount=${input_amount}&slippageBps=${slippage_bps}${excludeDexesParam}`;

    logger.debug(`Trying slippage: ${slippage_bps} bps`);

    try {
      const quote = await axios.get(quote_url, { timeout: 15000 });

      let body = {
        userPublicKey: payer.publicKey.toString(),
        payer: payer.publicKey.toString(),
        quoteResponse: quote.data,
        wrapAndUnwrapSol: false,
      };

      let config = {
        method: "post",
        maxBodyLength: 10 * 1024 * 1024,
        timeout: 15000,
        url: "https://lite-api.jup.ag/swap/v1/swap",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: JSON.stringify(body),
      };

      const swap = await axios.request(config);

      const transaction = VersionedTransaction.deserialize(
        Buffer.from(swap.data.swapTransaction, "base64")
      );

      const sim = await rpc.simulateTransaction(transaction, {
        sigVerify: false,
      });

      if (sim.value.err === null) {
        logger.debug(`Found passing slippage at ${slippage_bps} bps`);
        best_slippage = slippage_bps;
        break;
      } else {
        if (isComputeUnitExceeded(sim.value.logs)) {
          const program_id = extractDexProgramId(sim.value.logs || []);
          const dexLabel = PROGRAM_ID_TO_LABEL.get(program_id);

          if (dexLabel && !exclude_dexes.has(dexLabel)) {
            logger.debug(`CU exceeded in DEX: ${dexLabel}`);
            logger.debug(`Adding to exclusion list and retrying...`);
            exclude_dexes.add(dexLabel);

            // Retry with the same slippage but excluded DEX
            continue;
          }
        }
        logger.debug(`Simulation failed at ${slippage_bps} bps`);
      }
    } catch (err) {
      logger.debug(
        `Error at slippage ${slippage_bps}: ${(err as Error).message}`
      );
    }

    slippage_bps += 5;
  }

  if (!best_slippage) {
    logger.warn("No valid slippage found, defaulting to 50 bps");
    best_slippage = 50;
  }

  logger.debug("Best slippage result", { best_slippage });
  return {
    best_slippage,
    excludedDexLabels: Array.from(exclude_dexes),
  };
}

function getDexLabel(programId: string): string {
  return PROGRAM_ID_TO_LABEL.get(programId) || programId;
}

function isComputeUnitExceeded(logs?: string[]): boolean {
  if (!logs) return false;
  return logs.some(
    (line) =>
      line.toLowerCase().includes("exceeded cus meter") ||
      line.toLowerCase().includes("exceeded cu") ||
      line.toLowerCase().includes("program failed to complete")
  );
}

function extractDexProgramId(logs: string[]): string | null {
  // Find the last program invoke before the CU exceeded line
  const idx = logs.findIndex((l) =>
    l.toLowerCase().includes("exceeded cus meter")
  );
  if (idx === -1) return null;

  // Look backwards for the program that caused the issue
  for (let i = idx - 1; i >= 0; i--) {
    const m = logs[i].match(/Program ([A-Za-z0-9]{32,44}) invoke/);
    if (m) {
      const programId = m[1];
      // Skip Jupiter's main program and ComputeBudget program
      if (
        programId !== "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" &&
        programId !== "ComputeBudget111111111111111111111111111111"
      ) {
        return programId;
      }
    }
  }
  return null;
}
