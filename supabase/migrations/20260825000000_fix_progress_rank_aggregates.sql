-- Fixes two bugs on the Progress page where rank_tier aggregates used
-- min()/max() (the highest/lowest rank ever touched in the window) instead
-- of the chronologically first/last value — the two are only the same when
-- rank moves monotonically, which it never does in practice.
--
-- 1. get_mmr_forecast: `latest` (labelled "current" rank) was max(rank_tier)
--    over the lookback window, not the rank_tier of the most recent match.
--    This fed directly into next_rank_tier, estimated_weeks, and the
--    confidence band shown on the "แนวโน้ม MMR" chart — all silently wrong
--    whenever the player's rank had dipped after an earlier peak within the
--    window.
-- 2. get_weekly_imp_vs_mmr: rank_start/rank_end were min/max(rank_tier)
--    within the week, not the first/last match's rank_tier. mmr_delta
--    (rank_end - rank_start) on the "IMP vs MMR" scatter could show an
--    inflated or even wrong-signed weekly change whenever rank fluctuated
--    non-monotonically within the week (the normal case).

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
      regr_slope(rank_tier, ts)                    as slope,
      regr_intercept(rank_tier, ts)                 as intercept,
      (array_agg(rank_tier order by ts desc))[1]::int as latest,
      stddev(rank_tier)                             as std,
      count(*)                                      as n
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
      avg(imp)                                          as avg_imp,
      (array_agg(rank_tier order by start_time asc))[1]  as rank_start,
      (array_agg(rank_tier order by start_time desc))[1] as rank_end,
      count(*)                                          as games
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
