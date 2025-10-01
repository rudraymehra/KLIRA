"use client";

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import OrderForm from "@/components/trade/OrderForm";

export default function TradePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <ErrorBoundary>
        <OrderForm />
      </ErrorBoundary>
    </div>
  );
}
