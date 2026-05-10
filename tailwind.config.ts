import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Per UI doc §6 — calm industrial SaaS palette.
        bg: "#F7F8FA",
        panel: "#FFFFFF",
        ink: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        accent: "#0EA5E9",
        navy: "#0F172A",
        steel: "#64748B",
        ok: "#16A34A",
        warn: "#F59E0B",
        bad: "#DC2626",
        soft: "#F1F5F9",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
