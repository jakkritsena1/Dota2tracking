import Image from "next/image";
import { Clock } from "lucide-react";
import { rankTierToName } from "@/lib/utils";

interface PlayerHeaderProps {
  name: string;
  avatar: string | null;
  seasonRank: number | null;
  isDotaPlus: boolean;
  lastSyncedAt: string | null;
}

const RANK_COLORS: Record<number, string> = {
  1: "#9D9D9D", // Herald
  2: "#7B904B", // Guardian
  3: "#AE6F3B", // Crusader
  4: "#8A9AC4", // Archon
  5: "#C1C2B3", // Legend
  6: "#8AB7D9", // Ancient
  7: "#C48DFE", // Divine
  8: "#B1CCFB", // Immortal
};

export function PlayerHeader({
  name,
  avatar,
  seasonRank,
  isDotaPlus,
  lastSyncedAt,
}: PlayerHeaderProps) {
  const bracket = seasonRank ? Math.floor(seasonRank / 10) : null;
  const rankColor = bracket ? (RANK_COLORS[bracket] ?? "#999999") : "#999999";
  const rankName = rankTierToName(seasonRank);

  return (
    <header className="flex items-center gap-4" aria-label="โปรไฟล์ผู้เล่น">
      {/* Avatar */}
      <div className="relative h-16 w-16 rounded-full overflow-hidden bg-bg-secondary shrink-0 ring-2 ring-border">
        {avatar ? (
          <Image
            src={avatar}
            alt={`รูปโปรไฟล์ ${name}`}
            fill
            className="object-cover"
            sizes="64px"
            priority
            unoptimized
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-text-muted text-2xl">
            ?
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-text-primary truncate">{name}</h1>
          {isDotaPlus && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-medium">
              Dota+
            </span>
          )}
        </div>

        {/* Rank */}
        <p className="text-sm font-semibold" style={{ color: rankColor }}>
          {rankName}
        </p>

        {/* Last synced */}
        {lastSyncedAt && (
          <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
            <Clock size={10} aria-hidden />
            ซิงก์ล่าสุด{" "}
            {new Date(lastSyncedAt).toLocaleString("th-TH", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>
    </header>
  );
}
