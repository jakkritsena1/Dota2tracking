"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { cn, formatMatchDate, formatDuration, formatKDA } from "@/lib/utils";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import type { Match, MatchTag } from "@/types/database";

type MatchWithTags = Match & { match_tags?: MatchTag[] };

interface MatchTableProps {
  matches: MatchWithTags[];
}

const TAG_LABELS: Record<string, { label: string; color: string }> = {
  lane_loss:      { label: "Lane แพ้",       color: "bg-accent-red-dim text-loss" },
  slow_farm:      { label: "Farm ช้า",        color: "bg-accent-orange text-white" },
  died_in_fights: { label: "ตายในไฟต์",     color: "bg-accent-red-dim text-loss" },
  throw_midgame:  { label: "Throw",           color: "bg-accent-purple text-white" },
  carried_by_team:{ label: "ทีมพาขึ้น",      color: "bg-text-muted text-white" },
  good_game:      { label: "เกมดี",          color: "bg-accent-green-dim text-win" },
};

export function MatchTable({ matches }: MatchTableProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag
    ? matches.filter((m) => m.match_tags?.some((t) => t.tag === activeTag))
    : matches;

  return (
    <section aria-label="แมตช์ล่าสุด">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title mb-0">แมตช์ล่าสุด</p>
        {activeTag && (
          <button
            onClick={() => setActiveTag(null)}
            className="text-xs text-accent-blue hover:underline focus-ring"
            aria-label="ล้างการกรอง"
          >
            ล้างการกรอง ({TAG_LABELS[activeTag]?.label ?? activeTag})
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Table — scrollable horizontally on small screens */}
        <div className="scroll-x">
          <table className="w-full text-sm">
            <caption className="sr-table-caption">
              รายการแมตช์ล่าสุด พร้อมผลลัพธ์และสถิติ
            </caption>
            <thead>
              <tr className="border-b border-border">
                {["ฮีโร่", "ผล", "เวลา", "KDA", "IMP", "GPM", "แท็ก"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-text-muted text-xs font-medium"
                    scope="col"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted text-sm">
                    ไม่มีแมตช์ที่มีแท็ก &quot;{TAG_LABELS[activeTag ?? ""]?.label}&quot;
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <tr
                  key={m.match_id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors cursor-pointer"
                  onClick={() => { window.location.href = `/match/${m.match_id}`; }}
                >
                  {/* Hero */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-bg-secondary">
                        <Image
                          src={heroIconUrl(m.hero_id)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="32px"
                          unoptimized
                        />
                      </div>
                      <Link
                        href={`/match/${m.match_id}`}
                        className="text-text-primary hover:text-accent-blue font-medium focus-ring"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getHeroName(m.hero_id)}
                      </Link>
                    </div>
                  </td>

                  {/* Result */}
                  <td className="px-4 py-3">
                    <span className={m.is_win ? "badge-win" : "badge-loss"}>
                      <span aria-hidden>{m.is_win ? "▲" : "▼"}</span>
                      {m.is_win ? "ชนะ" : "แพ้"}
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 text-text-secondary">
                    <span>{formatMatchDate(m.start_time)}</span>
                    <span className="block text-text-muted text-xs">
                      {formatDuration(m.duration_sec)}
                    </span>
                  </td>

                  {/* KDA */}
                  <td className="px-4 py-3 font-mono text-text-primary">
                    {m.kills ?? 0}/{m.deaths ?? 0}/{m.assists ?? 0}
                    <span className="block text-text-muted text-xs">
                      {formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}
                    </span>
                  </td>

                  {/* IMP */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-medium",
                        m.imp !== null && m.imp >= 50
                          ? "text-win"
                          : m.imp !== null && m.imp <= 10
                          ? "text-loss"
                          : "text-text-primary",
                      )}
                    >
                      {m.imp ?? "—"}
                    </span>
                  </td>

                  {/* GPM */}
                  <td className="px-4 py-3 text-text-secondary">
                    {m.gpm ?? "—"}
                  </td>

                  {/* Tags (max 2) */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(m.match_tags ?? []).slice(0, 2).map((tag) => (
                        <button
                          key={tag.tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTag(activeTag === tag.tag ? null : tag.tag);
                          }}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-xs font-medium transition-opacity hover:opacity-80 focus-ring",
                            TAG_LABELS[tag.tag]?.color ?? "bg-bg-secondary text-text-secondary",
                          )}
                          aria-pressed={activeTag === tag.tag}
                          aria-label={`กรองด้วยแท็ก ${TAG_LABELS[tag.tag]?.label ?? tag.tag}`}
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
      </div>
    </section>
  );
}
