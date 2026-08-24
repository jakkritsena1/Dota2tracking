-- ============================================================
-- Multi-user Steam login
-- Adds profiles, user_id scoping + RLS across per-user tables,
-- a new player_benchmarks table (fixes a global-collision bug
-- in the old 'self' rows inside benchmarks), and re-scopes all
-- 11 RPC functions + both materialized views to auth.uid().
--
-- user_id columns are added NULLABLE here on purpose — existing
-- rows stay invisible (RLS: auth.uid() = user_id never matches
-- null) until a one-off backfill is run after the app owner logs
-- in for the first time. Do NOT alter these to NOT NULL until
-- that backfill has been confirmed (see follow-up migration).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES — maps auth.users to a Steam identity
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  steam_account_id bigint not null unique,
  persona_name     text,
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on public.profiles (steam_account_id);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = user_id);

-- No insert/delete policy: profile rows are only ever created by the
-- server-side Steam callback handler using the service-role key.

-- ────────────────────────────────────────────────────────────
-- 2. MATCHES — add user_id (nullable for now)
--    The eventual goal is a composite PK (user_id, match_id) — a bare
--    match_id PK would collide if two users play together and both
--    sync the same real STRATZ match. But a PK can't be created while
--    user_id is still null for the existing 200 rows, so the PK swap
--    itself is deferred to a follow-up migration run AFTER the
--    one-off backfill (see 20260820000001_backfill_pk.sql). The old
--    match_id-only PK stays in place until then.
-- ────────────────────────────────────────────────────────────
alter table public.matches add column user_id uuid references auth.users (id) on delete cascade;

create index on public.matches (user_id, start_time desc);

create policy "matches_select_own" on public.matches
  for select to authenticated using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. MATCH_TAGS — same deferred-PK approach as matches (see above)
-- ────────────────────────────────────────────────────────────
alter table public.match_tags add column user_id uuid references auth.users (id) on delete cascade;

create policy "match_tags_select_own" on public.match_tags
  for select to authenticated using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. WEAKNESSES — plain user_id column (PK is a synthetic id, no collision risk)
-- ────────────────────────────────────────────────────────────
alter table public.weaknesses add column user_id uuid references auth.users (id) on delete cascade;
create index on public.weaknesses (user_id, computed_at desc);

create policy "weaknesses_select_own" on public.weaknesses
  for select to authenticated using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. GOALS — plain user_id column; also gets write policies since
--    /api/goals should write as the logged-in user
-- ────────────────────────────────────────────────────────────
alter table public.goals add column user_id uuid references auth.users (id) on delete cascade;
create index on public.goals (user_id);

create policy "goals_select_own" on public.goals
  for select to authenticated using (auth.uid() = user_id);

create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (auth.uid() = user_id);

create policy "goals_update_own" on public.goals
  for update to authenticated using (auth.uid() = user_id);

create policy "goals_delete_own" on public.goals
  for delete to authenticated using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. PLAYER_BENCHMARKS — new table, replaces the old rank_bracket='self'
--    rows inside the global `benchmarks` table. Those rows collide
--    across users (same captured_on/role/metric key for everyone),
--    silently overwriting one player's percentiles with another's.
-- ────────────────────────────────────────────────────────────
create table public.player_benchmarks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  captured_on date not null,
  role        text not null,
  metric      text not null,
  p25         real,
  p50         real,
  p75         real,
  primary key (user_id, captured_on, role, metric)
);

alter table public.player_benchmarks enable row level security;

create policy "player_benchmarks_select_own" on public.player_benchmarks
  for select to authenticated using (auth.uid() = user_id);

-- One-off cleanup: the old global 'self' rows are no longer meaningful
-- once per-user percentiles live in player_benchmarks instead.
delete from public.benchmarks where rank_bracket = 'self';

-- `benchmarks` and `hero_meta_daily` stay exactly as-is structurally: real
-- global STRATZ bracket/meta reference data, same for every visitor, no
-- user_id column. They previously had no RLS policy at all (deny-all,
-- fine when every read went through the service-role client). Pages now
-- read per-user data through the anon-key + session client so RLS
-- actually applies — these two tables need an explicit read grant for
-- the `authenticated` role, since the data itself isn't sensitive.
create policy "benchmarks_select_all" on public.benchmarks
  for select to authenticated using (true);

create policy "hero_meta_daily_select_all" on public.hero_meta_daily
  for select to authenticated using (true);

