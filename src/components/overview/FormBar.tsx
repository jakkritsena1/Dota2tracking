"use client";

import Link from "next/link";
import { useState } from "react";
import { cn, formatMatchDate } from "@/lib/utils";
import { getHeroName } from "@/lib/hero-data";
import type { Match } from "@/types/database";

interface FormBarProps {
  matches: Match[]; // 10 most recent, oldest first
}

export function FormBar({ matches }: FormBarProps) {
  const [tooltip, setTooltip] = useState<number | null>(null);

  return (
    <section aria-label="Form 10 เกมล่าสุด">
      <p className="section-title">Form ล่าสุด</p>
      <div
        className="flex gap-1.5"
        role="list"
        aria-label="ผลการแข่งขัน 10 เกมล่าสุด เรียงจากเก่าไปใหม่"
      >
        {matches.map((m) => (
          <div key={m.match_id} className="relative" role="listitem">
            <Link
              href={`/match/${m.match_id}`}
              className={cn(
                "block w-8 h-8 rounded-sm font-bold text-xs transition-all focus-ring",
                "flex items-center justify-center",
                m.is_win
                  ? "bg-accent-green-dim text-win hover:bg-win hover:text-white"
                  : "bg-accent-red-dim text-loss hover:bg-loss hover:text-white",
              )}
              aria-label={`${m.is_win ? "ชนะ" : "แพ้"} ${getHeroName(m.hero_id)} ${formatMatchDate(m.start_time)}`}
              onMouseEnter={() => setTooltip(m.match_id)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={() => setTooltip(m.match_id)}
              onBlur={() => setTooltip(null)}
            >
              {m.is_win ? "W" : "L"}
            </Link>

            {/* Tooltip */}
            {tooltip === m.match_id && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none"
                role="tooltip"
              >
                <div className="bg-bg-secondary border border-border rounded-md p-2 text-xs whitespace-nowrap shadow-lg">
                  <p className="font-semibold text-text-primary">
                    {getHeroName(m.hero_id)}
                  </p>
                  <p className="text-text-secondary">
                    {m.kills}/{m.deaths}/{m.assists}
                    {m.imp !== null && ` · IMP ${m.imp}`}
                  </p>
                  <p className="text-text-muted">{formatMatchDate(m.start_time)}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Placeholders when < 10 games */}
        {Array.from({ length: Math.max(0, 10 - matches.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-8 h-8 rounded-sm bg-bg-secondary border border-border border-dashed"
            aria-hidden
          />
        ))}
      </div>
    </section>
  );
}
