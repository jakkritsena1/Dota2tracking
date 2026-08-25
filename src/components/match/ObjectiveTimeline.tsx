import { Milestone, Droplet } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { getHeroName } from "@/lib/hero-data";
import { cn, formatClock } from "@/lib/utils";
import type { LiveTowerDeath } from "@/lib/stratz-match";

/**
 * Objective map of the game on one axis.
 *
 * Events sit on the side of the team that *scored* them, not the team that
 * lost the building — a wall of markers on one side then reads immediately as
 * "that team took the map", which is the question this panel exists to
 * answer. Rendered as positioned HTML rather than SVG so each marker can
 * carry a normal tooltip.
 */
export default function ObjectiveTimeline({
  towerDeaths,
  firstBloodTime,
  durationSeconds,
}: {
  towerDeaths: LiveTowerDeath[];
  firstBloodTime: number | null;
  durationSeconds: number;
}) {
  if (towerDeaths.length === 0 && firstBloodTime == null) return null;

  const span = Math.max(durationSeconds, 1);
  const pos = (t: number) => `${Math.min(100, Math.max(0, (t / span) * 100))}%`;

  // A Radiant tower falling is a point for Dire, and vice versa.
  const radiantScored = towerDeaths.filter((t) => t.isRadiant === false);
  const direScored = towerDeaths.filter((t) => t.isRadiant === true);

  const minuteTicks = Array.from(
    { length: Math.floor(durationSeconds / 600) },
    (_, i) => (i + 1) * 600,
  );

  return (
    <Card padded={false}>
      <CardHeader
        title="ไทม์ไลน์ออบเจกทีฟ"
        subtitle={`ป้อมที่ล้ม ${towerDeaths.length} หลัง · เรียงตามทีมที่ทำได้`}
        icon={<Milestone size={14} />}
        action={
          <span className="flex items-center gap-3 text-text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-radiant" aria-hidden /> Radiant
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-dire" aria-hidden /> Dire
            </span>
          </span>
        }
      />

      <div className="p-4">
        <div className="relative h-24 select-none">
          {/* Axis */}
          <div
            className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2"
            style={{ background: "var(--hairline)" }}
            aria-hidden
          />

          {/* 10-minute gridlines */}
          {minuteTicks.map((t) => (
            <div key={t} className="absolute top-0 bottom-4" style={{ left: pos(t) }} aria-hidden>
              <div className="h-full w-px bg-white/5" />
              <span className="absolute -bottom-0.5 left-1 text-[0.625rem] font-mono text-text-muted">
                {t / 60}m
              </span>
            </div>
          ))}

          <ObjectiveRow events={radiantScored} side="top" team="radiant" pos={pos} />
          <ObjectiveRow events={direScored} side="bottom" team="dire" pos={pos} />

          {/* First blood — the one non-building event worth a mark */}
          {firstBloodTime != null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: pos(Math.max(0, firstBloodTime)) }}
            >
              <Tooltip content={`First Blood · ${formatClock(firstBloodTime)}`} focusable>
                <span className="grid place-items-center h-5 w-5 rounded-full bg-bg-card ring-1 ring-accent-gold">
                  <Droplet size={11} className="text-accent-gold" aria-hidden />
                </span>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="flex justify-between text-[0.625rem] font-mono tabular-nums text-text-muted mt-1">
          <span>0:00</span>
          <span>{formatClock(durationSeconds)}</span>
        </div>
      </div>
    </Card>
  );
}

function ObjectiveRow({
  events,
  side,
  team,
  pos,
}: {
  events: LiveTowerDeath[];
  side: "top" | "bottom";
  team: "radiant" | "dire";
  pos: (t: number) => string;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 h-8",
        side === "top" ? "top-1.5" : "bottom-6",
      )}
    >
      {events.map((e, i) => (
        <div
          key={`${e.time}-${e.npcId}-${i}`}
          className="absolute -translate-x-1/2"
          style={{ left: pos(e.time), [side === "top" ? "bottom" : "top"]: 0 }}
        >
          <Tooltip
            side={side === "top" ? "top" : "bottom"}
            focusable
            content={
              <>
                <span className="block text-text-primary font-semibold">
                  {team === "radiant" ? "Radiant" : "Dire"} ทำลายป้อม
                </span>
                <span className="block">
                  {formatClock(e.time)}
                  {e.attacker ? ` · ${getHeroName(e.attacker)}` : ""}
                </span>
              </>
            }
          >
            <span
              className={cn(
                "block h-3.5 w-2 rounded-sm transition-transform hover:scale-125",
                team === "radiant" ? "bg-radiant" : "bg-dire",
              )}
              aria-label={`${team} ทำลายป้อมนาที ${Math.floor(e.time / 60)}`}
            />
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
