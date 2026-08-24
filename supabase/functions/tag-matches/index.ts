// Edge Function: tag-matches
// Applies the rule engine to untagged matches.
// Rules are driven by config constants — adjust thresholds without redeploying
// by moving them to a DB config table in a later iteration.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyServiceRole } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const authErr = verifyServiceRole(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: jobRow } = await supabase
    .from("job_runs")
    .insert({ job_name: "tag-matches", status: "running" })
    .select("id")
    .single();
  const jobId = jobRow?.id;

  let processed = 0;
  let totalTags = 0;

  try {
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id");
    if (profilesErr) throw new Error(profilesErr.message);

    const today = new Date().toISOString().slice(0, 10);

    for (const profile of profiles ?? []) {
      // Fetch this user's matches that have no tags yet
      const { data: matches, error } = await supabase
        .from("matches")
        .select(`
          match_id, role, is_win, kills, deaths, assists,
          gpm, imp, cs_at_10, lane_outcome, hero_damage,
          net_worth, duration_sec, raw,
          match_tags ( tag )
        `)
        .eq("user_id", profile.user_id)
        .not("match_id", "in",
          supabase
            .from("match_tags")
            .select("match_id")
            .eq("user_id", profile.user_id)
        )
        .order("start_time", { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);
      if (!matches?.length) continue;

      // Fetch this user's personal benchmark percentiles for today
      const { data: benchmarks } = await supabase
        .from("player_benchmarks")
        .select("role, metric, p25, p50, p75")
        .eq("user_id", profile.user_id)
        .eq("captured_on", today);

      const bench = buildBenchmarkLookup(benchmarks ?? []);

      const tagsToInsert: Array<{
        user_id: string; match_id: number; tag: string; confidence: number; reason: Record<string, unknown>;
      }> = [];

      for (const m of matches) {
        const tags = computeTags(m, bench);
        tagsToInsert.push(...tags.map((t) => ({ ...t, user_id: profile.user_id })));
        processed++;
      }

      if (tagsToInsert.length) {
        const { error: insertErr } = await supabase
          .from("match_tags")
          .upsert(tagsToInsert, { onConflict: "user_id,match_id,tag", ignoreDuplicates: true });
        if (insertErr) throw new Error(insertErr.message);
        totalTags += tagsToInsert.length;
      }
    }

    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(), status: "ok", records: processed,
    }).eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, processed, tags: totalTags }), {
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

// ── Rule constants (tune with real data) ─────────────────────

const DEFAULTS = {
  gpm_p25: 420,
  gpm_p50: 520,
  cs_at_10_p25: 42,
  deaths_p75: 7,
  imp_p25: 20,
  imp_p75: 50,
  throw_networth_lead: 3000,   // net worth lead at min 20 that qualifies as "throw"
};

type MatchRow = {
  match_id: number;
  role: string | null;
  is_win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  imp: number | null;
  cs_at_10: number | null;
  lane_outcome: string | null;
  hero_damage: number | null;
  net_worth: number | null;
  duration_sec: number;
  raw: Record<string, unknown> | null;
};

type BenchRow = { role: string; metric: string; p25: number; p50: number; p75: number };

function buildBenchmarkLookup(rows: BenchRow[]) {
  const map = new Map<string, { p25: number; p50: number; p75: number }>();
  for (const r of rows) {
    map.set(`${r.role}:${r.metric}`, { p25: r.p25, p50: r.p50, p75: r.p75 });
  }
  return (role: string, metric: string, fallback: { p25: number; p50: number; p75: number }) => {
    return map.get(`${role}:${metric}`) ?? fallback;
  };
}

function computeTags(
  m: MatchRow,
  bench: (role: string, metric: string, fb: { p25: number; p50: number; p75: number }) => { p25: number; p50: number; p75: number },
): Array<{ match_id: number; tag: string; confidence: number; reason: Record<string, unknown> }> {
  const tags: Array<{ match_id: number; tag: string; confidence: number; reason: Record<string, unknown> }> = [];
  const role = m.role ?? "carry";

  const gpmBench  = bench(role, "gpm",    { p25: DEFAULTS.gpm_p25, p50: DEFAULTS.gpm_p50, p75: 620 });
  const csBench   = bench(role, "cs_at_10", { p25: DEFAULTS.cs_at_10_p25, p50: 55, p75: 68 });
  const deathsBench = bench(role, "deaths", { p25: 2, p50: 4, p75: DEFAULTS.deaths_p75 });
  const impBench  = bench(role, "imp",    { p25: DEFAULTS.imp_p25, p50: 35, p75: DEFAULTS.imp_p75 });

  // lane_loss: explicit lane_outcome or cs below p25
  if (
    m.lane_outcome === "loss" ||
    (m.cs_at_10 !== null && m.cs_at_10 < csBench.p25)
  ) {
    const confidence = m.lane_outcome === "loss" ? 0.9 : 0.7;
    tags.push({
      match_id: m.match_id, tag: "lane_loss", confidence,
      reason: {
        lane_outcome: m.lane_outcome,
        cs_at_10: m.cs_at_10,
        cs_p25: csBench.p25,
      },
    });
  }

  // slow_farm: gpm below p25 and deaths not elevated (i.e. didn't feed, just farmed slow)
  if (
    m.gpm !== null && m.gpm < gpmBench.p25 &&
    m.deaths !== null && m.deaths <= deathsBench.p50
  ) {
    tags.push({
      match_id: m.match_id, tag: "slow_farm", confidence: 0.8,
      reason: {
        gpm: m.gpm, gpm_p25: gpmBench.p25,
        deaths: m.deaths, deaths_median: deathsBench.p50,
      },
    });
  }

  // died_in_fights: deaths above p75
  if (m.deaths !== null && m.deaths >= deathsBench.p75) {
    tags.push({
      match_id: m.match_id, tag: "died_in_fights", confidence: 0.85,
      reason: { deaths: m.deaths, deaths_p75: deathsBench.p75 },
    });
  }

  // carried_by_team: won but imp below p25
  if (
    m.is_win &&
    m.imp !== null && m.imp < impBench.p25
  ) {
    tags.push({
      match_id: m.match_id, tag: "carried_by_team", confidence: 0.75,
      reason: { imp: m.imp, imp_p25: impBench.p25, is_win: m.is_win },
    });
  }

  // good_game: imp above p75 (win or loss — playing well matters)
  if (m.imp !== null && m.imp >= impBench.p75) {
    tags.push({
      match_id: m.match_id, tag: "good_game", confidence: 0.9,
      reason: { imp: m.imp, imp_p75: impBench.p75 },
    });
  }

  // throw_midgame: requires networthPerMinute array in raw payload
  const nwpm = (m.raw as { networthPerMinute?: number[] } | null)?.networthPerMinute;
  if (nwpm && nwpm.length >= 40) {
    const throwTag = detectThrow(m.match_id, nwpm);
    if (throwTag) tags.push(throwTag);
  }

  return tags;
}

function detectThrow(
  matchId: number,
  nwpm: number[],
): { match_id: number; tag: string; confidence: number; reason: Record<string, unknown> } | null {
  // net worth lead at minute 20 (index 20)
  const leadAt20 = nwpm[20] ?? 0;
  if (leadAt20 < DEFAULTS.throw_networth_lead) return null;

  // Check if it went negative permanently after minute 40
  const after40 = nwpm.slice(40);
  if (!after40.length) return null;
  const allNegativeAfter40 = after40.every((v) => v < 0);
  if (!allNegativeAfter40) return null;

  // Find the minute it turned negative
  const turnNegAt = nwpm.findIndex((v, i) => i >= 20 && v < 0);

  return {
    match_id: matchId, tag: "throw_midgame", confidence: 0.8,
    reason: {
      lead_at_min_20: leadAt20,
      turned_negative_at_min: turnNegAt,
      threshold: DEFAULTS.throw_networth_lead,
    },
  };
}
