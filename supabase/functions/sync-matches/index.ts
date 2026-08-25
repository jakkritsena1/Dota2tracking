// Edge Function: sync-matches
// Pulls new matches from STRATZ and upserts them into the matches table.
// Designed to be idempotent — safe to call multiple times.
// After sync, chains into tag-matches automatically if new records were inserted.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCurrentRankTier,
  getRecentMatches,
  mapLane,
  mapRole,
  type StratzConfig,
  type StratzMatch,
  type StratzMatchPlayer,
} from "../_shared/stratz.ts";
import { verifyServiceRole } from "../_shared/auth.ts";

const BATCH_SIZE = 50;
const MAX_BATCHES = 4; // stop after 200 matches per invocation, resume next cron tick

Deno.serve(async (req: Request) => {
  // Security: only cron/server may call this
  const authErr = verifyServiceRole(req);
  if (authErr) return authErr;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const apiKey = Deno.env.get("STRATZ_API_KEY")!;

  const { data: jobRow } = await supabase
    .from("job_runs")
    .insert({ job_name: "sync-matches", status: "running" })
    .select("id")
    .single();
  const jobId: number = jobRow?.id;

  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("user_id, steam_account_id");

  if (profilesErr) {
    const errorMsg = profilesErr.message;
    await supabase.from("job_runs").update({
      finished_at: new Date().toISOString(), status: "error", error: errorMsg,
    }).eq("id", jobId);
    return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  let totalInserted = 0;
  const perUserErrors: Record<string, string> = {};

  for (const profile of profiles ?? []) {
    try {
      totalInserted += await syncOneUser(supabase, apiKey, profile.user_id, profile.steam_account_id);
    } catch (err) {
      perUserErrors[profile.user_id] = String(err);
      console.error(`[sync-matches] user ${profile.user_id} failed:`, err);
    }
    // Small delay between users so a burst of profiles doesn't trip
    // STRATZ's shared per-second rate limit (one API key for everyone).
    await sleep(300);
  }

  const hasErrors = Object.keys(perUserErrors).length > 0;

  await supabase
    .from("job_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: hasErrors ? "error" : "ok",
      records: totalInserted,
      error: hasErrors ? JSON.stringify(perUserErrors) : null,
    })
    .eq("id", jobId);

  return new Response(
    JSON.stringify({ ok: !hasErrors, inserted: totalInserted, errors: perUserErrors }),
    { headers: { "Content-Type": "application/json" } },
  );
});

// deno-lint-ignore no-explicit-any
async function syncOneUser(
  supabase: any,
  apiKey: string,
  userId: string,
  steamAccountId: number,
): Promise<number> {
  const cfg: StratzConfig = { apiKey, steamAccountId };

  // Find the latest match_id already stored for this user so we can stop early
  const { data: latestRow } = await supabase
    .from("matches")
    .select("match_id, start_time")
    .eq("user_id", userId)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  const latestMatchId: number = latestRow?.match_id ?? 0;

  // STRATZ has no per-match historical rank tier for a player — only the
  // account's *current* season rank. Stamping that onto newly-synced
  // matches is an approximation (the account's rank as of sync time, not
  // as of match time), but it's a far better substitute than leaving
  // rank_tier permanently null, which is what happened before: the
  // Progress page's MMR trend/forecast panels were always empty regardless
  // of match count. Fetched lazily (only once we know there's a new match
  // to stamp) so a sync run with nothing new doesn't spend an extra STRATZ
  // call on every user, every 15 minutes.
  let currentRankTier: number | null | undefined;
  const getCachedRankTier = async () => {
    if (currentRankTier === undefined) {
      currentRankTier = await getCurrentRankTier(cfg).catch((err) => {
        console.error(`[sync-matches] getCurrentRankTier failed for user ${userId}:`, err);
        return null;
      });
    }
    return currentRankTier;
  };

  let skip = 0;
  let done = false;
  let inserted = 0;

  for (let batch = 0; batch < MAX_BATCHES && !done; batch++) {
    const matches: StratzMatch[] = await withRetry(() =>
      getRecentMatches(cfg, BATCH_SIZE, skip)
    );

    if (!matches.length) break;

    const newMatches = matches.filter((m) => m.id > latestMatchId);

    if (newMatches.length === 0) {
      done = true;
      break;
    }

    const rankTier = await getCachedRankTier();
    const rows = newMatches.map((m) => ({ ...toDbRow(m, cfg.steamAccountId, rankTier), user_id: userId }));

    const { error } = await supabase
      .from("matches")
      .upsert(rows, { onConflict: "user_id,match_id", ignoreDuplicates: true });

    if (error) throw new Error(error.message);

    inserted += rows.length;
    skip += BATCH_SIZE;

    // If we received fewer than batch size, we've caught up
    if (matches.length < BATCH_SIZE) done = true;
  }

  // Chain into tag-matches if we have new data
  if (inserted > 0) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const internalSecret = Deno.env.get("INTERNAL_API_SECRET")!;
    fetch(`${supabaseUrl}/functions/v1/tag-matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalSecret}`,
      },
      body: "{}",
    }).catch(() => {}); // fire and forget
  }

  return inserted;
}

// ── Helpers ──────────────────────────────────────────────────

function toDbRow(match: StratzMatch, steamAccountId: number, currentRankTier: number | null) {
  const me: StratzMatchPlayer | undefined = match.players?.find(
    (p) => (p as unknown as { steamAccount?: { id?: number } }).steamAccount?.id === steamAccountId,
  ) ?? match.players?.[0];

  if (!me) throw new Error(`No player data in match ${match.id}`);

  const csAt10 = me.stats?.lastHitsPerMinute?.[10] ?? null;

  return {
    match_id: match.id,
    start_time: new Date(match.startDateTime * 1000).toISOString(),
    duration_sec: match.durationSeconds,
    game_mode: match.gameMode ?? null,
    lobby_type: match.lobbyType ?? null,
    is_win: me.isVictory,
    hero_id: me.heroId,
    role: mapRole(me.role),
    lane: mapLane(me.lane),
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    gpm: me.goldPerMinute,
    xpm: me.experiencePerMinute,
    last_hits: me.numLastHits,
    denies: me.numDenies,
    net_worth: me.networth,
    hero_damage: me.heroDamage,
    tower_damage: me.towerDamage,
    healing: me.heroHealing,
    imp: me.imp,
    cs_at_10: csAt10,
    lane_outcome: null, // computed by tag-matches
    rank_tier: currentRankTier, // approximation — see comment in syncOneUser
    raw: me.stats ?? null,
  };
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      if (String(err).includes("STRATZ_RATE_LIMIT")) {
        await sleep(2000 * attempt);
      } else {
        await sleep(1000 * attempt);
      }
    }
  }
  throw new Error("unreachable");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
