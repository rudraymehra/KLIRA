"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span";
}

export default function GlitchText({
  text,
  className,
  as: Tag = "h1",
}: GlitchTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Tag
        className={cn(
          "glitch-text font-orbitron font-bold text-white",
          className
        )}
        data-text={text}
      >
        {text}
      </Tag>
    </motion.div>
  );
}
