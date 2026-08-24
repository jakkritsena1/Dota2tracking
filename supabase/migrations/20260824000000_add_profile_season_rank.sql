-- profiles never stored the player's current STRATZ rank anywhere — the
-- overview header derived it from matches.rank_tier, which sync-matches
-- always writes as null (STRATZ doesn't return per-match rank), so the
-- rank badge showed "Unknown" for every user. Capture it at login instead.
alter table public.profiles
  add column if not exists season_rank int,
  add column if not exists season_leaderboard_rank int;
