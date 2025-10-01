"use client";

import { useState, useCallback, useRef, useEffect, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SOLANA_NETWORK } from "@/lib/constants";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  txSignature?: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string, txSignature?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function getExplorerUrl(sig: string): string {
  const cluster = SOLANA_NETWORK === "mainnet-beta" ? "" : `?cluster=${SOLANA_NETWORK}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

const typeStyles: Record<ToastType, string> = {
  success: "border-neon-green/40 bg-neon-green/5",
  error: "border-neon-pink/40 bg-neon-pink/5",
  info: "border-neon-cyan/40 bg-neon-cyan/5",
};

const typeTextStyles: Record<ToastType, string> = {
  success: "text-neon-green",
  error: "text-neon-pink",
  info: "text-neon-cyan",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clear all pending timers on unmount
  useEffect(() => {
    const timers = timerMap.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, txSignature?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message, txSignature }]);

      // Auto-remove after 6 seconds
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timerMap.current.delete(id);
      }, 6000);
      timerMap.current.set(id, timer);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timerMap.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMap.current.delete(id);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container */}
      <div
        role="alert"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "border rounded-sm p-4 backdrop-blur-sm",
                typeStyles[toast.type]
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-jetbrains",
                      typeTextStyles[toast.type]
                    )}
                  >
                    {toast.message}
                  </p>
                  {toast.txSignature && (
                    <a
                      href={getExplorerUrl(toast.txSignature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-jetbrains text-white/40 hover:text-neon-cyan transition-colors mt-1 block truncate"
                    >
                      View on Explorer →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white/20 hover:text-white/60 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
