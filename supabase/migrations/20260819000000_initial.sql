-- ============================================================
-- Dota 2 Personal Dashboard — Initial Schema
-- Phase 1: Core tables, RLS, SQL functions, materialized views
-- ============================================================

-- Extensions (must be enabled in Supabase Dashboard → Database → Extensions)
-- pg_cron   — for cron.schedule()
-- pg_net    — for net.http_post() inside cron
-- pgcrypto  — already on by default

-- ────────────────────────────────────────────────────────────
-- 1. MATCHES — raw synced match data
-- ────────────────────────────────────────────────────────────
create table public.matches (
  match_id          bigint primary key,
  start_time        timestamptz not null,
  duration_sec      int not null,
  game_mode         text,
  lobby_type        text,
  is_win            boolean not null,
  hero_id           int not null,
  role              text check (role in ('carry','mid','offlane','support','hardsupport')),
  lane              text,
  kills             int,
  deaths            int,
  assists           int,
  gpm               int,
  xpm               int,
  last_hits         int,
  denies            int,
  net_worth         int,
  hero_damage       int,
  tower_damage      int,
  healing           int,
  imp               int,
  cs_at_10          int,
  lane_outcome      text check (lane_outcome in ('win','tie','loss')),
  rank_tier         int,
  -- keep only last 50 matches of raw payload (pruned by cron)
  raw               jsonb,
  synced_at         timestamptz default now() not null
);

create index on public.matches (start_time desc);
create index on public.matches (hero_id);
create index on public.matches (role);
create index on public.matches (is_win);

-- ────────────────────────────────────────────────────────────
-- 2. MATCH_TAGS — auto-tagged causes computed by rule engine
-- ────────────────────────────────────────────────────────────
create table public.match_tags (
  match_id   bigint not null references public.matches (match_id) on delete cascade,
  tag        text not null,
  confidence real not null check (confidence between 0 and 1),
  reason     jsonb not null default '{}',
  primary key (match_id, tag)
);

create index on public.match_tags (tag);

-- ────────────────────────────────────────────────────────────
-- 3. BENCHMARKS — daily percentile snapshots per bracket+role
-- ────────────────────────────────────────────────────────────
create table public.benchmarks (
  captured_on   date not null,
  rank_bracket  text not null,
  role          text not null,
  metric        text not null,
  p25           real,
  p50           real,
  p75           real,
  primary key (captured_on, rank_bracket, role, metric)
);

create index on public.benchmarks (captured_on desc);

-- ────────────────────────────────────────────────────────────
-- 4. HERO_META_DAILY — daily hero winrate/pickrate per bracket
-- ────────────────────────────────────────────────────────────
create table public.hero_meta_daily (
  captured_on   date not null,
  hero_id       int not null,
  rank_bracket  text not null,
  role          text not null,
  pick_rate     real,
  win_rate      real,
  patch         text,
  primary key (captured_on, hero_id, rank_bracket, role)
);

create index on public.hero_meta_daily (captured_on desc);
create index on public.hero_meta_daily (hero_id);

-- ────────────────────────────────────────────────────────────
-- 5. WEAKNESSES — computed impact-ranked weaknesses
-- ────────────────────────────────────────────────────────────
create table public.weaknesses (
  id                 bigint generated always as identity primary key,
  computed_at        timestamptz not null default now(),
  range_key          text not null,
  metric             text not null,
  current_value      real,
  benchmark_value    real,
  est_delta_winrate  real,
  evidence_matches   bigint[],
  rank_order         int
);

create index on public.weaknesses (computed_at desc);

-- ────────────────────────────────────────────────────────────
-- 6. GOALS — user-defined measurable objectives
-- ────────────────────────────────────────────────────────────
create table public.goals (
  id          bigint generated always as identity primary key,
  title       text not null,
  rule        jsonb not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  status      text not null default 'active'
              check (status in ('active','completed','expired'))
);

-- ────────────────────────────────────────────────────────────
-- 7. API_CACHE — TTL cache to avoid hammering STRATZ
-- ────────────────────────────────────────────────────────────
create table public.api_cache (
  cache_key   text primary key,
  payload     jsonb not null,
  expires_at  timestamptz not null
);

create index on public.api_cache (expires_at);

-- ────────────────────────────────────────────────────────────
-- 8. JOB_RUNS — audit log for all background jobs
-- ────────────────────────────────────────────────────────────
create table public.job_runs (
  id          bigint generated always as identity primary key,
  job_name    text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text check (status in ('ok','error','running')),
  records     int,
  error       text
);

