"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getHeroName } from "@/lib/hero-data";
import { formatClock } from "@/lib/utils";
import type { LiveMatchPlayer } from "@/lib/stratz-match";

// STRATZ reports ward positions in map units running roughly 64-192 on each
// axis, with 128 at the centre of the map. Normalise to 0-1 and flip Y, since
// world-Y increases northward but SVG-Y increases downward.
const MAP_MIN = 64;
const MAP_SPAN = 128;
const nx = (x: number) => Math.min(1, Math.max(0, (x - MAP_MIN) / MAP_SPAN));
const ny = (y: number) => 1 - Math.min(1, Math.max(0, (y - MAP_MIN) / MAP_SPAN));

const S = 400; // SVG viewport is square; the Dota map is too.

type TeamFilter = "all" | "radiant" | "dire";
type PhaseFilter = "all" | "lane" | "mid" | "late";

const PHASE_BOUNDS: Record<PhaseFilter, [number, number]> = {
  all: [-Infinity, Infinity],
  lane: [-Infinity, 600],
  mid: [600, 1500],
  late: [1500, Infinity],
};

interface Placed {
  key: string;
  x: number;
  y: number;
  time: number;
  isSentry: boolean;
  isRadiant: boolean;
  heroId: number;
}

/**
 * Where vision actually went, on a hand-drawn map.
 *
 * The terrain is vector rather than a screenshot of the minimap: at this size
 * a real minimap image is mostly unreadable texture, and the only landmarks
 * that matter for reading ward placement are the lanes, the river and the two
 * bases. Drawing them keeps the panel legible and on-theme.
 */
