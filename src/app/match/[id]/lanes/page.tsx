import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { getLiveMatchDetail } from "@/lib/stratz-match";
import LaneDetail from "@/components/match/LaneDetail";
import { EmptyState } from "@/components/shared/EmptyState";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Match #${id} · Lanes` };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchLanesPage({ params }: PageProps) {
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

  const liveDetail = await getLiveMatchDetail(matchId);

  if (!liveDetail) {
    return (
      <EmptyState
        title="ไม่มีข้อมูลเลน"
        description="ต้องใช้ข้อมูลแบบละเอียดจาก STRATZ ซึ่งอาจไม่พร้อมใช้งานสำหรับแมตช์นี้"
      />
    );
  }

  return (
    <LaneDetail players={liveDetail.players} laneOutcomes={liveDetail.laneOutcomes} />
  );
}
