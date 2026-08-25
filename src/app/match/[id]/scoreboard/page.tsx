import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { getLiveMatchDetail } from "@/lib/stratz-match";
import TeamScoreboard from "@/components/match/TeamScoreboard";
import { EmptyState } from "@/components/shared/EmptyState";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Match #${id} · Scoreboard` };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchScoreboardPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (isNaN(matchId)) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  const { data: match } = await db
    .from("matches")
    .select("match_id")
    .eq("match_id", matchId)
    .single();

  if (!match) notFound();

  const { data: profile } = await db
    .from("profiles")
    .select("steam_account_id")
    .single();

  const liveDetail = await getLiveMatchDetail(matchId);

  if (!liveDetail) {
    return (
      <EmptyState
        title="ไม่มีข้อมูล scoreboard"
        description="ต้องใช้ข้อมูลแบบละเอียดจาก STRATZ ซึ่งอาจไม่พร้อมใช้งานสำหรับแมตช์นี้"
      />
    );
  }

  return (
    <TeamScoreboard
      players={liveDetail.players}
      didRadiantWin={liveDetail.didRadiantWin}
      trackedSteamAccountId={profile?.steam_account_id ?? undefined}
    />
  );
}