export default function WardMap({ players }: { players: LiveMatchPlayer[] }) {
  const [team, setTeam] = useState<TeamFilter>("all");
  const [phase, setPhase] = useState<PhaseFilter>("all");
  const [hovered, setHovered] = useState<Placed | null>(null);

  const all = useMemo<Placed[]>(
    () =>
      players.flatMap((p) =>
        p.wards.map((w, i) => ({
          key: `${p.steamAccountId}-${i}`,
          x: nx(w.x),
          y: ny(w.y),
          time: w.time,
          isSentry: w.type === 1,
          isRadiant: p.isRadiant,
          heroId: p.heroId,
        })),
      ),
    [players],
  );

  const shown = useMemo(() => {
    const [lo, hi] = PHASE_BOUNDS[phase];
    return all.filter(
      (w) =>
        (team === "all" || (team === "radiant") === w.isRadiant) &&
        w.time >= lo &&
        w.time < hi,
    );
  }, [all, team, phase]);

  if (all.length === 0) return null;

  const obs = shown.filter((w) => !w.isSentry).length;
  const sentry = shown.length - obs;

  return (
    <Card padded={false}>
      <CardHeader
        title="แผนที่การวางวอร์ด"
        subtitle={`Observer ${obs} · Sentry ${sentry} จากทั้งหมด ${all.length} อัน`}
        icon={<Eye size={14} />}
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <SegmentedControl
              ariaLabel="กรองตามทีม"
              value={team}
              onChange={setTeam}
              segments={[
                { value: "all", label: "ทั้งสองทีม" },
                { value: "radiant", label: "Radiant" },
                { value: "dire", label: "Dire" },
              ]}
            />
            <SegmentedControl
              ariaLabel="กรองตามช่วงเวลา"
              value={phase}
              onChange={setPhase}
              segments={[
                { value: "all", label: "ทั้งเกม" },
                { value: "lane", label: "0-10m" },
                { value: "mid", label: "10-25m" },
                { value: "late", label: "25m+" },
              ]}
            />
          </div>
        }
      />

      <div className="p-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] items-start">
        <div className="relative max-w-md mx-auto w-full">
          <svg
            viewBox={`0 0 ${S} ${S}`}
            className="w-full h-auto rounded-md ring-hairline bg-[#0C0F0C]"
            role="img"
            aria-label={`แผนที่แสดงตำแหน่งวอร์ด ${shown.length} อัน`}
          >
            {/* Territory tint: Radiant holds the bottom-left half. */}
            <polygon points={`0,0 0,${S} ${S},${S}`} fill="#2ACB4F" opacity={0.05} />
            <polygon points={`0,0 ${S},0 ${S},${S}`} fill="#EC041F" opacity={0.05} />

            {/* River, running corner to corner between the two halves */}
            <line
              x1={0} y1={0} x2={S} y2={S}
              stroke="#2E6C86" strokeWidth={18} opacity={0.35} strokeLinecap="round"
            />

            {/* Lanes */}
            <g stroke="#8A7A55" strokeWidth={4} fill="none" opacity={0.55} strokeLinecap="round" strokeLinejoin="round">
              {/* top lane: up the left edge, then across the top */}
              <polyline points={`${S * 0.1},${S * 0.9} ${S * 0.1},${S * 0.1} ${S * 0.9},${S * 0.1}`} />
              {/* bottom lane: across the bottom, then up the right edge */}
              <polyline points={`${S * 0.1},${S * 0.9} ${S * 0.9},${S * 0.9} ${S * 0.9},${S * 0.1}`} />
              {/* mid */}
              <line x1={S * 0.16} y1={S * 0.84} x2={S * 0.84} y2={S * 0.16} />
            </g>

            {/* Bases */}
            <circle cx={S * 0.1} cy={S * 0.9} r={16} fill="#2ACB4F" opacity={0.25} />
            <circle cx={S * 0.1} cy={S * 0.9} r={7} fill="#2ACB4F" opacity={0.7} />
            <circle cx={S * 0.9} cy={S * 0.1} r={16} fill="#EC041F" opacity={0.25} />
            <circle cx={S * 0.9} cy={S * 0.1} r={7} fill="#EC041F" opacity={0.7} />

            {/* Wards. Observers are filled discs (they give vision); sentries
                are hollow rings (they deny it) — the shape carries the type so
                the map still reads without relying on colour. */}
            {shown.map((w) => {
              const cx = w.x * S;
              const cy = w.y * S;
              const color = w.isRadiant ? "#4FA855" : "#C23C2A";
              const active = hovered?.key === w.key;
              return (
                <g
                  key={w.key}
                  onMouseEnter={() => setHovered(w)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={cx} cy={cy} r={9} fill="transparent" />
                  {w.isSentry ? (
                    <circle
                      cx={cx} cy={cy} r={active ? 6.5 : 5}
                      fill="none" stroke={color} strokeWidth={2}
                    />
                  ) : (
                    <circle
                      cx={cx} cy={cy} r={active ? 6 : 4.5}
                      fill={color} stroke="#000" strokeWidth={0.75}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Corner labels, outside the SVG so they stay at a fixed size */}
          <span className="absolute bottom-1.5 left-2 text-[0.625rem] font-semibold text-radiant/80">
            Radiant
          </span>
          <span className="absolute top-1.5 right-2 text-[0.625rem] font-semibold text-dire/80">
            Dire
          </span>
        </div>

        <div className="text-xs space-y-2 sm:w-44">
          <div className="space-y-1.5">
            <p className="label-xs">สัญลักษณ์</p>
            <p className="flex items-center gap-2 text-text-secondary">
              <span className="h-2.5 w-2.5 rounded-full bg-text-secondary" aria-hidden />
              Observer — ให้วิชั่น
            </p>
            <p className="flex items-center gap-2 text-text-secondary">
              <span
                className="h-2.5 w-2.5 rounded-full border-2 border-text-secondary"
                aria-hidden
              />
              Sentry — ตัดวิชั่น
            </p>
          </div>

          <div
            className="surface p-2.5 min-h-[4.5rem] ring-hairline"
            aria-live="polite"
          >
            {hovered ? (
              <>
                <p className="text-text-primary font-semibold">
                  {hovered.isSentry ? "Sentry" : "Observer"}
                </p>
                <p className="text-text-secondary">{getHeroName(hovered.heroId)}</p>
                <p className="font-mono tabular-nums text-text-muted">
                  {formatClock(hovered.time)} ·{" "}
                  {hovered.isRadiant ? "Radiant" : "Dire"}
                </p>
              </>
            ) : (
              <p className="text-text-muted">ชี้ที่จุดบนแผนที่เพื่อดูรายละเอียด</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
