"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import BN from "bn.js";
import { useInitOrder } from "@/hooks/useInitOrder";
import { useToast } from "@/components/ui/Toast";
import TokenSelector from "./TokenSelector";
import AmountInput from "./AmountInput";
import ExpirationPicker from "./ExpirationPicker";
import CyberButton from "@/components/ui/CyberButton";
import { TOKENS, formatTokenAmount } from "@/lib/tokens";
import { EXPIRATION_OPTIONS, PROTOCOL_FEE_BPS } from "@/lib/constants";
import type { Token, ExpirationOption } from "@/types";

export default function OrderForm() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { initOrder, loading: submitting, error } = useInitOrder();
  const { addToast } = useToast();

  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]); // SOL
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]); // USDC
  const [amountIn, setAmountIn] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [expiration, setExpiration] = useState<ExpirationOption>("24h");
  const [txSig, setTxSig] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const estimatedOut = useMemo(() => {
    const amt = parseFloat(amountIn);
    const price = parseFloat(limitPrice);
    if (!amt || !price) return null;
    return amt * price;
  }, [amountIn, limitPrice]);

  function handleSwapTokens() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
    setLimitPrice("");
  }

  async function handleSubmit() {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const amtFloat = parseFloat(amountIn);
      const priceFloat = parseFloat(limitPrice);
      if (!amtFloat || !priceFloat) return;

      // Convert to token amounts using string-based multiplication to avoid floating point precision loss
      const amtParts = amountIn.split(".");
      const amtIntPart = amtParts[0] || "0";
      const amtDecPart = (amtParts[1] || "").padEnd(tokenIn.decimals, "0").slice(0, tokenIn.decimals);
      const makingAmountStr = amtIntPart + amtDecPart;
      const makingAmount = new BN(makingAmountStr);

      // Compute takingAmount using BigInt to avoid IEEE 754 precision issues
      // takingAmount (in tokenOut smallest units) = makingAmount * price * 10^(tokenOut.decimals) / 10^(tokenIn.decimals)
      const makingBig = BigInt(makingAmountStr);
      const [priceWhole, priceFrac = ""] = limitPrice.split(".");
      const pricePrecision = priceFrac.length;
      const priceScaled = BigInt(priceWhole + priceFrac); // price * 10^pricePrecision
      const takingBig =
        (makingBig * priceScaled * BigInt(10 ** tokenOut.decimals)) /
        (BigInt(10 ** tokenIn.decimals) * BigInt(10 ** pricePrecision));
      const takingAmount = new BN(takingBig.toString());

      // Expiration
      const expMs =
        EXPIRATION_OPTIONS.find((o) => o.value === expiration)?.ms ?? 86_400_000;
      const expiredAt = new BN(Math.floor((Date.now() + expMs) / 1000));

      const sig = await initOrder({
        inputMint: new PublicKey(tokenIn.mint),
        outputMint: new PublicKey(tokenOut.mint),
        inputSymbol: tokenIn.symbol,
        outputSymbol: tokenOut.symbol,
        makingAmount,
        takingAmount,
        expiredAt,
      });

      if (sig) {
        setTxSig(sig);
        setAmountIn("");
        setLimitPrice("");
        addToast(
          "success",
          `Order placed: ${tokenIn.symbol} → ${tokenOut.symbol}`,
          sig
        );
        // Redirect after a brief moment to show success
        setTimeout(() => router.push("/orders"), 1500);
      } else if (error) {
        addToast("error", error);
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const amt = parseFloat(amountIn);
  const price = parseFloat(limitPrice);
  const canSubmit =
    !!amountIn &&
    amt > 0 &&
    amt < 1e15 &&
    !!limitPrice &&
    price > 0 &&
    price < 1e15 &&
    tokenIn.mint !== tokenOut.mint &&
    !submitting;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[480px] mx-auto bg-cyber-panel border border-neon-cyan/15 rounded-sm p-6 shadow-neon-cyan"
    >
      <h2 className="font-orbitron font-bold text-lg text-white mb-6">
        Place Limit Order
      </h2>

      <div className="space-y-4">
        {/* Token In */}
        <TokenSelector
          label="You Pay"
          selected={tokenIn}
          onSelect={setTokenIn}
          excludeMint={tokenOut.mint}
        />
        <AmountInput
          value={amountIn}
          onChange={setAmountIn}
          tokenSymbol={tokenIn.symbol}
          label="Amount"
        />

        {/* Swap Button */}
        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={handleSwapTokens}
            className="w-10 h-10 flex items-center justify-center border border-white/10 rounded-full text-white/30 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* Token Out */}
        <TokenSelector
          label="You Receive"
          selected={tokenOut}
          onSelect={setTokenOut}
          excludeMint={tokenIn.mint}
        />

        {/* Limit Price */}
        <AmountInput
          value={limitPrice}
          onChange={setLimitPrice}
          tokenSymbol={`${tokenOut.symbol}/${tokenIn.symbol}`}
          label="Limit Price"
        />

        {/* Estimated output */}
        {estimatedOut !== null && (
          <div className="flex items-center justify-between px-4 py-2 bg-cyber-black/50 border border-white/5 rounded-sm">
            <span className="text-xs text-white/30 font-jetbrains">
              Est. Receive
            </span>
            <span className="text-sm font-jetbrains text-neon-green">
              {formatTokenAmount(estimatedOut)} {tokenOut.symbol}
            </span>
          </div>
        )}

        {/* Fee display */}
        <div className="flex items-center justify-between px-4 py-2 bg-cyber-black/50 border border-white/5 rounded-sm">
          <span className="text-xs text-white/30 font-jetbrains">
            Protocol Fee
          </span>
          <span className="text-xs font-jetbrains text-white/50">
            {PROTOCOL_FEE_BPS / 100}% — <span className="text-neon-cyan">0 SOL rent</span>
          </span>
        </div>

        {/* Expiration */}
        <ExpirationPicker selected={expiration} onSelect={setExpiration} />

        {/* Same token warning */}
        {tokenIn.mint === tokenOut.mint && (
          <div className="px-4 py-2 bg-neon-pink/10 border border-neon-pink/30 rounded-sm">
            <p className="text-red-400 text-xs font-jetbrains">
              Input and output tokens must be different
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-neon-pink/10 border border-neon-pink/30 rounded-sm">
            <p className="text-xs font-jetbrains text-neon-pink">{error}</p>
          </div>
        )}

        {/* Success */}
        {txSig && (
          <div className="px-4 py-2 bg-neon-green/10 border border-neon-green/30 rounded-sm">
            <p className="text-xs font-jetbrains text-neon-green">
              Order placed! Redirecting...
            </p>
          </div>
        )}

        {/* Submit */}
        <CyberButton
          variant="primary"
          size="lg"
          className="w-full mt-2"
          onClick={handleSubmit}
          disabled={submitting || (connected && !canSubmit)}
        >
          {!connected
            ? "Connect Wallet"
            : submitting
              ? "Signing Transaction..."
              : "Place Order"}
        </CyberButton>
      </div>
    </motion.div>
  );
}
