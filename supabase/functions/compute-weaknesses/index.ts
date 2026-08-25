// Edge Function: compute-weaknesses
// Runs daily at 04:30 BKK (21:30 UTC).
// Calculates top-3 weaknesses ranked by estimated Δ win-rate impact.
// Requires ≥ 20 matches in the range — returns empty set otherwise.
// Also refreshes materialized views mv_hero_performance and mv_daily_summary.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyServiceRole } from "../_shared/auth.ts";

const MIN_SAMPLES = 20;
const MIN_CORR_SAMPLES = 50;
const RANGE_DAYS = 30;

// Scaling factor: impact(m) * SCALING ≈ estimated Δ win-rate percentage
const SCALING_FACTOR = 0.4;

// Static weights for each metric — used when corr sample too small
const STATIC_WEIGHTS: Record<string, number> = {
  imp: 0.9,
  gpm: 0.7,
  deaths: 0.8,
  cs_at_10: 0.6,
};

Deno.serve(async (req: Request) => {
  const authErr = verifyServiceRole(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: jobRow } = await supabase
    .from("job_runs")
    .insert({ job_name: "compute-weaknesses", status: "running" })
    .select("id")
    .single();
  const jobId = jobRow?.id;

  try {
    // Refresh materialized views first (independent of sample size, per-user).
    // supabase-js's .rpc() builder is thenable but has no .catch() method —
    // calling .catch() on it throws "TypeError: ... .catch is not a
    // function" synchronously, which was being thrown *before* the RPC even
    // ran and crashing this whole function on every invocation (caught by
    // the outer try/catch below, which then skipped the entire per-user
    // weakness computation loop — this is why the weaknesses table had zero
    // rows despite every user having far more than MIN_SAMPLES matches).
    try {
      await supabase.rpc("refresh_materialized_views");
    } catch {
      // Views can also be refreshed via raw SQL — fallback silently
    }

    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id");
    if (profilesErr) throw new Error(profilesErr.message);

    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - RANGE_DAYS);
    const today = new Date().toISOString().slice(0, 10);

    let totalRows = 0;
    let insufficientCount = 0;

    for (const profile of profiles ?? []) {
      const rows = await computeWeaknessesForUser(supabase, profile.user_id, rangeStart, today);
      if (rows === null) {
        insufficientCount++;
        continue;
      }
      totalRows += rows;
    }

    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(), status: "ok", records: totalRows,
      error: insufficientCount ? `insufficient_data_for_${insufficientCount}_users` : null,
    }).eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, weaknesses: totalRows }), {
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

// Returns rows inserted, or null if this user has insufficient sample size.
// deno-lint-ignore no-explicit-any
async function computeWeaknessesForUser(
  supabase: any,
  userId: string,
  rangeStart: Date,
  today: string,
): Promise<number | null> {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("match_id, is_win, gpm, imp, deaths, cs_at_10")
    .eq("user_id", userId)
    .gte("start_time", rangeStart.toISOString())
    .order("start_time", { ascending: false });

  if (error) throw new Error(error.message);

  const records = matches ?? [];
  if (records.length < MIN_SAMPLES) return null;

  // Fetch this user's own benchmark percentiles (role="all")
  const { data: benchRows } = await supabase
    .from("player_benchmarks")
    .select("metric, p50, p75")
    .eq("user_id", userId)
    .eq("captured_on", today)
    .eq("role", "all");

  const benchmarks = new Map<string, { p50: number; p75: number }>();
  for (const r of benchRows ?? []) {
    benchmarks.set(r.metric, { p50: r.p50, p75: r.p75 });
  }

  // Compute correlation with win for each metric
  const metrics = ["gpm", "imp", "deaths", "cs_at_10"] as const;
  const weaknesses: Array<{
    metric: string;
    current_value: number;
    benchmark_value: number;
    gap: number;
    weight: number;
    est_delta_winrate: number;
    evidence_matches: number[];
  }> = [];

  for (const metric of metrics) {
    const pairs = records
      .map((r: Record<string, unknown>) => ({
        value: r[metric] as number | null,
        win: r.is_win ? 1 : 0,
        match_id: r.match_id as number,
      }))
      .filter((p: { value: number | null }): p is { value: number; win: number; match_id: number } =>
        p.value !== null
      );

    if (pairs.length < 5) continue;

    const myValues = pairs.map((p) => p.value);
    const currentValue = mean(myValues);
    const benchP75 = benchmarks.get(metric)?.p75 ?? currentValue;

    // For "deaths", lower is better — invert the gap calculation.
    // Parens around the ?? are required: "??" binds looser than "-", so
    // `a - b?.c ?? d` parses as `(a - b?.c) ?? d`, not `a - (b?.c ?? d)`.
    // Unparenthesized, a missing p50 benchmark produced `currentValue -
    // undefined` = NaN, and NaN ?? d is still NaN (?? only replaces
    // null/undefined) — silently poisoning gap, and therefore
    // est_delta_winrate, for every user missing a "deaths" benchmark row.
    const isLowerBetter = metric === "deaths";
    const gap = isLowerBetter
      ? currentValue - (benchmarks.get(metric)?.p50 ?? currentValue)  // positive = bad
      : benchP75 - currentValue;  // positive = room to improve

    if (gap <= 0) continue; // already above benchmark, not a weakness

    // Pearson correlation between metric value and win (clamp to data we have)
    const weight = pairs.length >= MIN_CORR_SAMPLES
      ? Math.abs(pearsonCorr(pairs.map((p) => p.value), pairs.map((p) => p.win)))
      : (STATIC_WEIGHTS[metric] ?? 0.5);

    const estDeltaWinrate = gap * weight * SCALING_FACTOR;

    // Evidence = matches where this metric was worst (bottom quartile)
    const sorted = [...myValues].sort((a, b) => isLowerBetter ? b - a : a - b);
    const p25threshold = percentile(sorted, 25);
    const evidenceMatches = pairs
      .filter((p) => isLowerBetter ? p.value >= p25threshold : p.value <= p25threshold)
      .map((p) => p.match_id)
      .slice(0, 20);

    weaknesses.push({
      metric,
      current_value: currentValue,
      benchmark_value: benchP75,
      gap,
      weight,
      est_delta_winrate: estDeltaWinrate,
      evidence_matches: evidenceMatches,
    });
  }

  // Sort by impact and take top-3
  weaknesses.sort((a, b) => b.est_delta_winrate - a.est_delta_winrate);

  const computedAt = new Date().toISOString();
  const rangeKey = `${RANGE_DAYS}d`;

  const rows = weaknesses.slice(0, 3).map((w, i) => ({
    user_id: userId,
    computed_at: computedAt,
    range_key: rangeKey,
    metric: w.metric,
    current_value: w.current_value,
    benchmark_value: w.benchmark_value,
    est_delta_winrate: w.est_delta_winrate,
    evidence_matches: w.evidence_matches,
    rank_order: i + 1,
  }));

  if (rows.length) {
    const { error: insertErr } = await supabase.from("weaknesses").insert(rows);
    if (insertErr) throw new Error(insertErr.message);
  }

  return rows.length;
}

// ── Statistics helpers ────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function pearsonCorr(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  const denom = Math.sqrt(sx * sy);
  return denom === 0 ? 0 : num / denom;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}