-- ────────────────────────────────────────────────────────────
-- 7. MATERIALIZED VIEWS — add user_id, revoke direct client access
--    (Postgres MVs cannot carry RLS policies; they must only ever
--    be read through a SECURITY DEFINER RPC that filters by
--    auth.uid(), never queried directly from app code.)
-- ────────────────────────────────────────────────────────────
drop materialized view if exists public.mv_hero_performance cascade;
drop materialized view if exists public.mv_daily_summary cascade;

create materialized view public.mv_hero_performance as
select
  user_id,
  hero_id,
  role,
  count(*)                                                as games,
  sum(is_win::int)                                        as wins,
  round(sum(is_win::int)::numeric / count(*) * 100, 1)   as win_rate,
  round(avg(imp), 1)                                      as avg_imp,
  round(avg(gpm), 0)                                      as avg_gpm,
  round(avg(kills), 1)                                    as avg_kills,
  round(avg(deaths), 1)                                   as avg_deaths,
  round(avg(assists), 1)                                  as avg_assists,
  max(start_time)                                         as last_played
from public.matches
group by user_id, hero_id, role;

create unique index on public.mv_hero_performance (user_id, hero_id, role);

create materialized view public.mv_daily_summary as
select
  user_id,
  (start_time at time zone 'Asia/Bangkok')::date          as play_date,
  count(*)                                                as games,
  sum(is_win::int)                                        as wins,
  round(sum(is_win::int)::numeric / count(*) * 100, 1)   as win_rate,
  round(avg(imp), 1)                                      as avg_imp,
  round(avg(gpm), 0)                                      as avg_gpm
from public.matches
group by user_id, play_date;

create unique index on public.mv_daily_summary (user_id, play_date);

revoke all on public.mv_hero_performance from anon, authenticated;
revoke all on public.mv_daily_summary    from anon, authenticated;

-- Previously called by compute-weaknesses but never defined (silently
-- swallowed by a .catch(() => {}) — the views were never actually being
-- refreshed). Defining it now since this migration already touches both
-- views' definitions.
create or replace function public.refresh_materialized_views()
returns void
language sql
security definer
set search_path = public
as $$
  refresh materialized view concurrently public.mv_hero_performance;
  refresh materialized view concurrently public.mv_daily_summary;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. RPC FUNCTIONS — re-scope all 11 to auth.uid(), which is read
--    from inside the SECURITY DEFINER function body (never accept
--    a caller-supplied user id parameter — that would let any
--    authenticated user read anyone else's data by passing a
--    different uuid, since these functions bypass RLS by design).
-- ────────────────────────────────────────────────────────────

-- get_summary — scoped to auth.uid()
create or replace function public.get_summary(
  p_start   timestamptz,
  p_end     timestamptz,
  p_role    text default null
)
returns table (
  total_games         bigint,
  wins                bigint,
  win_rate            numeric,
  prev_win_rate       numeric,
  avg_imp             numeric,
  prev_avg_imp        numeric,
  avg_kda             numeric,
  prev_avg_kda        numeric,
  consistency_score   numeric,
  prev_consistency    numeric
)
language sql
security definer
stable
set search_path = public
as $$
  with
  period_length as (
    select p_end - p_start as len
  ),
  prev_start as (
    select p_start - (select len from period_length) as ts
  ),
  current_games as (
    select
      is_win,
      imp,
      case when deaths = 0 then (kills + assists)::numeric
           else (kills + assists)::numeric / deaths
      end as kda
    from public.matches
    where user_id = auth.uid()
      and start_time >= p_start
      and start_time <  p_end
      and (p_role is null or role = p_role)
      and lobby_type in ('RANKED','ranked')
  ),
  prev_games as (
    select
      is_win,
      imp,
      case when deaths = 0 then (kills + assists)::numeric
           else (kills + assists)::numeric / deaths
      end as kda
    from public.matches
    where user_id = auth.uid()
      and start_time >= (select ts from prev_start)
      and start_time <  p_start
      and (p_role is null or role = p_role)
      and lobby_type in ('RANKED','ranked')
  )
  select
    (select count(*) from current_games)                               as total_games,
    (select count(*) from current_games where is_win)                  as wins,
    round(
      (select count(*)::numeric from current_games where is_win)
      / nullif((select count(*) from current_games), 0) * 100, 1
    )                                                                   as win_rate,
    round(
      (select count(*)::numeric from prev_games where is_win)
      / nullif((select count(*) from prev_games), 0) * 100, 1
    )                                                                   as prev_win_rate,
    round((select avg(imp) from current_games), 1)                    as avg_imp,
    round((select avg(imp) from prev_games), 1)                       as prev_avg_imp,
    round((select avg(kda) from current_games), 2)                    as avg_kda,
    round((select avg(kda) from prev_games), 2)                       as prev_avg_kda,
    round(
      greatest(0, 100 - least(100, coalesce(stddev_pop(imp), 0) * 2.5))
    , 1)                                                               as consistency_score,
    (select round(
      greatest(0, 100 - least(100, coalesce(stddev_pop(imp), 0) * 2.5))
    , 1) from prev_games)                                              as prev_consistency
  from current_games;
