import Link from "next/link";
import type { Weakness } from "@/types/database";

interface Props {
  weaknesses: Weakness[];
}

const METRIC_LABELS: Record<string, string> = {
  gpm: "Gold per minute",
  imp: "Impact score",
  deaths: "Deaths per game",
  cs_at_10: "CS ที่ 10 นาที",
  tower_damage: "Tower damage",
  hero_damage: "Hero damage",
};

export function WeeklyFocus({ weaknesses }: Props) {
  if (weaknesses.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">สัปดาห์นี้ควรแก้อะไร</h2>
        <p className="text-text-secondary text-sm mt-4">
          ยังไม่มีข้อมูล — ต้องการเกม ≥15 เกมเพื่อวิเคราะห์จุดอ่อน
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">สัปดาห์นี้ควรแก้อะไร</h2>
      <ol className="mt-4 space-y-3">
        {weaknesses.map((w, i) => {
          const label = METRIC_LABELS[w.metric] ?? w.metric;
          // est_delta_winrate is already percentage-point scale, not a 0-1
          // fraction — see compute-weaknesses/index.ts.
          const delta = w.est_delta_winrate != null
            ? `+${w.est_delta_winrate.toFixed(1)}% win rate`
            : null;
          return (
            <li key={w.id} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{label}</p>
                {w.current_value != null && w.benchmark_value != null && (
                  <p className="text-xs text-text-secondary">
                    ของฉัน {Number(w.current_value).toFixed(1)} · benchmark {Number(w.benchmark_value).toFixed(1)}
                  </p>
                )}
                {delta && (
                  <p className="text-xs text-win mt-0.5">{delta} ถ้าปรับปรุงได้</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <Link
        href="/coach"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-teal hover:underline"
      >
        ดูรายละเอียดเพิ่มเติม →
      </Link>
    </div>
  );
}
