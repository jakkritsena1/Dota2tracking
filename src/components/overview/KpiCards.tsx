import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SummaryRow } from "@/types/database";

interface KpiCardsProps {
  summary: SummaryRow;
  totalGames: number;
}

export function KpiCards({ summary, totalGames }: KpiCardsProps) {
  const insufficientSamples = totalGames < 10;

  const cards = [
    {
      label: "Win Rate",
      value: summary.win_rate !== null ? `${summary.win_rate}%` : "—",
      delta: delta(summary.win_rate, summary.prev_win_rate),
      sub: `${summary.wins}W / ${summary.total_games - summary.wins}L`,
      description: "อัตราชนะในช่วงที่เลือก",
    },
    {
      label: "Avg IMP",
      value: summary.avg_imp !== null ? String(summary.avg_imp) : "—",
      delta: delta(summary.avg_imp, summary.prev_avg_imp),
      sub: "STRATZ Impact Score",
      description: "คะแนน impact เฉลี่ยต่อเกม",
    },
    {
      label: "KDA",
      value: summary.avg_kda !== null ? String(summary.avg_kda) : "—",
      delta: delta(summary.avg_kda, summary.prev_avg_kda),
      sub: "Kills+Assists / Deaths",
      description: "KDA เฉลี่ย",
    },
    {
      label: "Consistency",
      value: summary.consistency_score !== null ? `${summary.consistency_score}` : "—",
      delta: delta(summary.consistency_score, summary.prev_consistency), // lower stddev = better = higher score
      sub: consistencyLabel(summary.consistency_score),
      description: "ความนิ่งของฝีมือ (100 = นิ่งมาก)",
    },
  ];

  const winRatePct = summary.win_rate ?? null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const isWinRate = card.label === "Win Rate";
        return (
          <article
            key={card.label}
            className="card space-y-1"
            aria-label={card.description}
          >
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider">
              {card.label}
            </p>

            <p className="text-2xl font-bold text-text-primary">
              {card.value}
            </p>

            {isWinRate && winRatePct !== null && (
              <div className="h-1 w-full rounded-full bg-bg-secondary overflow-hidden">
                <div
                  className={cn("h-full", winRatePct >= 50 ? "bg-win" : "bg-loss")}
                  style={{ width: `${Math.min(100, Math.max(0, winRatePct))}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-text-muted text-xs">{card.sub}</p>

              {insufficientSamples ? (
                <span
                  className="inline-flex items-center gap-1 text-xs text-accent-orange px-1.5 py-0.5 rounded bg-bg-secondary"
                  title="ตัวอย่างน้อย — ต้องการ 10 เกมขึ้นไป"
                >
                  <AlertTriangle size={10} aria-hidden />
                  น้อย
                </span>
              ) : card.delta !== null ? (
                <DeltaBadge delta={card.delta} />
              ) : null}
            </div>
          </article>
        );
      })}

      <p className="col-span-2 lg:col-span-4 text-xs text-text-secondary -mt-1">
        <span className="text-accent-gold font-semibold">{totalGames}</span> เกมในช่วงที่เลือก
      </p>
    </div>
  );
}

function delta(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}

function DeltaBadge({ delta }: { delta: number }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
        isZero
          ? "text-text-secondary"
          : isPositive
          ? "text-win bg-accent-green-dim"
          : "text-loss bg-accent-red-dim",
      )}
      aria-label={`เปลี่ยนแปลง ${delta > 0 ? "+" : ""}${delta.toFixed(1)} จากช่วงก่อนหน้า`}
    >
      {isZero ? (
        <Minus size={10} aria-hidden />
      ) : isPositive ? (
        <TrendingUp size={10} aria-hidden />
      ) : (
        <TrendingDown size={10} aria-hidden />
      )}
      {delta > 0 ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

function consistencyLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 75) return "ฝีมือนิ่งมาก";
  if (score >= 50) return "ค่อนข้างนิ่ง";
  if (score >= 30) return "ขึ้นๆ ลงๆ";
  return "เกมดีสลับเกมพัง";
}
