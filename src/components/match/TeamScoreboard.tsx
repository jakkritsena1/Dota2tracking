import Image from "next/image";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { getItemName, itemIconUrl } from "@/lib/item-data";
import { cn } from "@/lib/utils";
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
          colorClass="text-win"
          borderClass="border-accent-green-dim"
          badgeClass="badge-win"
          trackedSteamAccountId={trackedSteamAccountId}
        />
        <TeamTable
          label="Dire"
          players={dire}
          isWinner={!didRadiantWin}
          colorClass="text-loss"
          borderClass="border-accent-red-dim"
          badgeClass="badge-loss"
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
  colorClass,
  borderClass,
  badgeClass,
  trackedSteamAccountId,
}: {
  label: string;
  players: LiveMatchPlayer[];
  isWinner: boolean;
  colorClass: string;
  borderClass: string;
  badgeClass: string;
  trackedSteamAccountId?: number;
}) {
  return (
    <div className={cn("card overflow-hidden border-l-2 p-0", borderClass)}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-secondary/60">
        <span className={cn("text-sm font-semibold", colorClass)}>{label}</span>
        {isWinner && <span className={badgeClass}>ชนะ</span>}
      </div>
      <div className="scroll-x">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-text-muted text-xs border-b border-border">
              <th className="text-left font-medium px-3 py-2">ฮีโร่</th>
              <th className="text-left font-medium px-3 py-2">ผู้เล่น</th>
              <th className="text-right font-medium px-3 py-2">Lvl</th>
              <th className="text-right font-medium px-3 py-2">K/D/A</th>
              <th className="text-right font-medium px-3 py-2">GPM/XPM</th>
              <th className="text-right font-medium px-3 py-2">Net Worth</th>
              <th className="text-left font-medium px-3 py-2">ไอเทม</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.steamAccountId}
                className={cn(
                  "border-b border-border/50 last:border-b-0 transition-colors hover:bg-bg-hover",
                  p.steamAccountId === trackedSteamAccountId && "bg-bg-hover/60",
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
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
                    <span className="text-text-primary text-xs whitespace-nowrap">
                      {getHeroName(p.heroId)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 max-w-[150px]">
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
                      <span className="shrink-0 text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-1 py-0.5 rounded">
                        คุณ
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary text-xs">{p.level}</td>
                <td className="px-3 py-2.5 text-right text-text-primary text-xs font-mono whitespace-nowrap tabular-nums">
                  {p.kills}/{p.deaths}/{p.assists}
                </td>
                <td className="px-3 py-2.5 text-right text-text-secondary text-xs font-mono whitespace-nowrap tabular-nums">
                  {p.gpm}/{p.xpm}
                </td>
                <td className="px-3 py-2.5 text-right text-text-primary text-xs font-mono tabular-nums">
                  {(p.networth / 1000).toFixed(1)}k
                </td>
                <td className="px-3 py-2.5">
                  <ItemRow player={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
