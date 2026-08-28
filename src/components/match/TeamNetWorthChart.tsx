"use client";

import { useRef, useState } from "react";
import { LineChart } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

interface TeamNetWorthChartProps {
  radiantNetworthLeads: number[]; // per-minute, positive = Radiant ahead
  radiantExperienceLeads: number[]; // per-minute, positive = Radiant ahead
}

type Metric = "networth" | "xp";

// Fixed viewBox coordinate space, scaled to the card's actual rendered width
// via preserveAspectRatio="none" + className="w-full" — the same pattern
// WinProbabilityChart already uses. The previous version set a literal
// pixel `width` sized to the data length (min 320px), which left a big gap
// of empty card on any match shorter than the card was wide instead of
// filling it — that's the "แสดงผลไม่เต็ม" (doesn't display full) bug.
const W = 1000;
const H = 140;

export default function TeamNetWorthChart({
  radiantNetworthLeads,
  radiantExperienceLeads,
}: TeamNetWorthChartProps) {
  const [metric, setMetric] = useState<Metric>("networth");
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasXp = radiantExperienceLeads.length > 1;

  const data = metric === "xp" && hasXp ? radiantExperienceLeads : radiantNetworthLeads;
  if (data.length < 2) return null;

  const max = Math.max(1, ...data.map((v) => Math.abs(v)));
  const midY = H / 2;

  const scaleY = (v: number) => midY - (v / max) * (midY - 8);
  const scaleX = (i: number) => (i / (data.length - 1)) * W;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round((relX / W) * (data.length - 1));
    setHover(i >= 0 && i < data.length ? i : null);
  }

  // Split into positive/negative area paths so the fill flips color at
  // each zero-crossing, plus a single continuous stroke line on top.
  const linePoints = data.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ");

  const positiveArea = buildAreaPath(data, (v) => Math.max(v, 0), scaleX, scaleY, midY);
  const negativeArea = buildAreaPath(data, (v) => Math.min(v, 0), scaleX, scaleY, midY);

  const finalLead = data[data.length - 1];
  const leadingTeam = finalLead >= 0 ? "Radiant" : "Dire";
  const leadingColor = finalLead >= 0 ? "text-win" : "text-loss";
  const unit = metric === "xp" ? "XP" : "";

  return (
    <Card padded={false}>
      <CardHeader
        id="team-networth-heading"
        icon={<LineChart size={14} />}
        title={metric === "xp" ? "Experience ทั้งสองทีม" : "Net Worth ทั้งสองทีม"}
        subtitle="ค่าบวกคือ Radiant นำ ค่าลบคือ Dire นำ"
        action={
          <div className="flex items-center gap-3">
            {hasXp && (
              <SegmentedControl
                ariaLabel="เลือกตัวชี้วัด"
                value={metric}
                onChange={setMetric}
                segments={[
                  { value: "networth", label: "Net Worth" },
                  { value: "xp", label: "XP" },
                ]}
              />
            )}
            <span className={cn("font-medium whitespace-nowrap", leadingColor)}>
              {leadingTeam} นำ {(Math.abs(finalLead) / 1000).toFixed(1)}k {unit}
            </span>
          </div>
        }
      />
      <div className="p-4">
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
              <stop offset="0%" stopColor="#2ACB4F" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#2ACB4F" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="nw-loss-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#EC041F" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#EC041F" stopOpacity="0.06" />
            </linearGradient>
            <clipPath id="nw-clip-up">
              <rect x={0} y={0} width={W} height={midY} />
            </clipPath>
            <clipPath id="nw-clip-down">
              <rect x={0} y={midY} width={W} height={H - midY} />
            </clipPath>
          </defs>

          <line
            x1={0}
            y1={midY}
            x2={W}
            y2={midY}
            stroke="#262626"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          <path d={positiveArea} fill="url(#nw-win-fill)" />
          <path d={negativeArea} fill="url(#nw-loss-fill)" />

          <polyline
            points={linePoints}
            fill="none"
            stroke="#2ACB4F"
            strokeWidth={2}
            clipPath="url(#nw-clip-up)"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={linePoints}
            fill="none"
            stroke="#EC041F"
            strokeWidth={2}
            clipPath="url(#nw-clip-down)"
            vectorEffect="non-scaling-stroke"
          />

          {[10, 20, 30, 40, 50].filter((m) => m < data.length).map((min) => (
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
                cy={scaleY(data[hover])}
                r={4}
                fill={data[hover] >= 0 ? "#2ACB4F" : "#EC041F"}
                stroke="#0A0A0A"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        <div className="flex items-center justify-between mt-1.5 text-xs h-4">
          {hover !== null ? (
            <span className="text-text-muted">
              นาที <span className="font-mono tabular-nums text-text-secondary">{hover}</span> ·{" "}
              {data[hover] >= 0 ? "Radiant" : "Dire"} นำ{" "}
              <span
                className={cn(
                  "font-mono tabular-nums",
                  data[hover] >= 0 ? "text-win" : "text-loss",
                )}
              >
                {formatCompact(Math.abs(data[hover]))}
              </span>{" "}
              {unit}
            </span>
          ) : (
            <span className="text-text-muted">เลื่อนเมาส์บนกราฟเพื่อดูค่าตามนาที</span>
          )}
        </div>
      </div>
    </Card>
  );
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
