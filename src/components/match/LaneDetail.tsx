import Image from "next/image";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn, formatCompact } from "@/lib/utils";
import { mapLaneToSide, type LiveLaneOutcome, type LiveMatchPlayer } from "@/lib/stratz-match";
import { Card, CardHeader } from "@/components/ui/Card";

interface LaneDetailProps {
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

// STRATZ's *PerMinute arrays are cumulative snapshots indexed from minute 1
// (index 0 = end of minute 1), confirmed by cross-checking networthPerMinute
// against the match-level radiantNetworthLeads array we already trust.
function snapshotAt(arr: number[], minute: number): number | null {
  const v = arr[minute - 1];
  return v == null ? null : v;
}

function outcomeMeta(outcome: LiveLaneOutcome | null): { text: string; colorClass: string } {
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

export default function LaneDetail({ players, laneOutcomes }: LaneDetailProps) {
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
    <div className="space-y-6">
      {LANES.map(({ key, label }) => {
        const { radiant, dire } = buckets[key];
        if (radiant.length === 0 && dire.length === 0) return null;
        const { text, colorClass } = outcomeMeta(laneOutcomes[key]);

        return (
          <Card key={key} padded={false}>
            <CardHeader
              title={label}
              action={<span className={cn("text-sm", colorClass)}>{text}</span>}
            />
            <div className="grid gap-px sm:grid-cols-2 bg-border/50">
              <LaneSideTable players={radiant} side="radiant" />
              <LaneSideTable players={dire} side="dire" />
            </div>
          </Card>
        );
      })}

      {others.length > 0 && (
        <Card>
          <CardHeader title="โรมมิ่ง / ป่า" />
          <div className="flex flex-wrap gap-3 mt-4">
            {others.map((p) => (
              <div
                key={p.steamAccountId}
                className="flex items-center gap-2"
                title={p.lane ?? "UNKNOWN"}
              >
                <div className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-bg-secondary">
                  <Image
                    src={heroIconUrl(p.heroId)}
                    alt={getHeroName(p.heroId)}
                    fill
                    className="object-cover"
                    sizes="32px"
                    unoptimized
                  />
                </div>
                <span className="text-text-secondary text-xs font-mono tabular-nums">
                  {p.kills}/{p.deaths}/{p.assists}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function LaneSideTable({ players, side }: { players: LiveMatchPlayer[]; side: "radiant" | "dire" }) {
  if (players.length === 0) {
    return <div className="bg-bg-primary p-4" />;
  }

  return (
    <div className="bg-bg-primary">
      <div className="scroll-x">
        <table className="table-data min-w-[26rem]">
          <thead>
            <tr>
              <th scope="col" className={side === "radiant" ? "text-radiant" : "text-dire"}>
                {side === "radiant" ? "Radiant" : "Dire"}
              </th>
              <th scope="col" className="text-right">K/D/A</th>
              <th scope="col" className="text-right">NW @5</th>
              <th scope="col" className="text-right">NW @10</th>
              <th scope="col" className="text-right">LH/DN @5</th>
              <th scope="col" className="text-right">LH/DN @10</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const nw5 = snapshotAt(p.networthPerMinute, 5);
              const nw10 = snapshotAt(p.networthPerMinute, 10);
              const lh5 = snapshotAt(p.lastHitsPerMinute, 5);
              const lh10 = snapshotAt(p.lastHitsPerMinute, 10);
              const dn5 = snapshotAt(p.deniesPerMinute, 5);
              const dn10 = snapshotAt(p.deniesPerMinute, 10);

              return (
                <tr key={p.steamAccountId}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="relative h-6 w-6 shrink-0 rounded-sm overflow-hidden bg-bg-secondary">
                        <Image
                          src={heroIconUrl(p.heroId)}
                          alt={getHeroName(p.heroId)}
                          fill
                          className="object-cover"
                          sizes="24px"
                          unoptimized
                        />
                      </div>
                      <span className="text-text-primary text-xs whitespace-nowrap">
                        {getHeroName(p.heroId)}
                      </span>
                    </div>
                  </td>
                  <td className="num text-text-secondary text-xs whitespace-nowrap">
                    {p.kills}/{p.deaths}/{p.assists}
                  </td>
                  <td className="num text-text-secondary text-xs">
                    {nw5 != null ? formatCompact(nw5) : "—"}
                  </td>
                  <td className="num text-accent-gold text-xs font-semibold">
                    {nw10 != null ? formatCompact(nw10) : "—"}
                  </td>
                  <td className="num text-text-secondary text-xs whitespace-nowrap">
                    {lh5 != null ? `${lh5}/${dn5 ?? 0}` : "—"}
                  </td>
                  <td className="num text-text-secondary text-xs whitespace-nowrap">
                    {lh10 != null ? `${lh10}/${dn10 ?? 0}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
