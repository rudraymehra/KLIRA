"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TOKENS } from "@/lib/tokens";
import type { Token } from "@/types";

interface TokenSelectorProps {
  label: string;
  selected: Token;
  onSelect: (token: Token) => void;
  excludeMint?: string;
}

export default function TokenSelector({
  label,
  selected,
  onSelect,
  excludeMint,
}: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = TOKENS.filter((t) => t.mint !== excludeMint);

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-white/30 font-jetbrains uppercase tracking-wider mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 bg-cyber-black border border-white/10 rounded-sm transition-all duration-200",
          "hover:border-neon-cyan/40 focus:border-neon-cyan/60 focus:outline-none",
          open && "border-neon-cyan/60"
        )}
      >
        <span className="text-lg">{selected.icon}</span>
        <div className="flex-1 text-left">
          <span className="font-orbitron font-semibold text-white text-sm">
            {selected.symbol}
          </span>
          <span className="text-xs text-white/30 ml-2">{selected.name}</span>
        </div>
        <svg
          className={cn(
            "w-4 h-4 text-white/30 transition-transform",
            open && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-cyber-panel border border-neon-cyan/20 rounded-sm shadow-neon-cyan overflow-hidden"
          >
            {filtered.map((token) => (
              <button
                key={token.mint}
                type="button"
                onClick={() => {
                  onSelect(token);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-neon-cyan/5",
                  token.mint === selected.mint && "bg-neon-cyan/10"
                )}
              >
                <span className="text-lg">{token.icon}</span>
                <div className="flex-1">
                  <span className="font-orbitron font-semibold text-white text-sm">
                    {token.symbol}
                  </span>
                  <span className="text-xs text-white/30 ml-2">{token.name}</span>
                </div>
                {token.price && (
                  <span className="text-xs font-jetbrains text-white/30">
                    ${token.price.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
