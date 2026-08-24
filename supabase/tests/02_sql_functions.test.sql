-- pgTAP SQL function tests
-- Tests run as postgres (bypasses RLS) using seed data.
--
-- All per-user tables now require user_id (FK to auth.users), and the
-- RPC functions read auth.uid() internally — so seeding alone isn't
-- enough. We create a real auth.users row for a fixed test UUID, then
-- switch to the `authenticated` role with a matching JWT claim whenever
-- we call an auth.uid()-scoped RPC.

begin;

select plan(10);

-- ── Test user ────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'test-owner@example.com');

insert into public.profiles (user_id, steam_account_id) values
  ('11111111-1111-1111-1111-111111111111', 100000001);

-- ── Seed data ────────────────────────────────────────────────
insert into public.matches (
  user_id, match_id, start_time, duration_sec, is_win, hero_id,
  kills, deaths, assists, gpm, imp, role, lobby_type, rank_tier
)
values
  ('11111111-1111-1111-1111-111111111111', 1001, now() - interval '5 days',  3600, true,  1, 5, 2, 10, 580, 45, 'carry', 'RANKED', 55),
  ('11111111-1111-1111-1111-111111111111', 1002, now() - interval '4 days',  2700, false, 1, 2, 8,  3, 420, 15, 'carry', 'RANKED', 55),
  ('11111111-1111-1111-1111-111111111111', 1003, now() - interval '3 days',  4200, true,  2, 8, 1, 15, 650, 60, 'carry', 'RANKED', 55),
  ('11111111-1111-1111-1111-111111111111', 1004, now() - interval '2 days',  3000, false, 2, 1, 6,  8, 500, 30, 'mid',   'RANKED', 56),
  ('11111111-1111-1111-1111-111111111111', 1005, now() - interval '1 day',   3300, true,  3, 7, 3, 12, 540, 50, 'carry', 'RANKED', 56);

-- ── Switch to authenticated-as-test-user for auth.uid()-scoped RPCs ──
set role authenticated;
set request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ── get_summary ──────────────────────────────────────────────
select ok(
  exists(
    select 1 from public.get_summary(
      now() - interval '7 days',
      now(),
      null
    )
    where total_games = 5 and wins = 3
  ),
  'get_summary returns correct game count and wins'
);

select ok(
  exists(
    select 1 from public.get_summary(
      now() - interval '7 days',
      now(),
      'carry'
    )
    where total_games = 4 and wins = 3
  ),
  'get_summary filters by role correctly'
);

select ok(
  exists(
    select 1 from public.get_summary(
      now() - interval '7 days',
      now(),
      null
    )
    where win_rate = 60.0
  ),
  'get_summary calculates 3/5 = 60% win rate'
);

-- ── get_mmr_series ───────────────────────────────────────────
select ok(
  (select count(*) from public.get_mmr_series(null, 90)) = 5,
  'get_mmr_series returns all 5 seeded matches'
);

-- ── get_streak_stats ─────────────────────────────────────────
-- With 5 games (W,L,W,L,W), no 2-loss streak in a row → streak sample = 0
select ok(
  (select sample_size_overall from public.get_streak_stats()) = 5,
  'get_streak_stats correct overall sample size'
);

-- ── benchmarks: get_percentiles returns empty for missing data ─
-- (doesn't depend on auth.uid() — global reference table — but harmless
-- to check under the same role)
select ok(
  not exists(
    select 1 from public.get_percentiles('divine', 'carry', 'gpm', '2020-01-01')
  ),
  'get_percentiles returns empty for non-existent benchmark'
);

-- ── Back to postgres (bypasses RLS) for direct table writes ──
reset role;

-- ── Idempotency: upsert duplicate (user_id, match_id) ─────────
insert into public.matches (
  user_id, match_id, start_time, duration_sec, is_win, hero_id,
  kills, deaths, assists, gpm, imp, role, lobby_type, rank_tier
)
values
  ('11111111-1111-1111-1111-111111111111', 1001, now() - interval '5 days', 3600, true, 1, 5, 2, 10, 580, 45, 'carry', 'RANKED', 55)
on conflict (user_id, match_id) do nothing;

select is(
  (select count(*)::int from public.matches where match_id = 1001),
  1,
  'upsert on conflict do nothing is idempotent'
);

-- ── match_tags: unique constraint ────────────────────────────
insert into public.match_tags (user_id, match_id, tag, confidence, reason)
values ('11111111-1111-1111-1111-111111111111', 1001, 'lane_loss', 0.85, '{"cs_at_10": 38, "threshold": 42}');

select throws_ok(
  $$
    insert into public.match_tags (user_id, match_id, tag, confidence, reason)
    values ('11111111-1111-1111-1111-111111111111', 1001, 'lane_loss', 0.90, '{}')
  $$,
  '23505',
  null,
  'duplicate (user_id, match_id, tag) violates primary key'
);

-- ── RLS check: anon gets 0 rows even with seeded data ─────────
reset request.jwt.claims;
set role anon;
select is(
  (select count(*)::int from public.matches),
  0,
  'anon still reads 0 matches after seed'
);
reset role;

-- ── Goals: status check constraint ───────────────────────────
select throws_ok(
  $$
    insert into public.goals (user_id, title, rule, status)
    values ('11111111-1111-1111-1111-111111111111', 'bad status', '{}', 'invalid_status')
  $$,
  '23514',
  null,
  'goals.status rejects invalid values'
);

select * from finish();
rollback;
