import { ExpirationConfig } from "@/types";

export { PROGRAM_ID } from "./idl";

export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ||
  "devnet";

export const PROTOCOL_FEE_BPS = 10; // 0.1%

export const EXPIRATION_OPTIONS: ExpirationConfig[] = [
  { label: "1 Hour", value: "1h", ms: 3_600_000 },
  { label: "4 Hours", value: "4h", ms: 14_400_000 },
  { label: "24 Hours", value: "24h", ms: 86_400_000 },
  { label: "7 Days", value: "7d", ms: 604_800_000 },
  { label: "30 Days", value: "30d", ms: 2_592_000_000 },
];

export const STATS = [
  { label: "SOL Rent", value: "0" },
  { label: "Protocol Fee", value: "0.1%" },
  { label: "Execution", value: "< 1s" },
  { label: "Max Orders", value: "Unlimited" },
];

export const FEATURES = [
  {
    title: "Zero Rent",
    description:
      "No SOL locked as rent. Your capital stays fully available for trading. ZK compression eliminates storage costs entirely.",
    icon: "💎",
  },
  {
    title: "CEX-like UX",
    description:
      "Place limit orders as easily as on a centralized exchange. No complicated multi-step transactions or confusing interfaces.",
    icon: "⚡",
  },
  {
    title: "ZK Compressed",
    description:
      "Orders stored using Light Protocol's ZK compression — 1000x cheaper than traditional Solana accounts with full security.",
    icon: "🔐",
  },
  {
    title: "Jupiter Powered",
    description:
      "Orders execute through Jupiter aggregator for best-in-class pricing and deep liquidity across all Solana DEXs.",
    icon: "🪐",
  },
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Connect Wallet",
    description: "Link your Phantom or Solflare wallet to get started in seconds.",
  },
  {
    step: 2,
    title: "Set Your Order",
    description:
      "Choose your tokens, set amount and limit price. No rent deposit required.",
  },
  {
    step: 3,
    title: "ZK Compress",
    description:
      "Your order is compressed on-chain using Light Protocol — 1000x cheaper storage.",
  },
  {
    step: 4,
    title: "Auto Execute",
    description:
      "When market hits your price, the keeper network fills your order via Jupiter.",
  },
];
