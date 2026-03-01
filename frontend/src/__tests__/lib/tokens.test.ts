import { TOKENS, getToken, formatTokenAmount } from "@/lib/tokens";

describe("TOKENS", () => {
  it("contains at least 2 tokens", () => {
    expect(TOKENS.length).toBeGreaterThanOrEqual(2);
  });

  it("has SOL as the first token", () => {
    expect(TOKENS[0].symbol).toBe("SOL");
  });

  it("has USDC as the second token", () => {
    expect(TOKENS[1].symbol).toBe("USDC");
  });

  it("each token has required fields", () => {
    for (const token of TOKENS) {
      expect(token.symbol).toBeDefined();
      expect(token.name).toBeDefined();
      expect(token.mint).toBeDefined();
      expect(typeof token.decimals).toBe("number");
      expect(token.decimals).toBeGreaterThanOrEqual(0);
      expect(token.icon).toBeDefined();
    }
  });

  it("has unique mints", () => {
    const mints = TOKENS.map((t) => t.mint);
    expect(new Set(mints).size).toBe(mints.length);
  });

  it("has unique symbols", () => {
    const symbols = TOKENS.map((t) => t.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("SOL has 9 decimals", () => {
    expect(TOKENS[0].decimals).toBe(9);
  });

  it("USDC has 6 decimals", () => {
    expect(TOKENS[1].decimals).toBe(6);
  });

  it("all mints are valid base58 strings", () => {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    for (const token of TOKENS) {
      expect(token.mint).toMatch(base58Regex);
    }
  });
});

describe("getToken", () => {
  it("returns SOL for 'SOL'", () => {
    const token = getToken("SOL");
    expect(token).toBeDefined();
    expect(token!.symbol).toBe("SOL");
    expect(token!.name).toBe("Solana");
  });

  it("returns USDC for 'USDC'", () => {
    const token = getToken("USDC");
    expect(token).toBeDefined();
    expect(token!.decimals).toBe(6);
  });

  it("returns undefined for unknown symbol", () => {
    expect(getToken("UNKNOWN")).toBeUndefined();
  });

  it("is case-sensitive", () => {
    expect(getToken("sol")).toBeUndefined();
    expect(getToken("Sol")).toBeUndefined();
  });

  it("returns undefined for removed token", () => {
    expect(getToken("BONK")).toBeUndefined();
  });
});

describe("formatTokenAmount", () => {
  it("returns '0' for zero", () => {
    expect(formatTokenAmount(0)).toBe("0");
  });

  it("formats small numbers with exponential notation", () => {
    const result = formatTokenAmount(0.00001);
    expect(result).toMatch(/e/);
  });

  it("formats normal amounts", () => {
    const result = formatTokenAmount(123.456);
    expect(result).toContain("123");
  });

  it("formats large numbers with commas", () => {
    const result = formatTokenAmount(1234567.89);
    expect(result).toContain("1,234,567");
  });

  it("respects custom decimals parameter", () => {
    const result = formatTokenAmount(1.123456789, 2);
    expect(result).toBe("1.12");
  });

  it("formats amounts just above threshold", () => {
    const result = formatTokenAmount(0.0001);
    expect(result).not.toMatch(/e/);
  });

  it("formats amounts just below threshold with exponential", () => {
    const result = formatTokenAmount(0.00009);
    expect(result).toMatch(/e/);
  });
});
