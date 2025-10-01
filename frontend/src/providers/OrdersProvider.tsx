"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useCancelOrder } from "@/hooks/useCancelOrder";
import { useToast } from "@/components/ui/Toast";
import { updateOrderStatus, type StoredOrder } from "@/lib/order-store";

interface OrdersContextValue {
  orders: StoredOrder[];
  loading: boolean;
  refreshOrders: () => Promise<void>;
  cancelOrder: (escrowAddress: string) => Promise<string | null>;
  cancellingOrders: Set<string>;
  cancelError: string | null;
  markCancelled: (escrowAddress: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}

export default function OrdersProvider({ children }: { children: ReactNode }) {
  const { orders, loading, refreshOrders } = useUserOrders();
  const {
    cancelOrder: cancelOrderTx,
    error: cancelError,
  } = useCancelOrder();
  const { addToast } = useToast();
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (cancelError) {
      addToast("error", cancelError);
    }
  }, [cancelError, addToast]);

  const cancelOrder = useCallback(
    async (escrowAddress: string) => {
      setCancellingOrders((prev) => new Set(prev).add(escrowAddress));
      try {
        const sig = await cancelOrderTx(escrowAddress);
        if (sig) {
          await refreshOrders();
        }
        return sig;
      } finally {
        setCancellingOrders((prev) => {
          const next = new Set(prev);
          next.delete(escrowAddress);
          return next;
        });
      }
    },
    [cancelOrderTx, refreshOrders]
  );

  const markCancelled = useCallback(
    (escrowAddress: string) => {
      updateOrderStatus(escrowAddress, "cancelled");
      refreshOrders();
    },
    [refreshOrders]
  );

  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        refreshOrders,
        cancelOrder,
        cancellingOrders,
        cancelError,
        markCancelled,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}
