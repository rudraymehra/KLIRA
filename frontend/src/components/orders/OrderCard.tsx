"use client";

import { motion } from "framer-motion";
import NeonCard from "@/components/ui/NeonCard";
import StatusBadge from "@/components/ui/StatusBadge";
import OrderActions from "./OrderActions";
import { formatDate, getTimeRemaining, shortenAddress } from "@/lib/utils";
import { TOKENS } from "@/lib/tokens";
import type { StoredOrder } from "@/lib/order-store";

interface OrderCardProps {
  order: StoredOrder;
  index: number;
  onCancel: (escrowAddress: string) => void;
  cancelLoading: boolean;
}

const glowMap = {
  open: "cyan",
  filled: "green",
  cancelled: "pink",
  expired: "pink",
} as const;

function getDecimalsForSymbol(symbol: string): number {
  const token = TOKENS.find((t) => t.symbol === symbol);
  return token ? token.decimals : 6;
}

function formatAmount(raw: string, decimals: number = 6): string {
  const num = Number(raw) / 10 ** decimals;
  if (num === 0) return "0";
  if (num < 0.0001) return num.toExponential(2);
  return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function OrderCard({
  order,
  index,
  onCancel,
  cancelLoading,
}: OrderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <NeonCard
        glow={glowMap[order.status]}
        hoverable={false}
        className="p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-orbitron font-semibold text-sm text-white">
              {order.inputSymbol}
            </span>
            <svg
              className="w-4 h-4 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
            <span className="font-orbitron font-semibold text-sm text-white">
              {order.outputSymbol}
            </span>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-white/30 font-jetbrains block">
              Making
            </span>
            <span className="font-jetbrains text-white">
              {formatAmount(order.makingAmount, getDecimalsForSymbol(order.inputSymbol))} {order.inputSymbol}
            </span>
          </div>
          <div>
            <span className="text-xs text-white/30 font-jetbrains block">
              Taking
            </span>
            <span className="font-jetbrains text-neon-green">
              {formatAmount(order.takingAmount, getDecimalsForSymbol(order.outputSymbol))} {order.outputSymbol}
            </span>
          </div>
          <div>
            <span className="text-xs text-white/30 font-jetbrains block">
              {order.status === "open" ? "Expires In" : "Created"}
            </span>
            <span className="font-jetbrains text-white/60">
              {order.status === "open" && order.expiredAt > 0
                ? getTimeRemaining(new Date(order.expiredAt))
                : formatDate(new Date(order.createdAt))}
            </span>
          </div>
          <div>
            <span className="text-xs text-white/30 font-jetbrains block">
              Escrow
            </span>
            <span className="font-jetbrains text-white/40 text-xs">
              {shortenAddress(order.escrowAddress, 6)}
            </span>
          </div>
        </div>

        {/* TX Signature */}
        {order.txSignature && (
          <div className="mt-3 text-[10px] font-jetbrains text-white/15">
            tx: {shortenAddress(order.txSignature, 8)}
          </div>
        )}

        <OrderActions
          order={order}
          onCancel={onCancel}
          cancelLoading={cancelLoading}
        />
      </NeonCard>
    </motion.div>
  );
}
