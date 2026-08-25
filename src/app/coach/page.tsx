import type { Metadata } from "next";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { parseRange, parseRole, rangeToStartDate } from "@/lib/utils";
import { RangeSelector } from "@/components/shared/RangeSelector";
import { RadarAxes } from "@/components/coach/RadarAxes";
import { WeaknessCards } from "@/components/coach/WeaknessCards";
import { BenchmarkTimeline } from "@/components/coach/BenchmarkTimeline";
import { GoalsList } from "@/components/coach/GoalsList";
import type { RadarScoreRow, GoalProgressRow, Weakness, Benchmark } from "@/types/database";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Coach",
  description: "Self-coaching: radar axes, weaknesses, benchmarks, goals",
};

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ role?: string; range?: string }>;
}

export default async function CoachPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const role = parseRole(params.role ?? null);
  const range = parseRange(params.range ?? null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;
  const rangeStart = rangeToStartDate(range).toISOString();

  const [
    { data: radarData },
    { data: weaknessData },
    { data: goalData },
    { data: benchmarkData },
    { data: matchAvgData },
  ] = await Promise.all([
    // CO-1: Radar scores
    db.rpc("get_radar_scores", {
      p_start: rangeStart,
      p_end: new Date().toISOString(),
      p_role: role === "all" ? null : role,
    }),

    // CO-2: Weaknesses
    db
      .from("weaknesses")
      .select("*")
      .order("rank_order", { ascending: true })
      .limit(3),

    // CO-4: Goal progress
    db.rpc("get_goal_progress"),

    // CO-3: Latest benchmark values
    db
      .from("benchmarks")
      .select("*")
      .eq("rank_bracket", "legend")
      .eq("role", role === "all" ? "carry" : role)
      .order("captured_on", { ascending: false })
      .limit(10),

    // CO-3: Match averages over time (weekly buckets for timeline)
    db.rpc("get_daily_summary", {
      p_start: new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10),
    }),
  ]);

  const radarScores = (radarData as RadarScoreRow[] | null) ?? [];
  const weaknesses = (weaknessData as Weakness[] | null) ?? [];
  const goals = (goalData as GoalProgressRow[] | null) ?? [];
  const benchmarks = (benchmarkData as Benchmark[] | null) ?? [];

  // Build timeline data for BenchmarkTimeline
  const gpmBenchmark = benchmarks.find(b => b.metric === "gpm");
  const xpmBenchmark = benchmarks.find(b => b.metric === "xpm");
  const timelineData = ((matchAvgData as { play_date: string; avg_gpm: number }[] | null) ?? []).map(d => ({
    date: d.play_date,
    my_gpm: d.avg_gpm ?? null,
    my_xpm: null as number | null,
    p50_gpm: gpmBenchmark?.p50 ?? null,
    p50_xpm: xpmBenchmark?.p50 ?? null,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="โค้ช"
        title="Self Coach"
        description="จุดอ่อนที่แก้ได้จริง เรียงตามผลกระทบต่ออัตราชนะ"
        actions={<RangeSelector currentRange={range} currentRole={role} />}
      />

      {/* 796fr/380fr and the 1232px trigger are stratz.com's own measured
          main/rail split and breakpoint — see the note in globals.css. */}
      <div className="grid gap-6 min-[1232px]:grid-cols-[796fr_380fr]">
        {/* CO-1: Radar — needs the room, so it takes the wide column */}
        <RadarAxes scores={radarScores} />

        {/* CO-2: Weaknesses — a short ranked list, fits the rail */}
        <WeaknessCards weaknesses={weaknesses} />
      </div>

      {/* CO-3: Benchmark timeline */}
      <BenchmarkTimeline data={timelineData} benchmarks={benchmarks} />

      {/* CO-4: Goals */}
      <GoalsList goals={goals} />
    </div>
  );
}
