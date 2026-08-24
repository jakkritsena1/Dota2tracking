import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trophy, Skull, Clock, Swords } from "lucide-react";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { formatMatchDate, formatDuration, formatKDA, rankTierToName, cn } from "@/lib/utils";
import { getHeroName, heroIconUrl } from "@/lib/hero-data";
import { getLiveMatchDetail } from "@/lib/stratz-match";
import MatchScoreline from "@/components/match/MatchScoreline";
import DraftBans from "@/components/match/DraftBans";
import TeamScoreboard from "@/components/match/TeamScoreboard";
import KillMatrix from "@/components/match/KillMatrix";
import type { Match } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Match #${id}` };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  const { data: match } = await db
    .from("matches")
    .select("*")
    .eq("match_id", matchId)
    .single();

  if (!match) notFound();

  const m = match as Match;

  // Fetch tags for this match
  const { data: tags } = await db
    .from("match_tags")
    .select("tag, confidence, reason")
    .eq("match_id", matchId)
    .order("confidence", { ascending: false });

  // Personal benchmarks for comparison (most recent, this match's role)
  const { data: benchmarks } = await db
    .from("player_benchmarks")
    .select("metric, p25, p50, p75")
    .eq("role", m.role ?? "all")
    .order("captured_on", { ascending: false })
    .limit(10);

  const benchMap = new Map<string, { p25: number; p50: number; p75: number }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (benchmarks ?? []).map((b: any) => [b.metric, { p25: b.p25!, p50: b.p50!, p75: b.p75! }])
  );

  // Net worth timeline from raw payload
  const nwpm = (m.raw as { networthPerMinute?: number[] } | null)?.networthPerMinute ?? [];

  // Current user's steam account id, to highlight "you" in the full scoreboard
  const { data: profile } = await db
    .from("profiles")
    .select("steam_account_id")
    .single();

  // Full 10-player detail (draft, items, kill events) fetched live from STRATZ —
  // never stored, so this degrades to the simpler view above if it's unavailable.
  const liveDetail = await getLiveMatchDetail(matchId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors focus-ring"
      >
        <ArrowLeft size={14} aria-hidden />
        กลับรายการแมตช์
      </Link>

      {/* ── MD-1: Match header ──────────────────────────────── */}
      <header className="card">
        <div className="flex items-start gap-4">
          {/* Hero image */}
          <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-bg-secondary">
            <Image
              src={heroIconUrl(m.hero_id)}
              alt={getHeroName(m.hero_id)}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">
                {getHeroName(m.hero_id)}
              </h1>
              <span
                className={cn(
                  "text-lg font-bold",
                  m.is_win ? "text-win" : "text-loss"
                )}
                aria-label={m.is_win ? "ชนะ" : "แพ้"}
              >
                {m.is_win ? "VICTORY" : "DEFEAT"}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mt-2 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Clock size={13} aria-hidden />
                {formatMatchDate(m.start_time)} · {formatDuration(m.duration_sec)}
              </span>
              <span className="capitalize">{m.role ?? "—"}</span>
              {m.rank_tier && (
                <span>{rankTierToName(m.rank_tier)}</span>
              )}
              <span className="font-mono text-text-primary">
                Match #{m.match_id}
              </span>
            </div>

            {/* Tags */}
            {(tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(tags ?? []).map((tag) => (
                  <span
                    key={tag.tag}
                    className="px-2 py-0.5 rounded-md text-xs bg-bg-secondary text-text-secondary border border-border"
                    title={`ความมั่นใจ: ${Math.round(tag.confidence * 100)}%`}
                  >
                    {tag.tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Team scoreline ───────────────────────────────────── */}
      {liveDetail && (
        <MatchScoreline players={liveDetail.players} didRadiantWin={liveDetail.didRadiantWin} />
      )}

      {/* ── Draft (picks / bans) ────────────────────────────── */}
      {liveDetail && <DraftBans pickBans={liveDetail.pickBans} />}

      {/* ── Full 10-player scoreboard ───────────────────────── */}
      {liveDetail && (
        <TeamScoreboard
          players={liveDetail.players}
          didRadiantWin={liveDetail.didRadiantWin}
          trackedSteamAccountId={profile?.steam_account_id ?? undefined}
        />
      )}

      {/* ── MD-4: Stats vs benchmark ──────────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="section-title">สถิติเกมนี้</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="KDA"
            value={`${m.kills}/${m.deaths}/${m.assists}`}
            sub={formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}
            icon={<Swords size={14} aria-hidden />}
          />
          <StatCard
            label="IMP Score"
            value={m.imp ?? "—"}
            benchmark={benchMap.get("imp")}
            higherIsBetter
            icon={<Trophy size={14} aria-hidden />}
          />
          <StatCard
            label="GPM"
            value={m.gpm ?? "—"}
            benchmark={benchMap.get("gpm")}
            higherIsBetter
          />
          <StatCard
            label="Deaths"
            value={m.deaths ?? "—"}
            benchmark={benchMap.get("deaths")}
            higherIsBetter={false}
            icon={<Skull size={14} aria-hidden />}
          />
          <StatCard label="XPM"        value={m.xpm ?? "—"} />
          <StatCard label="Last Hits"  value={m.last_hits ?? "—"} />
          <StatCard label="Denies"     value={m.denies ?? "—"} />
          <StatCard label="CS @10"     value={m.cs_at_10 ?? "—"} benchmark={benchMap.get("cs_at_10")} higherIsBetter />
          <StatCard label="Net Worth"  value={m.net_worth ? `${(m.net_worth / 1000).toFixed(1)}k` : "—"} />
          <StatCard label="Hero Dmg"   value={m.hero_damage ? `${Math.round(m.hero_damage / 1000)}k` : "—"} />
          <StatCard label="Tower Dmg"  value={m.tower_damage ? `${Math.round(m.tower_damage / 1000)}k` : "—"} />
          <StatCard label="Healing"    value={m.healing ? `${Math.round(m.healing / 1000)}k` : "—"} />
        </div>
      </section>

      {/* ── MD-2: Net worth timeline ─────────────────────────── */}
      {nwpm.length > 0 && (
        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="section-title">Net Worth Timeline</h2>
          <NetworthTimeline data={nwpm} />
        </section>
      )}

      {/* ── Kill breakdown grid ──────────────────────────────── */}
      {liveDetail && <KillMatrix players={liveDetail.players} />}

      {/* ── Tag reasons (debug / evidence) ─────────────────── */}
      {(tags ?? []).length > 0 && (
        <section aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className="section-title">หลักฐานแท็ก</h2>
          <div className="space-y-2">
            {(tags ?? []).map((tag) => (
              <details key={tag.tag} className="card text-sm">
                <summary className="cursor-pointer text-text-primary font-medium select-none">
                  {tag.tag}
                  <span className="text-text-muted font-normal ml-2">
                    (ความมั่นใจ {Math.round(tag.confidence * 100)}%)
                  </span>
                </summary>
                <pre className="mt-2 text-xs text-text-secondary overflow-auto">
                  {JSON.stringify(tag.reason, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  benchmark?: { p25: number; p50: number; p75: number };
  higherIsBetter?: boolean;
  icon?: React.ReactNode;
}

function StatCard({ label, value, sub, benchmark, higherIsBetter = true, icon }: StatCardProps) {
  let valueColor = "text-text-primary";
  let percentileLabel: string | null = null;

  if (benchmark && typeof value === "number") {
    if (higherIsBetter) {
      if (value >= benchmark.p75) {
        valueColor = "text-win";
        percentileLabel = "> p75";
      } else if (value < benchmark.p25) {
        valueColor = "text-loss";
        percentileLabel = "< p25";
      }
    } else {
      if (value <= benchmark.p25) {
        valueColor = "text-win";
        percentileLabel = "< p25 ✓";
      } else if (value >= benchmark.p75) {
        valueColor = "text-loss";
        percentileLabel = "> p75";
      }
    }
  }

  return (
    <div className="card space-y-1">
      <p className="text-text-muted text-xs flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={cn("text-xl font-bold", valueColor)}>{String(value)}</p>
      {sub && <p className="text-text-muted text-xs">{sub}</p>}
      {percentileLabel && (
        <p className={cn("text-xs font-medium", valueColor)}>{percentileLabel}</p>
      )}
      {benchmark && (
        <p className="text-text-muted text-xs">
          p50: {benchmark.p50.toFixed(0)}
        </p>
      )}
    </div>
  );
}

function NetworthTimeline({ data }: { data: number[] }) {
  const max = Math.max(...data.map(Math.abs));
  const height = 80;
  const width = Math.max(data.length * 4, 200);

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height / 2 - (v / max) * (height / 2 - 4);
    return `${x},${y}`;
  });

  // Find throw moment: was leading by >3000 at min 20, then went negative
  const throwMin = (() => {
    if (data.length < 40) return null;
    if (data[20] < 3000) return null;
    for (let i = 20; i < data.length; i++) {
      if (data[i] < 0) return i;
    }
    return null;
  })();

  return (
    <div className="card overflow-hidden">
      <div className="scroll-x">
        <svg
          width={width}
          height={height + 20}
          aria-label="กราฟ net worth ตลอดเกม"
          role="img"
        >
          {/* Zero line */}
          <line
            x1={0} y1={height / 2}
            x2={width} y2={height / 2}
            stroke="#2A3B50" strokeWidth={1}
          />

          {/* Positive area (our favour) */}
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke={throwMin ? "#F59E0B" : "#45B26B"}
            strokeWidth={2}
          />

          {/* Throw moment marker */}
          {throwMin !== null && (
            <g>
              <line
                x1={(throwMin / (data.length - 1)) * width}
                y1={4}
                x2={(throwMin / (data.length - 1)) * width}
                y2={height - 4}
                stroke="#EF4444"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <text
                x={(throwMin / (data.length - 1)) * width + 3}
                y={14}
                fill="#EF4444"
                fontSize={10}
              >
                Throw ~{throwMin}m
              </text>
            </g>
          )}

          {/* Minute labels */}
          {[10, 20, 30, 40].filter((m) => m < data.length).map((min) => (
            <text
              key={min}
              x={(min / (data.length - 1)) * width}
              y={height + 14}
              fill="#566D87"
              fontSize={10}
              textAnchor="middle"
            >
              {min}m
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
