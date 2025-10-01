import {
  EXPIRATION_OPTIONS,
  PROTOCOL_FEE_BPS,
  STATS,
  FEATURES,
  HOW_IT_WORKS,
} from "@/lib/constants";

describe("EXPIRATION_OPTIONS", () => {
  it("has 5 options", () => {
    expect(EXPIRATION_OPTIONS).toHaveLength(5);
  });

  it("has correct values", () => {
    const values = EXPIRATION_OPTIONS.map((o) => o.value);
    expect(values).toEqual(["1h", "4h", "24h", "7d", "30d"]);
  });

  it("has increasing ms values", () => {
    for (let i = 1; i < EXPIRATION_OPTIONS.length; i++) {
      expect(EXPIRATION_OPTIONS[i].ms).toBeGreaterThan(
        EXPIRATION_OPTIONS[i - 1].ms
      );
    }
  });

  it("1 hour equals 3,600,000 ms", () => {
    expect(EXPIRATION_OPTIONS[0].ms).toBe(3_600_000);
  });

  it("24 hours equals 86,400,000 ms", () => {
    expect(EXPIRATION_OPTIONS[2].ms).toBe(86_400_000);
  });

  it("7 days equals 604,800,000 ms", () => {
    expect(EXPIRATION_OPTIONS[3].ms).toBe(604_800_000);
  });

  it("30 days equals 2,592,000,000 ms", () => {
    expect(EXPIRATION_OPTIONS[4].ms).toBe(2_592_000_000);
  });

  it("each option has a label", () => {
    for (const opt of EXPIRATION_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(typeof opt.label).toBe("string");
    }
  });
});

describe("PROTOCOL_FEE_BPS", () => {
  it("is 10 (0.1%)", () => {
    expect(PROTOCOL_FEE_BPS).toBe(10);
  });
});

describe("STATS", () => {
  it("has 4 stats", () => {
    expect(STATS).toHaveLength(4);
  });

  it("includes zero rent", () => {
    const rentStat = STATS.find((s) => s.label === "SOL Rent");
    expect(rentStat).toBeDefined();
    expect(rentStat!.value).toBe("0");
  });

  it("includes protocol fee", () => {
    const feeStat = STATS.find((s) => s.label === "Protocol Fee");
    expect(feeStat).toBeDefined();
    expect(feeStat!.value).toBe("0.1%");
  });
});

describe("FEATURES", () => {
  it("has 4 features", () => {
    expect(FEATURES).toHaveLength(4);
  });

  it("each feature has title, description, and icon", () => {
    for (const feature of FEATURES) {
      expect(feature.title).toBeTruthy();
      expect(feature.description).toBeTruthy();
      expect(feature.icon).toBeTruthy();
    }
  });

  it("includes Zero Rent feature", () => {
    const zeroRent = FEATURES.find((f) => f.title === "Zero Rent");
    expect(zeroRent).toBeDefined();
  });

  it("includes ZK Compressed feature", () => {
    const zkFeature = FEATURES.find((f) => f.title === "ZK Compressed");
    expect(zkFeature).toBeDefined();
  });
});

describe("HOW_IT_WORKS", () => {
  it("has 4 steps", () => {
    expect(HOW_IT_WORKS).toHaveLength(4);
  });

  it("steps are numbered 1-4", () => {
    const steps = HOW_IT_WORKS.map((s) => s.step);
    expect(steps).toEqual([1, 2, 3, 4]);
  });

  it("each step has title and description", () => {
    for (const step of HOW_IT_WORKS) {
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
    }
  });

  it("starts with Connect Wallet", () => {
    expect(HOW_IT_WORKS[0].title).toBe("Connect Wallet");
  });

  it("ends with Auto Execute", () => {
    expect(HOW_IT_WORKS[3].title).toBe("Auto Execute");
  });
});
