import Link from "next/link";
import type { Weakness } from "@/types/database";

interface Props {
  weaknesses: Weakness[];
}

const METRIC_CONFIG: Record<string, { label: string; description: string; unit: string; lowerIsBetter?: boolean }> = {
  gpm: { label: "Gold per Minute", description: "ฟาร์มทองช้ากว่า bracket เฉลี่ย", unit: "GPM" },
  imp: { label: "Impact Score", description: "ส่งผลต่อเกมน้อยกว่าที่ควร", unit: "" },
  deaths: { label: "Deaths", description: "ตายมากเกินไปในทีม", unit: "deaths", lowerIsBetter: true },
  cs_at_10: { label: "CS ที่ 10 นาที", description: "เลวลานิ่งกว่า bracket เฉลี่ย", unit: "CS" },
  tower_damage: { label: "Tower Damage", description: "ทำลาย tower น้อย", unit: "" },
  hero_damage: { label: "Hero Damage", description: "ดีลต่อฮีโร่น้อย", unit: "" },
};

function ImpactBar({ value }: { value: number }) {
  // value is est_delta_winrate — already percentage-point scale (see
  // compute-weaknesses/index.ts), not a 0-1 fraction. Typical range is
  // 0-15pp, so cap the bar at 15 to keep it meaningful for ranking.
  const pct = Math.min(100, Math.max(0, (value / 15) * 100));
  return (
    <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
      <div
        className="h-full bg-accent-blue rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WeaknessCards({ weaknesses }: Props) {
  if (weaknesses.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">จุดอ่อนสำคัญ</h2>
        <p className="text-text-secondary text-sm mt-4">
          ต้องการเกมอย่างน้อย 20 เกมเพื่อวิเคราะห์จุดอ่อน
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">จุดอ่อนสำคัญ</h2>
      <p className="text-xs text-text-secondary mt-1 mb-4">
        เรียงตามผลกระทบต่อ win rate — แก้จุดแรกก่อน
      </p>
      <div className="space-y-4">
        {weaknesses.map((w, i) => {
          const cfg = METRIC_CONFIG[w.metric] ?? { label: w.metric, description: "", unit: "" };
          const delta = w.est_delta_winrate ?? 0;
          return (
            <div key={w.id} className="p-3 rounded-lg bg-bg-hover">
              <div className="flex items-start gap-3 mb-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-loss/20 text-loss text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{cfg.label}</p>
                  <p className="text-xs text-text-secondary">{cfg.description}</p>
                </div>
                {delta > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-win font-bold text-sm">+{delta.toFixed(1)}%</p>
                    <p className="text-[10px] text-text-secondary">est. Δ WR</p>
                  </div>
                )}
              </div>

              <ImpactBar value={delta} />

              <div className="mt-2 flex justify-between text-[10px] text-text-secondary">
                {w.current_value != null && (
                  <span>ของฉัน: {Number(w.current_value).toFixed(1)} {cfg.unit}</span>
                )}
                {w.benchmark_value != null && (
                  <span>Target: {Number(w.benchmark_value).toFixed(1)} {cfg.unit}</span>
                )}
              </div>

              {w.evidence_matches && w.evidence_matches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] text-text-secondary">หลักฐาน:</span>
                  {w.evidence_matches.slice(0, 5).map(mid => (
                    <Link
                      key={mid}
                      href={`/match/${mid}`}
                      className="text-[10px] text-accent-blue hover:underline"
                    >
                      #{mid}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
