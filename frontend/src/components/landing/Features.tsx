"use client";

import { motion } from "framer-motion";
import NeonCard from "@/components/ui/NeonCard";
import { FEATURES } from "@/lib/constants";

const glows = ["cyan", "magenta", "green", "cyan"] as const;

export default function Features() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-orbitron font-bold text-center mb-16 text-white"
        >
          Why <span className="text-neon-cyan text-glow-cyan">Klira</span>?
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <NeonCard glow={glows[i]} className="h-full">
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-orbitron font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/40 font-inter leading-relaxed">
                  {feature.description}
                </p>
              </NeonCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
