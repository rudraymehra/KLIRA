"use client";

import { TOKENS } from "@/lib/tokens";

export function useTokenList() {
  return { tokens: TOKENS, loading: false };
}
