import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark STRATZ-inspired palette
        bg: {
          primary: "#0F1923",
          secondary: "#1A2534",
          card: "#1E2D3E",
          hover: "#243447",
        },
        accent: {
          blue: "#4C9BE8",
          "blue-dim": "#2A5F8F",
          green: "#45B26B",
          "green-dim": "#1E5C37",
          red: "#EF4444",
          "red-dim": "#7A1F1F",
          orange: "#F59E0B",
          purple: "#8B5CF6",
        },
        border: {
          DEFAULT: "#2A3B50",
          strong: "#3D5166",
        },
        text: {
          primary: "#F0F4F8",
          secondary: "#8B9DB5",
          muted: "#566D87",
        },
        win: "#45B26B",
        loss: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
