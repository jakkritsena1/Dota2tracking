-- ============================================================
-- Harden RLS policy role-scoping (defense in depth)
--
-- 20260820000000_multiuser.sql created every per-user policy
-- without a `TO` clause, which defaults to PUBLIC — i.e. anon too.
-- Since anon/authenticated hold base table privileges (Supabase's
-- default), the only thing stopping anon from reading another
-- user's data was `auth.uid() = user_id` evaluating to NULL for an
-- unauthenticated session. That's standard, but fragile as the sole
-- barrier — Supabase's own guidance is to scope every policy with
-- an explicit `TO` role rather than rely on it implicitly.
--
-- This migration is a pure role-scoping change — it doesn't touch
-- the policy expressions, table structure, or any data. Already-
-- applied on 20260820000000 (that migration file was fixed too, but
-- since it's already recorded as applied, editing it doesn't
-- retroactively change what's live — hence this follow-up).
-- ============================================================

alter policy "profiles_select_own"          on public.profiles           to authenticated;
alter policy "profiles_update_own"          on public.profiles           to authenticated;
alter policy "matches_select_own"           on public.matches            to authenticated;
alter policy "match_tags_select_own"        on public.match_tags         to authenticated;
alter policy "weaknesses_select_own"        on public.weaknesses         to authenticated;
alter policy "goals_select_own"             on public.goals              to authenticated;
alter policy "goals_insert_own"             on public.goals              to authenticated;
alter policy "goals_update_own"             on public.goals              to authenticated;
alter policy "goals_delete_own"             on public.goals              to authenticated;
alter policy "player_benchmarks_select_own" on public.player_benchmarks  to authenticated;
alter policy "benchmarks_select_all"        on public.benchmarks         to authenticated;
alter policy "hero_meta_daily_select_all"   on public.hero_meta_daily    to authenticated;
