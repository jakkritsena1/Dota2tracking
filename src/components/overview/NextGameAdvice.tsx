import Image from "next/image";
import Link from "next/link";
import type { HeroPoolWithMetaRow } from "@/types/database";
import { heroIconUrl, getHeroName } from "@/lib/hero-data";
import { cosineSimilarity } from "@/lib/statistics";
import { styleVector, playerStyleVector } from "@/lib/hero-properties";

interface Props {
  heroPool: HeroPoolWithMetaRow[];
  role: string | null;
}

function heroLabel(row: HeroPoolWithMetaRow): string {
  if (row.meta_wr != null && row.meta_wr > 0.53) return "เมต้าดี";
  if (row.games < 5) return "กำลังฝึก";
  if (row.player_wr >= 0.6) return "ชง";
  return "ประจำ";
}

function labelColor(label: string): string {
  if (label === "เมต้าดี") return "text-win bg-win/10";
  if (label === "ชง") return "text-accent-teal bg-accent-teal/10";
  if (label === "กำลังฝึก") return "text-text-secondary bg-border/30";
  return "text-accent-gold bg-accent-gold/10";
}

export function NextGameAdvice({ heroPool, role }: Props) {
  if (heroPool.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">เล่นฮีโร่ไหนดี?</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูลฮีโร่</p>
      </div>
    );
  }

  const pool = role ? heroPool.filter(h => h.role === role) : heroPool;

  // Compute player style vector from top heroes by games played
  const topHeroes = [...pool].sort((a, b) => b.games - a.games).slice(0, 10);
  const playerVec = playerStyleVector(
    topHeroes.map(h => h.hero_id),
    topHeroes.map(h => h.games),
  );

  // Score each hero: 40% player WR, 30% meta WR, 30% style similarity
  const scored = pool
    .filter(h => h.games >= 3)
    .map(h => {
      const heroVec = styleVector(h.hero_id);
      const styleSim = cosineSimilarity(playerVec, heroVec);
      const score =
        0.4 * (h.player_wr ?? 0.5) +
        0.3 * (h.meta_wr ?? 0.5) +
        0.3 * styleSim;
      return { ...h, score, label: heroLabel(h) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="card">
      <h2 className="section-title">เล่นฮีโร่ไหนดี?</h2>
      <ul className="mt-4 space-y-3">
        {scored.map(h => {
          const label = heroLabel(h);
          return (
            <li key={`${h.hero_id}-${h.role}`} className="flex items-center gap-3">
              <Image
                src={heroIconUrl(h.hero_id)}
                alt={getHeroName(h.hero_id)}
                width={40}
                height={40}
                className="rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{getHeroName(h.hero_id)}</p>
                <p className="text-xs text-text-secondary">
                  WR {(h.player_wr * 100).toFixed(0)}% · {h.games} เกม
                  {h.meta_wr != null && ` · Meta ${(h.meta_wr * 100).toFixed(0)}%`}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${labelColor(label)}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        href="/heroes"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent-teal hover:underline"
      >
        ดูฮีโร่ทั้งหมด →
      </Link>
    </div>
  );
}
