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
        // STRATZ-style dark palette — near-black surfaces, semantic accents
        // (green/red = result, gold = volume/count). Colour carries meaning
        // here, not just decoration — see globals.css for the rationale.
        bg: {
          primary: "#000000",
          secondary: "#0A0A0A",
          card: "#141414",
          hover: "#1F1F1F",
        },
        accent: {
          blue: "#4C9BE8",
          "blue-dim": "#1B3A57",
          green: "#2ACB4F",
          "green-dim": "#123A1E",
          red: "#EC041F",
          "red-dim": "#4D0810",
          gold: "#CBB02A",
          "gold-dim": "#3D340C",
          orange: "#F59E0B",
          purple: "#8B5CF6",
        },
        border: {
          DEFAULT: "#262626",
          strong: "#3D3D3D",
        },
        text: {
          primary: "#E6E6E6",
          secondary: "#999999",
          muted: "#5C5C5C",
        },
        win: "#2ACB4F",
        loss: "#EC041F",
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
