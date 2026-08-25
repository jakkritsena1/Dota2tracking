// Edge Function: snapshot-meta
// Runs daily at 04:00 BKK (21:00 UTC).
// 1. Fetches hero winrates from STRATZ for each bracket+role combo.
// 2. Inserts into hero_meta_daily (idempotent — today's date is the PK component).
// 3. Computes player benchmark percentiles from our own match data
//    and stores them in the benchmarks table.
// Must run every day — historical snapshots cannot be reconstructed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getHeroMeta,
  rankTierToBracket,
} from "../_shared/stratz.ts";
import { verifyServiceRole } from "../_shared/auth.ts";

// Every frontend query hardcodes rank_bracket "legend" (Overview, Heroes,
// Coach, hero detail — grep confirms none of the other 7 brackets are ever
// read anywhere in src/). Fetching all 8 brackets x 5 positions = 40 STRATZ
// calls per run was pure waste 7/8 of the time, and — worse — was the
// actual cause of this function being killed by the platform's execution
// timeout on every single run (confirmed: HTTP 546 at ~49s wall-clock, both
// before and after adding inter-call pacing below, which only made total
// wall-clock time longer). Scoped to just the bracket the app uses.
const BRACKETS = ["LEGEND"];
const POSITIONS = [
  "POSITION_1", "POSITION_2", "POSITION_3", "POSITION_4", "POSITION_5",
];
const ROLE_FROM_POSITION: Record<string, string> = {
  POSITION_1: "carry",
  POSITION_2: "mid",
  POSITION_3: "offlane",
  POSITION_4: "support",
  POSITION_5: "hardsupport",
};

Deno.serve(async (req: Request) => {
  const authErr = verifyServiceRole(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const apiKey = Deno.env.get("STRATZ_API_KEY")!;

  const { data: jobRow } = await supabase
    .from("job_runs")
    .insert({ job_name: "snapshot-meta", status: "running" })
    .select("id")
    .single();
  const jobId = jobRow?.id;

  const today = new Date().toISOString().slice(0, 10);
  let records = 0;

  try {
    // ── 1. Hero meta per bracket+position ──────────────────────
    const heroMetaRows: Array<Record<string, unknown>> = [];

    // 1 bracket x 5 positions = 5 STRATZ calls (was 40 before scoping
    // BRACKETS down to just "legend" — see comment above). A small pacing
    // delay is still kept between calls out of courtesy to STRATZ's
    // per-second rate limit, which is shared across every edge function on
    // this one API key (see the same note in sync-matches).
    for (const bracket of BRACKETS) {
      for (const position of POSITIONS) {
        const role = ROLE_FROM_POSITION[position];
        try {
          const rows = await getHeroMeta(apiKey, [bracket], [position]);

          // winDay returns one row per hero *per day* (an ~8-day trailing
          // series, confirmed via a live query), not one row per hero. All
          // rows were being stamped with today's date regardless of which
          // day they actually cover, so a single upsert batch ended up with
          // several rows sharing the same (captured_on, hero_id,
          // rank_bracket, role) key — Postgres rejects that outright
          // ("ON CONFLICT DO UPDATE command cannot affect row a second
          // time"), which silently discarded this whole day's snapshot.
          // Keep only the most recent day's row per hero.
          const latestByHero = new Map<number, (typeof rows)[number]>();
          for (const row of rows) {
            const existing = latestByHero.get(row.heroId);
            if (!existing || row.day > existing.day) latestByHero.set(row.heroId, row);
          }

          for (const row of latestByHero.values()) {
            if (!row.matchCount) continue;
            heroMetaRows.push({
              captured_on: today,
              hero_id: row.heroId,
              rank_bracket: bracket.toLowerCase(),
              role,
              pick_rate: null, // not returned directly by winDay — computed later
              win_rate: row.matchCount > 0 ? row.winCount / row.matchCount : null,
              patch: null,
            });
          }
        } catch {
          // Continue if one bracket/role combination fails
          console.warn(`Failed to fetch meta for ${bracket}/${position}`);
        }
        await sleep(250);
      }
    }

    if (heroMetaRows.length) {
      const { error } = await supabase
        .from("hero_meta_daily")
        .upsert(heroMetaRows, { onConflict: "captured_on,hero_id,rank_bracket,role" });
      if (error) throw new Error(error.message);
      records += heroMetaRows.length;
    }

    // ── 2. Compute benchmark percentiles from each user's own match data ─
    // We use each user's own match data as a self-benchmark (compare recent
    // vs earlier). A proper peer benchmark would require STRATZ's aggregated
    // stats endpoint. For now, compute percentiles across each player's own
    // last 200 matches, stored per-user in player_benchmarks (NOT the global
    // benchmarks table — that table holds real cross-player bracket data).

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id");

    for (const profile of profiles ?? []) {
      const { data: recentMatches } = await supabase
        .from("matches")
        .select("role, gpm, imp, deaths, cs_at_10, kills, assists")
        .eq("user_id", profile.user_id)
        .order("start_time", { ascending: false })
        .limit(500);

      if (!recentMatches?.length) continue;

      const benchmarkRows = computePersonalBenchmarks(today, recentMatches)
        .map((row) => ({ ...row, user_id: profile.user_id }));

      const { error } = await supabase
        .from("player_benchmarks")
        .upsert(benchmarkRows, {
          onConflict: "user_id,captured_on,role,metric",
        });
      if (error) throw new Error(error.message);
      records += benchmarkRows.length;
    }

    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(), status: "ok", records,
    }).eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, records }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = String(err);
    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(), status: "error", error: errorMsg,
    }).eq("id", jobId);
    return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Personal benchmark percentile calculation ─────────────────

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

type MatchRow = { role: string | null; gpm: number | null; imp: number | null; deaths: number | null; cs_at_10: number | null; kills: number | null; assists: number | null };

function computePersonalBenchmarks(
  today: string,
  matches: MatchRow[],
): Array<Record<string, unknown>> {
  const metrics = ["gpm", "imp", "deaths", "cs_at_10"] as const;
  const roles = ["carry", "mid", "offlane", "support", "hardsupport", "all"];
  const rows: Array<Record<string, unknown>> = [];

  for (const role of roles) {
    const filtered = role === "all"
      ? matches
      : matches.filter((m) => m.role === role);

    if (filtered.length < 10) continue;

    for (const metric of metrics) {
      const values = filtered
        .map((m) => m[metric as keyof typeof m] as number | null)
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);

      if (values.length < 5) continue;

      rows.push({
        captured_on: today,
        role,
        metric,
        p25: percentile(values, 25),
        p50: percentile(values, 50),
        p75: percentile(values, 75),
      });
    }
  }

  return rows;
}
