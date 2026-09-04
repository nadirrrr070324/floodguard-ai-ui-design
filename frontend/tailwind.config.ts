import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0a1628",
          light: "#162d50",
          mid: "#1a3a6e",
        },
        saffron: { DEFAULT: "#ff6f00", light: "#ff9800" },
        india: { green: "#138808", blue: "#0077cc" },
        water: { DEFAULT: "#0ea5e9", deep: "#0369a1" },
        flood: { critical: "#dc2626", high: "#ea580c", moderate: "#f59e0b", low: "#16a34a" },
      },
      keyframes: {
        ticker: { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } },
        pulseSos: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0.7)" },
          "50%": { boxShadow: "0 0 0 18px rgba(220,38,38,0)" },
        },
      },
      animation: {
        ticker: "ticker 40s linear infinite",
        "pulse-sos": "pulseSos 1.5s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;