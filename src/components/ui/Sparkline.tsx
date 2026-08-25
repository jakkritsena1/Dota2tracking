import { cn } from "@/lib/utils";

/**
 * Inline trend line for a KPI tile — no axes, no labels, just the shape.
 * Hand-rolled SVG rather than recharts: these render inside server components
 * and there is no interaction to justify shipping a chart runtime for them.
 */
export function Sparkline({
  values,
  width = 96,
  height = 24,
  className,
  tone,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Defaults to trend direction: up = win green, down = loss red. */
  tone?: "win" | "loss" | "teal" | "muted";
}) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const pad = 2;

  const pt = (v: number, i: number) => {
    const x = (i / (clean.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  };

  const points = clean.map(pt);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${points[0][0]},${height} ${line} ${points[points.length - 1][0]},${height}`;

  const rising = clean[clean.length - 1] >= clean[0];
  const resolved = tone ?? (rising ? "win" : "loss");
  const stroke = {
    win: "#2ACB4F",
    loss: "#EC041F",
    teal: "#10A4C1",
    muted: "#5C5C5C",
  }[resolved];

  const gradId = `spark-${resolved}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`แนวโน้ม ${rising ? "ขึ้น" : "ลง"}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={2} fill={stroke} />
    </svg>
  );
}
