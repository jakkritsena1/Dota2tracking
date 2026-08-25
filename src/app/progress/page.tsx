import type { Metadata } from "next";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { parseRole } from "@/lib/utils";
import { RangeSelector } from "@/components/shared/RangeSelector";
import { MmrForecast } from "@/components/progress/MmrForecast";
import { RoleMmrLines } from "@/components/progress/RoleMmrLines";
import { StreakStatsCard } from "@/components/progress/StreakStats";
import { ImpVsMmrChart } from "@/components/progress/ImpVsMmrChart";
import { Milestones } from "@/components/progress/Milestones";
import { PageHeader } from "@/components/ui/PageHeader";
import type {
  MmrSeriesRow,
  MmrForecastRow,
  StreakStats,
  WeeklyImpVsMmrRow,
  PersonalBestRow,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Progress",
  description: "ติดตามความก้าวหน้า MMR และ Milestones",
};

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ role?: string }>;
}

const ROLES = ["carry", "mid", "offlane", "support", "hardsupport"] as const;
const MIN_GAMES_PER_ROLE = 20;

export default async function ProgressPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const role = parseRole(params.role ?? null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  const [
    { data: mmrData },
    { data: forecastData },
    { data: streakData },
    { data: impMmrData },
    { data: bestsData },
    // Role-specific MMR series (5 calls, one per role)
    { data: carryMmr },
    { data: midMmr },
    { data: offlaneMmr },
    { data: supportMmr },
    { data: hardsupportMmr },
  ] = await Promise.all([
    db.rpc("get_mmr_series", { p_role: role === "all" ? null : role, p_limit: 100 }),
    db.rpc("get_mmr_forecast", { p_games: 30, p_role: role === "all" ? null : role }),
    db.rpc("get_streak_stats"),
    db.rpc("get_weekly_imp_vs_mmr", { p_weeks: 12 }),
    db.rpc("get_personal_bests"),
    db.rpc("get_mmr_series", { p_role: "carry",       p_limit: 60 }),
    db.rpc("get_mmr_series", { p_role: "mid",         p_limit: 60 }),
    db.rpc("get_mmr_series", { p_role: "offlane",     p_limit: 60 }),
    db.rpc("get_mmr_series", { p_role: "support",     p_limit: 60 }),
    db.rpc("get_mmr_series", { p_role: "hardsupport", p_limit: 60 }),
  ]);

  const series = (mmrData as MmrSeriesRow[] | null) ?? [];
  const forecast = (forecastData as MmrForecastRow[] | null)?.[0] ?? null;
  const streak = (streakData as StreakStats[] | null)?.[0] ?? null;
  const impMmr = (impMmrData as WeeklyImpVsMmrRow[] | null) ?? [];
  const bests = (bestsData as PersonalBestRow[] | null) ?? [];

  // Build per-role timeseries for RoleMmrLines
  const roleSeriesMap: Record<string, MmrSeriesRow[]> = {
    carry: (carryMmr as MmrSeriesRow[] | null) ?? [],
    mid: (midMmr as MmrSeriesRow[] | null) ?? [],
    offlane: (offlaneMmr as MmrSeriesRow[] | null) ?? [],
    support: (supportMmr as MmrSeriesRow[] | null) ?? [],
    hardsupport: (hardsupportMmr as MmrSeriesRow[] | null) ?? [],
  };

  // Only include roles with enough data
  const activeRoles = ROLES.filter(r => roleSeriesMap[r].length >= MIN_GAMES_PER_ROLE);

  // Merge per-role data into a unified date-keyed structure for RoleMmrLines
  const dateSet = new Set<string>();
  for (const r of activeRoles) {
    for (const m of roleSeriesMap[r]) dateSet.add(m.start_time.slice(0, 10));
  }
  const roleMmrData = Array.from(dateSet)
    .sort()
    .map(date => {
      const row: Record<string, string | number | null> = { date };
      for (const r of activeRoles) {
        const match = roleSeriesMap[r].find(m => m.start_time.slice(0, 10) === date);
        row[r] = match?.rank_tier ?? null;
      }
      return row;
    });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="ความก้าวหน้า"
        title="Progress"
        description="เส้นทาง MMR สตรีค และสถิติที่ทำได้ดีที่สุด"
        actions={<RangeSelector currentRange="30d" currentRole={role} showRange={false} />}
      />

      {/* PR-1: MMR forecast */}
      <MmrForecast series={series} forecast={forecast} />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* PR-2: Per-role MMR lines — a multi-line chart, needs the room */}
        <div className="xl:col-span-2">
          <RoleMmrLines data={roleMmrData as never} roles={activeRoles} />
        </div>

        {/* PR-3: Streak/tilt stats — two probability bars, fits the rail */}
        <StreakStatsCard stats={streak} />
      </div>

      {/* PR-4: IMP vs MMR scatter */}
      <ImpVsMmrChart data={impMmr} />

      {/* PR-5: Personal bests / milestones */}
      <Milestones bests={bests} />
    </div>
  );
}
