# Dota 2 Personal Dashboard — Development Reference

A personal Dota 2 performance-tracking dashboard. Built for multi-user use (Steam
login), backed by Supabase, with live match detail pulled from STRATZ's GraphQL
API. This doc is a snapshot of what exists as of **2026-08-24** — treat it as a
map for onboarding into the codebase, not a live source of truth; always check
the actual code/git history for current behavior before relying on a claim here.

## Tech stack

- **Frontend**: Next.js 14 (App Router, all Server Components unless noted), React 18, TypeScript
- **Styling**: Tailwind CSS with a custom dark theme (design tokens in `tailwind.config.ts` + `src/app/globals.css`), Radix UI primitives, `lucide-react` icons
- **Charts**: a mix — `recharts` powers the coach/progress/heroes charts (`BenchmarkTimeline`, `RadarAxes`, `PoolScatter`, `MmrChart`, `RolePieChart`, `ImpVsMmrChart`, `MmrForecast`, `RoleMmrLines`); the match-detail charts (`TeamNetWorthChart`, `NetworthTimeline`, `KillMatrix`) are hand-rolled inline SVG instead
- **Backend**: Supabase — Postgres + Row Level Security, Postgres RPC functions, Deno Edge Functions, `pg_cron` for scheduling
- **External data**: [STRATZ GraphQL API](https://api.stratz.com/graphql) — match history, match detail, hero/item/ability metadata, player profile
- **Auth**: Steam OpenID 2.0, manually bridged into Supabase Auth (Supabase has no native Steam provider)
- **Deploy**: Vercel (auto-deploys from the `claude/dota2-personal-dashboard-nxr9u3` branch on GitHub push), Supabase hosted project for DB/Edge Functions
- **Testing**: Playwright (one e2e spec), pgTAP-style SQL tests under `supabase/tests` (check current state — may be stale)

## Repo layout

```
src/app/            Next.js routes (pages + API routes), one folder per route
src/components/      UI components, grouped by the page/domain they belong to
src/lib/             Shared logic: Supabase clients, STRATZ client, formatters, static data maps
src/types/           Shared TS types, incl. database.ts (DB row shapes — see "Numeric scale conventions")
supabase/migrations/ SQL migrations, applied in filename order
supabase/functions/  Deno Edge Functions (STRATZ sync, weakness detection, digests)
```

## Pages

| Route | Purpose |
|---|---|
| `/` (Overview) | KPI cards, MMR chart, recent match table, role pie chart, form bar, play calendar heatmap, most-played heroes, weekly focus (top weakness), next-game advice |
| `/matches` | Full ranked match history list, filterable |
| `/match/[id]` | Match detail — see below, the most feature-dense page |
| `/heroes` | Hero pool table (win rate, games, meta win rate), pool scatter plot, patch impact, hero recommendations |
| `/heroes/[heroId]` | Per-hero match history and stats |
| `/progress` | MMR forecast, IMP-vs-MMR chart, role MMR lines, streak stats, milestones |
| `/coach` | Weakness cards (top-3 fixable weaknesses with estimated win-rate impact), radar chart vs benchmarks, benchmark timeline, goals list |
| `/settings` | Manual "sync now" trigger, account info |
| `/login` | Steam login entry point |

Every route has `loading.tsx` (skeleton), `error.tsx` (client component, retry via `reset()`), and there's a root `not-found.tsx`.

## Match detail page (`/match/[id]`) — component map

This page blends two data sources: the app's own `matches` table (the tracked
user's own stored stats — always available) and a **live, on-demand** STRATZ
fetch for the full 10-player breakdown (`getLiveMatchDetail()` in
`src/lib/stratz-match.ts` — never stored in the DB, refetched/cached per
request, degrades gracefully to `null` if STRATZ is unreachable so the page
still renders the personal-stats-only view).

| Component | What it shows | Data source |
|---|---|---|
| `MatchScoreline` | Team score header | live |
| `DraftBans` | Picks in order + bans | live |
| `LaneMatchup` | Top/mid/bottom lane hero-vs-hero rows + lane outcome | live (`player.lane`, `match.{top,mid,bottom}LaneOutcome`) |
| `TeamScoreboard` | Full 10-player table: KDA, level, GPM/XPM, net worth, items | live |
| `SkillBuildTimeline` | Per-player skill level-up order with talent markers | live (`playbackData.abilityLearnEvents`, resolved to names via the player's `abilities` cast log — STRATZ doesn't join ability names directly onto learn events) |
| `KillMatrix` | Who-killed-whom grid | live (`stats.killEvents`) |
| `TeamNetWorthChart` | Net worth **or** XP lead over time, toggle button | live (`radiantNetworthLeads`, `radiantExperienceLeads`) |
| (inline) `NetworthTimeline` | The tracked player's own net-worth curve + "throw" detection | own `matches.raw` JSONB |
| (inline) `StatCard` grid | KDA/IMP/GPM/deaths/etc vs personal benchmark percentile | own `matches` row + `player_benchmarks` |

## Data flow / sync pipeline

1. **`sync-matches`** Edge Function (cron: every 15 min) — pulls new matches from STRATZ for every logged-in user, writes to `matches` (one row per user per match, composite PK), extracts per-match tags via `tag-matches`.
2. **`snapshot-meta`** (cron: daily 04:00) — snapshots hero meta win rates into `hero_meta_daily`.
3. **`compute-weaknesses`** (cron: daily 04:30) — for each user, correlates metrics (GPM, deaths, CS@10, etc.) against win/loss via Pearson correlation, estimates win-rate impact of fixing each weakness, writes top-3 to `weaknesses`.
4. **`weekly-digest`** (cron: Mondays 01:00) — summary notification, delivered via Discord webhook (`DISCORD_WEBHOOK_URL` env var, if set) and/or email via Resend (`RESEND_API_KEY`, if set) — both delivery paths are optional/best-effort per env config.
5. **`prune-raw-jsonb`** (cron: daily 05:00) — trims the `matches.raw` JSONB payload after it's no longer needed for backfills, to control table size.
6. Materialized views `mv_hero_performance` and `mv_daily_summary` are refreshed as part of the pipeline and back most of the Heroes-page and Overview-page aggregates via RPC functions (`get_hero_pool_with_meta`, `get_daily_summary`, etc.) — **all filtered to `lobby_type in ('RANKED','ranked')` only**, matches from turbo/unranked lobbies are excluded everywhere in the app.

A manual "sync now" is also available from `/settings` (`TriggerSyncButton` → `POST /api/sync`).

## Auth flow

Steam has no OAuth/OIDC, only OpenID 2.0. Flow: `/auth/steam` redirects to Steam
→ Steam redirects back to `/auth/steam/callback` with an OpenID response →
the callback **re-verifies** the response with Steam directly (`check_authentication`,
security-critical, never trust the query string alone) → extracts the Steam64 ID
→ uses Supabase's Admin API (`generateLink` + `verifyOtp`) to find-or-create a
real Supabase Auth session, since there's no native Steam provider → fetches
the player's STRATZ profile (name/avatar/season rank) and upserts it into
`profiles`. `middleware.ts` gates every route except `/login` and `/auth/*`
behind a valid Supabase session.

## Database (Supabase Postgres)

Key tables (all RLS-scoped to `auth.uid()` via a `user_id` column except where noted):

- `profiles` — one row per user: `steam_account_id`, `persona_name`, `avatar_url`, `season_rank`, `season_leaderboard_rank`
- `matches` — per-user match history, composite PK `(user_id, match_id)`, includes a `raw` JSONB payload (STRATZ's full response, pruned periodically)
- `match_tags` — auto-detected tags per match (e.g. "throw", "stomp") with a `confidence` (0-1 fraction) and `reason` JSONB
- `player_benchmarks` — per-user, per-role percentile benchmarks (p25/p50/p75) for GPM/IMP/deaths/etc, replaces an earlier single-user global-benchmark design
- `weaknesses` — top-3 computed weaknesses per user, each with `est_delta_winrate` (see below)
- `goals` — user-set improvement goals
- `hero_meta_daily` — daily snapshot of hero meta win rates (not user-scoped)
- `api_cache`, `job_runs` — internal plumbing (cache/cron bookkeeping)

Materialized views `mv_hero_performance` / `mv_daily_summary` roll up `matches`
for the Heroes/Overview pages; both are ranked-only filtered and refreshed via
`refresh_materialized_views()`.

## Numeric scale conventions (read this before touching any display code)

This has been the single most recurring bug class in this project — the same
mistake (treating a 0-100 field as 0-1, or vice versa) has been found and fixed
multiple times across different components. **Before formatting any numeric
field, check its actual source and scale — don't assume from the name alone.**

| Field pattern | Scale | Needs `* 100` to display? |
|---|---|---|
| `win_rate` (from `mv_hero_performance`, `mv_daily_summary`, `get_summary`/`get_daily_summary` RPCs) | 0–100 | **No** — already scaled |
| `*_wr` (`player_wr`, `meta_wr`) | 0–1 fraction | **Yes** |
| `confidence` (on `match_tags`) | 0–1 fraction | **Yes** |
| `est_delta_winrate` (on `weaknesses`) | percentage points already (e.g. `3.6` = "+3.6% WR"), computed as `gap * corrWeight * 0.4` | **No** — fixed 2026-08-24, was double-scaled in `WeaknessCards.tsx` and `WeeklyFocus.tsx` |
| IMP score, KDA ratio | not a percentage at all | never scale |
| net worth, gold, GPM/XPM | raw gold/minute units | divide by 1000 + `.toFixed(1)}k` for net worth display, GPM/XPM shown raw |

`src/types/database.ts` has inline comments on every field where this has bitten
before — if you add a new percentage-like field anywhere (new RPC, new Edge
Function output), add a scale comment there too, and grep the whole frontend
for existing formatting of that field name before assuming a convention.

## STRATZ API — critical gotcha

**Never call `api.stratz.com` with the global `fetch()` from a Node context.**
Cloudflare bot management fingerprints undici's TLS/HTTP2 client and blocks it
with a 403 challenge page, even with a valid API key and correct headers — verified
directly: curl and Node's built-in `https` module both get a clean 200 with
identical request headers/body, `fetch()` gets Cloudflare's challenge every
time. Since Vercel's Node serverless runtime uses the same undici fetch, this
silently broke every STRATZ-backed Node-side feature in production (including
the login-time profile fetch — root cause of an earlier `persona_name`/
`avatar_url`-always-null bug that had only been patched with a manual DB
backfill, not fixed at the source).

**Fix**: `src/lib/stratz-client.ts` exports `stratzGraphQL()`, which uses
Node's `https` module instead of `fetch()`. All Node-side STRATZ calls go
through it (`src/lib/stratz-match.ts`, `src/app/auth/steam/callback/route.ts`).
The Deno-based Edge Function (`supabase/functions/_shared/stratz.ts`) is a
different runtime/fetch implementation and has not been observed to have this
problem — don't assume it needs the same fix without checking first.

If STRATZ calls start failing again, check the response body for a Cloudflare
"Just a moment..." challenge page before assuming an auth/rate-limit issue.

## Icon/asset CDN conventions

All Dota 2 art comes from STRATZ's CDN, no local assets:
- Hero icons: `https://cdn.stratz.com/images/dota2/heroes/{shortName}_icon.png` (`src/lib/hero-data.ts`)
- Hero vertical banners: `.../heroes/{shortName}_vert.png`
- Items: `https://cdn.stratz.com/images/dota2/items/{shortName}.png` (`src/lib/item-data.ts`, 575-entry static map)
- Abilities: `https://cdn.stratz.com/images/dota2/abilities/{shortName}.png` (`src/lib/ability-data.ts` — no static map needed, the live match query resolves ability shortnames/display names directly per-match)

Hero/item name maps are static files (source: STRATZ `constants` GraphQL query),
kept static to avoid a runtime dependency for metadata that rarely changes —
update periodically when new heroes/items ship.

## Verifying UI changes without a real login

Steam login can't be automated in this environment. The established pattern:
add a temporary unauthenticated route under `src/app/dev/*` that directly
imports and renders the component(s) under test with mock or live-fetched
fixture data, temporarily add `/dev` to `PUBLIC_PATHS` in `middleware.ts` to
bypass the auth gate, verify via the browser tools, then **fully delete**
`src/app/dev/` and revert the `middleware.ts` change before finishing. Always
open a **fresh browser tab** when checking console errors — a reused tab can
show stale `ChunkLoadError`/`SyntaxError` messages left over from earlier dev-server
restarts in the same session; this is a known false-positive, not a real bug.

## Known outstanding items (unverified — check before trusting)

- `.env.example` may be missing/stale (was missing as of a 2026-08-24 spot check, not investigated further)
