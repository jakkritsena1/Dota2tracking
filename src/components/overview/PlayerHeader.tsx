import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { RankBadge } from "@/components/ui/Badge";
import { rankTierColor } from "@/lib/utils";

interface PlayerHeaderProps {
  name: string;
  avatar: string | null;
  seasonRank: number | null;
  leaderboardRank?: number | null;
  isDotaPlus: boolean;
  lastSyncedAt: string | null;
}

/**
 * Identity band at the top of the dashboard.
 *
 * The avatar's glow is the medal colour, so the rank registers before you
 * read anything — the same trick STRATZ uses on its profile header, and the
 * reason rank colours live in tokens rather than one component.
 */
export function PlayerHeader({
  name,
  avatar,
  seasonRank,
  leaderboardRank,
  isDotaPlus,
  lastSyncedAt,
}: PlayerHeaderProps) {
  const rankColor = rankTierColor(seasonRank);

  return (
    <header className="flex items-center gap-4" aria-label="โปรไฟล์ผู้เล่น">
      <div className="relative shrink-0">
        <div
          className="relative h-16 w-16 rounded-full overflow-hidden bg-bg-secondary"
          style={{ boxShadow: `0 0 0 2px ${rankColor}, 0 0 18px ${rankColor}55` }}
        >
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
            <div className="h-full w-full grid place-items-center text-text-muted text-2xl">?</div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-text-primary truncate">{name}</h1>
          {isDotaPlus && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-medium">
              Dota+
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <RankBadge rankTier={seasonRank} leaderboardRank={leaderboardRank} size="md" />
          {lastSyncedAt && (
            <span className="text-xs text-text-muted flex items-center gap-1">
              <RefreshCw size={10} aria-hidden />
              ซิงก์{" "}
              {new Date(lastSyncedAt).toLocaleString("th-TH", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
