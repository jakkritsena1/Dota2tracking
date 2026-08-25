import Image from "next/image";
import { Clock } from "lucide-react";
import { formatMatchDate, formatDuration, roleLabel, cn } from "@/lib/utils";
import { getHeroName, heroIconUrl, heroBannerUrl } from "@/lib/hero-data";
import { Card } from "@/components/ui/Card";
import { Badge, RankBadge } from "@/components/ui/Badge";
import type { Match } from "@/types/database";

/**
 * Full-bleed header. The hero's own splash art sits behind the text at low
 * opacity — it identifies the match faster than any label, and it's the one
 * place in the app where a big decorative image earns its bytes.
 */
export default function MatchHero({
  match: m,
  tags,
}: {
  match: Match;
  tags: { tag: string; confidence: number }[];
}) {
  return (
    <Card padded={false} accent={m.is_win ? "win" : "loss"} className="relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <Image
          src={heroBannerUrl(m.hero_id)}
          alt=""
          fill
          className="object-cover object-top opacity-[0.13]"
          sizes="100vw"
          unoptimized
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #141414 25%, rgba(20,20,20,0.85) 55%, rgba(20,20,20,0.4))",
          }}
        />
      </div>

      <div className="relative flex items-start gap-4 p-4">
        <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-md overflow-hidden bg-bg-secondary ring-hairline">
          <Image
            src={heroIconUrl(m.hero_id)}
            alt={getHeroName(m.hero_id)}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-text-primary">{getHeroName(m.hero_id)}</h1>
            <span
              className={cn(
                "text-lg font-extrabold tracking-wide",
                m.is_win ? "text-win" : "text-loss",
              )}
            >
              {m.is_win ? "VICTORY" : "DEFEAT"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Clock size={13} aria-hidden />
              {formatMatchDate(m.start_time)} · {formatDuration(m.duration_sec)}
            </span>
            <span className="chip">{roleLabel(m.role)}</span>
            {m.rank_tier ? <RankBadge rankTier={m.rank_tier} /> : null}
            <span className="font-mono text-xs text-text-muted">#{m.match_id}</span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <Badge
                  key={tag.tag}
                  tone="neutral"
                  title={`ความมั่นใจ: ${Math.round(tag.confidence * 100)}%`}
                >
                  {tag.tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
