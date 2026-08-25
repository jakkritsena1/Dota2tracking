"use client";

import { useMemo, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { MatchOutcomeKind } from "@/lib/stratz-match";

const W = 1000;
const H = 200;
const PAD_L = 34;
const PAD_R = 8;
const PAD_Y = 10;

const OUTCOME_LABEL: Record<MatchOutcomeKind, { text: string; tone: "gold" | "teal" | "neutral" } | null> = {
  NONE: null,
  STOMPED: { text: "Stomp", tone: "neutral" },
  COMEBACK: { text: "Comeback", tone: "gold" },
  CLOSE_GAME: { text: "เกมสูสี", tone: "teal" },
};

/**
 * STRATZ's win-probability curve, redrawn from this player's point of view.
 *
 * The API returns Radiant's per-minute win chance; showing that raw would
 * mean a Dire player reads their own dominant game as a line pinned to the
 * floor. `perspectiveIsRadiant` flips it so the curve is always "my team's
 * chance to win", which is the only framing that makes the 50% midline mean
 * "even game" regardless of which side you were on.
 */
export default function WinProbabilityChart({
  radiantWinRates,
  perspectiveIsRadiant,
  durationSeconds,
  outcomeKind,
}: {
  radiantWinRates: number[];
  perspectiveIsRadiant: boolean;
  durationSeconds: number;
  outcomeKind: MatchOutcomeKind;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const series = useMemo(
    () =>
      radiantWinRates
        .map((v) => (perspectiveIsRadiant ? v : 1 - v))
        .map((v) => Math.min(1, Math.max(0, v))),
    [radiantWinRates, perspectiveIsRadiant],
  );

  const geometry = useMemo(() => {
    if (series.length < 2) return null;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_Y * 2;
    const x = (i: number) => PAD_L + (i / (series.length - 1)) * innerW;
    const y = (v: number) => PAD_Y + (1 - v) * innerH;
    const line = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return {
      x,
      y,
      line,
      mid: y(0.5),
      area: `${PAD_L},${y(0.5)} ${line} ${x(series.length - 1)},${y(0.5)}`,
    };
  }, [series]);

  // The single biggest minute-to-minute swing — usually a teamfight or a
  // Roshan, and the thing worth rewatching.
  const swing = useMemo(() => {
    let best = { index: 0, delta: 0 };
    for (let i = 1; i < series.length; i++) {
      const d = series[i] - series[i - 1];
      if (Math.abs(d) > Math.abs(best.delta)) best = { index: i, delta: d };
    }
    return Math.abs(best.delta) >= 0.12 ? best : null;
  }, [series]);

  if (!geometry) return null;

  const { x, y, line, mid, area } = geometry;
  const finalPct = Math.round(series[series.length - 1] * 100);
  const outcome = OUTCOME_LABEL[outcomeKind];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const t = (relX - PAD_L) / (W - PAD_L - PAD_R);
    const i = Math.round(t * (series.length - 1));
    setHover(i >= 0 && i < series.length ? i : null);
  }

  return (
    <Card padded={false}>
      <CardHeader
        title="โอกาสชนะระหว่างเกม"
        subtitle="ประเมินจากสถานะเกมรายนาทีโดย STRATZ · มุมมองฝั่งของคุณ"
        icon={<Activity size={14} />}
        action={
          <div className="flex items-center gap-2">
            {outcome && <Badge tone={outcome.tone}>{outcome.text}</Badge>}
            <span className="text-text-muted">
              จบที่ <span className="font-mono tabular-nums text-text-primary">{finalPct}%</span>
            </span>
          </div>
        }
      />

      <div className="p-4 pt-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[200px]"
          preserveAspectRatio="none"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label={`กราฟโอกาสชนะตลอด ${series.length} นาที จบที่ ${finalPct} เปอร์เซ็นต์`}
        >
          <defs>
            <linearGradient id="wp-up" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ACB4F" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2ACB4F" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="wp-down" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#EC041F" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#EC041F" stopOpacity="0.02" />
            </linearGradient>
            {/* Clip the same filled area to each half of the chart so the
                fill flips colour exactly at the 50% line. */}
            <clipPath id="wp-clip-up">
              <rect x="0" y="0" width={W} height={mid} />
            </clipPath>
            <clipPath id="wp-clip-down">
              <rect x="0" y={mid} width={W} height={H - mid} />
            </clipPath>
          </defs>

          {/* Gridlines at 25 / 50 / 75% */}
          {[0.25, 0.5, 0.75].map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 0.5 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}
                strokeWidth={1}
                strokeDasharray={v === 0.5 ? undefined : "3 4"}
                vectorEffect="non-scaling-stroke"
              />
              <text x={4} y={y(v) + 3} fill="#5C5C5C" fontSize={10}>
                {v * 100}%
              </text>
            </g>
          ))}

          <polygon points={area} fill="url(#wp-up)" clipPath="url(#wp-clip-up)" />
          <polygon points={area} fill="url(#wp-down)" clipPath="url(#wp-clip-down)" />

          <polyline
            points={line}
            fill="none"
            stroke="#2ACB4F"
            strokeWidth={2}
            clipPath="url(#wp-clip-up)"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={line}
            fill="none"
            stroke="#EC041F"
            strokeWidth={2}
            clipPath="url(#wp-clip-down)"
            vectorEffect="non-scaling-stroke"
          />

          {swing && (
            <g>
              <line
                x1={x(swing.index)}
                x2={x(swing.index)}
                y1={PAD_Y}
                y2={H - PAD_Y}
                stroke={swing.delta > 0 ? "#2ACB4F" : "#EC041F"}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.6}
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={x(swing.index)} cy={y(series[swing.index])} r={3.5}
                      fill={swing.delta > 0 ? "#2ACB4F" : "#EC041F"} />
            </g>
          )}

          {/* Minute ticks every 10 minutes */}
          {series.map((_, i) => i).filter((i) => i > 0 && i % 10 === 0).map((i) => (
            <text key={i} x={x(i)} y={H - 1} fill="#5C5C5C" fontSize={10} textAnchor="middle">
              {i}m
            </text>
          ))}

          {hover !== null && (
            <g pointerEvents="none">
              <line
                x1={x(hover)} x2={x(hover)} y1={PAD_Y} y2={H - PAD_Y}
                stroke="rgba(255,255,255,0.35)" strokeWidth={1} vectorEffect="non-scaling-stroke"
              />
              <circle cx={x(hover)} cy={y(series[hover])} r={4} fill="#E6E6E6" />
            </g>
          )}
        </svg>

        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-text-muted">
            {hover !== null ? (
              <>
                นาที <span className="font-mono tabular-nums text-text-secondary">{hover}</span> ·{" "}
                โอกาสชนะ{" "}
                <span
                  className={
                    series[hover] >= 0.5 ? "font-mono tabular-nums text-win" : "font-mono tabular-nums text-loss"
                  }
                >
                  {Math.round(series[hover] * 100)}%
                </span>
              </>
            ) : (
              `ความยาวเกม ${Math.round(durationSeconds / 60)} นาที`
            )}
          </span>
          {swing && (
            <span className={swing.delta > 0 ? "text-win" : "text-loss"}>
              จุดพลิกใหญ่สุด: นาที {swing.index} ({swing.delta > 0 ? "+" : ""}
              {Math.round(swing.delta * 100)}%)
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
