import {
  getStoredOrders,
  saveOrder,
  updateOrderStatus,
  getOrdersForWallet,
  type StoredOrder,
} from "@/lib/order-store";

function createMockOrder(overrides: Partial<StoredOrder> = {}): StoredOrder {
  return {
    id: "kl_test123",
    escrowAddress: "EscrowAddr111111111111111111111111111111111",
    uniqueId: "1234567890",
    maker: "Maker1111111111111111111111111111111111111",
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    inputSymbol: "SOL",
    outputSymbol: "USDC",
    makingAmount: "1000000000",
    takingAmount: "150000000",
    expiredAt: Date.now() + 86_400_000,
    createdAt: Date.now(),
    status: "open",
    ...overrides,
  };
}

describe("order-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getStoredOrders", () => {
    it("returns empty array when no orders stored", () => {
      expect(getStoredOrders()).toEqual([]);
    });

    it("returns stored orders", () => {
      const order = createMockOrder();
      localStorage.setItem("klira_orders", JSON.stringify([order]));
      expect(getStoredOrders()).toEqual([order]);
    });

    it("handles corrupted JSON gracefully", () => {
      localStorage.setItem("klira_orders", "not-valid-json");
      expect(getStoredOrders()).toEqual([]);
    });
  });

  describe("saveOrder", () => {
    it("saves an order to empty store", () => {
      const order = createMockOrder();
      saveOrder(order);
      const stored = getStoredOrders();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(order.id);
    });

    it("prepends new orders (most recent first)", () => {
      const order1 = createMockOrder({ id: "kl_first" });
      const order2 = createMockOrder({ id: "kl_second" });
      saveOrder(order1);
      saveOrder(order2);
      const stored = getStoredOrders();
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe("kl_second");
      expect(stored[1].id).toBe("kl_first");
    });

    it("preserves existing orders", () => {
      saveOrder(createMockOrder({ id: "kl_1" }));
      saveOrder(createMockOrder({ id: "kl_2" }));
      saveOrder(createMockOrder({ id: "kl_3" }));
      expect(getStoredOrders()).toHaveLength(3);
    });
  });

  describe("updateOrderStatus", () => {
    it("updates the status of an existing order", () => {
      const order = createMockOrder({ status: "open" });
      saveOrder(order);
      updateOrderStatus(order.escrowAddress, "cancelled");
      const stored = getStoredOrders();
      expect(stored[0].status).toBe("cancelled");
    });

    it("does not affect other orders", () => {
      const order1 = createMockOrder({
        id: "kl_1",
        escrowAddress: "addr1111111111111111111111111111111111111111",
        status: "open",
      });
      const order2 = createMockOrder({
        id: "kl_2",
        escrowAddress: "addr2222222222222222222222222222222222222222",
        status: "open",
      });
      saveOrder(order1);
      saveOrder(order2);
      updateOrderStatus(
        "addr1111111111111111111111111111111111111111",
        "filled"
      );
      const stored = getStoredOrders();
      const updated1 = stored.find((o) => o.id === "kl_1");
      const updated2 = stored.find((o) => o.id === "kl_2");
      expect(updated1!.status).toBe("filled");
      expect(updated2!.status).toBe("open");
    });

    it("does nothing if escrow address not found", () => {
      const order = createMockOrder();
      saveOrder(order);
      updateOrderStatus("nonexistent_address", "cancelled");
      const stored = getStoredOrders();
      expect(stored[0].status).toBe("open");
    });

    it("can update to all valid statuses", () => {
      const statuses: StoredOrder["status"][] = [
        "open",
        "filled",
        "cancelled",
        "expired",
      ];
      for (const status of statuses) {
        const order = createMockOrder({
          escrowAddress: `addr_${status}`,
        });
        saveOrder(order);
        updateOrderStatus(`addr_${status}`, status);
        const stored = getStoredOrders();
        const found = stored.find((o) => o.escrowAddress === `addr_${status}`);
        expect(found!.status).toBe(status);
      }
    });
  });

  describe("getOrdersForWallet", () => {
    it("returns empty array for unknown wallet", () => {
      saveOrder(createMockOrder());
      expect(getOrdersForWallet("unknown_wallet")).toEqual([]);
    });

    it("returns orders for the specified wallet", () => {
      saveOrder(createMockOrder({ maker: "wallet_A" }));
      saveOrder(createMockOrder({ maker: "wallet_B" }));
      saveOrder(createMockOrder({ maker: "wallet_A", id: "kl_2" }));

      const result = getOrdersForWallet("wallet_A");
      expect(result).toHaveLength(2);
      result.forEach((o) => expect(o.maker).toBe("wallet_A"));
    });

    it("returns empty array when no orders exist", () => {
      expect(getOrdersForWallet("any_wallet")).toEqual([]);
    });
  });
});
