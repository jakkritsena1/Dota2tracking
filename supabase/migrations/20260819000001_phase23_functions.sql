-- ============================================================
-- Phase 2 / 3 SQL functions
-- Progress, Coach, Heroes feature SQL functions
-- ============================================================

-- ── PR-1: MMR linear regression forecast ─────────────────────
-- Uses regr_slope/regr_intercept on rank_tier over time (Unix epoch as X).
-- Returns slope, current position, and estimated weeks to next rank.

create or replace function public.get_mmr_forecast(
  p_games   int  default 30,
  p_role    text default null
)
returns table (
  slope_per_week       numeric,
  current_rank_tier    int,
  next_rank_tier       int,
  estimated_weeks      numeric,
  confidence_low       numeric,
  confidence_high      numeric,
  sample_size          bigint
)
language sql
security definer
stable
as $$
  with recent as (
    select
      rank_tier,
      extract(epoch from start_time) as ts
    from public.matches
    where rank_tier is not null
      and lobby_type in ('RANKED','ranked')
      and (p_role is null or role = p_role)
    order by start_time desc
    limit p_games
  ),
  stats as (
    select
      regr_slope(rank_tier, ts)        as slope,   -- rank_tier change per second
      regr_intercept(rank_tier, ts)    as intercept,
      max(rank_tier)::int              as latest,
      stddev(rank_tier)                as std,
      count(*)                         as n
    from recent
  )
  select
    round((slope * 86400 * 7)::numeric, 3)           as slope_per_week,
    latest                                            as current_rank_tier,
    (latest + 1)::int                                 as next_rank_tier,
    case
      when slope > 0 then round(((latest + 1 - intercept - (
        slope * extract(epoch from now())
      )) / (slope * 86400 * 7))::numeric, 1)
      else null
    end                                               as estimated_weeks,
    round((latest - 1.645 * std / sqrt(n))::numeric, 1) as confidence_low,
    round((latest + 1.645 * std / sqrt(n))::numeric, 1) as confidence_high,
    n                                                 as sample_size
  from stats;
$$;


-- ── PR-4: Weekly IMP vs MMR delta (for scatter chart) ────────

create or replace function public.get_weekly_imp_vs_mmr(
  p_weeks int default 12
)
returns table (
  week_start   date,
  avg_imp      numeric,
  rank_start   int,
  rank_end     int,
  games        bigint
)
language sql
security definer
stable
as $$
  with weekly as (
    select
      date_trunc('week', start_time at time zone 'Asia/Bangkok')::date as week_start,
      avg(imp)                              as avg_imp,
      min(rank_tier)                        as rank_start,
      max(rank_tier)                        as rank_end,
      count(*)                              as games
    from public.matches
    where lobby_type in ('RANKED','ranked')
      and imp is not null
      and rank_tier is not null
      and start_time >= now() - (p_weeks || ' weeks')::interval
    group by week_start
  )
  select *
  from weekly
  order by week_start;
$$;


-- ── PR-5: Personal bests / milestones ────────────────────────

create or replace function public.get_personal_bests()
returns table (
  metric   text,
  value    numeric,
  match_id bigint,
  date     timestamptz
)
language sql
security definer
stable
as $$
  select metric, value, match_id, date from (
    select 'max_gpm'           as metric, gpm::numeric          as value, match_id, start_time as date from public.matches where gpm is not null order by gpm desc limit 1
  ) q1
  union all
  select metric, value, match_id, date from (
    select 'max_imp'           as metric, imp::numeric          as value, match_id, start_time as date from public.matches where imp is not null order by imp desc limit 1
  ) q2
  union all
  select metric, value, match_id, date from (
    select 'max_kills'         as metric, kills::numeric        as value, match_id, start_time as date from public.matches where kills is not null order by kills desc limit 1
  ) q3
  union all
  select metric, value, match_id, date from (
    select 'max_hero_damage'   as metric, hero_damage::numeric  as value, match_id, start_time as date from public.matches where hero_damage is not null order by hero_damage desc limit 1
  ) q4
  union all
  select metric, value, match_id, date from (
    select 'max_win_streak'    as metric, streak_len            as value, match_id, start_time as date
    from (
      select
        match_id, start_time,
        count(*) over (
          partition by grp
          order by start_time
          rows between unbounded preceding and current row
        ) as streak_len,
        is_win
      from (
        select
          match_id, start_time, is_win,
          row_number() over (order by start_time) -
          row_number() over (partition by is_win order by start_time) as grp
        from public.matches
        where lobby_type in ('RANKED','ranked')
      ) grouped
      where is_win
    ) streaks
    order by streak_len desc
    limit 1
  ) q5;
