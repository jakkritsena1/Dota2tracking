import Image from "next/image";
import Link from "next/link";
import type { HeroPoolWithMetaRow } from "@/types/database";
import { heroIconUrl, HEROES } from "@/lib/hero-data";
import { cosineSimilarity } from "@/lib/statistics";
import { styleVector, playerStyleVector } from "@/lib/hero-properties";

interface Props {
  pool: HeroPoolWithMetaRow[];
}

interface ScoredHero extends HeroPoolWithMetaRow {
  score: number;
  reasons: string[];
}

function computeScore(h: HeroPoolWithMetaRow, playerVec: number[]): ScoredHero {
  const heroVec = styleVector(h.hero_id);
  const styleSim = cosineSimilarity(playerVec, heroVec);
  const wrScore = h.player_wr;
  const metaScore = h.meta_wr ?? 0.5;
  const recencyBonus = h.games < 5 ? 0.05 : 0;
  const score = 0.35 * wrScore + 0.35 * metaScore + 0.25 * styleSim + 0.05 * recencyBonus;

  const reasons: string[] = [];
  if (metaScore > 0.53) reasons.push(`Meta ${(metaScore * 100).toFixed(0)}%`);
  if (wrScore >= 0.6) reasons.push(`WR ${(wrScore * 100).toFixed(0)}%`);
  if (styleSim > 0.9) reasons.push("ตรงสไตล์เล่น");
  if (h.games < 5) reasons.push("ลองฮีโร่ใหม่");

  return { ...h, score, reasons };
}

export function HeroRecommendations({ pool }: Props) {
  if (pool.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">ฮีโร่แนะนำ</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูลฮีโร่</p>
      </div>
    );
  }

  const topPlayed = [...pool].sort((a, b) => b.games - a.games).slice(0, 10);
  const playerVec = playerStyleVector(topPlayed.map(h => h.hero_id), topPlayed.map(h => h.games));

  const scored = pool
    .filter(h => h.games >= 2 || (h.meta_wr != null && h.meta_wr > 0.53))
    .map(h => computeScore(h, playerVec))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="card">
      <h2 className="section-title">ฮีโร่แนะนำ</h2>
      <p className="text-xs text-text-secondary mt-1 mb-4">
        คำนวณจาก WR, Meta strength และ style fit
      </p>
      <div className="space-y-3">
        {scored.map((h, i) => {
          const heroName = HEROES[h.hero_id]?.displayName ?? `Hero ${h.hero_id}`;
          return (
            <Link
              key={`${h.hero_id}-${h.role}`}
              href={`/heroes/${h.hero_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <span className="text-text-secondary text-sm w-5 shrink-0">{i + 1}</span>
              <Image
                src={heroIconUrl(h.hero_id)}
                alt={heroName}
                width={36}
                height={36}
                className="rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{heroName}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {h.reasons.map(r => (
                    <span key={r} className="text-[10px] bg-accent-teal/10 text-accent-teal px-1.5 py-0.5 rounded-full">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${h.player_wr >= 0.5 ? "text-win" : "text-loss"}`}>
                  {(h.player_wr * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-text-secondary">{h.games} เกม</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
