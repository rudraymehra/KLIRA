"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { bn } from "@lightprotocol/stateless.js";
import { PublicKey } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import {
  getOrdersForWallet,
  updateOrderStatus,
  type StoredOrder,
} from "@/lib/order-store";
import { SOLANA_RPC_URL } from "@/lib/constants";

export function useUserOrders() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rpc = useMemo(
    () => createRpc(SOLANA_RPC_URL, SOLANA_RPC_URL, SOLANA_RPC_URL),
    []
  );

  const refreshOrders = useCallback(async () => {
    if (!publicKey) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stored = getOrdersForWallet(publicKey.toBase58());

      // Verify open orders on-chain
      const verified = await Promise.all(
        stored.map(async (order) => {
          if (order.status !== "open") return order;

          try {
            const address = new PublicKey(order.escrowAddress);
            const account = await rpc.getCompressedAccount(
              bn(address.toBytes())
            );

            if (!account) {
              // Account gone — filled or expired
              const now = Date.now();
              const newStatus =
                order.expiredAt > 0 && order.expiredAt < now
                  ? "expired"
                  : "filled";
              updateOrderStatus(order.escrowAddress, newStatus);
              return { ...order, status: newStatus } as StoredOrder;
            }

            return order;
          } catch {
            // RPC error — keep existing status
            return order;
          }
        })
      );

      setOrders(verified);
    } catch (err: any) {
      console.error("Failed to refresh orders:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [publicKey, rpc]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Auto-refresh open orders every 30 seconds
  useEffect(() => {
    if (!publicKey) return;
    const interval = setInterval(refreshOrders, 30_000);
    return () => clearInterval(interval);
  }, [publicKey, refreshOrders]);

  return { orders, loading, error, refreshOrders };
}
