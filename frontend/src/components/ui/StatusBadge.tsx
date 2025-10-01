import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusStyles: Record<OrderStatus, string> = {
  open: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 animate-pulse-slow",
  filled: "bg-neon-green/10 text-neon-green border-neon-green/30",
  cancelled: "bg-white/5 text-white/40 border-white/10",
  expired: "bg-neon-pink/10 text-neon-pink border-neon-pink/30",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-jetbrains uppercase tracking-wider border",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}
