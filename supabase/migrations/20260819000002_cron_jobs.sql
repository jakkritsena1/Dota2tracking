-- ============================================================
-- Cron Job Registration
-- Requires pg_cron + pg_net enabled (Dashboard → Extensions)
-- and database config set via SQL editor FIRST (see below).
-- ============================================================
--
-- Run these TWO commands in Supabase SQL Editor ONCE before
-- applying this migration (values not stored in git):
--
--   ALTER DATABASE postgres
--     SET "app.supabase_url" TO 'https://YOUR_PROJECT_REF.supabase.co';
--
--   ALTER DATABASE postgres
--     SET "app.internal_api_secret" TO 'YOUR_INTERNAL_API_SECRET';
--   (same value as the INTERNAL_API_SECRET Edge Function secret)
--
-- After setting those, run: supabase db push  (or supabase db reset)
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- Remove any previous versions of these jobs before re-registering
select cron.unschedule(jobname)
from cron.job
where jobname in (
  'sync-matches',
  'snapshot-meta',
  'compute-weaknesses',
  'weekly-digest',
  'prune-raw-jsonb'
);

-- ── Every 15 min: sync new matches from STRATZ ────────────────
select cron.schedule(
  'sync-matches',
  '*/15 * * * *',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/sync-matches',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.internal_api_secret')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Daily 04:00 UTC (11:00 BKK): snapshot hero meta ──────────
select cron.schedule(
  'snapshot-meta',
  '0 4 * * *',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/snapshot-meta',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.internal_api_secret')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Daily 04:30 UTC: recompute weaknesses ────────────────────
select cron.schedule(
  'compute-weaknesses',
  '30 4 * * *',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/compute-weaknesses',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.internal_api_secret')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Monday 01:00 UTC: weekly digest email + Discord ───────────
select cron.schedule(
  'weekly-digest',
  '0 1 * * 1',
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/weekly-digest',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.internal_api_secret')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Daily 05:00 UTC: prune raw JSONB (free tier space) ───────
-- Keeps each user's own 50 most recent matches with raw payload intact
-- (per-user, since matches now hold multiple users' data).
select cron.schedule(
  'prune-raw-jsonb',
  '0 5 * * *',
  $$
    update public.matches m
    set raw = null
    where raw is not null
      and not exists (
        select 1
        from (
          select user_id, match_id,
                 row_number() over (partition by user_id order by start_time desc) as rn
          from public.matches
        ) ranked
        where ranked.user_id = m.user_id
          and ranked.match_id = m.match_id
          and ranked.rn <= 50
      );
  $$
);
