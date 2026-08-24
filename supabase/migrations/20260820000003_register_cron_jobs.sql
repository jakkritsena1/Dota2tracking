-- ============================================================
-- Register cron jobs (real fix for 20260819000002_cron_jobs.sql)
--
-- That migration is already recorded as applied on production, so
-- editing its content never re-runs it — and it turns out its
-- content never actually registered anything: `cron.job` was empty
-- and `app.supabase_url` / `app.internal_api_secret` were never set,
-- because `ALTER DATABASE ... SET` requires cluster-superuser rights
-- that the managed `postgres` role doesn't have on this platform tier
-- (confirmed: it errors with 42501 permission denied even from the
-- SQL Editor). The original migration's design depended on a step
-- that was never actually possible to complete.
--
-- Fix: the project URL isn't secret (it's a public HTTPS endpoint),
-- so it's hardcoded directly below. The internal API secret IS
-- sensitive, so instead of a database-level GUC it's read from
-- Supabase Vault (`vault.decrypted_secrets`), which the migration
-- role *can* read — the secret itself was seeded out-of-band via
-- `vault.create_secret(...)` as a one-off query, never committed to
-- this file or git history.
-- ============================================================

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
      url     := 'https://tglnslwwwryrheklnzpf.supabase.co/functions/v1/sync-matches',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'internal_api_secret'
        )
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
      url     := 'https://tglnslwwwryrheklnzpf.supabase.co/functions/v1/snapshot-meta',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'internal_api_secret'
        )
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
      url     := 'https://tglnslwwwryrheklnzpf.supabase.co/functions/v1/compute-weaknesses',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'internal_api_secret'
        )
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
      url     := 'https://tglnslwwwryrheklnzpf.supabase.co/functions/v1/weekly-digest',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'internal_api_secret'
        )
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Daily 05:00 UTC: prune raw JSONB (free tier space) ───────
-- Keeps each user's own 50 most recent matches with raw payload intact.
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
