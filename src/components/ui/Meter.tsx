import { cn } from "@/lib/utils";

/**
 * A single value plotted against this player's own p25/p50/p75 for the same
 * metric and role. The bar is the value; the ticks are the benchmarks. Showing
 * the distribution beside the number is the whole point — "GPM 480" means
 * nothing until you can see where 480 sits in your own spread.
 */
export function BenchmarkMeter({
  value,
  p25,
  p50,
  p75,
  higherIsBetter = true,
  className,
}: {
  value: number;
  p25: number;
  p50: number;
  p75: number;
  higherIsBetter?: boolean;
  className?: string;
}) {
  // Scale to a little past p75 so a p75+ value still has bar left to fill.
  const max = Math.max(p75 * 1.25, value * 1.05, 1);
  const pct = (n: number) => Math.min(100, Math.max(0, (n / max) * 100));

  const good = higherIsBetter ? value >= p75 : value <= p25;
  const bad = higherIsBetter ? value < p25 : value > p75;

  return (
    <div className={cn("relative h-1.5 w-full rounded-full bg-bg-overlay overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full origin-left animate-grow-x",
          good ? "bg-win" : bad ? "bg-loss" : "bg-accent-teal",
        )}
        style={{ width: `${pct(value)}%` }}
      />
      {/* Benchmark ticks — p50 is the reference line, p25/p75 the shoulders. */}
      {[p25, p50, p75].map((b, i) => (
        <span
          key={i}
          className={cn(
            "absolute top-0 bottom-0 w-px",
            i === 1 ? "bg-white/50" : "bg-white/20",
          )}
          style={{ left: `${pct(b)}%` }}
          aria-hidden
        />
      ))}
    </div>
  );
}

/**
 * Two-sided share bar (Radiant vs Dire net worth, damage split, …).
 * `leftPct` is 0–100.
 */
export function SplitBar({
  leftPct,
  leftClass = "bg-radiant",
  rightClass = "bg-dire",
  className,
}: {
  leftPct: number;
  leftClass?: string;
  rightClass?: string;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, leftPct));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-bg-overlay overflow-hidden flex", className)}>
      <div className={cn("h-full transition-all", leftClass)} style={{ width: `${clamped}%` }} />
      <div className={cn("h-full flex-1", rightClass)} />
    </div>
  );
}

/** Plain 0–100 progress bar, tinted by whether the value clears `goodAt`. */
export function ProgressBar({
  pct,
  goodAt = 50,
  className,
}: {
  pct: number;
  goodAt?: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("h-1 w-full rounded-full bg-bg-overlay overflow-hidden", className)}>
      <div
        className={cn("h-full origin-left animate-grow-x", clamped >= goodAt ? "bg-win" : "bg-loss")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
