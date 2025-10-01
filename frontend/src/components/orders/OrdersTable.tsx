"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import OrderCard from "./OrderCard";
import CyberButton from "@/components/ui/CyberButton";
import { OrderCardSkeleton } from "@/components/ui/Skeleton";
import { useOrders } from "@/providers/OrdersProvider";
import { cn } from "@/lib/utils";

type OrderTab = "all" | "open" | "filled" | "cancelled" | "expired";

const TABS: { value: OrderTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "filled", label: "Filled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export default function OrdersTable() {
  const [activeTab, setActiveTab] = useState<OrderTab>("all");
  const { orders: allOrders, loading, cancelOrder, cancellingOrders, refreshOrders } =
    useOrders();
  const { connected } = useWallet();

  const orders = useMemo(() => {
    if (activeTab === "all") return allOrders;
    return allOrders.filter((o) => o.status === activeTab);
  }, [allOrders, activeTab]);

  function handleCancel(escrowAddress: string) {
    cancelOrder(escrowAddress);
  }

  if (!connected) {
    return (
      <div className="text-center py-20">
        <p className="text-white/20 font-jetbrains text-sm mb-6">
          Connect your wallet to view orders
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab filters + refresh */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-2 text-xs font-jetbrains uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap",
                activeTab === tab.value
                  ? "text-neon-cyan border-neon-cyan"
                  : "text-white/30 border-transparent hover:text-white/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CyberButton variant="ghost" size="sm" onClick={refreshOrders}>
          Refresh
        </CyberButton>
      </div>

      {/* Skeleton loading */}
      {loading && (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Orders */}
      {!loading && orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map((order, i) => (
            <OrderCard
              key={order.escrowAddress}
              order={order}
              index={i}
              onCancel={handleCancel}
              cancelLoading={cancellingOrders.has(order.escrowAddress)}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <p className="text-white/20 font-jetbrains text-sm mb-6">
              No {activeTab === "all" ? "" : activeTab} orders found
            </p>
            <Link href="/trade">
              <CyberButton variant="primary" size="md">
                Place Your First Order
              </CyberButton>
            </Link>
          </motion.div>
        )
      )}
    </div>
  );
}
