import Image from "next/image";
import { Star } from "lucide-react";
import { abilityIconUrl } from "@/lib/ability-data";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { LiveMatchPlayer } from "@/lib/stratz-match";

interface SkillBuildTimelineProps {
  players: LiveMatchPlayer[];
}

export default function SkillBuildTimeline({ players }: SkillBuildTimelineProps) {
  const radiant = players
    .filter((p) => p.isRadiant && p.skillBuild.length > 0)
    .sort((a, b) => b.networth - a.networth);
  const dire = players
    .filter((p) => !p.isRadiant && p.skillBuild.length > 0)
    .sort((a, b) => b.networth - a.networth);

  if (radiant.length === 0 && dire.length === 0) return null;

  return (
    <section aria-labelledby="skill-build-heading">
      <h2 id="skill-build-heading" className="section-title">ลำดับการเปิดสกิล</h2>
      <div className="space-y-4">
        {radiant.length > 0 && (
          <div className="card p-0 overflow-hidden border-l-2 border-accent-green-dim">
            <div className="px-4 py-2 bg-bg-secondary/60 text-win text-sm font-semibold">Radiant</div>
            <div className="divide-y divide-border/50">
              {radiant.map((p) => (
                <PlayerSkillRow key={p.steamAccountId} player={p} sideLabel="Radiant" />
              ))}
            </div>
          </div>
        )}
        {dire.length > 0 && (
          <div className="card p-0 overflow-hidden border-l-2 border-accent-red-dim">
            <div className="px-4 py-2 bg-bg-secondary/60 text-loss text-sm font-semibold">Dire</div>
            <div className="divide-y divide-border/50">
              {dire.map((p) => (
                <PlayerSkillRow key={p.steamAccountId} player={p} sideLabel="Dire" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PlayerSkillRow({ player, sideLabel }: { player: LiveMatchPlayer; sideLabel: "Radiant" | "Dire" }) {
  const heroName = getHeroName(player.heroId);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <div
        className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-bg-secondary"
        title={heroName}
      >
        <Image
          src={heroIconUrl(player.heroId)}
          alt={heroName}
          fill
          className="object-cover"
          sizes="32px"
          unoptimized
        />
      </div>
      <div className="scroll-x flex-1 min-w-0">
        <div className="flex items-center gap-1 w-max">
          {player.skillBuild.map((s, i) => (
            <Tooltip
              key={i}
              content={
                <span className="whitespace-normal block max-w-[12rem]">
                  <span className={sideLabel === "Radiant" ? "text-win" : "text-loss"}>
                    {sideLabel}
                  </span>
                  {" · "}
                  {heroName} · Lv.{s.levelObtained}
                  <br />
                  {s.isTalent ? "Talent: " : ""}
                  {s.displayName}
                </span>
              }
            >
              <div
                className="relative shrink-0 animate-scale-in opacity-0"
                style={{ animationDelay: `${Math.min(i * 25, 500)}ms`, animationFillMode: "both" }}
              >
                {s.isTalent ? (
                  <div className="flex items-center justify-center h-7 w-7 rounded-sm bg-accent-purple/15 border border-accent-purple/40 transition-transform hover:scale-110 hover:z-10">
                    <Star size={14} className="text-accent-purple" fill="currentColor" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "relative h-7 w-7 rounded-sm overflow-hidden bg-bg-secondary border transition-transform hover:scale-110 hover:z-10",
                      s.isMaxLevel ? "border-accent-gold" : "border-border/50",
                    )}
                  >
                    <Image
                      src={abilityIconUrl(s.name)}
                      alt={s.displayName}
                      fill
                      className="object-cover"
                      sizes="28px"
                      unoptimized
                    />
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bg-card border border-border text-[8px] font-bold text-text-secondary">
                  {s.levelObtained}
                </span>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  );
}
