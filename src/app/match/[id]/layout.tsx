import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import MatchHero from "@/components/match/MatchHero";
import MatchTabs from "@/components/match/MatchTabs";
import WinConfetti from "@/components/match/WinConfetti";
import type { Match } from "@/types/database";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function MatchDetailLayout({ children, params }: LayoutProps) {
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

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors focus-ring rounded"
      >
        <ArrowLeft size={14} aria-hidden />
        กลับรายการแมตช์
      </Link>

      {m.is_win && <WinConfetti />}

      <MatchHero match={m} tags={tags ?? []} />

      <MatchTabs matchId={matchId} />

      {children}
    </div>
  );
}