$$;


-- ── CO-1: Radar axis scores ────────────────────────────────────
-- Computes percentile scores for 6 coaching axes.
-- Score = percentile of player's metric within own distribution (self-relative).
-- Vision axis uses hero_damage share as proxy (no ward data in basic endpoint).

create or replace function public.get_radar_scores(
  p_start timestamptz default now() - interval '30 days',
  p_end   timestamptz default now(),
  p_role  text        default null
)
returns table (
  axis          text,
  score         numeric,   -- 0-100 percentile
  my_avg        numeric,
  p50_value     numeric,
  sample_size   bigint
)
language plpgsql
security definer
stable
as $$
declare
  v_cs_scores      numeric[];
  v_gpm_scores     numeric[];
  v_imp_scores     numeric[];
  v_tdmg_scores    numeric[];
  v_deaths_scores  numeric[];
  v_kp_scores      numeric[];
  v_all_cs         numeric[];
  v_all_gpm        numeric[];
  v_all_imp        numeric[];
  v_all_tdmg       numeric[];
  v_all_deaths     numeric[];
  v_all_kp         numeric[];
begin
  -- Pull matches in range
  select
    array_agg(cs_at_10     order by start_time),
    array_agg(gpm          order by start_time),
    array_agg(imp          order by start_time),
    array_agg(tower_damage order by start_time),
    array_agg(deaths       order by start_time),
    array_agg((kills + assists)::numeric order by start_time)
  into
    v_cs_scores, v_gpm_scores, v_imp_scores,
    v_tdmg_scores, v_deaths_scores, v_kp_scores
  from public.matches
  where start_time between p_start and p_end
    and (p_role is null or role = p_role);

  -- Historical distribution for percentile base
  select
    array_agg(cs_at_10     order by start_time),
    array_agg(gpm          order by start_time),
    array_agg(imp          order by start_time),
    array_agg(tower_damage order by start_time),
    array_agg(deaths       order by start_time),
    array_agg((kills + assists)::numeric order by start_time)
  into
    v_all_cs, v_all_gpm, v_all_imp,
    v_all_tdmg, v_all_deaths, v_all_kp
  from public.matches
  where (p_role is null or role = p_role)
    and start_time >= now() - interval '180 days';

  -- Helper: percentile rank of avg(recent) within all[]
  -- Returned as table rows for each axis
  return query
  with base as (
    select
      avg(m.cs_at_10)                                       as my_cs,
      avg(m.gpm)                                             as my_gpm,
      avg(m.imp)                                             as my_imp,
      avg(m.tower_damage)                                    as my_tdmg,
      avg(m.deaths)                                          as my_deaths,
      avg((m.kills + m.assists)::numeric)                    as my_kp,
      count(*)                                               as n
    from public.matches m
    where m.start_time between p_start and p_end
      and (p_role is null or m.role = p_role)
  ),
  hist as (
    select
      percentile_cont(0.5) within group (order by cs_at_10)     as p50_cs,
      percentile_cont(0.5) within group (order by gpm)           as p50_gpm,
      percentile_cont(0.5) within group (order by imp)           as p50_imp,
      percentile_cont(0.5) within group (order by tower_damage)  as p50_tdmg,
      percentile_cont(0.5) within group (order by deaths)        as p50_deaths,
      percentile_cont(0.5) within group (order by kills + assists) as p50_kp,
      count(*)                                                    as hn
    from public.matches
    where (p_role is null or role = p_role)
      and start_time >= now() - interval '180 days'
  )
  select axis_name, score_val, my_val, p50_val, total_n
  from base, hist,
  lateral (values
    -- Laning: cs_at_10 percentile (50 base = neutral)
    ('laning',
     greatest(0, least(100, round(
       case when hist.p50_cs > 0 then (base.my_cs / hist.p50_cs * 50)::numeric else 50 end
     , 0))),
     round(base.my_cs::numeric, 1),
     round(hist.p50_cs::numeric, 1),
     base.n),
    -- Farming: gpm vs p50
    ('farming',
     greatest(0, least(100, round(
       case when hist.p50_gpm > 0 then (base.my_gpm / hist.p50_gpm * 50)::numeric else 50 end
     , 0))),
     round(base.my_gpm::numeric, 0),
     round(hist.p50_gpm::numeric, 0),
     base.n),
    -- Teamfight: IMP as proxy for combined contribution
    ('teamfight',
     greatest(0, least(100, round(
       case when hist.p50_imp > 0 then (base.my_imp / hist.p50_imp * 50)::numeric else 50 end
     , 0))),
     round(base.my_imp::numeric, 1),
     round(hist.p50_imp::numeric, 1),
     base.n),
    -- Objective: tower damage vs p50
    ('objective',
     greatest(0, least(100, round(
       case when hist.p50_tdmg > 0 then (base.my_tdmg / hist.p50_tdmg * 50)::numeric else 50 end
     , 0))),
     round(base.my_tdmg::numeric, 0),
     round(hist.p50_tdmg::numeric, 0),
     base.n),
    -- Vision: no ward data — show 50 (neutral) until ward sync is added
    ('vision', 50::numeric, null, null, 0::bigint),
    -- Survival: inverted deaths (lower deaths = higher score)
    ('survival',
     greatest(0, least(100, round(
       case when hist.p50_deaths > 0
         then greatest(0, (2 - base.my_deaths / hist.p50_deaths) * 50)::numeric
         else 50
       end
     , 0))),
     round(base.my_deaths::numeric, 1),
     round(hist.p50_deaths::numeric, 1),
     base.n)
  ) as t(axis_name, score_val, my_val, p50_val, total_n);
