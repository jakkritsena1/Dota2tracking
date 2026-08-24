import Image from "next/image";
import Link from "next/link";
import type { HeroPoolWithMetaRow } from "@/types/database";
import { heroIconUrl, HEROES } from "@/lib/hero-data";

interface Props {
  heroes: HeroPoolWithMetaRow[];
  previousMeta: Record<number, number>; // heroId → prev meta WR
}

export function PatchImpact({ heroes, previousMeta }: Props) {
  const withDelta = heroes
    .filter(h => h.meta_wr != null && previousMeta[h.hero_id] != null)
    .map(h => ({
      ...h,
      delta: (h.meta_wr ?? 0) - (previousMeta[h.hero_id] ?? 0),
    }))
    .filter(h => Math.abs(h.delta) >= 0.02) // ≥2pp change
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  if (withDelta.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">Patch Impact</h2>
        <p className="text-text-secondary text-sm mt-4">
          ยังไม่มีข้อมูลเปรียบเทียบ patch — ต้องการข้อมูล 2 วันขึ้นไป
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">Patch Impact</h2>
      <p className="text-xs text-text-secondary mt-1 mb-4">
        ฮีโร่ในพูลที่ meta WR เปลี่ยน ≥2pp จากวันก่อน
      </p>
      <div className="space-y-2">
        {withDelta.map(h => {
          const heroName = HEROES[h.hero_id]?.displayName ?? `Hero ${h.hero_id}`;
          const buffed = h.delta > 0;
          return (
            <Link
              key={h.hero_id}
              href={`/heroes/${h.hero_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors"
            >
              <Image
                src={heroIconUrl(h.hero_id)}
                alt={heroName}
                width={32}
                height={32}
                className="rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{heroName}</p>
                <p className="text-xs text-text-secondary">{h.role}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${buffed ? "text-win" : "text-loss"}`}>
                  {buffed ? "+" : ""}{(h.delta * 100).toFixed(1)}pp
                </p>
                <p className="text-[10px] text-text-secondary">
                  {h.meta_wr != null ? `${(h.meta_wr * 100).toFixed(1)}% ปัจจุบัน` : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
