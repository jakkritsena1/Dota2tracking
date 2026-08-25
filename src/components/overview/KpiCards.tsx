import { AlertTriangle, Percent, Gauge, Swords, Activity } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { Sparkline } from "@/components/ui/Sparkline";
import { ProgressBar } from "@/components/ui/Meter";
import { MIN_GAMES_FOR_SUMMARY } from "@/lib/utils";
import type { SummaryRow, Match } from "@/types/database";

interface KpiCardsProps {
  summary: SummaryRow;
  totalGames: number;
  /** Recent matches, oldest first — drives the sparkline on each tile. */
  recent?: Pick<Match, "is_win" | "imp" | "kills" | "deaths" | "assists">[];
}

export function KpiCards({ summary, totalGames, recent = [] }: KpiCardsProps) {
  const insufficientSamples = totalGames < MIN_GAMES_FOR_SUMMARY;
  const winRatePct = summary.win_rate ?? null;

  // Rolling win rate over the recent window: at game i, the win rate of
  // everything up to and including it. Reads as "which way is this trending"
  // without needing an axis.
  const winSeries = recent.reduce<number[]>((acc, m, i) => {
    const wins = (i > 0 ? acc[i - 1] * i : 0) / 100 + (m.is_win ? 1 : 0);
    acc.push((wins / (i + 1)) * 100);
    return acc;
  }, []);

  const impSeries = recent.map((m) => m.imp).filter((v): v is number => v != null);
  const kdaSeries = recent.map((m) =>
    (m.deaths ?? 0) === 0
      ? (m.kills ?? 0) + (m.assists ?? 0)
      : ((m.kills ?? 0) + (m.assists ?? 0)) / (m.deaths ?? 1),
  );

  const sampleWarning = insufficientSamples ? (
    <span
      className="inline-flex items-center gap-1 text-xs text-accent-orange px-1.5 py-0.5 rounded bg-bg-overlay"
      title={`ตัวอย่างน้อย — ต้องการ ${MIN_GAMES_FOR_SUMMARY} เกมขึ้นไป`}
    >
      <AlertTriangle size={10} aria-hidden />
      ตัวอย่างน้อย
    </span>
  ) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        label="Win Rate"
        icon={<Percent size={12} />}
        value={winRatePct !== null ? `${winRatePct}%` : "—"}
        tone={winRatePct !== null ? (winRatePct >= 50 ? "win" : "loss") : undefined}
        delta={insufficientSamples ? null : delta(summary.win_rate, summary.prev_win_rate)}
        deltaSuffix="%"
        meter={winRatePct !== null ? <ProgressBar pct={winRatePct} /> : undefined}
        sub={`${summary.wins}W / ${summary.total_games - summary.wins}L`}
        footer={sampleWarning}
        ariaLabel="อัตราชนะในช่วงที่เลือก"
      />

      <StatTile
        label="Avg IMP"
        icon={<Gauge size={12} />}
        value={summary.avg_imp ?? "—"}
        delta={insufficientSamples ? null : delta(summary.avg_imp, summary.prev_avg_imp)}
        sub="STRATZ Impact Score"
        chart={impSeries.length > 1 ? <Sparkline values={impSeries} /> : undefined}
        ariaLabel="คะแนน impact เฉลี่ยต่อเกม"
      />

      <StatTile
        label="KDA"
        icon={<Swords size={12} />}
        value={summary.avg_kda ?? "—"}
        delta={insufficientSamples ? null : delta(summary.avg_kda, summary.prev_avg_kda)}
        deltaSuffix=""
        sub="(Kills + Assists) / Deaths"
        chart={kdaSeries.length > 1 ? <Sparkline values={kdaSeries} /> : undefined}
        ariaLabel="KDA เฉลี่ย"
      />

      <StatTile
        label="Consistency"
        icon={<Activity size={12} />}
        value={summary.consistency_score ?? "—"}
        delta={insufficientSamples ? null : delta(summary.consistency_score, summary.prev_consistency)}
        sub={consistencyLabel(summary.consistency_score)}
        chart={winSeries.length > 1 ? <Sparkline values={winSeries} tone="teal" /> : undefined}
        ariaLabel="ความนิ่งของฝีมือ (100 = นิ่งมาก)"
      />

      <p className="col-span-2 lg:col-span-4 text-xs text-text-secondary -mt-1">
        <span className="text-accent-gold font-semibold tabular-nums">{totalGames}</span> เกมในช่วงที่เลือก
        {insufficientSamples && (
          <span className="text-text-muted">
            {" "}
            · ตัวเลขเทียบช่วงก่อนหน้าถูกซ่อนไว้จนกว่าจะครบ {MIN_GAMES_FOR_SUMMARY} เกม
          </span>
        )}
      </p>
    </div>
  );
}

function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}

function consistencyLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 75) return "ฝีมือนิ่งมาก";
  if (score >= 50) return "ค่อนข้างนิ่ง";
  if (score >= 30) return "ขึ้นๆ ลงๆ";
  return "เกมดีสลับเกมพัง";
}
