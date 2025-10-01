"use client";

import { motion } from "framer-motion";
import { HOW_IT_WORKS } from "@/lib/constants";

export default function HowItWorks() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-orbitron font-bold text-center mb-16 text-white"
        >
          How It <span className="text-neon-magenta text-glow-magenta">Works</span>
        </motion.h2>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-neon-cyan/50 via-neon-magenta/50 to-neon-cyan/50" />

          <div className="space-y-12">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative flex items-start gap-6 pl-2"
              >
                {/* Step circle */}
                <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-cyber-black border border-neon-cyan/50 flex items-center justify-center shadow-neon-cyan">
                  <span className="font-orbitron text-sm font-bold text-neon-cyan">
                    {item.step}
                  </span>
                </div>

                <div className="pt-1">
                  <h3 className="text-lg font-orbitron font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/40 font-inter leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
