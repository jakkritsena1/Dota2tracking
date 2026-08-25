import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import {
  parseRange,
  parseRole,
  rangeToStartDate,
  formatMatchDate,
  formatDuration,
  formatKDA,
  roleLabel,
  cn,
} from "@/lib/utils";
import { RangeSelector } from "@/components/shared/RangeSelector";
import { InsufficientData } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { HeroCell } from "@/components/ui/HeroAvatar";
import { ResultBadge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Matches" };
export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ range?: string; role?: string; tag?: string }>;
}

export default async function MatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const range = parseRange(params.range ?? null);
  const role = parseRole(params.role ?? null);
  const rangeStart = rangeToStartDate(range);
  const activeTag = params.tag ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  let query = db
    .from("matches")
    .select(`
      match_id, start_time, duration_sec, is_win,
      hero_id, role, lane, kills, deaths, assists,
      gpm, xpm, imp, cs_at_10, net_worth,
      hero_damage, tower_damage,
      match_tags ( tag, confidence )
    `)
    .gte("start_time", rangeStart.toISOString())
    .in("lobby_type", ["RANKED", "ranked"])
    .order("start_time", { ascending: false })
    .limit(100);

  if (role !== "all") query = query.eq("role", role);

  const { data: matches } = await query;

  const filtered = activeTag
    ? (matches ?? []).filter((m) =>
        m.match_tags?.some((t: { tag: string }) => t.tag === activeTag)
      )
    : (matches ?? []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="ประวัติ"
        title="Matches"
        description="ทุกเกมแรงก์ในช่วงที่เลือก คลิกแถวเพื่อดูรายละเอียดเต็ม"
        actions={<RangeSelector currentRange={range} currentRole={role} />}
      />

      {activeTag && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>กรองด้วยแท็ก: <strong className="text-text-primary">{activeTag}</strong></span>
          <Link
            href={`/matches?range=${range}&role=${role}`}
            className="text-accent-teal hover:underline text-xs"
          >
            ล้าง
          </Link>
        </div>
      )}

      {filtered.length < 10 ? (
        <InsufficientData games={filtered.length} minimum={10} />
      ) : (
        <Card padded={false}>
          <div className="scroll-x">
            <table className="table-data min-w-[48rem]">
              <caption className="sr-only">รายการแมตช์</caption>
              <thead>
                <tr>
                  <th scope="col">ฮีโร่</th>
                  <th scope="col">ผล / เวลา</th>
                  <th scope="col" className="text-right">K/D/A</th>
                  <th scope="col" className="text-right">IMP</th>
                  <th scope="col" className="text-right">GPM</th>
                  <th scope="col" className="text-right">XPM</th>
                  <th scope="col" className="text-right">CS@10</th>
                  <th scope="col">แท็ก</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.match_id}>
                    <td>
                      <HeroCell
                        heroId={m.hero_id}
                        href={`/match/${m.match_id}`}
                        sub={roleLabel(m.role)}
                        size="md"
                      />
                    </td>

                    <td>
                      <ResultBadge isWin={m.is_win} />
                      <span className="block text-text-muted text-xs mt-0.5 whitespace-nowrap">
                        {formatMatchDate(m.start_time)} · {formatDuration(m.duration_sec)}
                      </span>
                    </td>

                    <td className="num text-text-primary">
                      {m.kills}/{m.deaths}/{m.assists}
                      <span className="block text-text-muted text-xs">
                        {formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}
                      </span>
                    </td>

                    <td className={cn(
                      "num font-semibold",
                      m.imp !== null && m.imp >= 50 ? "text-win" :
                      m.imp !== null && m.imp <= 10 ? "text-loss" : "text-text-primary"
                    )}>
                      {m.imp ?? "—"}
                    </td>

                    <td className="num text-text-secondary">{m.gpm ?? "—"}</td>
                    <td className="num text-text-secondary">{m.xpm ?? "—"}</td>
                    <td className="num text-text-secondary">{m.cs_at_10 ?? "—"}</td>

                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(m.match_tags ?? []).slice(0, 2).map((tag: { tag: string }) => (
                          <Link
                            key={tag.tag}
                            href={`/matches?range=${range}&role=${role}&tag=${tag.tag}`}
                            className="chip hover:text-text-primary transition-colors focus-ring"
                          >
                            {tag.tag}
                          </Link>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
