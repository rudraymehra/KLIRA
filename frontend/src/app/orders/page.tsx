"use client";

import { motion } from "framer-motion";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import OrdersTable from "@/components/orders/OrdersTable";

export default function OrdersPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-3xl mx-auto px-4 py-12">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-orbitron font-bold text-2xl text-white mb-8"
      >
        Your <span className="text-neon-cyan text-glow-cyan">Orders</span>
      </motion.h1>

      <ErrorBoundary>
        <OrdersTable />
      </ErrorBoundary>
    </div>
  );
}
