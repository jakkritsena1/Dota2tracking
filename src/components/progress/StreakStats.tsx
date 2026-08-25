import type { StreakStats } from "@/types/database";

interface Props {
  stats: StreakStats | null;
}

function ProbBar({ pct, label, color }: { pct: number; label: string; color: string }) {
  // color is the *text* class ("text-loss" / "text-win" / neutral) chosen by
  // the caller for the % readout — the bar fill must match it explicitly.
  // Falling through anything that isn't exactly "text-loss" to the win/green
  // fill (the previous logic) meant a neutral baseline stat rendered as a
  // bright green "good" bar even though the number it's showing is a loss
  // probability, which reads as backwards on a panel titled "ความเสี่ยง Tilt".
  const fillClass =
    color === "text-loss" ? "bg-loss" : color === "text-win" ? "bg-win" : "bg-accent-teal";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className={color}>{(pct * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-border/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${fillClass}`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function StreakStatsCard({ stats }: Props) {
  if (!stats) {
    return (
      <div className="card">
        <h2 className="section-title">ความเสี่ยง Tilt</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูลเพียงพอ</p>
      </div>
    );
  }

  const { p_loss_overall, p_loss_after_2loss, sample_size_overall, sample_size_streak } = stats;
  const tiltFactor = p_loss_overall > 0 ? p_loss_after_2loss / p_loss_overall : 1;
  const isTilted = tiltFactor > 1.2 && sample_size_streak >= 10;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">ความเสี่ยง Tilt</h2>
        {isTilted && (
          <span className="badge-loss">⚠️ Tilt Risk</span>
        )}
      </div>

      <div className="space-y-4">
        <ProbBar
          pct={p_loss_overall}
          label={`โอกาสแพ้ทั่วไป (n=${sample_size_overall})`}
          color="text-text-secondary"
        />
        <ProbBar
          pct={p_loss_after_2loss}
          label={`แพ้ต่อเนื่องหลังแพ้ 2 เกม (n=${sample_size_streak})`}
          color={isTilted ? "text-loss" : "text-win"}
        />
      </div>

      <div className="mt-4 p-3 rounded-lg bg-bg-hover text-xs text-text-secondary">
        {isTilted ? (
          <>
            <span className="text-loss font-medium">โอกาสแพ้เพิ่มขึ้น {((tiltFactor - 1) * 100).toFixed(0)}%</span>
            {" "}หลังแพ้ 2 เกมติด — ลองพักหรือเปลี่ยนฮีโร่ก่อนเล่นต่อ
          </>
        ) : (
          "สถิติ Tilt ปกติ — แพ้ 2 เกมติดไม่ได้เพิ่มโอกาสแพ้อย่างมีนัย"
        )}
      </div>
    </div>
  );
}
