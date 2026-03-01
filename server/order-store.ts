// Klira Server - Order Store
// Database-backed order storage using Prisma/PostgreSQL with JSON file fallback.
import { logger } from "./utils";

export interface TrackedOrder {
  escrowAddress: string;
  uniqueId: string;
  maker: string;
  inputMint: string;
  outputMint: string;
  inputSymbol: string;
  outputSymbol: string;
  makingAmount: string;
  takingAmount: string;
  expiredAt: number; // ms timestamp
  createdAt: number; // ms timestamp
  status: "open" | "filled" | "expired" | "cancelled" | "settled";
  fillTxSignature?: string;
  lastChecked?: number;
  failCount?: number;
}

// ── Storage backend selection ───────────────────────────
// Use PostgreSQL via Prisma when DATABASE_URL is configured,
// otherwise fall back to JSON file storage for development.

interface OrderStore {
  addOrder(order: TrackedOrder): Promise<void>;
  getOpenOrders(): Promise<TrackedOrder[]>;
  updateOrderStatus(
    escrowAddress: string,
    status: TrackedOrder["status"],
    txSignature?: string
  ): Promise<void>;
  markOrderChecked(escrowAddress: string, failed?: boolean): Promise<void>;
  getAllOrders(limit?: number, offset?: number): Promise<TrackedOrder[]>;
  getOrderCount(): Promise<number>;
  getOrdersByWallet(wallet: string): Promise<TrackedOrder[]>;
}

// ── Prisma/PostgreSQL Backend ───────────────────────────
function createPrismaStore(): OrderStore {
  // Dynamic import to avoid requiring Prisma when using JSON fallback
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  function toTrackedOrder(row: any): TrackedOrder {
    return {
      escrowAddress: row.escrowAddress,
      uniqueId: row.uniqueId,
      maker: row.maker,
      inputMint: row.inputMint,
      outputMint: row.outputMint,
      inputSymbol: row.inputSymbol,
      outputSymbol: row.outputSymbol,
      makingAmount: row.makingAmount,
      takingAmount: row.takingAmount,
      expiredAt: Number(row.expiredAt),
      createdAt: Number(row.createdAt),
      status: row.status,
      fillTxSignature: row.fillTxSignature ?? undefined,
      lastChecked: row.lastChecked ? Number(row.lastChecked) : undefined,
      failCount: row.failCount ?? undefined,
    };
  }

  return {
    async addOrder(order: TrackedOrder): Promise<void> {
      try {
        await prisma.order.upsert({
          where: { escrowAddress: order.escrowAddress },
          update: {}, // No-op if already exists
          create: {
            escrowAddress: order.escrowAddress,
            uniqueId: order.uniqueId,
            maker: order.maker,
            inputMint: order.inputMint,
            outputMint: order.outputMint,
            inputSymbol: order.inputSymbol,
            outputSymbol: order.outputSymbol,
            makingAmount: order.makingAmount,
            takingAmount: order.takingAmount,
            expiredAt: BigInt(order.expiredAt),
            createdAt: BigInt(order.createdAt),
            status: order.status,
          },
        });
        logger.info("Order registered", {
          escrowAddress: order.escrowAddress,
          maker: order.maker,
          pair: `${order.inputSymbol}/${order.outputSymbol}`,
        });
      } catch (err) {
        // P2002 = unique constraint violation (order already exists)
        if ((err as any)?.code === "P2002") {
          logger.warn("Order already tracked", {
            escrowAddress: order.escrowAddress,
          });
          return;
        }
        throw err;
      }
    },

    async getOpenOrders(): Promise<TrackedOrder[]> {
      const rows = await prisma.order.findMany({
        where: { status: "open" },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toTrackedOrder);
    },

    async updateOrderStatus(
      escrowAddress: string,
      status: TrackedOrder["status"],
      txSignature?: string
    ): Promise<void> {
      await prisma.order.updateMany({
        where: { escrowAddress },
        data: {
          status,
          ...(txSignature ? { fillTxSignature: txSignature } : {}),
          lastChecked: BigInt(Date.now()),
        },
      });
    },

    async markOrderChecked(
      escrowAddress: string,
      failed: boolean = false
    ): Promise<void> {
      if (failed) {
        await prisma.order.updateMany({
          where: { escrowAddress },
          data: {
            lastChecked: BigInt(Date.now()),
            failCount: { increment: 1 },
          },
        });
      } else {
        await prisma.order.updateMany({
          where: { escrowAddress },
          data: {
            lastChecked: BigInt(Date.now()),
            failCount: 0,
          },
        });
      }
    },

    async getAllOrders(limit: number = 50, offset: number = 0): Promise<TrackedOrder[]> {
      const rows = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      });
      return rows.map(toTrackedOrder);
    },

    async getOrderCount(): Promise<number> {
      return prisma.order.count();
    },

    async getOrdersByWallet(wallet: string): Promise<TrackedOrder[]> {
      const rows = await prisma.order.findMany({
        where: { maker: wallet },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toTrackedOrder);
    },
  };
}

