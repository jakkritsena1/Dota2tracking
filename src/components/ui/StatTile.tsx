import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single stat-display unit: one number, plus whatever context is
 * available to make it mean something (change vs the previous period, a
 * trend line, a benchmark bar). Every KPI/stat grid in the app uses this so
 * the numbers all sit on the same baseline and read as one system.
 */
export function StatTile({
  label,
  value,
  sub,
  delta,
  deltaSuffix = "",
  lowerIsBetter = false,
  icon,
  tone,
  chart,
  meter,
  footer,
  className,
  ariaLabel,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Change vs the comparison period, in the value's own units. */
  delta?: number | null;
  deltaSuffix?: string;
  lowerIsBetter?: boolean;
  icon?: React.ReactNode;
  /** Colours the value itself — use for pass/fail against a benchmark. */
  tone?: "win" | "loss" | "gold" | "teal";
  /** Sparkline or similar, rendered flush right of the value. */
  chart?: React.ReactNode;
  /** Full-width bar under the value (BenchmarkMeter / ProgressBar). */
  meter?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <article
      className={cn("card flex flex-col gap-1.5", className)}
      aria-label={ariaLabel ?? label}
    >
      <p className="label-xs flex items-center gap-1.5">
        {icon && (
          <span className="text-text-muted" aria-hidden>
            {icon}
          </span>
        )}
        {label}
      </p>

      <div className="flex items-end justify-between gap-2">
        <p
          className={cn(
            "text-2xl font-bold leading-none tabular-nums",
            tone === "win" && "text-win",
            tone === "loss" && "text-loss",
            tone === "gold" && "text-accent-gold",
            tone === "teal" && "text-accent-teal",
            !tone && "text-text-primary",
          )}
        >
          {value}
        </p>
        {chart && <div className="shrink-0 pb-0.5">{chart}</div>}
      </div>

      {meter}

      {(sub || delta != null) && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-text-muted text-xs truncate">{sub}</p>
          {delta != null && (
            <DeltaBadge delta={delta} suffix={deltaSuffix} lowerIsBetter={lowerIsBetter} />
          )}
        </div>
      )}

      {footer}
    </article>
  );
}

export function DeltaBadge({
  delta,
  suffix = "",
  lowerIsBetter = false,
  precision = 1,
}: {
  delta: number;
  suffix?: string;
  lowerIsBetter?: boolean;
  precision?: number;
}) {
  const isZero = Math.abs(delta) < 10 ** -precision / 2;
  const isUp = delta > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded tabular-nums shrink-0",
        isZero
          ? "text-text-secondary bg-bg-overlay"
          : isGood
          ? "text-win bg-accent-green-dim"
          : "text-loss bg-accent-red-dim",
      )}
      aria-label={`เปลี่ยนแปลง ${isUp ? "+" : ""}${delta.toFixed(precision)}${suffix} จากช่วงก่อนหน้า`}
    >
      {isZero ? (
        <Minus size={10} aria-hidden />
      ) : isUp ? (
        <TrendingUp size={10} aria-hidden />
      ) : (
        <TrendingDown size={10} aria-hidden />
      )}
      {isUp ? "+" : ""}
      {delta.toFixed(precision)}
      {suffix}
    </span>
  );
}
