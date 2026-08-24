import Image from "next/image";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";
import { mapLaneToSide, type LiveLaneOutcome, type LiveMatchPlayer } from "@/lib/stratz-match";

interface LaneMatchupProps {
  players: LiveMatchPlayer[];
  laneOutcomes: {
    top: LiveLaneOutcome | null;
    mid: LiveLaneOutcome | null;
    bottom: LiveLaneOutcome | null;
  };
}

const LANES: { key: "top" | "mid" | "bottom"; label: string }[] = [
  { key: "top", label: "เลนบน" },
  { key: "mid", label: "เลนกลาง" },
  { key: "bottom", label: "เลนล่าง" },
];

export default function LaneMatchup({ players, laneOutcomes }: LaneMatchupProps) {
  const buckets = {
    top: { radiant: [] as LiveMatchPlayer[], dire: [] as LiveMatchPlayer[] },
    mid: { radiant: [] as LiveMatchPlayer[], dire: [] as LiveMatchPlayer[] },
    bottom: { radiant: [] as LiveMatchPlayer[], dire: [] as LiveMatchPlayer[] },
  };
  const others: LiveMatchPlayer[] = [];

  for (const p of players) {
    const side = mapLaneToSide(p.lane, p.isRadiant);
    if (!side) {
      others.push(p);
      continue;
    }
    buckets[side][p.isRadiant ? "radiant" : "dire"].push(p);
  }

  const hasAnyLane = LANES.some(
    ({ key }) => buckets[key].radiant.length > 0 || buckets[key].dire.length > 0,
  );
  if (!hasAnyLane) return null;

  return (
    <section aria-labelledby="lane-matchup-heading">
      <h2 id="lane-matchup-heading" className="section-title">คู่เลน</h2>
      <div className="card space-y-3">
        {LANES.map(({ key, label }) => {
          const { radiant, dire } = buckets[key];
          if (radiant.length === 0 && dire.length === 0) return null;
          return (
            <LaneRow
              key={key}
              label={label}
              radiant={radiant}
              dire={dire}
              outcome={laneOutcomes[key]}
            />
          );
        })}

        {others.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-text-muted text-xs mb-1.5">โรมมิ่ง / ป่า</p>
            <div className="flex flex-wrap gap-1.5">
              {others.map((p) => (
                <div
                  key={p.steamAccountId}
                  className="relative h-7 w-7 shrink-0 rounded-sm overflow-hidden bg-bg-secondary"
                  title={`${getHeroName(p.heroId)} (${p.lane ?? "UNKNOWN"})`}
                >
                  <Image
                    src={heroIconUrl(p.heroId)}
                    alt={getHeroName(p.heroId)}
                    fill
                    className="object-cover"
                    sizes="28px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function outcomeLabel(outcome: LiveLaneOutcome | null): { text: string; colorClass: string } {
  switch (outcome) {
    case "RADIANT_STOMP":
      return { text: "Radiant ครองเลน", colorClass: "text-win font-semibold" };
    case "RADIANT_VICTORY":
      return { text: "Radiant ได้เปรียบ", colorClass: "text-win" };
    case "DIRE_STOMP":
      return { text: "Dire ครองเลน", colorClass: "text-loss font-semibold" };
    case "DIRE_VICTORY":
      return { text: "Dire ได้เปรียบ", colorClass: "text-loss" };
    case "TIE":
      return { text: "สูสี", colorClass: "text-text-muted" };
    default:
      return { text: "—", colorClass: "text-text-muted" };
  }
}

function LaneRow({
  label,
  radiant,
  dire,
  outcome,
}: {
  label: string;
  radiant: LiveMatchPlayer[];
  dire: LiveMatchPlayer[];
  outcome: LiveLaneOutcome | null;
}) {
  const { text, colorClass } = outcomeLabel(outcome);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center justify-end gap-1.5">
        {radiant.map((p) => (
          <HeroChip key={p.steamAccountId} player={p} align="right" />
        ))}
      </div>

      <div className="shrink-0 w-24 text-center">
        <p className="text-text-muted text-[10px]">{label}</p>
        <p className={cn("text-[11px]", colorClass)}>{text}</p>
      </div>

      <div className="flex-1 flex items-center gap-1.5">
        {dire.map((p) => (
          <HeroChip key={p.steamAccountId} player={p} align="left" />
        ))}
      </div>
    </div>
  );
}

function HeroChip({ player, align }: { player: LiveMatchPlayer; align: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        align === "right" && "flex-row-reverse",
      )}
      title={`${getHeroName(player.heroId)} — ${player.kills}/${player.deaths}/${player.assists}`}
    >
      <div className="relative h-9 w-9 shrink-0 rounded-sm overflow-hidden bg-bg-secondary border border-border/50">
        <Image
          src={heroIconUrl(player.heroId)}
          alt={getHeroName(player.heroId)}
          fill
          className="object-cover"
          sizes="36px"
          unoptimized
        />
      </div>
      <span className="text-text-secondary text-[11px] font-mono tabular-nums hidden sm:inline">
        {player.kills}/{player.deaths}/{player.assists}
      </span>
    </div>
  );
}
