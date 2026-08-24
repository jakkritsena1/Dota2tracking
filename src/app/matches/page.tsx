import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { parseRange, parseRole, rangeToStartDate, formatMatchDate, formatDuration, formatKDA } from "@/lib/utils";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { RangeSelector } from "@/components/shared/RangeSelector";
import { InsufficientData } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Matches</h1>
        <RangeSelector currentRange={range} currentRole={role} />
      </div>

      {activeTag && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>กรองด้วยแท็ก: <strong className="text-text-primary">{activeTag}</strong></span>
          <Link
            href={`/matches?range=${range}&role=${role}`}
            className="text-accent-blue hover:underline text-xs"
          >
            ล้าง
          </Link>
        </div>
      )}

      {filtered.length < 10 ? (
        <InsufficientData games={filtered.length} minimum={10} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="scroll-x">
            <table className="w-full text-sm">
              <caption className="sr-only">รายการแมตช์</caption>
              <thead>
                <tr className="border-b border-border">
                  {["ฮีโร่", "ผล / เวลา", "K/D/A", "IMP", "GPM", "XPM", "CS@10", "แท็ก"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 text-left text-text-muted text-xs font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.match_id}
                    className="border-b border-border/40 hover:bg-bg-hover transition-colors"
                  >
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
                        <div>
                          <Link
                            href={`/match/${m.match_id}`}
                            className="text-text-primary hover:text-accent-blue font-medium focus-ring block"
                          >
                            {getHeroName(m.hero_id)}
                          </Link>
                          <span className="text-text-muted text-xs capitalize">
                            {m.role ?? "—"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={m.is_win ? "badge-win" : "badge-loss"}>
                        <span aria-hidden>{m.is_win ? "▲" : "▼"}</span>
                        {m.is_win ? "ชนะ" : "แพ้"}
                      </span>
                      <span className="block text-text-muted text-xs mt-0.5">
                        {formatMatchDate(m.start_time)} · {formatDuration(m.duration_sec)}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-text-primary">
                      {m.kills}/{m.deaths}/{m.assists}
                      <span className="block text-text-muted text-xs">
                        {formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={cn(
                        "font-medium",
                        m.imp !== null && m.imp >= 50 ? "text-win" :
                        m.imp !== null && m.imp <= 10 ? "text-loss" : "text-text-primary"
                      )}>
                        {m.imp ?? "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-text-secondary">{m.gpm ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.xpm ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.cs_at_10 ?? "—"}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(m.match_tags ?? []).slice(0, 2).map((tag: { tag: string }) => (
                          <Link
                            key={tag.tag}
                            href={`/matches?range=${range}&role=${role}&tag=${tag.tag}`}
                            className="px-1.5 py-0.5 rounded text-xs bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors focus-ring"
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
        </div>
      )}
    </div>
  );
}
