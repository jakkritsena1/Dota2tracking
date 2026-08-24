// TypeScript types for Supabase tables.
// Regenerate with: npm run db:types
// (Manually maintained until supabase gen types is set up)

export interface Match {
  match_id: number;
  start_time: string;
  duration_sec: number;
  game_mode: string | null;
  lobby_type: string | null;
  is_win: boolean;
  hero_id: number;
  role: "carry" | "mid" | "offlane" | "support" | "hardsupport" | null;
  lane: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  gpm: number | null;
  xpm: number | null;
  last_hits: number | null;
  denies: number | null;
  net_worth: number | null;
  hero_damage: number | null;
  tower_damage: number | null;
  healing: number | null;
  imp: number | null;
  cs_at_10: number | null;
  lane_outcome: "win" | "tie" | "loss" | null;
  rank_tier: number | null;
  raw: Record<string, unknown> | null;
  synced_at: string;
}

export interface MatchTag {
  match_id: number;
  tag: string;
  confidence: number;
  reason: Record<string, unknown>;
}

export interface Benchmark {
  captured_on: string;
  rank_bracket: string;
  role: string;
  metric: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
}

export interface HeroMetaDaily {
  captured_on: string;
  hero_id: number;
  rank_bracket: string;
  role: string;
  pick_rate: number | null;
  win_rate: number | null;
  patch: string | null;
}

export interface Weakness {
  id: number;
  computed_at: string;
  range_key: string;
  metric: string;
  current_value: number | null;
  benchmark_value: number | null;
  est_delta_winrate: number | null;
  evidence_matches: number[] | null;
  rank_order: number | null;
}

export interface Goal {
  id: number;
  title: string;
  rule: {
    metric: string;
    op: "<=" | ">=" | "<" | ">" | "=";
    value: number;
  };
  created_at: string;
  expires_at: string | null;
  status: "active" | "completed" | "expired";
}

export interface JobRun {
  id: number;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error" | "running" | null;
  records: number | null;
  error: string | null;
}

// ── RPC return types ─────────────────────────────────────────

export interface SummaryRow {
  total_games: number;
  wins: number;
  win_rate: number | null;
  prev_win_rate: number | null;
  avg_imp: number | null;
  prev_avg_imp: number | null;
  avg_kda: number | null;
  prev_avg_kda: number | null;
  consistency_score: number | null;
  prev_consistency: number | null;
}

export interface MmrSeriesRow {
  match_id: number;
  start_time: string;
  rank_tier: number;
  is_win: boolean;
  ma7: number;
}

export interface StreakStats {
  p_loss_overall: number;
  p_loss_after_2loss: number;
  sample_size_overall: number;
  sample_size_streak: number;
}

// ── View types ────────────────────────────────────────────────

export interface HeroPerformance {
  hero_id: number;
  role: string;
  games: number;
  wins: number;
  win_rate: number;
  avg_imp: number;
  avg_gpm: number;
  avg_kills: number;
  avg_deaths: number;
  avg_assists: number;
  last_played: string;
}

export interface DailySummary {
  play_date: string;
  games: number;
  wins: number;
  win_rate: number;
  avg_imp: number;
  avg_gpm: number;
}

// ── Phase 2/3 RPC return types ────────────────────────────────

export interface MmrForecastRow {
  slope_per_week: number | null;
  current_rank_tier: number | null;
  next_rank_tier: number | null;
  estimated_weeks: number | null;
  confidence_low: number | null;
  confidence_high: number | null;
  sample_size: number;
}

export interface WeeklyImpVsMmrRow {
  week_start: string;
  avg_imp: number | null;
  rank_start: number | null;
  rank_end: number | null;
  games: number;
}

export interface PersonalBestRow {
  metric: string;
  value: number;
  match_id: number;
  date: string;
}

export interface RadarScoreRow {
  axis: string;
  score: number;
  my_avg: number | null;
  p50_value: number | null;
  sample_size: number;
}

export interface GoalProgressRow {
  goal_id: number;
  title: string;
  rule: { metric: string; op: string; value: number };
  passed_games: number;
  total_games: number;
  status: string;
  expires_at: string | null;
}

export interface HeroPoolWithMetaRow {
  hero_id: number;
  role: string;
  games: number;
  wins: number;
  player_wr: number;
  avg_imp: number | null;
  avg_gpm: number | null;
  last_played: string | null;
  meta_wr: number | null;
  meta_pick_rate: number | null;
  patch: string | null;
}

// ── Query param types ────────────────────────────────────────

export type RangeParam = "7d" | "30d" | "90d" | "all";
export type RoleParam = "all" | "carry" | "mid" | "offlane" | "support" | "hardsupport";
export type ModeParam = "all" | "ranked" | "turbo";