end;
$$;


-- ── CO-4: Check goal progress ─────────────────────────────────
-- For each active goal, count how many of the last 10 games satisfy it.

create or replace function public.get_goal_progress()
returns table (
  goal_id       bigint,
  title         text,
  rule          jsonb,
  passed_games  int,
  total_games   int,
  status        text,
  expires_at    timestamptz
)
language plpgsql
security definer
stable
as $$
declare
  g record;
  passed_count int;
  total_count  int;
begin
  for g in
    select id, title, rule, status, expires_at
    from public.goals
    where status = 'active'
    order by created_at
  loop
    -- Evaluate rule against last 10 ranked games
    -- Rule: {"metric": "deaths", "op": "<=", "value": 3}
    execute format(
      'select
         count(*) filter (where %I %s %s),
         count(*)
       from (
         select %I from public.matches
         where lobby_type in (''RANKED'',''ranked'')
         order by start_time desc limit 10
       ) recent',
      g.rule->>'metric',
      g.rule->>'op',
      (g.rule->>'value')::text,
      g.rule->>'metric'
    ) into passed_count, total_count;

    goal_id      := g.id;
    title        := g.title;
    rule         := g.rule;
    passed_games := passed_count;
    total_games  := total_count;
    status       := g.status;
    expires_at   := g.expires_at;
    return next;
  end loop;
end;
$$;


-- ── HE: Hero pool with meta context ──────────────────────────

create or replace function public.get_hero_pool_with_meta(
  p_role         text  default null,
  p_rank_bracket text  default 'legend'
)
returns table (
  hero_id         int,
  role            text,
  games           bigint,
  wins            bigint,
  player_wr       numeric,
  avg_imp         numeric,
  avg_gpm         numeric,
  last_played     timestamptz,
  meta_wr         real,
  meta_pick_rate  real,
  patch           text
)
language sql
security definer
stable
as $$
  select
    hp.hero_id,
    hp.role,
    hp.games,
    hp.wins,
    hp.win_rate                              as player_wr,
    hp.avg_imp,
    hp.avg_gpm,
    hp.last_played,
    hm.win_rate                              as meta_wr,
    hm.pick_rate                             as meta_pick_rate,
    hm.patch
  from public.mv_hero_performance hp
  left join (
    select hero_id, role, win_rate, pick_rate, patch
    from public.hero_meta_daily
    where captured_on = (
      select max(captured_on) from public.hero_meta_daily
      where rank_bracket = lower(p_rank_bracket)
    )
    and rank_bracket = lower(p_rank_bracket)
  ) hm on hm.hero_id = hp.hero_id and hm.role = hp.role
  where (p_role is null or hp.role = p_role)
    and hp.games >= 1
  order by hp.games desc;
$$;
