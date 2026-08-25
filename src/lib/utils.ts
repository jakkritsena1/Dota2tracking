import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { th } from "date-fns/locale";
import type { RangeParam, RoleParam } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date helpers ─────────────────────────────────────────────

export function formatMatchDate(isoString: string): string {
  return format(new Date(isoString), "d MMM HH:mm", { locale: th });
}

export function formatRelative(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: th });
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Range to dates ────────────────────────────────────────────

export function rangeToStartDate(range: RangeParam): Date {
  const now = new Date();
  switch (range) {
    case "7d":  return new Date(now.setDate(now.getDate() - 7));
    case "30d": return new Date(now.setDate(now.getDate() - 30));
    case "90d": return new Date(now.setDate(now.getDate() - 90));
    case "all": return new Date(0);
  }
}

// ── Number formatters ─────────────────────────────────────────

export function formatKDA(kills: number, deaths: number, assists: number): string {
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  return kda.toFixed(2);
}

export function formatDelta(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  return delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
}

export function deltaColor(delta: string | null, lowerIsBetter = false): string {
  if (!delta) return "text-text-secondary";
  const positive = delta.startsWith("+");
  const good = lowerIsBetter ? !positive : positive;
  return good ? "text-win" : "text-loss";
}

// ── Rank tier helpers ─────────────────────────────────────────

const RANK_NAMES = [
  "", "Herald", "Guardian", "Crusader", "Archon",
  "Legend", "Ancient", "Divine", "Immortal",
];

export function rankTierToName(rankTier: number | null): string {
  if (!rankTier) return "Unknown";
  const bracket = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  const name = RANK_NAMES[bracket] ?? "Unknown";
  if (bracket >= 8) return "Immortal";
  return `${name} ${stars}`;
}

// Medal colours, Herald → Immortal. Mirrors the `rank.*` Tailwind tokens —
// kept here too because SVG fills and inline styles can't use a class.
const RANK_COLORS = [
  "#999999", // (unranked)
  "#9D9D9D", // Herald
  "#7B904B", // Guardian
  "#AE6F3B", // Crusader
  "#8A9AC4", // Archon
  "#C1C2B3", // Legend
  "#8AB7D9", // Ancient
  "#C48DFE", // Divine
  "#B1CCFB", // Immortal
];

export function rankTierColor(rankTier: number | null): string {
  if (!rankTier) return RANK_COLORS[0];
  return RANK_COLORS[Math.min(8, Math.floor(rankTier / 10))] ?? RANK_COLORS[0];
}

export function rankTierToMmr(rankTier: number | null): number {
  if (!rankTier) return 0;
  const bracket = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  const baseMMR =   [0, 100, 770, 1400, 2080, 2800, 3530, 4290, 5500][bracket] ?? 0;
  const starsMMR = ([0, 150,  90,   95,  100,  105,  115,  160,    0][bracket] ?? 0) * stars;
  return baseMMR + starsMMR;
}

// ── Role label ────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  carry: "Carry",
  mid: "Mid",
  offlane: "Offlane",
  support: "Support",
  hardsupport: "Hard Support",
};

export function roleLabel(role: string | null): string {
  return role ? (ROLE_LABELS[role] ?? role) : "—";
}

// ── Hero image URL from STRATZ CDN ───────────────────────────

export function heroImageUrl(heroName: string, variant: "icon" | "vert" = "icon"): string {
  const name = heroName.toLowerCase().replace(/\s+/g, "_").replace(/^npc_dota_hero_/, "");
  return `https://cdn.stratz.com/images/dota2/heroes/${name}_${variant}.png`;
}

// ── Query param validation ────────────────────────────────────

export function parseRange(value: string | null): RangeParam {
  const valid: RangeParam[] = ["7d", "30d", "90d", "all"];
  return valid.includes(value as RangeParam) ? (value as RangeParam) : "30d";
}

export function parseRole(value: string | null): RoleParam {
  const valid: RoleParam[] = ["all","carry","mid","offlane","support","hardsupport"];
  return valid.includes(value as RoleParam) ? (value as RoleParam) : "all";
}

// ── Min sample size guard ─────────────────────────────────────

export const MIN_GAMES_FOR_INSIGHT = 15;
export const MIN_GAMES_FOR_SUMMARY = 10;

export function hasSufficientSamples(count: number, min = MIN_GAMES_FOR_INSIGHT): boolean {
  return count >= min;
}

// ── Compact number / clock formatting ────────────────────────

/** 12_345 → "12.3k". Used for net worth, damage, healing. */
export function formatCompact(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1000) return String(Math.round(value));
  return `${(value / 1000).toFixed(digits)}k`;
}

/** Game clock from seconds — "8:04", or "-1:30" for pre-horn events. */
export function formatClock(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(seconds));
  return `${sign}${Math.floor(abs / 60)}:${(abs % 60).toString().padStart(2, "0")}`;
}
