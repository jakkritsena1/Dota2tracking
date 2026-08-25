import Image from "next/image";
import Link from "next/link";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { cn } from "@/lib/utils";

const SIZES = { xs: 20, sm: 28, md: 36, lg: 48, xl: 72 } as const;

/**
 * Hero portrait used everywhere a hero appears in a list or table.
 *
 * Two details matter: the icon is cropped square (STRATZ's `_icon.png` is
 * already square but the CDN occasionally serves a wider variant), and the
 * optional `level` badge sits bottom-right the way it does in the in-game
 * scoreboard, so it reads as a level rather than a generic count.
 */
export function HeroAvatar({
  heroId,
  size = "sm",
  level,
  href,
  ring,
  className,
}: {
  heroId: number;
  size?: keyof typeof SIZES;
  level?: number | null;
  href?: string;
  /** Team/result tint on the outline. */
  ring?: "radiant" | "dire" | "win" | "loss" | "none";
  className?: string;
}) {
  const px = SIZES[size];
  const name = getHeroName(heroId);

  const img = (
    <span
      className={cn(
        "relative block shrink-0 rounded-sm overflow-hidden bg-bg-secondary",
        ring === "radiant" && "ring-1 ring-radiant/60",
        ring === "dire" && "ring-1 ring-dire/60",
        ring === "win" && "ring-1 ring-win/60",
        ring === "loss" && "ring-1 ring-loss/60",
        (!ring || ring === "none") && "ring-hairline",
        className,
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src={heroIconUrl(heroId)}
        alt=""
        fill
        className="object-cover"
        sizes={`${px}px`}
        unoptimized
      />
      {level != null && (
        <span
          className="absolute bottom-0 right-0 bg-black/85 text-accent-gold font-mono tabular-nums
                     leading-none px-[3px] py-[1px] text-[9px] rounded-tl-sm"
          aria-label={`เลเวล ${level}`}
        >
          {level}
        </span>
      )}
    </span>
  );

  if (!href) return img;

  return (
    <Link
      href={href}
      title={name}
      className="focus-ring rounded-sm hover:opacity-80 transition-opacity"
      aria-label={name}
    >
      {img}
    </Link>
  );
}

/** Hero icon + clickable name, the standard "hero cell" in a data table. */
export function HeroCell({
  heroId,
  href,
  sub,
  level,
  size = "sm",
}: {
  heroId: number;
  href?: string;
  sub?: React.ReactNode;
  level?: number | null;
  size?: keyof typeof SIZES;
}) {
  const name = getHeroName(heroId);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <HeroAvatar heroId={heroId} size={size} level={level} />
      <div className="min-w-0">
        {href ? (
          <Link
            href={href}
            className="block truncate text-text-primary hover:text-accent-teal font-medium transition-colors focus-ring rounded"
          >
            {name}
          </Link>
        ) : (
          <span className="block truncate text-text-primary font-medium">{name}</span>
        )}
        {sub && <span className="block truncate text-xs text-text-muted">{sub}</span>}
      </div>
    </div>
  );
}
