import { Suspense } from "react";
import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { parseRange, parseRole, rangeToStartDate } from "@/lib/utils";
import { PlayerHeader } from "@/components/overview/PlayerHeader";
import { FormBar } from "@/components/overview/FormBar";
import { KpiCards } from "@/components/overview/KpiCards";
import { MatchTable } from "@/components/overview/MatchTable";
import { RolePieChart } from "@/components/overview/RolePieChart";
import { MmrChart } from "@/components/overview/MmrChart";
import { WeeklyFocus } from "@/components/overview/WeeklyFocus";
import { NextGameAdvice } from "@/components/overview/NextGameAdvice";
import { PlayCalendar } from "@/components/overview/PlayCalendar";
import { MostPlayedHeroes } from "@/components/overview/MostPlayedHeroes";
import { SessionTracker } from "@/components/overview/SessionTracker";
import { Card } from "@/components/ui/Card";
import { RangeSelector } from "@/components/shared/RangeSelector";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiCardSkeleton } from "@/components/shared/SkeletonCard";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import type {
  SummaryRow,
  MmrSeriesRow,
  Weakness,
  HeroPoolWithMetaRow,
  DailySummary,
  SessionWinrateRow,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Overview",
  description: "ภาพรวมสถิติ Dota 2 ของฉัน",
};

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ range?: string; role?: string; mode?: string }>;
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range = parseRange(params.range ?? null);
  const role = parseRole(params.role ?? null);
  const rangeStart = rangeToStartDate(range);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;
  // job_runs stays global/service-role-only (admin diagnostics, not per-user data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = getServerSupabase() as any;

  const [
    { data: summaryData },
    { data: recentMatches },
    { data: formMatches },
    { data: mmrData },
    { data: roleData },
    { data: lastSync },
    { data: weaknessData },
    { data: heroPoolData },
    { data: dailyData },
    { data: sessionData },
  ] = await Promise.all([
    db.rpc("get_summary", {
      p_start: rangeStart.toISOString(),
      p_end: new Date().toISOString(),
      p_role: role === "all" ? null : role,
    }),

    (() => {
      let q = db
        .from("matches")
        .select(`
          match_id, start_time, duration_sec, is_win,
          hero_id, role, kills, deaths, assists,
          gpm, imp, lane_outcome,
          match_tags ( tag, confidence, reason )
        `)
        .gte("start_time", rangeStart.toISOString())
        .in("lobby_type", ["RANKED", "ranked"]);
      if (role !== "all") q = q.eq("role", role);
      return q.order("start_time", { ascending: false }).limit(20);
    })(),

    db
      .from("matches")
      .select("match_id, is_win, hero_id, kills, deaths, assists, imp, start_time")
      .in("lobby_type", ["RANKED", "ranked"])
      .order("start_time", { ascending: false })
      .limit(10),

    db.rpc("get_mmr_series", {
      p_role: role === "all" ? null : role,
      p_limit: 60,
    }),

    db
      .from("matches")
      .select("role")
      .gte("start_time", rangeStart.toISOString())
      .not("role", "is", null),

    adminDb
      .from("job_runs")
      .select("finished_at")
      .eq("job_name", "sync-matches")
      .eq("status", "ok")
      .order("finished_at", { ascending: false })
      .limit(1)
      .single(),

    // OV-5: top weaknesses
    db
      .from("weaknesses")
      .select("*")
      .order("rank_order", { ascending: true })
      .limit(3),

    // OV-9: hero pool for advisor
    db.rpc("get_hero_pool_with_meta", {
      p_role: role === "all" ? null : role,
      p_rank_bracket: "legend",
    }),

    // OV-10: play calendar (last 28 days)
    db.rpc("get_daily_summary", {
      p_start: new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10),
    }),

    // Session tracker — per-day game sequence, for the current session and
    // the "does game 5 go worse than game 1" curve.
    db.rpc("get_session_winrate", {
      p_start: new Date(Date.now() - 90 * 86400_000).toISOString(),
    }),
  ]);

  const roleCounts = ((roleData ?? []) as {role?: string}[]).reduce((acc: Record<string, number>, m) => {
    if (m.role) acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const rolePieData = Object.entries(roleCounts).map(([role, count]) => ({ role, count }));

  const summary = (summaryData as SummaryRow[] | null)?.[0] ?? null;
  const mmrSeries = (mmrData as MmrSeriesRow[] | null) ?? [];
  const form10 = (formMatches ?? []).slice().reverse();
  const weaknesses = (weaknessData as Weakness[] | null) ?? [];
  const heroPool = (heroPoolData as HeroPoolWithMetaRow[] | null) ?? [];
  const dailySummaries = (dailyData as DailySummary[] | null) ?? [];
  const sessions = (sessionData as SessionWinrateRow[] | null) ?? [];

  return (
    <div className="space-y-6 md:space-y-8">
      <ScrollReveal className="flex flex-wrap items-end justify-between gap-4">
        <Suspense fallback={<div className="skeleton h-16 w-64" />}>
          <OverviewHeader lastSyncedAt={lastSync?.finished_at ?? null} />
        </Suspense>
        <RangeSelector currentRange={range} currentRole={role} />
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
        <FormBar matches={form10 as Parameters<typeof FormBar>[0]["matches"]} />
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        {summary ? (
          <KpiCards
            summary={summary}
            totalGames={Number(summary.total_games ?? 0)}
            recent={form10 as Parameters<typeof KpiCards>[0]["recent"]}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <KpiCardSkeleton key={i} />)}
          </div>
        )}
      </ScrollReveal>

      {/* Trend row — MMR gets the wider column; it's the one chart people
          come back for, and a pie needs far less room to be readable.
          796fr/380fr and the 1232px trigger are stratz.com's own measured
          main/rail split and breakpoint (binary-searched live, not
          guessed) — see the note in globals.css. */}
      <ScrollReveal className="grid gap-6 min-[1232px]:grid-cols-[796fr_380fr]">
        <Card>
          {mmrSeries.length > 0 ? (
            <MmrChart data={mmrSeries} />
          ) : (
            <EmptyState
              title="ยังไม่มีข้อมูล MMR"
              description="STRATZ ไม่ส่ง rank ย้อนหลังรายแมตช์มาให้ — เห็นได้แค่ rank ปัจจุบันเท่านั้น กราฟนี้จะเริ่มมีข้อมูลเมื่อระบบเก็บ rank ของแมตช์ใหม่ ๆ ได้"
            />
          )}
        </Card>
        <Card>
          <RolePieChart data={rolePieData} />
        </Card>
      </ScrollReveal>

      {/* Habits row — the session curve needs width to read; the calendar
          heatmap doesn't, so it takes the narrower column instead of an
          even split. */}
      <ScrollReveal className="grid gap-6 min-[1232px]:grid-cols-[796fr_380fr]">
        <SessionTracker rows={sessions} />
        <PlayCalendar dailySummaries={dailySummaries} />
      </ScrollReveal>

      {/* Advice row — three peer cards, no main/rail split needed. */}
      <ScrollReveal className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <WeeklyFocus weaknesses={weaknesses} />
        <NextGameAdvice heroPool={heroPool} role={role === "all" ? null : role} />
        <MostPlayedHeroes heroPool={heroPool} />
      </ScrollReveal>

      <ScrollReveal>
        <MatchTable matches={(recentMatches ?? []) as Parameters<typeof MatchTable>[0]["matches"]} />
      </ScrollReveal>
    </div>
  );
}

async function OverviewHeader({
  lastSyncedAt,
}: {
  lastSyncedAt: string | null;
}) {
  const userDb = getServerSupabaseForUser();
  const { data: { user } } = await userDb.auth.getUser();

  const { data: profile } = user
    ? await userDb
        .from("profiles")
        .select("persona_name, avatar_url, season_rank, season_leaderboard_rank")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  return (
    <PlayerHeader
      name={profile?.persona_name ?? "Player"}
      avatar={profile?.avatar_url ?? null}
      seasonRank={profile?.season_rank ?? null}
      leaderboardRank={profile?.season_leaderboard_rank ?? null}
      isDotaPlus={false}
      lastSyncedAt={lastSyncedAt}
    />
  );
}
