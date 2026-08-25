import Link from "next/link";
import { Timer, TriangleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import type { SessionWinrateRow } from "@/types/database";

/** Below this, a per-slot win rate is noise rather than a signal. */
const MIN_GAMES_PER_SLOT = 5;
/** How many games deep the fatigue curve goes before bucketing the tail. */
const SLOTS = 6;

/**
 * Two questions on one card: how is the current session going, and does
 * playing longer actually make you worse?
 *
 * The fatigue curve is the interesting half — win rate bucketed by a game's
 * position *within its session*, aggregated over every session in range.
 * Slots below MIN_GAMES_PER_SLOT are drawn hollow instead of hidden, so a
 * thin sample reads as "not enough data yet" rather than silently vanishing.
 */
export function SessionTracker({ rows }: { rows: SessionWinrateRow[] }) {
  if (rows.length === 0) {
    return (
      <Card padded={false}>
        <CardHeader title="เซสชันการเล่น" icon={<Timer size={14} />} />
        <EmptyState
          title="ยังไม่มีข้อมูลเซสชัน"
          description="เล่นแรงก์แล้วซิงก์ข้อมูล ระบบจะเริ่มจับรูปแบบการเล่นต่อวันให้"
        />
      </Card>
    );
  }

  // Latest calendar day present in the data = the most recent session.
  const latestDate = rows.reduce((max, r) => (r.play_date > max ? r.play_date : max), rows[0].play_date);
  const current = rows
    .filter((r) => r.play_date === latestDate)
    .sort((a, b) => a.game_seq - b.game_seq);

  const wins = current.filter((r) => r.is_win).length;
  const losses = current.length - wins;

  // Trailing streak, counted backwards from the last game of the session.
  let streak = 0;
  const lastResult = current[current.length - 1]?.is_win;
  for (let i = current.length - 1; i >= 0 && current[i].is_win === lastResult; i--) streak++;
  const onTilt = lastResult === false && streak >= 2;

  // Fatigue curve: bucket by game_seq, with everything past SLOTS folded into
  // a final "7+" bucket so a rare 11-game day doesn't create empty columns.
  const buckets = Array.from({ length: SLOTS }, () => ({ games: 0, wins: 0 }));
  for (const r of rows) {
    const i = Math.min(r.game_seq, SLOTS) - 1;
    buckets[i].games++;
    if (r.is_win) buckets[i].wins++;
  }

  const sessionDate = new Date(`${latestDate}T00:00:00`);
  const isToday = latestDate === new Date().toISOString().slice(0, 10);

  return (
    <Card padded={false}>
      <CardHeader
        title="เซสชันการเล่น"
        subtitle={
          isToday
            ? "วันนี้"
            : sessionDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" })
        }
        icon={<Timer size={14} />}
        action={
          <span className="font-mono tabular-nums">
            <span className="text-win">{wins}W</span>
            <span className="text-text-muted"> / </span>
            <span className="text-loss">{losses}L</span>
          </span>
        }
      />

      <div className="p-4 space-y-4">
        {/* Current session, game by game */}
        <div className="flex flex-wrap gap-1" role="list" aria-label="ผลแต่ละเกมในเซสชันล่าสุด">
          {current.map((g) => (
            <Link
              key={g.match_id}
              href={`/match/${g.match_id}`}
              role="listitem"
              className={cn(
                "grid place-items-center h-7 w-7 rounded-sm text-xs font-bold transition-colors focus-ring",
                g.is_win
                  ? "bg-accent-green-dim text-win hover:bg-win hover:text-black"
                  : "bg-accent-red-dim text-loss hover:bg-loss hover:text-white",
              )}
              aria-label={`เกมที่ ${g.game_seq} ${g.is_win ? "ชนะ" : "แพ้"}`}
            >
              {g.is_win ? "W" : "L"}
            </Link>
          ))}
        </div>

        {onTilt && (
          <p className="flex items-start gap-2 text-xs text-accent-orange surface p-2.5 ring-hairline">
            <TriangleAlert size={14} className="shrink-0 mt-px" aria-hidden />
            <span>
              แพ้ติดกัน {streak} เกมในเซสชันนี้ — สถิติของคุณเองบอกว่าเกมถัดไปมักจะแย่ลง
              พักสักหน่อยน่าจะคุ้มกว่า
            </span>
          </p>
        )}

        {/* Fatigue curve */}
        <div>
          <p className="label-xs mb-2">อัตราชนะตามลำดับเกมในหนึ่งวัน</p>
          <div className="flex items-end gap-1.5 h-20">
            {buckets.map((b, i) => {
              const wr = b.games > 0 ? (b.wins / b.games) * 100 : 0;
              const thin = b.games < MIN_GAMES_PER_SLOT;
              const label = i === SLOTS - 1 ? `${SLOTS}+` : String(i + 1);
              return (
                <Tooltip
                  key={i}
                  className="flex-1 h-full items-end"
                  focusable
                  content={
                    b.games === 0 ? (
                      <>เกมที่ {label} · ยังไม่มีข้อมูล</>
                    ) : (
                      <>
                        <span className="block text-text-primary font-semibold">เกมที่ {label} ของวัน</span>
                        <span className="block">
                          ชนะ {b.wins}/{b.games} ({Math.round(wr)}%)
                          {thin && " · ตัวอย่างน้อย"}
                        </span>
                      </>
                    )
                  }
                >
                  <span className="flex flex-col justify-end items-stretch w-full h-full gap-1">
                    <span
                      className={cn(
                        "rounded-sm transition-all min-h-[2px]",
                        b.games === 0
                          ? "bg-bg-overlay"
                          : thin
                          ? "bg-transparent ring-1 ring-inset ring-text-muted"
                          : wr >= 50
                          ? "bg-win"
                          : "bg-loss",
                      )}
                      style={{ height: `${Math.max(2, wr)}%` }}
                    />
                    <span className="text-[0.625rem] text-text-muted text-center font-mono leading-none">
                      {label}
                    </span>
                  </span>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
