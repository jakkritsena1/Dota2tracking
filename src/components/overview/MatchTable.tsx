"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardLinkAction } from "@/components/ui/Card";
import { HeroCell } from "@/components/ui/HeroAvatar";
import { ResultBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn, formatMatchDate, formatDuration, formatKDA } from "@/lib/utils";
import type { Match, MatchTag } from "@/types/database";

type MatchWithTags = Match & { match_tags?: MatchTag[] };

interface MatchTableProps {
  matches: MatchWithTags[];
}

const TAG_LABELS: Record<string, { label: string; className: string }> = {
  lane_loss:       { label: "Lane แพ้",   className: "bg-accent-red-dim text-loss" },
  slow_farm:       { label: "Farm ช้า",    className: "bg-accent-orange/15 text-accent-orange" },
  died_in_fights:  { label: "ตายในไฟต์", className: "bg-accent-red-dim text-loss" },
  throw_midgame:   { label: "Throw",       className: "bg-accent-purple/20 text-accent-purple" },
  carried_by_team: { label: "ทีมพาขึ้น",  className: "bg-bg-overlay-strong text-text-secondary" },
  good_game:       { label: "เกมดี",       className: "bg-accent-green-dim text-win" },
};

export function MatchTable({ matches }: MatchTableProps) {
  const router = useRouter();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? matches.filter((m) => m.match_tags?.some((t) => t.tag === activeTag))
    : matches;

  return (
    <Card padded={false}>
      <CardHeader
        title="แมตช์ล่าสุด"
        subtitle={
          activeTag
            ? `กรองด้วยแท็ก "${TAG_LABELS[activeTag]?.label ?? activeTag}" — ${filtered.length} เกม`
            : `${matches.length} เกมล่าสุดในช่วงที่เลือก`
        }
        action={
          activeTag ? (
            <button
              onClick={() => setActiveTag(null)}
              className="text-accent-teal hover:text-accent-teal-bright transition-colors focus-ring rounded"
            >
              ล้างการกรอง
            </button>
          ) : (
            <CardLinkAction href="/matches">ดูทั้งหมด</CardLinkAction>
          )
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="ไม่มีแมตช์ที่ตรงกับตัวกรอง"
          description={`ยังไม่มีเกมที่ติดแท็ก "${TAG_LABELS[activeTag ?? ""]?.label ?? activeTag}" ในช่วงเวลานี้`}
        />
      ) : (
        <div className="scroll-x">
          <table className="table-data min-w-[46rem]">
            <caption className="sr-table-caption">
              รายการแมตช์ล่าสุด พร้อมผลลัพธ์และสถิติ
            </caption>
            <thead>
              <tr>
                <th scope="col">ฮีโร่</th>
                <th scope="col">ผล</th>
                <th scope="col">เมื่อไหร่</th>
                <th scope="col" className="text-right">KDA</th>
                <th scope="col" className="text-right">IMP</th>
                <th scope="col" className="text-right">GPM</th>
                <th scope="col">แท็ก</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.match_id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/match/${m.match_id}`)}
                >
                  <td>
                    <HeroCell
                      heroId={m.hero_id}
                      href={`/match/${m.match_id}`}
                      sub={m.role ?? undefined}
                    />
                  </td>

                  <td>
                    <ResultBadge isWin={m.is_win} />
                  </td>

                  <td className="text-text-secondary whitespace-nowrap">
                    {formatMatchDate(m.start_time)}
                    <span className="block text-text-muted text-xs font-mono">
                      {formatDuration(m.duration_sec)}
                    </span>
                  </td>

                  <td className="num text-text-primary">
                    {m.kills ?? 0}/{m.deaths ?? 0}/{m.assists ?? 0}
                    <span className="block text-text-muted text-xs">
                      {formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}
                    </span>
                  </td>

                  <td
                    className={cn(
                      "num font-semibold",
                      m.imp !== null && m.imp >= 50
                        ? "text-win"
                        : m.imp !== null && m.imp <= 10
                        ? "text-loss"
                        : "text-text-primary",
                    )}
                  >
                    {m.imp ?? "—"}
                  </td>

                  <td className="num text-text-secondary">{m.gpm ?? "—"}</td>

                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(m.match_tags ?? []).slice(0, 2).map((tag) => (
                        <button
                          key={tag.tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTag(activeTag === tag.tag ? null : tag.tag);
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium transition-opacity hover:opacity-75 focus-ring",
                            TAG_LABELS[tag.tag]?.className ?? "bg-bg-overlay text-text-secondary",
                            activeTag === tag.tag && "ring-1 ring-accent-teal",
                          )}
                          aria-pressed={activeTag === tag.tag}
                          aria-label={`กรองด้วยแท็ก ${TAG_LABELS[tag.tag]?.label ?? tag.tag}`}
                          title={`ความมั่นใจ ${Math.round(tag.confidence * 100)}%`}
                        >
                          {TAG_LABELS[tag.tag]?.label ?? tag.tag}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Row click uses the router, but keyboard users need a real link out. */}
      <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--hairline)" }}>
        <Link
          href="/matches"
          className="text-xs text-text-muted hover:text-accent-teal transition-colors focus-ring rounded"
        >
          ดูประวัติแมตช์ทั้งหมด →
        </Link>
      </div>
    </Card>
  );
}
