import Link from "next/link";
import { HeroAvatar } from "@/components/ui/HeroAvatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn, formatMatchDate, formatKDA } from "@/lib/utils";
import { getHeroName } from "@/lib/hero-data";
import type { Match } from "@/types/database";

interface FormBarProps {
  matches: Match[]; // 10 most recent, oldest first
}

/**
 * Last ten games as hero portraits rather than W/L letters.
 *
 * The hero is the part you actually recognise when scanning your own recent
 * form ("oh, that was the Pudge game"), so it carries the identity and the
 * coloured bar underneath carries the result. Server component: the hover
 * cards are CSS-driven, so none of this needs to ship as JS.
 */
export function FormBar({ matches }: FormBarProps) {
  const wins = matches.filter((m) => m.is_win).length;

  return (
    <section aria-label="Form 10 เกมล่าสุด">
      <div className="flex items-baseline justify-between mb-2">
        <p className="section-title mb-0">Form ล่าสุด</p>
        {matches.length > 0 && (
          <p className="text-xs text-text-muted tabular-nums">
            <span className="text-win font-semibold">{wins}W</span>
            <span> / </span>
            <span className="text-loss font-semibold">{matches.length - wins}L</span>
            <span className="text-text-muted"> ใน {matches.length} เกมล่าสุด</span>
          </p>
        )}
      </div>

      <ol
        className="flex gap-1.5"
        aria-label="ผลการแข่งขัน 10 เกมล่าสุด เรียงจากเก่าไปใหม่"
      >
        {matches.map((m) => (
          <li key={m.match_id}>
            <Tooltip
              content={
                <>
                  <span className="block text-text-primary font-semibold">
                    {getHeroName(m.hero_id)}
                  </span>
                  <span className="block font-mono tabular-nums">
                    {m.kills}/{m.deaths}/{m.assists} · KDA{" "}
                    {formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}
                    {m.imp !== null && ` · IMP ${m.imp}`}
                  </span>
                  <span className="block text-text-muted">{formatMatchDate(m.start_time)}</span>
                </>
              }
            >
              <Link
                href={`/match/${m.match_id}`}
                className="block group focus-ring rounded-sm"
                aria-label={`${m.is_win ? "ชนะ" : "แพ้"} ${getHeroName(m.hero_id)} ${formatMatchDate(m.start_time)}`}
              >
                <HeroAvatar
                  heroId={m.hero_id}
                  size="md"
                  ring={m.is_win ? "win" : "loss"}
                  className="transition-transform group-hover:scale-110"
                />
                <span
                  className={cn(
                    "mt-0.5 block h-1 rounded-full",
                    m.is_win ? "bg-win" : "bg-loss",
                  )}
                  aria-hidden
                />
              </Link>
            </Tooltip>
          </li>
        ))}

        {/* Placeholders keep the row a fixed width below 10 games, so the
            layout doesn't reflow as history fills in. */}
        {Array.from({ length: Math.max(0, 10 - matches.length) }).map((_, i) => (
          <li key={`empty-${i}`} aria-hidden>
            <span className="block h-9 w-9 rounded-sm bg-bg-overlay ring-hairline" />
            <span className="mt-0.5 block h-1 rounded-full bg-bg-overlay" />
          </li>
        ))}
      </ol>
    </section>
  );
}
