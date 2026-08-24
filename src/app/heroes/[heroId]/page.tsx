import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { heroIconUrl, heroBannerUrl, HEROES } from "@/lib/hero-data";
import { rankTierToName, formatMatchDate, formatKDA } from "@/lib/utils";
import type { Match, HeroMetaDaily } from "@/types/database";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ heroId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { heroId } = await params;
  const id = Number(heroId);
  const heroName = HEROES[id]?.displayName ?? `Hero ${id}`;
  return {
    title: heroName,
    description: `สถิติ ${heroName}`,
  };
}

export default async function HeroDetailPage({ params }: PageProps) {
  const { heroId } = await params;
  const id = Number(heroId);

  if (isNaN(id) || id <= 0) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  const [
    { data: matchesData },
    { data: metaData },
  ] = await Promise.all([
    db
      .from("matches")
      .select("match_id, start_time, is_win, kills, deaths, assists, gpm, xpm, imp, role, rank_tier")
      .eq("hero_id", id)
      .in("lobby_type", ["RANKED", "ranked"])
      .order("start_time", { ascending: false })
      .limit(50),

    db
      .from("hero_meta_daily")
      .select("win_rate, pick_rate, patch, rank_bracket")
      .eq("hero_id", id)
      .order("captured_on", { ascending: false })
      .limit(5),
  ]);

  const matches = (matchesData as Match[] | null) ?? [];
  if (matches.length === 0) notFound();

  const heroName = HEROES[id]?.displayName ?? `Hero ${id}`;
  const meta = (metaData as Pick<HeroMetaDaily, "win_rate" | "pick_rate" | "patch" | "rank_bracket">[] | null) ?? [];
  const legendMeta = meta.find(m => m.rank_bracket === "legend") ?? meta[0] ?? null;

  const wins = matches.filter(m => m.is_win).length;
  const wr = matches.length > 0 ? wins / matches.length : 0;
  const avgKills = matches.reduce((a, m) => a + (m.kills ?? 0), 0) / matches.length;
  const avgDeaths = matches.reduce((a, m) => a + (m.deaths ?? 0), 0) / matches.length;
  const avgAssists = matches.reduce((a, m) => a + (m.assists ?? 0), 0) / matches.length;
  const avgGpm = matches.reduce((a, m) => a + (m.gpm ?? 0), 0) / matches.length;
  const avgImp = matches.filter(m => m.imp != null).reduce((a, m) => a + (m.imp ?? 0), 0) /
    Math.max(1, matches.filter(m => m.imp != null).length);

  // Learning curve: WR over first 5, next 5, next 10 games
  const curve = [
    { range: "1-5", games: matches.slice(-5) },
    { range: "6-10", games: matches.slice(-10, -5) },
    { range: "11-20", games: matches.slice(-20, -10) },
    { range: "21+", games: matches.slice(0, -20) },
  ]
    .filter(c => c.games.length > 0)
    .map(c => ({
      range: c.range,
      wr: c.games.filter(m => m.is_win).length / c.games.length,
      count: c.games.length,
    }))
    .reverse();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero header */}
      <div className="relative rounded-xl overflow-hidden">
        <Image
          src={heroBannerUrl(id)}
          alt={heroName}
          width={900}
          height={200}
          className="w-full h-32 object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/90 to-transparent" />
        <div className="absolute inset-0 flex items-center gap-4 px-6">
          <Image
            src={heroIconUrl(id)}
            alt={heroName}
            width={56}
            height={56}
            className="rounded-lg border-2 border-border"
          />
          <div>
            <h1 className="text-xl font-bold text-text-primary">{heroName}</h1>
            <p className="text-sm text-text-secondary">{matches.length} เกมในประวัติ</p>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Win Rate", value: `${(wr * 100).toFixed(1)}%`, color: wr >= 0.5 ? "text-win" : "text-loss" },
          { label: "KDA เฉลี่ย", value: formatKDA(avgKills, avgDeaths, avgAssists), color: "text-text-primary" },
          { label: "GPM เฉลี่ย", value: Math.round(avgGpm).toString(), color: "text-text-primary" },
          { label: "IMP เฉลี่ย", value: avgImp.toFixed(1), color: "text-accent-blue" },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-xs text-text-secondary mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Meta data */}
      {legendMeta && (
        <div className="card">
          <h2 className="section-title">Meta (Legend)</h2>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-xs text-text-secondary">Meta WR</p>
              <p className={`text-lg font-bold ${legendMeta.win_rate != null && legendMeta.win_rate > 0.51 ? "text-win" : "text-loss"}`}>
                {legendMeta.win_rate != null ? `${(legendMeta.win_rate * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Pick Rate</p>
              <p className="text-lg font-bold text-text-primary">
                {legendMeta.pick_rate != null ? `${(legendMeta.pick_rate * 100).toFixed(2)}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Patch</p>
              <p className="text-lg font-bold text-text-primary">{legendMeta.patch ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* HE-5: Learning curve */}
      {curve.length > 1 && (
        <div className="card">
          <h2 className="section-title">Learning Curve</h2>
          <p className="text-xs text-text-secondary mt-1 mb-4">Win rate ตามช่วงเกม (เก่า → ใหม่)</p>
          <div className="flex gap-4 items-end h-24">
            {curve.map(c => (
              <div key={c.range} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center">
                  <div
                    className={`w-full rounded-t-sm ${c.wr >= 0.5 ? "bg-win" : "bg-loss"}`}
                    style={{ height: `${Math.max(4, c.wr * 80)}px` }}
                  />
                </div>
                <p className="text-[10px] text-text-secondary">{c.range}</p>
                <p className={`text-xs font-bold ${c.wr >= 0.5 ? "text-win" : "text-loss"}`}>
                  {(c.wr * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent matches */}
      <div className="card">
        <h2 className="section-title">เกมล่าสุด</h2>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="text-xs text-text-secondary border-b border-border">
              <tr>
                <th className="text-left py-2 pr-4">วันที่</th>
                <th className="text-left py-2 pr-4">ผล</th>
                <th className="text-right py-2 pr-4">K/D/A</th>
                <th className="text-right py-2 pr-4">GPM</th>
                <th className="text-right py-2 pr-4">IMP</th>
                <th className="text-right py-2">Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {matches.slice(0, 20).map(m => (
                <tr key={m.match_id} className="hover:bg-bg-hover transition-colors">
                  <td className="py-2 pr-4 text-text-secondary whitespace-nowrap">
                    <Link href={`/match/${m.match_id}`} className="hover:text-accent-blue transition-colors">
                      {formatMatchDate(m.start_time)}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`badge ${m.is_win ? "badge-win" : "badge-loss"}`}>
                      {m.is_win ? "W" : "L"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">
                    {m.kills}/{m.deaths}/{m.assists}
                  </td>
                  <td className="py-2 pr-4 text-right text-text-secondary">{m.gpm ?? "—"}</td>
                  <td className={`py-2 pr-4 text-right font-medium ${m.imp != null && m.imp > 0 ? "text-win" : m.imp != null ? "text-loss" : "text-text-secondary"}`}>
                    {m.imp != null ? m.imp.toFixed(1) : "—"}
                  </td>
                  <td className="py-2 text-right text-text-secondary">
                    {m.rank_tier ? rankTierToName(m.rank_tier) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
