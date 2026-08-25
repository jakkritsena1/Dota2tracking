import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Trophy, Skull, Swords, Coins, Zap, Crosshair } from "lucide-react";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { formatKDA, formatCompact, roleLabel } from "@/lib/utils";
import { getLiveMatchDetail } from "@/lib/stratz-match";
import { StatTile } from "@/components/ui/StatTile";
import { BenchmarkMeter } from "@/components/ui/Meter";
import { Card, CardHeader } from "@/components/ui/Card";
import DraftBans from "@/components/match/DraftBans";
import KillMatrix from "@/components/match/KillMatrix";
import TeamNetWorthChart from "@/components/match/TeamNetWorthChart";
import LaneMatchup from "@/components/match/LaneMatchup";
import SkillBuildTimeline from "@/components/match/SkillBuildTimeline";
import WinProbabilityChart from "@/components/match/WinProbabilityChart";
import ObjectiveTimeline from "@/components/match/ObjectiveTimeline";
import ItemBuildTimeline from "@/components/match/ItemBuildTimeline";
import WardMap from "@/components/match/WardMap";
import MatchScoreline from "@/components/match/MatchScoreline";
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

export default async function MatchOverviewPage({ params }: PageProps) {
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

  const { data: tags } = await db
    .from("match_tags")
    .select("tag, confidence, reason")
    .eq("match_id", matchId)
    .order("confidence", { ascending: false });

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

  const nwpm = (m.raw as { networthPerMinute?: number[] } | null)?.networthPerMinute ?? [];

  const { data: profile } = await db
    .from("profiles")
    .select("steam_account_id")
    .single();

  const liveDetail = await getLiveMatchDetail(matchId);

  const me = liveDetail?.players.find(
    (p) => profile?.steam_account_id && p.steamAccountId === profile.steam_account_id,
  );
  const iWasRadiant = me ? me.isRadiant : liveDetail ? m.is_win === liveDetail.didRadiantWin : true;

  return (
    <div className="space-y-6">
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

      {/* ── Draft + lane matchup ─────────────────────────────── */}
      {liveDetail && (
        <div className="grid gap-6 xl:grid-cols-2">
          <DraftBans pickBans={liveDetail.pickBans} />
          <LaneMatchup players={liveDetail.players} laneOutcomes={liveDetail.laneOutcomes} />
        </div>
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

  const midY = height / 2;
  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = midY - (v / max) * (midY - 4);
    return { x, y };
  });
  const points = coords.map(({ x, y }) => `${x},${y}`);
  const areaPath =
    `M ${coords[0].x},${midY} ` +
    coords.map(({ x, y }) => `L ${x},${y}`).join(" ") +
    ` L ${coords[coords.length - 1].x},${midY} Z`;

  // Find throw moment: was leading by >3000 at min 20, then went negative
  const throwMin = (() => {
    if (data.length < 40) return null;
    if (data[20] < 3000) return null;
    for (let i = 20; i < data.length; i++) {
      if (data[i] < 0) return i;
    }
    return null;
  })();

  const lineColor = throwMin ? "#F59E0B" : "#2ACB4F";
  const gradientId = throwMin ? "personal-nw-throw" : "personal-nw-normal";

  return (
    <div className="scroll-x">
      <svg
        width={width}
        height={height + 20}
        aria-label="กราฟ net worth ตลอดเกม"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <line x1={0} y1={midY} x2={width} y2={midY} stroke="#262626" strokeWidth={1} />

        <path d={areaPath} fill={`url(#${gradientId})`} />

        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={lineColor}
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
