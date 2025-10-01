export interface StoredOrder {
  id: string;
  escrowAddress: string;
  uniqueId: string;
  maker: string;
  inputMint: string;
  outputMint: string;
  inputSymbol: string;
  outputSymbol: string;
  makingAmount: string;
  takingAmount: string;
  expiredAt: number;
  createdAt: number;
  status: "open" | "filled" | "cancelled" | "expired";
  txSignature?: string;
}

const STORAGE_KEY = "klira_orders";

export function getStoredOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: StoredOrder): void {
  const orders = getStoredOrders();
  orders.unshift(order);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function updateOrderStatus(
  escrowAddress: string,
  status: StoredOrder["status"]
): void {
  const orders = getStoredOrders();
  const updated = orders.map((o) =>
    o.escrowAddress === escrowAddress ? { ...o, status } : o
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getOrdersForWallet(wallet: string): StoredOrder[] {
  return getStoredOrders().filter((o) => o.maker === wallet);
}
