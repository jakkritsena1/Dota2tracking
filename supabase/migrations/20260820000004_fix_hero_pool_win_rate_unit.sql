-- ============================================================
-- Fix get_hero_pool_with_meta: player_wr unit mismatch
--
-- mv_hero_performance.win_rate is stored 0-100 (round(...*100,1)),
-- but every frontend consumer of player_wr (HeroTable, PoolScatter,
-- HeroRecommendations, PatchImpact, NextGameAdvice) treats it as a
-- 0-1 fraction — same convention as meta_wr, which really is 0-1
-- (hero_meta_daily.win_rate = winCount/matchCount, see snapshot-meta).
-- Result: displayed win rates showed values like "8000%" instead of
-- "80%", and the *0.4 weight in NextGameAdvice's hero scoring was
-- off by 100x.
--
-- Fixing at the source (divide by 100 here) rather than in every
-- frontend consumer, since they already correctly assume a 0-1
-- fraction — this function was the one that regressed.
-- ============================================================

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
