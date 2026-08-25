import Image from "next/image";
import { getHeroName } from "@/lib/hero-data";
import { getItemName, itemIconUrl } from "@/lib/item-data";
import { Card, CardHeader } from "@/components/ui/Card";
import { HeroAvatar } from "@/components/ui/HeroAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn, formatCompact } from "@/lib/utils";
import type { LiveMatchPlayer } from "@/lib/stratz-match";

interface TeamScoreboardProps {
  players: LiveMatchPlayer[];
  didRadiantWin: boolean;
  trackedSteamAccountId?: number;
}

export default function TeamScoreboard({
  players,
  didRadiantWin,
  trackedSteamAccountId,
}: TeamScoreboardProps) {
  const radiant = players.filter((p) => p.isRadiant).sort((a, b) => b.networth - a.networth);
  const dire = players.filter((p) => !p.isRadiant).sort((a, b) => b.networth - a.networth);

  return (
    <section aria-labelledby="scoreboard-heading">
      <h2 id="scoreboard-heading" className="section-title">รายละเอียดผู้เล่นทั้งหมด</h2>
      <div className="space-y-4">
        <TeamTable
          label="Radiant"
          players={radiant}
          isWinner={didRadiantWin}
          accent="radiant"
          trackedSteamAccountId={trackedSteamAccountId}
        />
        <TeamTable
          label="Dire"
          players={dire}
          isWinner={!didRadiantWin}
          accent="dire"
          trackedSteamAccountId={trackedSteamAccountId}
        />
      </div>
    </section>
  );
}

function TeamTable({
  label,
  players,
  isWinner,
  accent,
  trackedSteamAccountId,
}: {
  label: string;
  players: LiveMatchPlayer[];
  isWinner: boolean;
  accent: "radiant" | "dire";
  trackedSteamAccountId?: number;
}) {
  return (
    <Card padded={false} accent={accent}>
      <CardHeader
        title={
          <span className={accent === "radiant" ? "text-radiant" : "text-dire"}>{label}</span>
        }
        subtitle={`${players.reduce((n, p) => n + p.kills, 0)} kills · ${formatCompact(
          players.reduce((n, p) => n + p.networth, 0),
        )} net worth`}
        action={isWinner ? <Badge tone={accent === "radiant" ? "win" : "loss"}>ชนะ</Badge> : null}
      />
      <div className="scroll-x">
        <table className="table-data min-w-[42rem]">
          <thead>
            <tr>
              <th scope="col">ฮีโร่</th>
              <th scope="col">ผู้เล่น</th>
              <th scope="col" className="text-right">K/D/A</th>
              <th scope="col" className="text-right">GPM/XPM</th>
              <th scope="col" className="text-right">Net Worth</th>
              <th scope="col">ไอเทม</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.steamAccountId}
                className={cn(
                  p.steamAccountId === trackedSteamAccountId && "bg-accent-teal-dim/50",
                )}
              >
                <td>
                  <div className="flex items-center gap-2">
                    <HeroAvatar heroId={p.heroId} size="md" level={p.level} ring={accent} />
                    <span className="text-text-primary text-xs whitespace-nowrap">
                      {getHeroName(p.heroId)}
                    </span>
                  </div>
                </td>
                <td className="max-w-[150px]">
                  <div className="flex items-center gap-1.5">
                    {p.avatar && (
                      <div className="relative h-5 w-5 shrink-0 rounded-full overflow-hidden bg-bg-secondary">
                        <Image src={p.avatar} alt="" fill className="object-cover" sizes="20px" unoptimized />
                      </div>
                    )}
                    <span className="text-text-secondary text-xs whitespace-nowrap truncate">
                      {p.name ?? "—"}
                    </span>
                    {p.steamAccountId === trackedSteamAccountId && (
                      <span className="shrink-0 text-[10px] font-semibold text-accent-teal bg-accent-teal/10 px-1 py-0.5 rounded">
                        คุณ
                      </span>
                    )}
                  </div>
                </td>
                <td className="num text-text-primary text-xs whitespace-nowrap">
                  {p.kills}/{p.deaths}/{p.assists}
                </td>
                <td className="num text-text-secondary text-xs whitespace-nowrap">
                  {p.gpm}/{p.xpm}
                </td>
                <td className="num text-accent-gold text-xs font-semibold">
                  {formatCompact(p.networth)}
                </td>
                <td>
                  <ItemRow player={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ItemRow({ player }: { player: LiveMatchPlayer }) {
  const slots = [...player.items, ...player.backpack];
  return (
    <div className="flex items-center gap-0.5">
      {slots.map((itemId, i) => (
        <ItemIcon key={i} itemId={itemId} />
      ))}
      {player.neutralItem != null && (
        <div className="ml-1">
          <ItemIcon itemId={player.neutralItem} neutral />
        </div>
      )}
    </div>
  );
}

function ItemIcon({ itemId, neutral }: { itemId: number; neutral?: boolean }) {
  if (!itemId) {
    return <div className="h-6 w-8 rounded-sm bg-bg-secondary/50 shrink-0" aria-hidden />;
  }
  const url = itemIconUrl(itemId);
  if (!url) {
    return (
      <div
        className="h-6 w-8 rounded-sm bg-bg-secondary shrink-0 border border-border/50"
        title={`Item #${itemId}`}
      />
    );
  }
  return (
    <div
      className={cn(
        "relative h-6 w-8 shrink-0 rounded-sm overflow-hidden bg-bg-secondary border border-border/50",
        neutral && "ring-1 ring-accent-purple border-transparent",
      )}
      title={getItemName(itemId)}
    >
      <Image src={url} alt={getItemName(itemId)} fill className="object-cover" sizes="32px" unoptimized />
    </div>
  );
}
