-- ============================================================
-- Multi-user backfill + PK swap (follow-up to 20260820000000_multiuser.sql)
--
-- That migration added `user_id` as NULLABLE on matches, match_tags,
-- weaknesses and goals so existing rows wouldn't break on migrate, but
-- left them invisible under RLS (auth.uid() = user_id never matches
-- null) and left matches/match_tags on their old single-column PKs.
--
-- This migration:
--   1. Attributes every existing null-user_id row to the app owner
--   2. Makes user_id NOT NULL on all four tables
--   3. Swaps matches to PK (user_id, match_id) and match_tags to PK
--      (user_id, match_id, tag) — composite so two users who play
--      together and both sync the same real STRATZ match get their
--      own row instead of colliding on a bare match_id
--   4. Rebuilds the materialized views so they reflect the backfill
--
-- RUN THIS EXACTLY ONCE, and only after the app owner has logged in
-- via Steam at least once (so exactly one `profiles` row exists to
-- attribute the old data to). Safe to run before any second user has
-- ever logged in — the guard below aborts otherwise, since with more
-- than one profile there is no way to tell from the old data alone
-- which rows belonged to which player.
-- ============================================================

do $$
declare
  v_owner_count  int;
  v_owner_id     uuid;
  v_orphan_count bigint;
begin
  select count(*) into v_owner_count from public.profiles;

  select
    (select count(*) from public.matches    where user_id is null) +
    (select count(*) from public.match_tags where user_id is null) +
    (select count(*) from public.weaknesses where user_id is null) +
    (select count(*) from public.goals      where user_id is null)
  into v_orphan_count;

  if v_owner_count = 0 then
    if v_orphan_count > 0 then
      raise exception
        'No profiles row exists yet, but % row(s) still need an owner — log in via Steam once before running this backfill.',
        v_orphan_count;
    end if;
    -- Fresh database (e.g. `supabase db reset` / CI) — nothing to attribute,
    -- fall through to the NOT NULL / PK changes below.
  elsif v_owner_count > 1 then
    raise exception
      'Found % profiles — this backfill only knows how to attribute pre-multiuser data to a single owner. Resolve manually.',
      v_owner_count;
  else
    select user_id into v_owner_id from public.profiles limit 1;

    update public.matches     set user_id = v_owner_id where user_id is null;
    update public.match_tags  set user_id = v_owner_id where user_id is null;
    update public.weaknesses  set user_id = v_owner_id where user_id is null;
    update public.goals       set user_id = v_owner_id where user_id is null;
  end if;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- MATCHES — enforce NOT NULL, swap single-column PK for
-- composite (user_id, match_id)
-- ────────────────────────────────────────────────────────────
alter table public.matches alter column user_id set not null;

-- match_tags' FK targets matches(match_id) — must go before the PK swap
alter table public.match_tags drop constraint match_tags_match_id_fkey;

alter table public.matches drop constraint matches_pkey;
alter table public.matches add primary key (user_id, match_id);

-- ────────────────────────────────────────────────────────────
-- MATCH_TAGS — enforce NOT NULL, swap PK for
-- (user_id, match_id, tag), re-point the FK at the new composite key
-- ────────────────────────────────────────────────────────────
alter table public.match_tags alter column user_id set not null;

alter table public.match_tags drop constraint match_tags_pkey;
alter table public.match_tags add primary key (user_id, match_id, tag);

alter table public.match_tags
  add constraint match_tags_user_match_fkey
  foreign key (user_id, match_id)
  references public.matches (user_id, match_id)
  on delete cascade;

-- ────────────────────────────────────────────────────────────
-- WEAKNESSES / GOALS — synthetic bigint PKs, unaffected by the
-- collision concern above; just enforce NOT NULL now that every
-- row has an owner
-- ────────────────────────────────────────────────────────────
alter table public.weaknesses alter column user_id set not null;
alter table public.goals      alter column user_id set not null;

-- ────────────────────────────────────────────────────────────
-- Rebuild the materialized views so the backfilled user_id values
-- are reflected immediately (plain, non-concurrent refresh — this
-- runs inside the migration's transaction, and REFRESH ... CONCURRENTLY
-- cannot run inside a transaction block).
-- ────────────────────────────────────────────────────────────
refresh materialized view public.mv_hero_performance;
refresh materialized view public.mv_daily_summary;
