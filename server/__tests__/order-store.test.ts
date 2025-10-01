/**
 * Unit tests for server/order-store.ts
 *
 * These tests cover the critical order storage functions:
 *   - addOrder
 *   - getOpenOrders
 *   - updateOrderStatus
 *   - markOrderChecked
 *   - getOrdersByWallet
 *
 * The real filesystem is mocked so tests run in-memory with no side effects.
 * Tests force the JSON backend by ensuring DATABASE_URL is not set.
 */

import fs from "fs";
import path from "path";

// Ensure we use JSON backend, not Prisma
delete process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Mock the logger (imported by order-store via ./utils) so we never touch the
// real filesystem for logs or attempt to import ./app (which boots Express).
// ---------------------------------------------------------------------------
jest.mock("../utils", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock the `fs` module so we can control what the JSON store sees
// without touching the real disk.
// ---------------------------------------------------------------------------
jest.mock("fs");

const mockedFs = jest.mocked(fs);

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are in place.
// ---------------------------------------------------------------------------
import {
  TrackedOrder,
  addOrder,
  getOpenOrders,
  updateOrderStatus,
  markOrderChecked,
  getOrdersByWallet,
  getAllOrders,
} from "../order-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid TrackedOrder for tests. */
function makeOrder(overrides: Partial<TrackedOrder> = {}): TrackedOrder {
  return {
    escrowAddress: "EscrowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    uniqueId: "uid-1",
    maker: "MakerAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    inputSymbol: "SOL",
    outputSymbol: "USDC",
    makingAmount: "1000000000",
    takingAmount: "50000000",
    expiredAt: 0,
    createdAt: Date.now(),
    status: "open",
    ...overrides,
  };
}

/**
 * Configure the fs mock so that the JSON store will return `orders`.
 * Also makes `existsSync` return true for the store path.
 */
function seedStore(orders: TrackedOrder[]) {
  mockedFs.existsSync.mockReturnValue(true);
  mockedFs.readFileSync.mockReturnValue(JSON.stringify(orders));
}

/** Capture what was last written via writeFileSync (the .tmp file). */
function lastWrittenOrders(): TrackedOrder[] {
  const calls = mockedFs.writeFileSync.mock.calls;
  if (calls.length === 0) return [];
  // writeFileSync(tmpPath, data, "utf-8")
  const raw = calls[calls.length - 1][1] as string;
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Default: data dir exists, store file does not (empty store).
  mockedFs.existsSync.mockReturnValue(false);
  mockedFs.mkdirSync.mockReturnValue(undefined as any);
  mockedFs.writeFileSync.mockReturnValue(undefined);
  mockedFs.renameSync.mockReturnValue(undefined);
});

// ── addOrder ────────────────────────────────────────────────────────────────

