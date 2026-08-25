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

// Rank medal icon images. Neither STRATZ's GraphQL schema nor its CDN
// (cdn.stratz.com) expose these, and no candidate path on Valve's own CDN
// (cdn.cloudflare.steamstatic.com) resolved either — every one checked
// 404'd. These URLs are the Dota 2 Wiki's mirror of Valve's original
// SeasonalRank{bracket}-{star}.png / SeasonalRankTop{n}.png game assets,
// resolved individually via MediaWiki's imageinfo API (not guessed —
// every entry below was confirmed to return a live image on 2026-08-25).
//
// Fandom's CDN hotlink-protects these (200 with a dota2.fandom.com Referer,
// 404 with any other) — confirmed with curl, not assumed — so they can't be
// used as a direct <img src>. /api/rank-icon/[key] fetches them server-side
// with the right Referer and re-serves the bytes from our own origin;
// rankTierIconUrl() below points at that route, not at wikia directly.
export const RANK_ICON_URLS: Record<string, string> = {
  "0-0": "https://static.wikia.nocookie.net/dota2_gamepedia/images/e/e7/SeasonalRank0-0.png/revision/latest",
  "1-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/85/SeasonalRank1-1.png/revision/latest",
  "1-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/e/ee/SeasonalRank1-2.png/revision/latest",
  "1-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/0/05/SeasonalRank1-3.png/revision/latest",
  "1-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/6/6d/SeasonalRank1-4.png/revision/latest",
  "1-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/2/2b/SeasonalRank1-5.png/revision/latest",
  "2-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/c/c7/SeasonalRank2-1.png/revision/latest",
  "2-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/2/2c/SeasonalRank2-2.png/revision/latest",
  "2-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/f/f5/SeasonalRank2-3.png/revision/latest",
  "2-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/b/b4/SeasonalRank2-4.png/revision/latest",
  "2-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/3/32/SeasonalRank2-5.png/revision/latest",
  "3-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/82/SeasonalRank3-1.png/revision/latest",
  "3-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/6/6e/SeasonalRank3-2.png/revision/latest",
  "3-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/6/67/SeasonalRank3-3.png/revision/latest",
  "3-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/87/SeasonalRank3-4.png/revision/latest",
  "3-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/b/b1/SeasonalRank3-5.png/revision/latest",
  "4-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/7/76/SeasonalRank4-1.png/revision/latest",
  "4-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/87/SeasonalRank4-2.png/revision/latest",
  "4-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/6/60/SeasonalRank4-3.png/revision/latest",
  "4-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/4/4a/SeasonalRank4-4.png/revision/latest",
  "4-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/a/a3/SeasonalRank4-5.png/revision/latest",
  "5-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/7/79/SeasonalRank5-1.png/revision/latest",
  "5-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/5/52/SeasonalRank5-2.png/revision/latest",
  "5-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/88/SeasonalRank5-3.png/revision/latest",
  "5-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/2/25/SeasonalRank5-4.png/revision/latest",
  "5-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/8e/SeasonalRank5-5.png/revision/latest",
  "6-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/e/e0/SeasonalRank6-1.png/revision/latest",
  "6-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/1/1c/SeasonalRank6-2.png/revision/latest",
  "6-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/d/da/SeasonalRank6-3.png/revision/latest",
  "6-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/d/db/SeasonalRank6-4.png/revision/latest",
  "6-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/4/47/SeasonalRank6-5.png/revision/latest",
  "7-1": "https://static.wikia.nocookie.net/dota2_gamepedia/images/b/b7/SeasonalRank7-1.png/revision/latest",
  "7-2": "https://static.wikia.nocookie.net/dota2_gamepedia/images/8/8f/SeasonalRank7-2.png/revision/latest",
  "7-3": "https://static.wikia.nocookie.net/dota2_gamepedia/images/f/fd/SeasonalRank7-3.png/revision/latest",
  "7-4": "https://static.wikia.nocookie.net/dota2_gamepedia/images/1/13/SeasonalRank7-4.png/revision/latest",
  "7-5": "https://static.wikia.nocookie.net/dota2_gamepedia/images/3/33/SeasonalRank7-5.png/revision/latest",
  "8-0": "https://static.wikia.nocookie.net/dota2_gamepedia/images/f/f2/SeasonalRankTop0.png/revision/latest",
};

export function rankTierIconKey(rankTier: number | null): string {
  if (!rankTier) return "0-0";
  const bracket = Math.min(8, Math.floor(rankTier / 10));
  if (bracket >= 8) return "8-0";
  const stars = Math.min(5, Math.max(1, rankTier % 10 || 1));
  const key = `${bracket}-${stars}`;
  return key in RANK_ICON_URLS ? key : "0-0";
}

/** Same-origin path — routes through /api/rank-icon so the browser never
 * hits Fandom's hotlink-protected CDN directly. */
export function rankTierIconUrl(rankTier: number | null): string {
  return `/api/rank-icon/${rankTierIconKey(rankTier)}`;
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
