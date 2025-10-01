"use client";

import CyberButton from "@/components/ui/CyberButton";
import type { StoredOrder } from "@/lib/order-store";

interface OrderActionsProps {
  order: StoredOrder;
  onCancel: (escrowAddress: string) => void;
  cancelLoading: boolean;
}

export default function OrderActions({
  order,
  onCancel,
  cancelLoading,
}: OrderActionsProps) {
  if (order.status !== "open") return null;

  function handleCancel() {
    if (window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      onCancel(order.escrowAddress);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
      <CyberButton
        variant="danger"
        size="sm"
        onClick={handleCancel}
        disabled={cancelLoading}
      >
        {cancelLoading ? "Cancelling..." : "Cancel Order"}
      </CyberButton>
    </div>
  );
}
