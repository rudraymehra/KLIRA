export interface Token {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  icon: string;
  price?: number;
}

export type OrderStatus = "open" | "filled" | "cancelled" | "expired";

export type ExpirationOption = "1h" | "4h" | "24h" | "7d" | "30d" | "custom";

export interface ExpirationConfig {
  label: string;
  value: ExpirationOption;
  ms: number;
}

export type OrderTab = "all" | "open" | "filled" | "cancelled";