describe("addOrder", () => {
  it("adds an order correctly to an empty store", async () => {
    // Empty store (file does not exist).
    mockedFs.existsSync.mockReturnValue(false);

    const order = makeOrder();
    await addOrder(order);

    // Should have written the order to disk.
    const written = lastWrittenOrders();
    expect(written).toHaveLength(1);
    expect(written[0].escrowAddress).toBe(order.escrowAddress);
  });

  it("rejects duplicate escrow addresses", async () => {
    const order = makeOrder();
    seedStore([order]);

    // Try to add the same escrow address again.
    await addOrder(order);

    // The store should NOT have been re-written with a duplicate.
    // Because the duplicate branch returns early without calling saveOrders,
    // writeFileSync should NOT have been called.
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("allows orders with different escrow addresses", async () => {
    const order1 = makeOrder({
      escrowAddress: "EscrowAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });
    seedStore([order1]);

    const order2 = makeOrder({
      escrowAddress: "EscrowBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    });
    await addOrder(order2);

    const written = lastWrittenOrders();
    expect(written).toHaveLength(2);
    expect(written[1].escrowAddress).toBe(order2.escrowAddress);
  });
});

// ── getOpenOrders ───────────────────────────────────────────────────────────

describe("getOpenOrders", () => {
  it("only returns orders with status 'open'", async () => {
    const open = makeOrder({ status: "open", escrowAddress: "OpenAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
    const filled = makeOrder({ status: "filled", escrowAddress: "FillAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
    const expired = makeOrder({ status: "expired", escrowAddress: "ExprAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
    const cancelled = makeOrder({ status: "cancelled", escrowAddress: "CancAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });

    seedStore([open, filled, expired, cancelled]);

    const result = await getOpenOrders();
    expect(result).toHaveLength(1);
    expect(result[0].escrowAddress).toBe(open.escrowAddress);
    expect(result[0].status).toBe("open");
  });

  it("returns empty array when no open orders exist", async () => {
    seedStore([
      makeOrder({ status: "filled", escrowAddress: "FillAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
    ]);
    expect(await getOpenOrders()).toHaveLength(0);
  });

  it("returns empty array for an empty store", async () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(await getOpenOrders()).toHaveLength(0);
  });
});

// ── updateOrderStatus ───────────────────────────────────────────────────────

describe("updateOrderStatus", () => {
  it("updates status for a matching order", async () => {
    const order = makeOrder({ status: "open" });
    seedStore([order]);

    await updateOrderStatus(order.escrowAddress, "filled");

    const written = lastWrittenOrders();
    expect(written[0].status).toBe("filled");
  });

  it("attaches fillTxSignature when provided", async () => {
    const order = makeOrder({ status: "open" });
    seedStore([order]);

    const sig = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbbA3N3V5";
    await updateOrderStatus(order.escrowAddress, "filled", sig);

    const written = lastWrittenOrders();
    expect(written[0].fillTxSignature).toBe(sig);
    expect(written[0].status).toBe("filled");
  });

  it("sets lastChecked timestamp", async () => {
    const order = makeOrder({ status: "open" });
    seedStore([order]);

    const before = Date.now();
    await updateOrderStatus(order.escrowAddress, "expired");
    const after = Date.now();

    const written = lastWrittenOrders();
    expect(written[0].lastChecked).toBeGreaterThanOrEqual(before);
    expect(written[0].lastChecked).toBeLessThanOrEqual(after);
  });

  it("does nothing when escrow address is not found", async () => {
    seedStore([makeOrder()]);
    await updateOrderStatus("NonExistentAddress1111111111111111111111111", "filled");
    // saveOrders is never called because the order was not found.
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });
});

// ── markOrderChecked ────────────────────────────────────────────────────────

describe("markOrderChecked", () => {
  it("increments failCount on failure", async () => {
    const order = makeOrder({ failCount: 2 });
    seedStore([order]);

    await markOrderChecked(order.escrowAddress, true);

    const written = lastWrittenOrders();
    expect(written[0].failCount).toBe(3);
  });

  it("starts failCount from 0 when undefined and failure occurs", async () => {
    const order = makeOrder();
    delete (order as any).failCount; // simulate undefined
    seedStore([order]);

    await markOrderChecked(order.escrowAddress, true);

    const written = lastWrittenOrders();
    expect(written[0].failCount).toBe(1);
  });

  it("resets failCount to 0 on success", async () => {
    const order = makeOrder({ failCount: 5 });
    seedStore([order]);

    await markOrderChecked(order.escrowAddress, false);

    const written = lastWrittenOrders();
    expect(written[0].failCount).toBe(0);
  });

  it("sets lastChecked timestamp", async () => {
    const order = makeOrder();
    seedStore([order]);

    const before = Date.now();
    await markOrderChecked(order.escrowAddress, false);
    const after = Date.now();

    const written = lastWrittenOrders();
    expect(written[0].lastChecked).toBeGreaterThanOrEqual(before);
    expect(written[0].lastChecked).toBeLessThanOrEqual(after);
  });
});

// ── getOrdersByWallet ───────────────────────────────────────────────────────

describe("getOrdersByWallet", () => {
  it("filters orders by wallet (maker) address", async () => {
    const walletA = "WalletAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const walletB = "WalletBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

    seedStore([
      makeOrder({ maker: walletA, escrowAddress: "Escrow1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
      makeOrder({ maker: walletB, escrowAddress: "Escrow2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
      makeOrder({ maker: walletA, escrowAddress: "Escrow3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
    ]);

    const result = await getOrdersByWallet(walletA);
    expect(result).toHaveLength(2);
    result.forEach((o) => expect(o.maker).toBe(walletA));
  });

  it("returns empty array when no orders match the wallet", async () => {
    seedStore([makeOrder()]);
    const result = await getOrdersByWallet("NoMatchAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(result).toHaveLength(0);
  });
});

// ── Atomic write pattern ────────────────────────────────────────────────────

describe("atomic write pattern", () => {
  it("uses tmp file then renames when saving", async () => {
    mockedFs.existsSync.mockReturnValue(false);

    const order = makeOrder();
    await addOrder(order);

    // 1. writeFileSync should target the .tmp path
    expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
    const writePath = mockedFs.writeFileSync.mock.calls[0][0] as string;
    expect(writePath).toMatch(/\.tmp$/);

    // 2. renameSync should move .tmp -> final path
    expect(mockedFs.renameSync).toHaveBeenCalledTimes(1);
    const [src, dest] = mockedFs.renameSync.mock.calls[0];
    expect(src).toBe(writePath); // same tmp path
    expect((dest as string).endsWith(".tmp")).toBe(false);
  });

  it("serialises orders as pretty-printed JSON", async () => {
    mockedFs.existsSync.mockReturnValue(false);

    const order = makeOrder();
    await addOrder(order);

    const raw = mockedFs.writeFileSync.mock.calls[0][1] as string;
    // Pretty-printed means it includes newlines and indentation.
    expect(raw).toContain("\n");
    // And it round-trips correctly.
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].escrowAddress).toBe(order.escrowAddress);
  });
});
