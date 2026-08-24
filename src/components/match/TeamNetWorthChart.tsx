"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TeamNetWorthChartProps {
  radiantNetworthLeads: number[]; // per-minute, positive = Radiant ahead
  radiantExperienceLeads: number[]; // per-minute, positive = Radiant ahead
}

type Metric = "networth" | "xp";

export default function TeamNetWorthChart({
  radiantNetworthLeads,
  radiantExperienceLeads,
}: TeamNetWorthChartProps) {
  const [metric, setMetric] = useState<Metric>("networth");
  const hasXp = radiantExperienceLeads.length > 1;

  const data = metric === "xp" && hasXp ? radiantExperienceLeads : radiantNetworthLeads;
  if (data.length < 2) return null;

  const max = Math.max(1, ...data.map((v) => Math.abs(v)));
  const width = Math.max(data.length * 8, 320);
  const height = 140;
  const midY = height / 2;

  const scaleY = (v: number) => midY - (v / max) * (midY - 8);
  const scaleX = (i: number) => (i / (data.length - 1)) * width;

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
    <section aria-labelledby="team-networth-heading">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 id="team-networth-heading" className="section-title mb-0">
          {metric === "xp" ? "Experience ทั้งสองทีม" : "Net Worth ทั้งสองทีม"}
        </h2>
        <div className="flex items-center gap-3">
          {hasXp && (
            <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setMetric("networth")}
                className={cn(
                  "px-2.5 py-1 transition-colors",
                  metric === "networth"
                    ? "bg-accent-blue text-white"
                    : "text-text-secondary hover:bg-bg-hover",
                )}
              >
                Net Worth
              </button>
              <button
                type="button"
                onClick={() => setMetric("xp")}
                className={cn(
                  "px-2.5 py-1 transition-colors",
                  metric === "xp"
                    ? "bg-accent-blue text-white"
                    : "text-text-secondary hover:bg-bg-hover",
                )}
              >
                XP
              </button>
            </div>
          )}
          <span className={cn("text-xs font-medium whitespace-nowrap", leadingColor)}>
            {leadingTeam} นำ {(Math.abs(finalLead) / 1000).toFixed(1)}k {unit}
          </span>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="scroll-x">
          <svg width={width} height={height + 20} aria-label="กราฟเทียบสองทีม" role="img">
            <line x1={0} y1={midY} x2={width} y2={midY} stroke="#262626" strokeWidth={1} />

            <path d={positiveArea} fill="#2ACB4F" fillOpacity={0.18} />
            <path d={negativeArea} fill="#EC041F" fillOpacity={0.18} />

            <polyline points={linePoints} fill="none" stroke="#999999" strokeWidth={1.5} />

            {[10, 20, 30, 40, 50].filter((m) => m < data.length).map((min) => (
              <text key={min} x={scaleX(min)} y={height + 14} fill="#5C5C5C" fontSize={10} textAnchor="middle">
                {min}m
              </text>
            ))}
          </svg>
        </div>
        <p className="px-4 py-2 text-text-muted text-[11px] border-t border-border">
          บนเส้น = Radiant นำ · ใต้เส้น = Dire นำ
        </p>
      </div>
    </section>
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
