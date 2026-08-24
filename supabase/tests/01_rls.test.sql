-- pgTAP RLS tests
-- Run with: supabase test db
-- Verifies both that anon can't read anything, and that an
-- authenticated user only ever sees their OWN rows — never another
-- user's. If any of these fail, data is leaking across accounts.

begin;

select plan(15);

-- ── Two test users, each with one match ─────────────────────
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@example.com');

insert into public.profiles (user_id, steam_account_id) values
  ('11111111-1111-1111-1111-111111111111', 100000001),
  ('22222222-2222-2222-2222-222222222222', 100000002);

insert into public.matches (
  user_id, match_id, start_time, duration_sec, is_win, hero_id,
  kills, deaths, assists, gpm, imp, role, lobby_type, rank_tier
) values (
  '11111111-1111-1111-1111-111111111111', 9001, now(), 1800, true, 1,
  5, 2, 10, 500, 40, 'carry', 'RANKED', 55
);

insert into public.match_tags (user_id, match_id, tag, confidence, reason) values
  ('11111111-1111-1111-1111-111111111111', 9001, 'good_game', 0.9, '{}');

insert into public.weaknesses (user_id, range_key, metric, current_value) values
  ('11111111-1111-1111-1111-111111111111', '30d', 'gpm', 500);

insert into public.goals (user_id, title, rule) values
  ('11111111-1111-1111-1111-111111111111', 'raise gpm', '{"metric":"gpm","op":">=","value":500}');

insert into public.benchmarks (captured_on, rank_bracket, role, metric, p50) values
  (current_date, 'legend', 'carry', 'gpm', 520);

-- ────────────────────────────────────────────────────────────
-- anon role (mimics unauthenticated browser request) — deny-all
-- ────────────────────────────────────────────────────────────
set role anon;

select is((select count(*)::int from public.matches),         0, 'anon cannot read matches');
select is((select count(*)::int from public.match_tags),       0, 'anon cannot read match_tags');
select is((select count(*)::int from public.weaknesses),       0, 'anon cannot read weaknesses');
select is((select count(*)::int from public.goals),            0, 'anon cannot read goals');
select is((select count(*)::int from public.api_cache),        0, 'anon cannot read api_cache');
select is((select count(*)::int from public.job_runs),         0, 'anon cannot read job_runs');
select is((select count(*)::int from public.profiles),         0, 'anon cannot read profiles');
select is((select count(*)::int from public.benchmarks),       0, 'anon cannot read benchmarks');

reset role;

-- ────────────────────────────────────────────────────────────
-- authenticated as the STRANGER — owns no rows, must see none of
-- the owner's data (this is the check that actually proves
-- per-user isolation, not just "table is empty")
-- ────────────────────────────────────────────────────────────
set role authenticated;
set request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*)::int from public.matches),    0, 'stranger reads 0 of the owner''s matches');
select is((select count(*)::int from public.match_tags), 0, 'stranger reads 0 of the owner''s match_tags');
select is((select count(*)::int from public.weaknesses), 0, 'stranger reads 0 of the owner''s weaknesses');
select is((select count(*)::int from public.goals),      0, 'stranger reads 0 of the owner''s goals');

reset role;

-- ────────────────────────────────────────────────────────────
-- authenticated as the OWNER — must see exactly their own row
-- ────────────────────────────────────────────────────────────
set role authenticated;
set request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is((select count(*)::int from public.matches), 1, 'owner reads their own match');
select is((select count(*)::int from public.goals),   1, 'owner reads their own goal');

-- benchmarks/hero_meta_daily are global reference data — every
-- authenticated user should be able to read them (select-true policy),
-- unlike the per-user tables above
select is((select count(*)::int from public.benchmarks), 1, 'authenticated user can read global benchmarks');

reset role;

select * from finish();
rollback;
