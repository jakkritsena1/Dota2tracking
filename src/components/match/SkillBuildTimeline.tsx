import Image from "next/image";
import { Star } from "lucide-react";
import { abilityIconUrl } from "@/lib/ability-data";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { LiveMatchPlayer, LiveSkillEvent } from "@/lib/stratz-match";

interface SkillBuildTimelineProps {
  players: LiveMatchPlayer[];
}

const DEFAULT_MAX_LEVEL = 25; // hero level cap absent talent events past it

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
                <PlayerSkillGrid key={p.steamAccountId} player={p} sideLabel="Radiant" />
              ))}
            </div>
          </div>
        )}
        {dire.length > 0 && (
          <div className="card p-0 overflow-hidden border-l-2 border-accent-red-dim">
            <div className="px-4 py-2 bg-bg-secondary/60 text-loss text-sm font-semibold">Dire</div>
            <div className="divide-y divide-border/50">
              {dire.map((p) => (
                <PlayerSkillGrid key={p.steamAccountId} player={p} sideLabel="Dire" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface AbilityRow {
  name: string;
  displayName: string;
  events: Map<number, LiveSkillEvent>;
}

function PlayerSkillGrid({ player, sideLabel }: { player: LiveMatchPlayer; sideLabel: "Radiant" | "Dire" }) {
  const heroName = getHeroName(player.heroId);

  // One row per distinct ability, in the order it was first leveled — mirrors
  // the in-game skill panel (Q/W/E/passive/R). Talent picks are one-off
  // events on their own tiers, so they collapse into a single combined row
  // instead of a full 25-level lane each.
  const abilityOrder: string[] = [];
  const abilityRows = new Map<string, AbilityRow>();
  const talentEvents: LiveSkillEvent[] = [];

  for (const s of player.skillBuild) {
    if (s.isTalent) {
      talentEvents.push(s);
      continue;
    }
    if (!abilityRows.has(s.name)) {
      abilityOrder.push(s.name);
      abilityRows.set(s.name, { name: s.name, displayName: s.displayName, events: new Map() });
    }
    abilityRows.get(s.name)!.events.set(s.levelObtained, s);
  }

  const highestLevel = Math.max(
    DEFAULT_MAX_LEVEL,
    ...player.skillBuild.map((s) => s.levelObtained),
  );
  const levels = Array.from({ length: highestLevel }, (_, i) => i + 1);

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative h-7 w-7 shrink-0 rounded-sm overflow-hidden bg-bg-secondary">
          <Image
            src={heroIconUrl(player.heroId)}
            alt={heroName}
            fill
            className="object-cover"
            sizes="28px"
            unoptimized
          />
        </div>
        <span className="text-sm font-medium text-text-secondary truncate">{heroName}</span>
      </div>

      <div className="scroll-x">
        <div className="w-max">
          {/* Level ruler */}
          <div className="flex items-center gap-[3px] pl-[26px] mb-1">
            {levels.map((lvl) => (
              <div key={lvl} className="w-5 shrink-0 text-center text-[9px] font-mono text-text-muted">
                {lvl % 5 === 0 ? lvl : ""}
              </div>
            ))}
          </div>

          {abilityOrder.map((name) => {
            const row = abilityRows.get(name)!;
            return (
              <div key={name} className="flex items-center gap-[3px] mb-[3px]">
                <div className="relative h-5 w-5 shrink-0 rounded-sm overflow-hidden bg-bg-secondary border border-border/50">
                  <Image
                    src={abilityIconUrl(name)}
                    alt={row.displayName}
                    fill
                    className="object-cover"
                    sizes="20px"
                    unoptimized
                  />
                </div>
                {levels.map((lvl) => {
                  const ev = row.events.get(lvl);
                  return (
                    <SkillCell
                      key={lvl}
                      event={ev}
                      tooltip={
                        ev && (
                          <>
                            <span className={sideLabel === "Radiant" ? "text-win" : "text-loss"}>{sideLabel}</span>
                            {" · "}{heroName} · Lv.{lvl}
                            <br />
                            {row.displayName}
                          </>
                        )
                      }
                    />
                  );
                })}
              </div>
            );
          })}

          {talentEvents.length > 0 && (
            <div className="flex items-center gap-[3px]">
              <div className="flex items-center justify-center h-5 w-5 shrink-0 rounded-sm bg-accent-purple/15 border border-accent-purple/40">
                <Star size={10} className="text-accent-purple" fill="currentColor" />
              </div>
              {levels.map((lvl) => {
                const ev = talentEvents.find((t) => t.levelObtained === lvl);
                return (
                  <SkillCell
                    key={lvl}
                    event={ev}
                    talent
                    tooltip={
                      ev && (
                        <>
                          <span className={sideLabel === "Radiant" ? "text-win" : "text-loss"}>{sideLabel}</span>
                          {" · "}{heroName} · Lv.{lvl}
                          <br />
                          Talent: {ev.displayName}
                        </>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillCell({
  event,
  tooltip,
  talent = false,
}: {
  event: LiveSkillEvent | undefined;
  tooltip: React.ReactNode;
  talent?: boolean;
}) {
  if (!event) {
    return <div className="h-5 w-5 shrink-0 rounded-sm bg-bg-secondary/30 border border-border/30" />;
  }

  const cell = (
    <div
      className={cn(
        "h-5 w-5 shrink-0 rounded-sm flex items-center justify-center border transition-transform hover:scale-110 hover:z-10",
        talent
          ? "bg-accent-purple/20 border-accent-purple/50"
          : event.isMaxLevel
            ? "bg-accent-gold/20 border-accent-gold"
            : "bg-accent-green/20 border-accent-green/50",
      )}
    >
      {talent ? (
        <Star size={10} className="text-accent-purple" fill="currentColor" />
      ) : (
        <div className={cn("h-2 w-2 rounded-full", event.isMaxLevel ? "bg-accent-gold" : "bg-accent-green")} />
      )}
    </div>
  );

  return (
    <Tooltip content={<span className="whitespace-normal block max-w-[12rem]">{tooltip}</span>}>
      {cell}
    </Tooltip>
  );
}
