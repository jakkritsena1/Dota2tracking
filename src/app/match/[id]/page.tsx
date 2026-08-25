import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trophy, Skull, Clock, Swords, Coins, Zap, Crosshair } from "lucide-react";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import {
  formatMatchDate,
  formatDuration,
  formatKDA,
  formatCompact,
  roleLabel,
  cn,
} from "@/lib/utils";
import { getHeroName, heroIconUrl, heroBannerUrl } from "@/lib/hero-data";
import { getLiveMatchDetail } from "@/lib/stratz-match";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, RankBadge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { BenchmarkMeter } from "@/components/ui/Meter";
import MatchScoreline from "@/components/match/MatchScoreline";
import DraftBans from "@/components/match/DraftBans";
import TeamScoreboard from "@/components/match/TeamScoreboard";
import KillMatrix from "@/components/match/KillMatrix";
import TeamNetWorthChart from "@/components/match/TeamNetWorthChart";
import LaneMatchup from "@/components/match/LaneMatchup";
import SkillBuildTimeline from "@/components/match/SkillBuildTimeline";
import WinProbabilityChart from "@/components/match/WinProbabilityChart";
import ObjectiveTimeline from "@/components/match/ObjectiveTimeline";
import ItemBuildTimeline from "@/components/match/ItemBuildTimeline";
import WardMap from "@/components/match/WardMap";
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

  // Which side was the tracked player on? Prefer the authoritative match on
  // steam account id; fall back to inferring it from who won, which is right
  // whenever the profile hasn't been linked yet.
  const me = liveDetail?.players.find(
    (p) => profile?.steam_account_id && p.steamAccountId === profile.steam_account_id,
  );
  const iWasRadiant = me ? me.isRadiant : liveDetail ? m.is_win === liveDetail.didRadiantWin : true;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors focus-ring rounded"
      >
        <ArrowLeft size={14} aria-hidden />
        กลับรายการแมตช์
      </Link>

      {/* ── Match header ─────────────────────────────────────── */}
      <MatchHero match={m} tags={tags ?? []} />

      {/* ── Team scoreline ───────────────────────────────────── */}
      {liveDetail && (
        <MatchScoreline players={liveDetail.players} didRadiantWin={liveDetail.didRadiantWin} />
      )}

      {/* ── Win probability over time ────────────────────────── */}
      {liveDetail && liveDetail.radiantWinRates.length > 1 && (
        <WinProbabilityChart
          radiantWinRates={liveDetail.radiantWinRates}
          perspectiveIsRadiant={iWasRadiant}
          durationSeconds={liveDetail.durationSeconds}
          outcomeKind={liveDetail.outcomeKind}
        />
      )}

      {/* ── Objectives ───────────────────────────────────────── */}
      {liveDetail && (
        <ObjectiveTimeline
          towerDeaths={liveDetail.towerDeaths}
          firstBloodTime={liveDetail.firstBloodTime}
          durationSeconds={liveDetail.durationSeconds}
        />
      )}

      {/* ── Draft (picks / bans) ────────────────────────────── */}
      {liveDetail && <DraftBans pickBans={liveDetail.pickBans} />}

      {/* ── Lane matchup ─────────────────────────────────────── */}
      {liveDetail && (
        <LaneMatchup players={liveDetail.players} laneOutcomes={liveDetail.laneOutcomes} />
      )}

      {/* ── Full 10-player scoreboard ───────────────────────── */}
      {liveDetail && (
        <TeamScoreboard
          players={liveDetail.players}
          didRadiantWin={liveDetail.didRadiantWin}
          trackedSteamAccountId={profile?.steam_account_id ?? undefined}
        />
      )}

      {/* ── Item purchase order ──────────────────────────────── */}
      {liveDetail && (
        <ItemBuildTimeline
          players={liveDetail.players}
          trackedSteamAccountId={profile?.steam_account_id ?? undefined}
        />
      )}

      {/* ── Skill build order ────────────────────────────────── */}
      {liveDetail && <SkillBuildTimeline players={liveDetail.players} />}

      {/* ── Team net worth / XP graph ────────────────────────── */}
      {liveDetail && liveDetail.radiantNetworthLeads.length > 1 && (
        <TeamNetWorthChart
          radiantNetworthLeads={liveDetail.radiantNetworthLeads}
          radiantExperienceLeads={liveDetail.radiantExperienceLeads}
        />
      )}

      {/* ── Vision ───────────────────────────────────────────── */}
      {liveDetail && <WardMap players={liveDetail.players} />}

      {/* ── Personal stats vs benchmark ──────────────────────── */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="section-title">สถิติของคุณในเกมนี้</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="KDA"
            value={`${m.kills}/${m.deaths}/${m.assists}`}
            sub={`ratio ${formatKDA(m.kills ?? 0, m.deaths ?? 0, m.assists ?? 0)}`}
            icon={<Swords size={12} />}
          />
          <BenchmarkTile label="IMP Score" value={m.imp} bench={benchMap.get("imp")} icon={<Trophy size={12} />} />
          <BenchmarkTile label="GPM" value={m.gpm} bench={benchMap.get("gpm")} icon={<Coins size={12} />} />
          <BenchmarkTile
            label="Deaths"
            value={m.deaths}
            bench={benchMap.get("deaths")}
            higherIsBetter={false}
            icon={<Skull size={12} />}
          />
          <StatTile label="XPM" value={m.xpm ?? "—"} icon={<Zap size={12} />} />
          <StatTile label="Last Hits" value={m.last_hits ?? "—"} sub={`denies ${m.denies ?? 0}`} />
          <BenchmarkTile label="CS @10" value={m.cs_at_10} bench={benchMap.get("cs_at_10")} icon={<Crosshair size={12} />} />
          <StatTile label="Net Worth" value={formatCompact(m.net_worth)} tone="gold" />
          <StatTile label="Hero Dmg" value={formatCompact(m.hero_damage, 0)} />
          <StatTile label="Tower Dmg" value={formatCompact(m.tower_damage, 0)} />
          <StatTile label="Healing" value={formatCompact(m.healing, 0)} />
          <StatTile label="Lane" value={m.lane_outcome ? laneOutcomeLabel(m.lane_outcome) : "—"} sub={roleLabel(m.role)} />
        </div>
      </section>

      {/* ── Personal net worth timeline ──────────────────────── */}
      {nwpm.length > 0 && (
        <Card padded={false}>
          <CardHeader
            title="Net Worth ของคุณตลอดเกม"
            subtitle="เทียบกับค่าเฉลี่ยของทั้งสองทีม — เส้นตกแรง ๆ คือช่วงที่เสียเปรียบ"
          />
          <div className="p-4">
            <NetworthTimeline data={nwpm} />
          </div>
        </Card>
      )}

      {/* ── Kill breakdown grid ──────────────────────────────── */}
      {liveDetail && <KillMatrix players={liveDetail.players} />}

      {/* ── Tag reasons (debug / evidence) ─────────────────── */}
      {(tags ?? []).length > 0 && (
        <section aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className="section-title">หลักฐานแท็ก</h2>
          <div className="space-y-2">
            {(tags ?? []).map((tag: { tag: string; confidence: number; reason: unknown }) => (
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

/**
 * Full-bleed header. The hero's own splash art sits behind the text at low
 * opacity — it identifies the match faster than any label, and it's the one
 * place in the app where a big decorative image earns its bytes.
 */
function MatchHero({
  match: m,
  tags,
}: {
  match: Match;
  tags: { tag: string; confidence: number }[];
}) {
  return (
    <Card padded={false} accent={m.is_win ? "win" : "loss"} className="relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <Image
          src={heroBannerUrl(m.hero_id)}
          alt=""
          fill
          className="object-cover object-top opacity-[0.13]"
          sizes="100vw"
          unoptimized
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #141414 25%, rgba(20,20,20,0.85) 55%, rgba(20,20,20,0.4))",
          }}
        />
      </div>

      <div className="relative flex items-start gap-4 p-4">
        <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-md overflow-hidden bg-bg-secondary ring-hairline">
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
            <h1 className="text-2xl font-bold text-text-primary">{getHeroName(m.hero_id)}</h1>
            <span
              className={cn(
                "text-lg font-extrabold tracking-wide",
                m.is_win ? "text-win" : "text-loss",
              )}
            >
              {m.is_win ? "VICTORY" : "DEFEAT"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <Clock size={13} aria-hidden />
              {formatMatchDate(m.start_time)} · {formatDuration(m.duration_sec)}
            </span>
            <span className="chip">{roleLabel(m.role)}</span>
            {m.rank_tier ? <RankBadge rankTier={m.rank_tier} /> : null}
            <span className="font-mono text-xs text-text-muted">#{m.match_id}</span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <Badge
                  key={tag.tag}
                  tone="neutral"
                  title={`ความมั่นใจ: ${Math.round(tag.confidence * 100)}%`}
                >
                  {tag.tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** StatTile wired to a p25/p50/p75 benchmark, with the meter and verdict. */
function BenchmarkTile({
  label,
  value,
  bench,
  higherIsBetter = true,
  icon,
}: {
  label: string;
  value: number | null;
  bench?: { p25: number; p50: number; p75: number };
  higherIsBetter?: boolean;
  icon?: React.ReactNode;
}) {
  if (value == null) return <StatTile label={label} value="—" icon={icon} />;
  if (!bench) return <StatTile label={label} value={value} icon={icon} />;

  const good = higherIsBetter ? value >= bench.p75 : value <= bench.p25;
  const bad = higherIsBetter ? value < bench.p25 : value > bench.p75;

  return (
    <StatTile
      label={label}
      value={value}
      icon={icon}
      tone={good ? "win" : bad ? "loss" : undefined}
      meter={
        <BenchmarkMeter
          value={value}
          p25={bench.p25}
          p50={bench.p50}
          p75={bench.p75}
          higherIsBetter={higherIsBetter}
          className="my-0.5"
        />
      }
      sub={
        good
          ? `เหนือ p75 (${bench.p75.toFixed(0)})`
          : bad
          ? `ต่ำกว่า p25 (${bench.p25.toFixed(0)})`
          : `ค่ากลางของคุณ ${bench.p50.toFixed(0)}`
      }
    />
  );
}

function laneOutcomeLabel(outcome: "win" | "tie" | "loss"): string {
  return { win: "ชนะเลน", tie: "เสมอ", loss: "แพ้เลน" }[outcome];
}

function NetworthTimeline({ data }: { data: number[] }) {
  const max = Math.max(...data.map(Math.abs), 1);
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
    <div className="scroll-x">
      <svg
        width={width}
        height={height + 20}
        aria-label="กราฟ net worth ตลอดเกม"
        role="img"
      >
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#262626" strokeWidth={1} />

        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={throwMin ? "#F59E0B" : "#2ACB4F"}
          strokeWidth={2}
        />

        {throwMin !== null && (
          <g>
            <line
              x1={(throwMin / (data.length - 1)) * width}
              y1={4}
              x2={(throwMin / (data.length - 1)) * width}
              y2={height - 4}
              stroke="#EC041F"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <text
              x={(throwMin / (data.length - 1)) * width + 3}
              y={14}
              fill="#EC041F"
              fontSize={10}
            >
              Throw ~{throwMin}m
            </text>
          </g>
        )}

        {[10, 20, 30, 40].filter((min) => min < data.length).map((min) => (
          <text
            key={min}
            x={(min / (data.length - 1)) * width}
            y={height + 14}
            fill="#5C5C5C"
            fontSize={10}
            textAnchor="middle"
          >
            {min}m
          </text>
        ))}
      </svg>
    </div>
  );
}
