"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NeonCardProps {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "magenta" | "green" | "pink";
  hoverable?: boolean;
}

const glowStyles = {
  cyan: "border-neon-cyan/20 hover:border-neon-cyan/60 hover:shadow-neon-cyan",
  magenta: "border-neon-magenta/20 hover:border-neon-magenta/60 hover:shadow-neon-magenta",
  green: "border-neon-green/20 hover:border-neon-green/60 hover:shadow-neon-green",
  pink: "border-neon-pink/20 hover:border-neon-pink/60 hover:shadow-neon-pink",
};

export default function NeonCard({
  children,
  className,
  glow = "cyan",
  hoverable = true,
}: NeonCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -4 } : {}}
      className={cn(
        "bg-cyber-panel border rounded-sm p-6 transition-all duration-300",
        glowStyles[glow],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
