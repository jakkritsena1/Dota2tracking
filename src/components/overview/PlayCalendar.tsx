"use client";

import { useMemo } from "react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { th } from "date-fns/locale";
import type { DailySummary } from "@/types/database";
import { MIN_GAMES_FOR_INSIGHT } from "@/lib/utils";

interface Props {
  dailySummaries: DailySummary[];
}

const DAYS = 28; // 4 weeks
const TILT_THRESHOLD = 3; // ≥3 losses in a row → tilt warning

function intensity(games: number, winRate: number): string {
  if (games === 0) return "bg-border/20";
  if (winRate >= 0.6) return "bg-win/70";
  if (winRate >= 0.5) return "bg-win/40";
  if (winRate >= 0.4) return "bg-loss/40";
  return "bg-loss/70";
}

export function PlayCalendar({ dailySummaries }: Props) {
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start: subDays(today, DAYS - 1), end: today });

  const byDate = useMemo(() => {
    const map: Record<string, DailySummary> = {};
    for (const s of dailySummaries) map[s.play_date.slice(0, 10)] = s;
    return map;
  }, [dailySummaries]);

  const totalGames = dailySummaries.reduce((a, d) => a + d.games, 0);
  const showTiltWarning = useMemo(() => {
    if (totalGames < MIN_GAMES_FOR_INSIGHT) return false;
    // Check last 5 days for consecutive losses
    let consecutive = 0;
    for (let i = days.length - 1; i >= 0 && consecutive < TILT_THRESHOLD; i--) {
      const key = format(days[i], "yyyy-MM-dd");
      const s = byDate[key];
      if (!s) break;
      if (s.win_rate < 0.4 && s.games >= 3) consecutive++;
      else break;
    }
    return consecutive >= TILT_THRESHOLD;
  }, [byDate, days, totalGames]);

  return (
    <div className="card">
      <h2 className="section-title">ตารางเล่น (4 สัปดาห์)</h2>

      {showTiltWarning && (
        <div className="mt-3 p-3 rounded-lg bg-loss/10 border border-loss/30 text-sm text-loss">
          ⚠️ ช่วงนี้แพ้ต่อเนื่อง — ลองพักก่อนดีไหม?
        </div>
      )}

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(d => (
          <div key={d} className="text-center text-[10px] text-text-secondary">{d}</div>
        ))}
        {/* Pad first row */}
        {Array.from({ length: days[0].getDay() }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const s = byDate[key];
          const label = format(day, "d MMM", { locale: th });
          const games = s?.games ?? 0;
          const wr = s?.win_rate ?? 0;
          return (
            <div
              key={key}
              className={`aspect-square rounded-sm ${intensity(games, wr)} relative group cursor-default`}
              title={games > 0 ? `${label}: ${games} เกม, WR ${(wr * 100).toFixed(0)}%` : label}
            >
              {games > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-text-primary/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  {games}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-secondary">
        <span>ไม่ได้เล่น</span>
        <div className="flex gap-1">
          {["bg-border/20","bg-loss/70","bg-loss/40","bg-win/40","bg-win/70"].map(c => (
            <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
        </div>
        <span>ชนะมาก</span>
      </div>
    </div>
  );
}
