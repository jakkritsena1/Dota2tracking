import Image from "next/image";
import { Ban } from "lucide-react";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";
import type { LivePickBan } from "@/lib/stratz-match";

interface DraftBansProps {
  pickBans: LivePickBan[];
}

export default function DraftBans({ pickBans }: DraftBansProps) {
  const bans = pickBans.filter((pb) => !pb.isPick && pb.bannedHeroId != null);
  const radiantPicks = pickBans
    .filter((pb) => pb.isPick && pb.isRadiant)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const direPicks = pickBans
    .filter((pb) => pb.isPick && !pb.isRadiant)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (bans.length === 0 && radiantPicks.length === 0 && direPicks.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="draft-heading">
      <h2 id="draft-heading" className="section-title">ดราฟท์</h2>
      <div className="card space-y-4">
        {(radiantPicks.length > 0 || direPicks.length > 0) && (
          <div className="flex items-start justify-between gap-6">
            <PickColumn label="Radiant" picks={radiantPicks} team="radiant" />
            <PickColumn label="Dire" picks={direPicks} team="dire" />
          </div>
        )}

        {bans.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1.5">
              <Ban size={12} aria-hidden />
              แบน ({bans.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {bans.map((pb, i) => (
                <div
                  key={i}
                  className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-bg-secondary"
                  title={`${getHeroName(pb.bannedHeroId!)} (ถูกแบน)`}
                >
                  <Image
                    src={heroIconUrl(pb.bannedHeroId!)}
                    alt={getHeroName(pb.bannedHeroId!)}
                    fill
                    className="object-cover opacity-40 grayscale"
                    sizes="32px"
                    unoptimized
                  />
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 32 32"
                    aria-hidden
                  >
                    <line x1="5" y1="5" x2="27" y2="27" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="27" y1="5" x2="5" y2="27" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PickColumn({
  label,
  picks,
  team,
}: {
  label: string;
  picks: LivePickBan[];
  team: "radiant" | "dire";
}) {
  const isRadiant = team === "radiant";
  return (
    <div className={cn("flex-1 min-w-0 space-y-2", !isRadiant && "flex flex-col items-end")}>
      <p className={cn("text-xs font-semibold", isRadiant ? "text-win" : "text-loss")}>
        {label}
      </p>
      <div className={cn("flex flex-wrap gap-1.5", !isRadiant && "justify-end")}>
        {picks.map((pb, i) => (
          <div
            key={i}
            className="relative"
            title={`${getHeroName(pb.heroId!)} — pick ${(pb.order ?? 0) + 1}`}
          >
            <div
              className={cn(
                "relative h-11 w-11 shrink-0 rounded-sm overflow-hidden bg-bg-secondary border",
                isRadiant ? "border-accent-green-dim" : "border-accent-red-dim",
              )}
            >
              <Image
                src={heroIconUrl(pb.heroId!)}
                alt={getHeroName(pb.heroId!)}
                fill
                className="object-cover"
                sizes="44px"
                unoptimized
              />
            </div>
            <span
              className={cn(
                "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white border border-bg-card",
                isRadiant ? "bg-accent-green" : "bg-accent-red",
              )}
            >
              {(pb.order ?? 0) + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
