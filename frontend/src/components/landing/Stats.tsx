"use client";

import { motion } from "framer-motion";
import { STATS } from "@/lib/constants";

export default function Stats() {
  return (
    <section className="py-12 border-y border-neon-cyan/10 bg-cyber-panel/50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="text-center"
            >
              <p className="text-2xl sm:text-3xl font-orbitron font-bold text-neon-cyan text-glow-cyan">
                {stat.value}
              </p>
              <p className="text-xs text-white/40 font-jetbrains uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
