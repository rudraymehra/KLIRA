"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CyberButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

const variants = {
  primary: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 hover:bg-neon-cyan/20 hover:border-neon-cyan hover:shadow-neon-cyan",
  secondary: "bg-neon-magenta/10 text-neon-magenta border-neon-magenta/50 hover:bg-neon-magenta/20 hover:border-neon-magenta hover:shadow-neon-magenta",
  danger: "bg-neon-pink/10 text-neon-pink border-neon-pink/50 hover:bg-neon-pink/20 hover:border-neon-pink hover:shadow-neon-pink",
  ghost: "bg-transparent text-white/70 border-white/20 hover:text-neon-cyan hover:border-neon-cyan/50",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export default function CyberButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className,
  type = "button",
}: CyberButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={cn(
        "clip-cyber font-orbitron font-semibold uppercase tracking-wider border transition-all duration-300",
        variants[variant],
        sizes[size],
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