create index on public.job_runs (job_name, started_at desc);

-- ────────────────────────────────────────────────────────────
-- RLS: Enable on ALL tables. No policies = deny all anon/auth.
-- service_role bypasses RLS automatically — use that server-side.
-- ────────────────────────────────────────────────────────────
alter table public.matches          enable row level security;
alter table public.match_tags       enable row level security;
alter table public.benchmarks       enable row level security;
alter table public.hero_meta_daily  enable row level security;
alter table public.weaknesses       enable row level security;
alter table public.goals            enable row level security;
alter table public.api_cache        enable row level security;
alter table public.job_runs         enable row level security;

-- Table-level grants are a separate layer from RLS: without them Postgres
-- denies the query outright ("permission denied for table") before RLS
-- policies ever get a chance to run. RLS (or the lack of a policy) stays
-- the real access control here — these grants just let anon/authenticated
-- attempt a query at all. Applies to future tables too (profiles,
-- player_benchmarks, etc. created by later migrations under this role).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- SQL FUNCTIONS (called via supabase.rpc())
-- All run as SECURITY DEFINER so they can read past RLS.
-- ────────────────────────────────────────────────────────────

-- 5.2-A: KPI summary with delta vs previous period
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
    where start_time >= p_start
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
    where start_time >= (select ts from prev_start)
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
    -- consistency = 100 - clamp(stddev * 2.5, 0, 100)
    round(
      greatest(0, 100 - least(100, coalesce(stddev_pop(imp), 0) * 2.5))
    , 1)                                                               as consistency_score,
    (select round(
      greatest(0, 100 - least(100, coalesce(stddev_pop(imp), 0) * 2.5))
    , 1) from prev_games)                                              as prev_consistency
  from current_games;
$$;

-- 5.2-B: Percentile lookup from benchmarks table
create or replace function public.get_percentiles(
  p_bracket text,
  p_role    text,
  p_metric  text,
  p_date    date default current_date
)
returns table (p25 real, p50 real, p75 real)
language sql
security definer
stable
as $$
  select p25, p50, p75
  from public.benchmarks
  where captured_on  = p_date
    and rank_bracket = p_bracket
    and role         = p_role
    and metric       = p_metric
  order by captured_on desc
  limit 1;
$$;

-- 5.2-C: MMR / rank series with moving average (uses lag)
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
as $$
  with base as (
    select
      match_id,
      start_time,
      rank_tier,
      is_win,
      row_number() over (order by start_time desc) as rn
    from public.matches
    where (p_role is null or role = p_role)
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

-- 5.2-D: Streak stats — P(loss | last 2 were losses)
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
as $$
  with ordered as (
    select
      match_id,
      is_win,
      lag(is_win, 1) over (order by start_time) as prev1,
      lag(is_win, 2) over (order by start_time) as prev2
    from public.matches
    where lobby_type in ('RANKED','ranked')
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

-- 5.2-E: Session winrate (group by calendar day + session index)
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
as $$
  with dated as (
    select
      match_id,
      is_win,
      start_time at time zone 'Asia/Bangkok' as local_time
    from public.matches
    where start_time >= p_start
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
    -- crude session: new session after 3h+ gap (simplified to day-based here)
    1 as session_seq,
    game_seq_of_day::int as game_seq,
    is_win,
    match_id
  from with_day;
$$;

-- ────────────────────────────────────────────────────────────
-- MATERIALIZED VIEWS (refreshed by compute-weaknesses cron)
-- ────────────────────────────────────────────────────────────

create materialized view if not exists public.mv_hero_performance as
select
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
group by hero_id, role;

create unique index on public.mv_hero_performance (hero_id, role);

create materialized view if not exists public.mv_daily_summary as
select
  (start_time at time zone 'Asia/Bangkok')::date          as play_date,
  count(*)                                                as games,
  sum(is_win::int)                                        as wins,
  round(sum(is_win::int)::numeric / count(*) * 100, 1)   as win_rate,
  round(avg(imp), 1)                                      as avg_imp,
  round(avg(gpm), 0)                                      as avg_gpm
from public.matches
group by play_date;

create unique index on public.mv_daily_summary (play_date);

-- ────────────────────────────────────────────────────────────
-- PG_CRON: scheduled jobs are registered in
-- 20260819000002_cron_jobs.sql, after pg_cron/pg_net are enabled
-- and app.supabase_url / app.internal_api_secret are set.
-- ────────────────────────────────────────────────────────────
