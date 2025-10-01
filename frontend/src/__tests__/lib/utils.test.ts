import { cn, shortenAddress, formatDate, getTimeRemaining } from "@/lib/utils";

describe("cn (class name merge)", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("shortenAddress", () => {
  const address = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

  it("shortens with default chars (4)", () => {
    const result = shortenAddress(address);
    expect(result).toBe("9WzD...AWWM");
    expect(result).toContain("...");
  });

  it("shortens with custom chars", () => {
    const result = shortenAddress(address, 6);
    expect(result).toBe("9WzDXw...YtAWWM");
  });

  it("shortens with 1 char", () => {
    const result = shortenAddress(address, 1);
    expect(result).toBe("9...M");
  });

  it("handles short addresses", () => {
    const result = shortenAddress("abcd", 2);
    expect(result).toBe("ab...cd");
  });
});

describe("formatDate", () => {
  it("formats a date correctly", () => {
    const date = new Date("2024-03-15T14:30:00");
    const result = formatDate(date);
    expect(result).toContain("Mar");
    expect(result).toContain("15");
  });

  it("handles different months", () => {
    const date = new Date("2024-01-01T00:00:00");
    const result = formatDate(date);
    expect(result).toContain("Jan");
  });
});

describe("getTimeRemaining", () => {
  it('returns "Expired" for past dates', () => {
    const pastDate = new Date(Date.now() - 1000);
    expect(getTimeRemaining(pastDate)).toBe("Expired");
  });

  it("returns minutes for less than 1 hour", () => {
    const futureDate = new Date(Date.now() + 30 * 60_000); // 30 minutes
    const result = getTimeRemaining(futureDate);
    expect(result).toMatch(/^\d+m$/);
  });

  it("returns hours and minutes for less than 24 hours", () => {
    const futureDate = new Date(Date.now() + 5 * 3_600_000 + 15 * 60_000); // 5h 15m
    const result = getTimeRemaining(futureDate);
    expect(result).toMatch(/^\d+h \d+m$/);
  });

  it("returns days and hours for more than 24 hours", () => {
    const futureDate = new Date(Date.now() + 3 * 86_400_000 + 5 * 3_600_000); // 3d 5h
    const result = getTimeRemaining(futureDate);
    expect(result).toMatch(/^\d+d \d+h$/);
  });

  it('returns "Expired" for exactly now', () => {
    const now = new Date();
    expect(getTimeRemaining(now)).toBe("Expired");
  });
});
