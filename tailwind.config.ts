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
        // ── STRATZ-derived palette ────────────────────────────────
        // Sampled from stratz.com's own computed styles rather than guessed:
        // pure-black ground, #141414 cards, translucent-white overlays for
        // anything stacked on top, a 1px rgba(255,255,255,0.08) hairline, and
        // #2ACB4F / #D6AF4C / #10A4C1 as the three semantic accents.
        // Colour carries meaning here (green/red = result, gold = volume,
        // teal = brand/interactive) — see globals.css for the rationale.
        bg: {
          primary: "#000000",
          secondary: "#0A0A0A",
          card: "#141414",
          hover: "#1F1F1F",
          // Translucent overlays — for surfaces stacked *inside* a card, so
          // they keep working over any parent instead of hard-coding a shade.
          overlay: "rgba(255,255,255,0.04)",
          "overlay-strong": "rgba(255,255,255,0.08)",
        },
        accent: {
          // Teal is STRATZ's actual brand hue (their nav/CTA gradient runs
          // #0BAFD0 → #078197); blue is kept as the older link colour.
          teal: "#10A4C1",
          "teal-bright": "#0BAFD0",
          "teal-deep": "#078197",
          "teal-dim": "#13343A",
          blue: "#4C9BE8",
          "blue-dim": "#1B3A57",
          green: "#2ACB4F",
          "green-dim": "#123A1E",
          red: "#EC041F",
          "red-dim": "#4D0810",
          gold: "#D6AF4C",
          "gold-dim": "#3D340C",
          orange: "#F59E0B",
          purple: "#8B5CF6",
        },
        border: {
          DEFAULT: "#262626",
          strong: "#3D3D3D",
          hairline: "rgba(255,255,255,0.08)",
        },
        text: {
          primary: "#E6E6E6",
          secondary: "#999999",
          muted: "#5C5C5C",
        },
        win: "#2ACB4F",
        loss: "#EC041F",
        // Team identity — Radiant is green-leaning, Dire red-leaning, matching
        // both the game and STRATZ. Separate from win/loss so a scoreboard can
        // colour a losing Radiant team without implying "this side won".
        radiant: "#4FA855",
        dire: "#C23C2A",
        // Rank medals, Herald → Immortal. Previously hard-coded inside
        // PlayerHeader; promoted to tokens so every rank chip agrees.
        rank: {
          herald: "#9D9D9D",
          guardian: "#7B904B",
          crusader: "#AE6F3B",
          archon: "#8A9AC4",
          legend: "#C1C2B3",
          ancient: "#8AB7D9",
          divine: "#C48DFE",
          immortal: "#B1CCFB",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Thai", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
      boxShadow: {
        // STRATZ leans on a tight ambient shadow plus an inset hairline
        // instead of a drawn border — it reads as depth without adding
        // visual weight at this density.
        ambient: "0 0 4px rgba(0,0,0,0.5)",
        card: "0 0 0 1px rgba(255,255,255,0.06) inset, 0 1px 3px rgba(0,0,0,0.6)",
        "card-hover":
          "0 0 0 1px rgba(255,255,255,0.12) inset, 0 4px 16px rgba(0,0,0,0.7)",
      },
      backgroundImage: {
        // STRATZ's own nav/CTA gradient, sampled from their site.
        "brand-gradient": "linear-gradient(124deg, #0BAFD0, #078197)",
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
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "scale-in": "scale-in 0.12s ease-out",
        "grow-x": "grow-x 0.5s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
