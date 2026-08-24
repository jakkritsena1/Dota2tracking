import { cn } from "@/lib/utils";
import type { LiveMatchPlayer } from "@/lib/stratz-match";

interface MatchScorelineProps {
  players: LiveMatchPlayer[];
  didRadiantWin: boolean;
}

export default function MatchScoreline({ players, didRadiantWin }: MatchScorelineProps) {
  const radiant = players.filter((p) => p.isRadiant);
  const dire = players.filter((p) => !p.isRadiant);

  const radiantKills = radiant.reduce((sum, p) => sum + p.kills, 0);
  const direKills = dire.reduce((sum, p) => sum + p.kills, 0);
  const radiantNw = radiant.reduce((sum, p) => sum + p.networth, 0);
  const direNw = dire.reduce((sum, p) => sum + p.networth, 0);
  const totalNw = radiantNw + direNw || 1;
  const radiantShare = (radiantNw / totalNw) * 100;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <TeamLabel label="Radiant" isWinner={didRadiantWin} colorClass="text-win" align="start" />
        <div className="flex items-center gap-3 font-mono text-2xl font-bold text-text-primary tabular-nums">
          <span className={didRadiantWin ? "text-win" : "text-text-secondary"}>{radiantKills}</span>
          <span className="text-text-muted text-sm font-sans">—</span>
          <span className={!didRadiantWin ? "text-loss" : "text-text-secondary"}>{direKills}</span>
        </div>
        <TeamLabel label="Dire" isWinner={!didRadiantWin} colorClass="text-loss" align="end" />
      </div>

      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1 font-mono tabular-nums">
          <span>{(radiantNw / 1000).toFixed(1)}k</span>
          <span className="text-text-muted/70 font-sans">Net Worth</span>
          <span>{(direNw / 1000).toFixed(1)}k</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-bg-secondary overflow-hidden flex">
          <div
            className="h-full bg-win transition-all"
            style={{ width: `${radiantShare}%` }}
          />
          <div className="h-full bg-loss flex-1" />
        </div>
      </div>
    </div>
  );
}

function TeamLabel({
  label,
  isWinner,
  colorClass,
  align,
}: {
  label: string;
  isWinner: boolean;
  colorClass: string;
  align: "start" | "end";
}) {
  return (
    <div className={cn("flex items-center gap-2", align === "end" && "flex-row-reverse")}>
      <span className={cn("text-sm font-semibold", colorClass)}>{label}</span>
      {isWinner && <span className={colorClass === "text-win" ? "badge-win" : "badge-loss"}>ชนะ</span>}
    </div>
  );
}
