"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GlitchText from "@/components/ui/GlitchText";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background grid glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,240,255,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <span className="inline-block px-4 py-1.5 text-xs font-jetbrains uppercase tracking-widest text-neon-cyan border border-neon-cyan/30 bg-neon-cyan/5 rounded-sm">
            Powered by ZK Compression
          </span>
        </motion.div>

        <GlitchText
          text="RENT-FREE LIMIT ORDERS"
          className="text-4xl sm:text-5xl md:text-7xl leading-tight mb-6"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 font-inter"
        >
          Place limit orders on Solana without paying rent. Your capital stays
          fully available — no locked SOL, no wasted fees.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/trade"
            className="clip-cyber font-orbitron font-semibold uppercase tracking-wider border transition-all duration-300 bg-neon-cyan/10 text-neon-cyan border-neon-cyan/50 hover:bg-neon-cyan/20 hover:border-neon-cyan hover:shadow-neon-cyan px-8 py-3.5 text-base inline-block"
          >
            Start Trading
          </Link>
          <Link
            href="/orders"
            className="clip-cyber font-orbitron font-semibold uppercase tracking-wider border transition-all duration-300 bg-transparent text-white/70 border-white/20 hover:text-neon-cyan hover:border-neon-cyan/50 px-8 py-3.5 text-base inline-block"
          >
            View Orders
          </Link>
        </motion.div>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-20 h-px bg-gradient-to-r from-transparent via-neon-cyan/40 to-transparent"
        />
      </div>
    </section>
  );
}
