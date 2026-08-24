import Image from "next/image";
import Link from "next/link";
import type { HeroPoolWithMetaRow } from "@/types/database";
import { heroIconUrl, getHeroName } from "@/lib/hero-data";
import { cn } from "@/lib/utils";

interface Props {
  heroPool: HeroPoolWithMetaRow[];
}

const TOP_N = 5;

export function MostPlayedHeroes({ heroPool }: Props) {
  if (heroPool.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">ฮีโร่ที่เล่นบ่อย</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  const totalGames = heroPool.reduce((sum, h) => sum + h.games, 0);
  const top = [...heroPool].sort((a, b) => b.games - a.games).slice(0, TOP_N);
  const maxGames = Math.max(...top.map((h) => h.games));
  const topShare = totalGames > 0
    ? Math.round((top.reduce((sum, h) => sum + h.games, 0) / totalGames) * 100)
    : 0;

  return (
    <div className="card">
      <h2 className="section-title">ฮีโร่ที่เล่นบ่อย</h2>
      <ul className="mt-2 space-y-3">
        {top.map((h) => {
          const wr = h.player_wr * 100;
          return (
            <li key={`${h.hero_id}-${h.role}`} className="flex items-center gap-3">
              <Link href={`/heroes/${h.hero_id}`} className="shrink-0">
                <Image
                  src={heroIconUrl(h.hero_id)}
                  alt={getHeroName(h.hero_id)}
                  width={36}
                  height={36}
                  className="rounded-sm"
                  unoptimized
                />
              </Link>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/heroes/${h.hero_id}`}
                    className="text-xs font-medium text-text-primary hover:text-accent-blue truncate"
                  >
                    {getHeroName(h.hero_id)}
                  </Link>
                  <span className={cn("text-xs font-semibold shrink-0", wr >= 50 ? "text-win" : "text-loss")}>
                    {wr.toFixed(0)}%
                  </span>
                </div>
                {/* Win rate bar */}
                <div className="h-1 w-full rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full", wr >= 50 ? "bg-win" : "bg-loss")}
                    style={{ width: `${Math.min(100, wr)}%` }}
                  />
                </div>
                {/* Volume bar */}
                <div className="flex items-center gap-1.5">
                  <div className="h-1 flex-1 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-accent-gold"
                      style={{ width: `${(h.games / maxGames) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-accent-gold font-medium shrink-0">{h.games} เกม</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] text-text-muted">
        {TOP_N} ฮีโร่นี้คิดเป็น <span className="text-accent-gold font-medium">{topShare}%</span> ของเกมทั้งหมด
      </p>

      <Link
        href="/heroes"
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
      >
        ดูฮีโร่ทั้งหมด →
      </Link>
    </div>
  );
}
