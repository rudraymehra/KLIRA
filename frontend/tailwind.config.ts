import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: "#0a0a0f",
          panel: "#111119",
          "panel-light": "#1a1a2e",
        },
        neon: {
          cyan: "#00f0ff",
          magenta: "#ff00ff",
          green: "#39ff14",
          pink: "#ff2d7b",
        },
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        jetbrains: ["var(--font-jetbrains)", "monospace"],
        inter: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        "neon-cyan": "0 0 5px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.3)",
        "neon-cyan-lg":
          "0 0 10px #00f0ff, 0 0 40px rgba(0, 240, 255, 0.4), 0 0 80px rgba(0, 240, 255, 0.1)",
        "neon-magenta": "0 0 5px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.3)",
        "neon-green": "0 0 5px #39ff14, 0 0 20px rgba(57, 255, 20, 0.3)",
        "neon-pink": "0 0 5px #ff2d7b, 0 0 20px rgba(255, 45, 123, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        glitch: "glitch 2.5s infinite",
        scanline: "scanline 8s linear infinite",
        "border-glow": "borderGlow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        borderGlow: {
          "0%": {
            boxShadow: "0 0 5px #00f0ff, 0 0 20px rgba(0, 240, 255, 0.2)",
          },
          "100%": {
            boxShadow: "0 0 10px #00f0ff, 0 0 40px rgba(0, 240, 255, 0.4)",
          },
        },
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)",
        "cyber-grid-dense":
          "linear-gradient(rgba(0, 240, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.06) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
    },
  },
  plugins: [],
};

export default config;
