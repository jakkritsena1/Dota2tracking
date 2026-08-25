import Link from "next/link";
import type { PersonalBestRow } from "@/types/database";
import { formatMatchDate } from "@/lib/utils";

interface Props {
  bests: PersonalBestRow[];
}

const METRIC_CONFIG: Record<string, { label: string; unit: string; nextMilestone: (v: number) => number }> = {
  max_gpm: {
    label: "GPM สูงสุด",
    unit: "GPM",
    nextMilestone: v => Math.ceil(v / 100) * 100,
  },
  max_imp: {
    label: "Impact สูงสุด",
    unit: "IMP",
    nextMilestone: v => Math.ceil(v / 5) * 5,
  },
  max_kills: {
    label: "Kill สูงสุด",
    unit: "kills",
    nextMilestone: v => v + 1,
  },
  max_hero_damage: {
    label: "Hero Damage สูงสุด",
    unit: "",
    nextMilestone: v => Math.ceil(v / 5000) * 5000,
  },
  max_win_streak: {
    label: "Win Streak ยาวสุด",
    unit: "เกม",
    nextMilestone: v => v + 1,
  },
};

function formatValue(metric: string, value: number): string {
  if (metric === "max_hero_damage" || metric === "max_gpm") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
  }
  return String(value);
}

export function Milestones({ bests }: Props) {
  if (bests.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">Personal Bests</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">Personal Bests</h2>
      <ul className="mt-4 divide-y divide-border">
        {bests.map(b => {
          const cfg = METRIC_CONFIG[b.metric];
          if (!cfg) return null;
          const next = cfg.nextMilestone(b.value);
          const pct = Math.min(100, (b.value / next) * 100);
          return (
            <li key={b.metric} className="py-3 first:pt-0 last:pb-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-text-primary">{cfg.label}</span>
                <span className="text-sm font-bold text-accent-teal">
                  {formatValue(b.metric, b.value)} {cfg.unit}
                </span>
              </div>
              <div className="h-1.5 bg-border/40 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-accent-teal rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>
                  {b.date ? formatMatchDate(b.date) : ""} ·{" "}
                  <Link href={`/match/${b.match_id}`} className="text-accent-teal hover:underline">
                    ดูเกม
                  </Link>
                </span>
                <span>เป้าหมายถัดไป: {formatValue(b.metric, next)} {cfg.unit}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
