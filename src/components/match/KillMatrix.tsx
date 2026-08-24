import Image from "next/image";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";
import type { LiveMatchPlayer } from "@/lib/stratz-match";

interface KillMatrixProps {
  players: LiveMatchPlayer[];
}

export default function KillMatrix({ players }: KillMatrixProps) {
  const ordered = [...players].sort((a, b) => {
    if (a.isRadiant !== b.isRadiant) return a.isRadiant ? -1 : 1;
    return 0;
  });

  const totalKills = players.reduce((sum, p) => sum + p.killEvents.length, 0);
  if (totalKills === 0) return null;

  // heroId -> victimHeroId -> count
  const counts = new Map<number, Map<number, number>>();
  let maxCount = 1;
  for (const p of ordered) {
    const row = new Map<number, number>();
    for (const ev of p.killEvents) {
      const next = (row.get(ev.target) ?? 0) + 1;
      row.set(ev.target, next);
      if (next > maxCount) maxCount = next;
    }
    counts.set(p.heroId, row);
  }

  return (
    <section aria-labelledby="killmatrix-heading">
      <h2 id="killmatrix-heading" className="section-title">ตารางการฆ่า (ใครฆ่าใคร)</h2>
      <div className="card overflow-hidden p-0">
        <div className="scroll-x">
          <table className="text-xs border-separate" style={{ borderSpacing: 3 }}>
            <thead>
              <tr>
                <th className="w-9 h-9 sticky left-0 z-10 bg-bg-card" />
                {ordered.map((p) => (
                  <th key={p.heroId} className="p-0 pb-1">
                    <HeroCell heroId={p.heroId} isRadiant={p.isRadiant} size={24} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((killer) => (
                <tr key={killer.heroId}>
                  <th scope="row" className="p-0 pr-1 sticky left-0 z-10 bg-bg-card">
                    <HeroCell heroId={killer.heroId} isRadiant={killer.isRadiant} size={24} />
                  </th>
                  {ordered.map((victim) => {
                    if (victim.heroId === killer.heroId) {
                      return (
                        <td
                          key={victim.heroId}
                          className="w-9 h-9 text-center text-text-muted/40 rounded-sm bg-bg-secondary/30"
                        >
                          ·
                        </td>
                      );
                    }
                    const count = counts.get(killer.heroId)?.get(victim.heroId) ?? 0;
                    const intensity = count / maxCount;
                    return (
                      <td
                        key={victim.heroId}
                        className={cn(
                          "w-9 h-9 text-center font-mono rounded-sm tabular-nums",
                          count === 0 && "text-text-muted/50 bg-bg-secondary/20",
                          count > 0 && "font-semibold",
                        )}
                        style={
                          count > 0
                            ? {
                                backgroundColor: killer.isRadiant
                                  ? `rgba(42, 203, 79, ${0.12 + intensity * 0.55})`
                                  : `rgba(236, 4, 31, ${0.12 + intensity * 0.55})`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className={count === 0 ? "" : killer.isRadiant ? "text-win" : "text-loss"}
                          style={intensity > 0.4 ? { color: "#E6E6E6" } : undefined}
                        >
                          {count > 0 ? count : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2.5 text-text-muted text-[11px] border-t border-border">
          แถว = ผู้ฆ่า · คอลัมน์ = เหยื่อ · สีเข้ม = ฆ่าบ่อย
        </p>
      </div>
    </section>
  );
}

function HeroCell({ heroId, isRadiant, size }: { heroId: number; isRadiant: boolean; size: number }) {
  return (
    <div
      className={cn(
        "relative rounded-sm overflow-hidden bg-bg-secondary border mx-auto",
        isRadiant ? "border-accent-green-dim" : "border-accent-red-dim",
      )}
      style={{ height: size, width: size }}
      title={getHeroName(heroId)}
    >
      <Image
        src={heroIconUrl(heroId)}
        alt={getHeroName(heroId)}
        fill
        className="object-cover"
        sizes={`${size}px`}
        unoptimized
      />
    </div>
  );
}
