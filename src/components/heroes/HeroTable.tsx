"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Table2 } from "lucide-react";
import type { HeroPoolWithMetaRow } from "@/types/database";
import { heroIconUrl, HEROES } from "@/lib/hero-data";
import { formatMatchDate } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";

interface Props {
  heroes: HeroPoolWithMetaRow[];
}

type SortKey = "games" | "player_wr" | "avg_imp" | "avg_gpm" | "meta_wr" | "last_played";

export function HeroTable({ heroes }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("games");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const filtered = heroes.filter(h => roleFilter === "all" || h.role === roleFilter);
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    if (typeof va === "string" && typeof vb === "string") {
      return va < vb ? sortDir : va > vb ? -sortDir : 0;
    }
    return ((va as number) - (vb as number)) * sortDir;
  });

  const roles = Array.from(new Set(heroes.map(h => h.role))).sort();

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="text-right py-2 px-3 font-medium cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
        onClick={() => handleSort(k)}
      >
        {label} {active ? (sortDir === -1 ? "↓" : "↑") : ""}
      </th>
    );
  }

  return (
    <Card padded={false}>
      <CardHeader
        title="ฮีโร่ทั้งหมด"
        icon={<Table2 size={14} />}
        action={
          <select
            className="bg-bg-hover border border-border rounded-md px-2 py-1 text-sm text-text-primary focus:outline-none"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">ทุกบทบาท</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-text-secondary border-b border-border">
            <tr>
              <th className="text-left py-2 px-3 font-medium">ฮีโร่</th>
              <th className="text-left py-2 px-3 font-medium">บทบาท</th>
              <SortTh label="เกม" k="games" />
              <SortTh label="WR%" k="player_wr" />
              <SortTh label="IMP" k="avg_imp" />
              <SortTh label="GPM" k="avg_gpm" />
              <SortTh label="Meta%" k="meta_wr" />
              <SortTh label="เล่นล่าสุด" k="last_played" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map(h => {
              const heroName = HEROES[h.hero_id]?.displayName ?? `Hero ${h.hero_id}`;
              return (
                <tr key={`${h.hero_id}-${h.role}`} className="hover:bg-bg-hover transition-colors">
                  <td className="py-2 px-3">
                    <Link href={`/heroes/${h.hero_id}`} className="flex items-center gap-2 hover:text-accent-teal transition-colors">
                      <Image
                        src={heroIconUrl(h.hero_id)}
                        alt={heroName}
                        width={28}
                        height={28}
                        className="rounded shrink-0"
                      />
                      <span className="font-medium truncate max-w-[120px]">{heroName}</span>
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-text-secondary">{h.role}</td>
                  <td className="py-2 px-3 text-right">{h.games}</td>
                  <td className={`py-2 px-3 text-right font-medium ${h.player_wr >= 0.5 ? "text-win" : "text-loss"}`}>
                    {(h.player_wr * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right text-text-secondary">
                    {h.avg_imp != null ? Number(h.avg_imp).toFixed(1) : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-text-secondary">
                    {h.avg_gpm != null ? Math.round(Number(h.avg_gpm)) : "—"}
                  </td>
                  <td className={`py-2 px-3 text-right ${h.meta_wr != null && h.meta_wr > 0.51 ? "text-win" : "text-text-secondary"}`}>
                    {h.meta_wr != null ? `${(h.meta_wr * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-text-secondary whitespace-nowrap">
                    {h.last_played ? formatMatchDate(h.last_played) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="text-center text-text-secondary text-sm py-8">ไม่มีข้อมูล</p>
        )}
      </div>
    </Card>
  );
}
