"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn, formatCompact } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";

interface TeamNetWorthChartProps {
  radiantNetworthLeads: number[]; // per-minute, positive = Radiant ahead
  radiantExperienceLeads: number[]; // per-minute, positive = Radiant ahead
}

type Metric = "networth" | "xp";

// Fixed viewBox coordinate space, scaled to the card's actual rendered width
// via preserveAspectRatio="none" + className="w-full" — matches
// WinProbabilityChart's pattern. A literal pixel width sized to data length
// left a gap of empty card on shorter matches instead of filling it.
const W = 1000;
const H = 140;
const PAD_L = 44; // room for the Y-axis value labels

// Faction icons — the same pair STRATZ's own match header uses (confirmed
// from a real page's rendered HTML: cdn.stratz.com/images/dota2/{radiant,dire}_square.png).
const RADIANT_ICON = "https://cdn.stratz.com/images/dota2/radiant_square.png";
const DIRE_ICON = "https://cdn.stratz.com/images/dota2/dire_square.png";

export default function TeamNetWorthChart({
  radiantNetworthLeads,
  radiantExperienceLeads,
}: TeamNetWorthChartProps) {
  const [metric, setMetric] = useState<Metric>("networth");
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasXp = radiantExperienceLeads.length > 1;

  if (radiantNetworthLeads.length < 2) return null;

  const networth = radiantNetworthLeads;
  const experience = hasXp ? radiantExperienceLeads : [];
  const activeData = metric === "xp" && hasXp ? experience : networth;
  const len = activeData.length;

  // Shared domain across both series so they read on one consistent scale —
  // matches STRATZ rendering net worth and XP on the same axis.
  const max = Math.max(1, ...networth.map((v) => Math.abs(v)), ...experience.map((v) => Math.abs(v)));
  const midY = H / 2;
  const innerW = W - PAD_L;

  const scaleY = (v: number) => midY - (v / max) * (midY - 8);
  const scaleX = (i: number) => PAD_L + (i / (len - 1)) * innerW;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const t = (relX - PAD_L) / innerW;
    const i = Math.round(t * (len - 1));
    setHover(i >= 0 && i < len ? i : null);
  }

  const finalNetworth = networth[networth.length - 1];
  const finalXp = hasXp ? experience[experience.length - 1] : 0;
  const finalActive = metric === "xp" && hasXp ? finalXp : finalNetworth;

  const activeLine = buildLine(activeData, scaleX, scaleY);
  const activePositiveArea = buildAreaPath(activeData, (v) => Math.max(v, 0), scaleX, scaleY, midY);
  const activeNegativeArea = buildAreaPath(activeData, (v) => Math.min(v, 0), scaleX, scaleY, midY);

  const ghostData = hasXp ? (metric === "xp" ? networth : experience) : null;
  const ghostLine = ghostData ? buildLine(ghostData, scaleX, scaleY) : null;

  const yTicks = [max, max / 2, 0, -max / 2, -max];

  return (
    <Card padded={false}>
      <CardHeader
        id="team-networth-heading"
        title="Net Worth / Experience ทั้งสองทีม"
        subtitle="ค่าบวกคือ Radiant นำ ค่าลบคือ Dire นำ"
      />

      {/* Faction summary bar — matches STRATZ's header: faction icon + name
          on each end, gold and XP deltas in the middle. */}
      <div className="flex items-center gap-2 px-4 pt-3 text-xs">
        <Image src={RADIANT_ICON} alt="" width={18} height={18} unoptimized />
        <span className="font-semibold text-radiant">Radiant</span>
        <span className={cn("font-semibold", finalNetworth >= 0 ? "text-win" : "text-loss")}>
          {finalNetworth >= 0 ? "+" : "-"}{formatCompact(Math.abs(finalNetworth))}
        </span>
        {hasXp && (
          <span className="text-text-secondary">
            {finalXp >= 0 ? "+" : "-"}{formatCompact(Math.abs(finalXp))} XP
          </span>
        )}
        <div className="flex-1" />
        <span className="font-semibold text-dire">Dire</span>
        <Image src={DIRE_ICON} alt="" width={18} height={18} unoptimized />
      </div>

      <div className="p-4 pt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H + 20}`}
          preserveAspectRatio="none"
          className="w-full h-[160px]"
          aria-label="กราฟเทียบสองทีม"
          role="img"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="nw-win-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ACB4F" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#2ACB4F" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="nw-loss-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#EC041F" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#EC041F" stopOpacity="0.08" />
            </linearGradient>
            <clipPath id="nw-clip-up">
              <rect x={0} y={0} width={W} height={midY} />
            </clipPath>
            <clipPath id="nw-clip-down">
              <rect x={0} y={midY} width={W} height={H - midY} />
            </clipPath>
          </defs>

          {/* Y-axis gridlines + value labels */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W}
                y1={scaleY(v)}
                y2={scaleY(v)}
                stroke="#262626"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text x={PAD_L - 6} y={scaleY(v) + 3} fill="#5C5C5C" fontSize={10} textAnchor="end">
                {v === 0 ? "0" : `${v > 0 ? "+" : "-"}${formatCompact(Math.abs(v))}`}
              </text>
            </g>
          ))}

          {/* The other metric, shown faintly for context — matches STRATZ
              keeping both series on screen with only one "highlighted". */}
          {ghostLine && (
            <polyline
              points={ghostLine}
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )}

          <path d={activePositiveArea} fill="url(#nw-win-fill)" />
          <path d={activeNegativeArea} fill="url(#nw-loss-fill)" />

          <polyline
            points={activeLine}
            fill="none"
            stroke="#2ACB4F"
            strokeWidth={2}
            clipPath="url(#nw-clip-up)"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={activeLine}
            fill="none"
            stroke="#EC041F"
            strokeWidth={2}
            clipPath="url(#nw-clip-down)"
            vectorEffect="non-scaling-stroke"
          />

          {[10, 20, 30, 40, 50].filter((m) => m < len).map((min) => (
            <text
              key={min}
              x={scaleX(min)}
              y={H + 14}
              fill="#5C5C5C"
              fontSize={10}
              textAnchor="middle"
            >
              {min}m
            </text>
          ))}

          {hover !== null && (
            <g pointerEvents="none">
              <line
                x1={scaleX(hover)}
                x2={scaleX(hover)}
                y1={0}
                y2={H}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={scaleX(hover)}
                cy={scaleY(activeData[hover])}
                r={4}
                fill={activeData[hover] >= 0 ? "#2ACB4F" : "#EC041F"}
                stroke="#0A0A0A"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {/* Toggle buttons — click to make that metric the highlighted one,
            matching STRATZ's Net Worth / Experience legend buttons. */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setMetric("networth")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              metric === "networth"
                ? "bg-bg-overlay text-text-primary ring-hairline"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            Net Worth
          </button>
          {hasXp && (
            <button
              type="button"
              onClick={() => setMetric("xp")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                metric === "xp"
                  ? "bg-bg-overlay text-text-primary ring-hairline"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              Experience
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-1.5 text-xs h-4">
          {hover !== null ? (
            <span className="text-text-muted">
              นาที <span className="font-mono tabular-nums text-text-secondary">{hover}</span> ·{" "}
              {activeData[hover] >= 0 ? "Radiant" : "Dire"} นำ{" "}
              <span
                className={cn(
                  "font-mono tabular-nums",
                  activeData[hover] >= 0 ? "text-win" : "text-loss",
                )}
              >
                {formatCompact(Math.abs(activeData[hover]))}
              </span>{" "}
              {metric === "xp" ? "XP" : ""}
            </span>
          ) : (
            <span className="text-text-muted">
              {finalActive >= 0 ? "Radiant" : "Dire"} นำ {formatCompact(Math.abs(finalActive))}{" "}
              {metric === "xp" ? "XP" : ""} · เลื่อนเมาส์บนกราฟเพื่อดูค่าตามนาที
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function buildLine(
  data: number[],
  scaleX: (i: number) => number,
  scaleY: (v: number) => number,
): string {
  return data.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ");
}

function buildAreaPath(
  data: number[],
  clip: (v: number) => number,
  scaleX: (i: number) => number,
  scaleY: (v: number) => number,
  midY: number,
): string {
  const top = data.map((v, i) => `${scaleX(i)},${scaleY(clip(v))}`).join(" L ");
  return `M ${scaleX(0)},${midY} L ${top} L ${scaleX(data.length - 1)},${midY} Z`;
}