$$;

-- get_percentiles — unchanged, reads global benchmarks table only

-- get_mmr_series — scoped to auth.uid()
create or replace function public.get_mmr_series(
  p_role     text  default null,
  p_limit    int   default 90
)
returns table (
  match_id   bigint,
  start_time timestamptz,
  rank_tier  int,
  is_win     boolean,
  ma7        numeric
)
language sql
security definer
stable
set search_path = public
as $$
  with base as (
    select
      match_id,
      start_time,
      rank_tier,
      is_win,
      row_number() over (order by start_time desc) as rn
    from public.matches
    where user_id = auth.uid()
      and (p_role is null or role = p_role)
      and rank_tier is not null
      and lobby_type in ('RANKED','ranked')
    order by start_time desc
    limit p_limit
  ),
  ordered as (
    select * from base order by start_time asc
  )
  select
    match_id,
    start_time,
    rank_tier,
    is_win,
    round(avg(rank_tier) over (
      order by start_time
      rows between 6 preceding and current row
    ), 1) as ma7
  from ordered;
$$;

-- get_streak_stats — scoped to auth.uid()
create or replace function public.get_streak_stats()
returns table (
  p_loss_overall      numeric,
  p_loss_after_2loss  numeric,
  sample_size_overall bigint,
  sample_size_streak  bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with ordered as (
    select
      match_id,
      is_win,
      lag(is_win, 1) over (order by start_time) as prev1,
      lag(is_win, 2) over (order by start_time) as prev2
    from public.matches
    where user_id = auth.uid()
      and lobby_type in ('RANKED','ranked')
    order by start_time
  ),
  streak as (
    select * from ordered
    where prev1 = false and prev2 = false
  )
  select
    round((select count(*)::numeric from ordered where not is_win)
      / nullif((select count(*) from ordered), 0), 4) as p_loss_overall,
    round((count(*) filter (where not is_win))::numeric
      / nullif(count(*), 0), 4)                      as p_loss_after_2loss,
    (select count(*) from ordered)                    as sample_size_overall,
    count(*)                                          as sample_size_streak
  from streak;
$$;

-- get_session_winrate — scoped to auth.uid()
create or replace function public.get_session_winrate(
  p_start timestamptz default now() - interval '90 days'
)
returns table (
  play_date     date,
  session_seq   int,
  game_seq      int,
  is_win        boolean,
  match_id      bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with dated as (
    select
      match_id,
      is_win,
      start_time at time zone 'Asia/Bangkok' as local_time
    from public.matches
    where user_id = auth.uid()
      and start_time >= p_start
    order by start_time
  ),
  with_day as (
    select
      match_id,
      is_win,
      local_time::date as play_date,
      row_number() over (
        partition by local_time::date
        order by local_time
      ) as game_seq_of_day
    from dated
  )
  select
    play_date,
    1 as session_seq,
    game_seq_of_day::int as game_seq,
    is_win,
    match_id
  from with_day;
$$;

-- get_daily_summary — new RPC, replaces direct mv_daily_summary reads
create or replace function public.get_daily_summary(
  p_start date default (current_date - 28)
)
returns table (
  play_date date,
  games     bigint,
  wins      bigint,
  win_rate  numeric,
  avg_imp   numeric,
  avg_gpm   numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select play_date, games, wins, win_rate, avg_imp, avg_gpm
  from public.mv_daily_summary
  where user_id = auth.uid()
    and play_date >= p_start
  order by play_date;
$$;

-- get_mmr_forecast — scoped to auth.uid()
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
set search_path = public
as $$
  with recent as (
    select
      rank_tier,
      extract(epoch from start_time) as ts
    from public.matches
    where user_id = auth.uid()
      and rank_tier is not null
      and lobby_type in ('RANKED','ranked')
      and (p_role is null or role = p_role)
    order by start_time desc
    limit p_games
  ),
  stats as (
    select
      regr_slope(rank_tier, ts)        as slope,
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

-- get_weekly_imp_vs_mmr — scoped to auth.uid()
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
set search_path = public
as $$
  with weekly as (
    select
      date_trunc('week', start_time at time zone 'Asia/Bangkok')::date as week_start,
      avg(imp)                              as avg_imp,
      min(rank_tier)                        as rank_start,
      max(rank_tier)                        as rank_end,
      count(*)                              as games
    from public.matches
    where user_id = auth.uid()
      and lobby_type in ('RANKED','ranked')
      and imp is not null
      and rank_tier is not null
      and start_time >= now() - (p_weeks || ' weeks')::interval
    group by week_start
  )
  select *
  from weekly
  order by week_start;
$$;

-- get_personal_bests — scoped to auth.uid()
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
set search_path = public
as $$
  select metric, value, match_id, date from (
    select 'max_gpm'           as metric, gpm::numeric          as value, match_id, start_time as date from public.matches where user_id = auth.uid() and gpm is not null order by gpm desc limit 1
  ) q1
  union all
  select metric, value, match_id, date from (
    select 'max_imp'           as metric, imp::numeric          as value, match_id, start_time as date from public.matches where user_id = auth.uid() and imp is not null order by imp desc limit 1
  ) q2
  union all
  select metric, value, match_id, date from (
    select 'max_kills'         as metric, kills::numeric        as value, match_id, start_time as date from public.matches where user_id = auth.uid() and kills is not null order by kills desc limit 1
  ) q3
  union all
  select metric, value, match_id, date from (
    select 'max_hero_damage'   as metric, hero_damage::numeric  as value, match_id, start_time as date from public.matches where user_id = auth.uid() and hero_damage is not null order by hero_damage desc limit 1
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
        where user_id = auth.uid()
          and lobby_type in ('RANKED','ranked')
      ) grouped
      where is_win
    ) streaks
    order by streak_len desc
    limit 1
  ) q5;
$$;

-- get_radar_scores — scoped to auth.uid()
create or replace function public.get_radar_scores(
  p_start timestamptz default now() - interval '30 days',
  p_end   timestamptz default now(),
  p_role  text        default null
)
returns table (
  axis          text,
  score         numeric,
  my_avg        numeric,
  p50_value     numeric,
  sample_size   bigint
)
language plpgsql
security definer
stable
set search_path = public
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
  where user_id = auth.uid()
    and start_time between p_start and p_end
    and (p_role is null or role = p_role);

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
  where user_id = auth.uid()
    and (p_role is null or role = p_role)
    and start_time >= now() - interval '180 days';

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
    where m.user_id = auth.uid()
      and m.start_time between p_start and p_end
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
    where user_id = auth.uid()
      and (p_role is null or role = p_role)
      and start_time >= now() - interval '180 days'
  )
  select axis_name, score_val, my_val, p50_val, total_n
  from base, hist,
  lateral (values
    ('laning',
     greatest(0, least(100, round(
       case when hist.p50_cs > 0 then (base.my_cs / hist.p50_cs * 50)::numeric else 50 end
     , 0))),
     round(base.my_cs::numeric, 1),
     round(hist.p50_cs::numeric, 1),
     base.n),
    ('farming',
     greatest(0, least(100, round(
       case when hist.p50_gpm > 0 then (base.my_gpm / hist.p50_gpm * 50)::numeric else 50 end
     , 0))),
     round(base.my_gpm::numeric, 0),
     round(hist.p50_gpm::numeric, 0),
     base.n),
    ('teamfight',
     greatest(0, least(100, round(
       case when hist.p50_imp > 0 then (base.my_imp / hist.p50_imp * 50)::numeric else 50 end
     , 0))),
     round(base.my_imp::numeric, 1),
     round(hist.p50_imp::numeric, 1),
     base.n),
    ('objective',
     greatest(0, least(100, round(
       case when hist.p50_tdmg > 0 then (base.my_tdmg / hist.p50_tdmg * 50)::numeric else 50 end
     , 0))),
     round(base.my_tdmg::numeric, 0),
     round(hist.p50_tdmg::numeric, 0),
     base.n),
    ('vision', 50::numeric, null, null, 0::bigint),
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

-- get_goal_progress — scoped to auth.uid()
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
set search_path = public
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
      and user_id = auth.uid()
    order by created_at
  loop
    -- Evaluate rule against last 10 ranked games (this user's only)
    execute format(
      'select
         count(*) filter (where %I %s %s),
         count(*)
       from (
         select %I from public.matches
         where lobby_type in (''RANKED'',''ranked'')
           and user_id = auth.uid()
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

-- get_hero_pool_with_meta — scoped to auth.uid() via mv_hero_performance.user_id
-- (re-created here since the materialized view it depends on was dropped/rebuilt above)
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
set search_path = public
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
  where hp.user_id = auth.uid()
    and (p_role is null or hp.role = p_role)
    and hp.games >= 1
  order by hp.games desc;
$$;