// ── JSON File Backend (development fallback) ────────────
function createJsonStore(): OrderStore {
  const fs = require("fs");
  const path = require("path");

  const STORE_PATH = path.join(process.cwd(), "data", "orders.json");

  let writeLock: Promise<void> = Promise.resolve();

  function withLock<T>(fn: () => T): Promise<T> {
    const result = writeLock.then(() => fn());
    writeLock = result.then(
      () => {},
      () => {}
    );
    return result;
  }

  function ensureDataDir() {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  function loadOrders(): TrackedOrder[] {
    ensureDataDir();
    try {
      if (!fs.existsSync(STORE_PATH)) return [];
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      logger.error("Failed to load orders from disk", {
        error: (err as Error).message,
      });
      return [];
    }
  }

  function saveOrders(orders: TrackedOrder[]): void {
    ensureDataDir();
    try {
      const tmpPath = STORE_PATH + ".tmp";
      fs.writeFileSync(tmpPath, JSON.stringify(orders, null, 2), "utf-8");
      fs.renameSync(tmpPath, STORE_PATH);
    } catch (err) {
      logger.error("Failed to save orders to disk", {
        error: (err as Error).message,
      });
    }
  }

  return {
    async addOrder(order: TrackedOrder): Promise<void> {
      return withLock(() => {
        const orders = loadOrders();
        const exists = orders.find(
          (o) => o.escrowAddress === order.escrowAddress
        );
        if (exists) {
          logger.warn("Order already tracked", {
            escrowAddress: order.escrowAddress,
          });
          return;
        }
        orders.push(order);
        saveOrders(orders);
        logger.info("Order registered", {
          escrowAddress: order.escrowAddress,
          maker: order.maker,
          pair: `${order.inputSymbol}/${order.outputSymbol}`,
        });
      });
    },

    async getOpenOrders(): Promise<TrackedOrder[]> {
      return loadOrders().filter((o) => o.status === "open");
    },

    async updateOrderStatus(
      escrowAddress: string,
      status: TrackedOrder["status"],
      txSignature?: string
    ): Promise<void> {
      return withLock(() => {
        const orders = loadOrders();
        const order = orders.find((o) => o.escrowAddress === escrowAddress);
        if (order) {
          order.status = status;
          if (txSignature) order.fillTxSignature = txSignature;
          order.lastChecked = Date.now();
          saveOrders(orders);
        }
      });
    },

    async markOrderChecked(
      escrowAddress: string,
      failed: boolean = false
    ): Promise<void> {
      return withLock(() => {
        const orders = loadOrders();
        const order = orders.find((o) => o.escrowAddress === escrowAddress);
        if (order) {
          order.lastChecked = Date.now();
          if (failed) {
            order.failCount = (order.failCount || 0) + 1;
          } else {
            order.failCount = 0;
          }
          saveOrders(orders);
        }
      });
    },

    async getAllOrders(limit: number = 50, offset: number = 0): Promise<TrackedOrder[]> {
      const orders = loadOrders();
      return orders.slice(offset, offset + limit);
    },

    async getOrderCount(): Promise<number> {
      return loadOrders().length;
    },

    async getOrdersByWallet(wallet: string): Promise<TrackedOrder[]> {
      return loadOrders().filter((o) => o.maker === wallet);
    },
  };
}

// ── Initialize the store ────────────────────────────────
const USE_DATABASE = !!process.env.DATABASE_URL;

const store: OrderStore = USE_DATABASE
  ? createPrismaStore()
  : createJsonStore();

if (USE_DATABASE) {
  logger.info("Order store: PostgreSQL (Prisma)");
} else {
  logger.warn(
    "Order store: JSON file (development mode). Set DATABASE_URL to use PostgreSQL."
  );
}

// ── Exports (same interface as before) ──────────────────
export async function addOrder(order: TrackedOrder): Promise<void> {
  return store.addOrder(order);
}

export async function getOpenOrders(): Promise<TrackedOrder[]> {
  return store.getOpenOrders();
}

export async function updateOrderStatus(
  escrowAddress: string,
  status: TrackedOrder["status"],
  txSignature?: string
): Promise<void> {
  return store.updateOrderStatus(escrowAddress, status, txSignature);
}

export async function markOrderChecked(
  escrowAddress: string,
  failed: boolean = false
): Promise<void> {
  return store.markOrderChecked(escrowAddress, failed);
}

export async function getAllOrders(limit: number = 50, offset: number = 0): Promise<TrackedOrder[]> {
  return store.getAllOrders(limit, offset);
}

export async function getOrderCount(): Promise<number> {
  return store.getOrderCount();
}

export async function getOrdersByWallet(
  wallet: string
): Promise<TrackedOrder[]> {
  return store.getOrdersByWallet(wallet);
}
