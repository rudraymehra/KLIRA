import { Token } from "@/types";

// Prices should be fetched live from an oracle or price API (e.g., Jupiter Price API, Pyth, etc.)
export const TOKENS: Token[] = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    icon: "◎",
    price: 0,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    // Devnet: custom test mint; Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
    mint: "2t6JyM65AHxBUaSBAhwZdWMDu8VbvqhRLAoa4f3xqVht",
    decimals: 6,
    icon: "$",
    price: 0,
  },
];

export function getToken(symbol: string): Token | undefined {
  return TOKENS.find((t) => t.symbol === symbol);
}

export function getTokenByMint(mint: string): Token | undefined {
  return TOKENS.find((t) => t.mint === mint);
}

export function formatTokenAmount(
  amount: number,
  decimals: number = 4
): string {
  if (amount === 0) return "0";
  if (amount < 0.0001) return amount.toExponential(2);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
