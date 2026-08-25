import Image from "next/image";
import { cn, rankTierToName, rankTierColor, rankTierIconUrl } from "@/lib/utils";

type Tone = "neutral" | "win" | "loss" | "teal" | "gold" | "purple" | "orange";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-bg-overlay text-text-secondary ring-hairline",
  win: "bg-accent-green-dim text-win",
  loss: "bg-accent-red-dim text-loss",
  teal: "bg-accent-teal-dim text-accent-teal",
  gold: "bg-accent-gold-dim text-accent-gold",
  purple: "bg-accent-purple/20 text-accent-purple",
  orange: "bg-accent-orange/15 text-accent-orange",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ResultBadge({ isWin, compact = false }: { isWin: boolean; compact?: boolean }) {
  return (
    <Badge tone={isWin ? "win" : "loss"}>
      <span aria-hidden>{isWin ? "▲" : "▼"}</span>
      {compact ? (isWin ? "W" : "L") : isWin ? "ชนะ" : "แพ้"}
    </Badge>
  );
}

/**
 * Rank medal chip. The dot carries the medal colour and the label the tier
 * name, so the rank is still readable without relying on colour alone.
 */
export function RankBadge({
  rankTier,
  leaderboardRank,
  size = "sm",
}: {
  rankTier: number | null;
  leaderboardRank?: number | null;
  size?: "sm" | "md";
}) {
  if (!rankTier) {
    return (
      <span className="chip" title="ยังไม่ทราบ rank">
        Unranked
      </span>
    );
  }

  const color = rankTierColor(rankTier);
  const name = rankTierToName(rankTier);
  const iconPx = size === "md" ? 20 : 16;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded font-semibold ring-hairline bg-bg-overlay",
        size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs",
      )}
      style={{ color }}
    >
      <Image
        src={rankTierIconUrl(rankTier)}
        alt=""
        width={iconPx}
        height={iconPx}
        className="shrink-0"
        unoptimized
        priority
        aria-hidden
      />
      {name}
      {leaderboardRank ? (
        <span className="text-text-muted font-mono tabular-nums">#{leaderboardRank}</span>
      ) : null}
    </span>
  );
}
