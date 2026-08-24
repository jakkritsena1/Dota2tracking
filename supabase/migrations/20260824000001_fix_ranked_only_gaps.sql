-- ============================================================
-- Fix: several stats sources never filtered lobby_type, so
-- turbo/unranked games silently leaked into aggregates that are
-- meant to be ranked-only everywhere else in the app:
--
--   - mv_hero_performance / mv_daily_summary (materialized views
--     backing the Hero Pool page, NextGameAdvice, MostPlayedHeroes,
--     and the Overview play calendar) had no WHERE clause at all.
--   - get_radar_scores (Coach page radar chart) — all 3 source
--     queries.
--   - get_personal_bests — the max_gpm/max_imp/max_kills/
--     max_hero_damage branches (max_win_streak already had it,
--     so a "personal best" could silently come from a turbo game
--     while the streak stat next to it couldn't).
--   - get_session_winrate — unused by the frontend today, fixed
--     anyway for consistency since it reads the same table.
-- ============================================================

-- ── 1. Rebuild the two materialized views with the missing filter ──

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
where lobby_type in ('RANKED','ranked')
group by user_id, hero_id, role;

create unique index on public.mv_hero_performance (user_id, hero_id, role);
revoke all on public.mv_hero_performance from anon, authenticated;

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
where lobby_type in ('RANKED','ranked')
group by user_id, play_date;

create unique index on public.mv_daily_summary (user_id, play_date);
revoke all on public.mv_daily_summary from anon, authenticated;

-- ── 2. Re-declare the functions that read those views — a plain
--       DROP CASCADE on a materialized view doesn't reliably take
--       out functions that merely SELECT from it inside their body,
--       but redeclare unconditionally so this migration is correct
--       either way. ──

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
    hp.win_rate / 100                        as player_wr,
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

-- ── 3. get_radar_scores — add the missing filter to all 3 queries ──

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
    and lobby_type in ('RANKED','ranked')
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
    and lobby_type in ('RANKED','ranked')
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
      and m.lobby_type in ('RANKED','ranked')
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
      and lobby_type in ('RANKED','ranked')
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

-- ── 4. get_personal_bests — add the missing filter to q1-q4 ──

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
    select 'max_gpm'           as metric, gpm::numeric          as value, match_id, start_time as date from public.matches where user_id = auth.uid() and lobby_type in ('RANKED','ranked') and gpm is not null order by gpm desc limit 1
  ) q1
  union all
  select metric, value, match_id, date from (
    select 'max_imp'           as metric, imp::numeric          as value, match_id, start_time as date from public.matches where user_id = auth.uid() and lobby_type in ('RANKED','ranked') and imp is not null order by imp desc limit 1
  ) q2
  union all
  select metric, value, match_id, date from (
    select 'max_kills'         as metric, kills::numeric        as value, match_id, start_time as date from public.matches where user_id = auth.uid() and lobby_type in ('RANKED','ranked') and kills is not null order by kills desc limit 1
  ) q3
  union all
  select metric, value, match_id, date from (
    select 'max_hero_damage'   as metric, hero_damage::numeric  as value, match_id, start_time as date from public.matches where user_id = auth.uid() and lobby_type in ('RANKED','ranked') and hero_damage is not null order by hero_damage desc limit 1
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

-- ── 5. get_session_winrate — unused by the frontend today, fixed for
--       consistency since it reads the same table without a filter ──

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
      and lobby_type in ('RANKED','ranked')
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

-- ── 6. Refresh the two views now so corrected data is visible
--       immediately, without waiting for the next cron tick ──
refresh materialized view public.mv_hero_performance;
refresh materialized view public.mv_daily_summary;
