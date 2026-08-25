import type { Metadata } from "next";
import { getServerSupabaseForUser } from "@/lib/supabase/server-user";
import { parseRole } from "@/lib/utils";
import { RangeSelector } from "@/components/shared/RangeSelector";
import { PoolScatter } from "@/components/heroes/PoolScatter";
import { HeroRecommendations } from "@/components/heroes/HeroRecommendations";
import { HeroTable } from "@/components/heroes/HeroTable";
import { PatchImpact } from "@/components/heroes/PatchImpact";
import type { HeroPoolWithMetaRow, HeroMetaDaily } from "@/types/database";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Heroes",
  description: "Hero pool analysis and recommendations",
};

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function HeroesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const role = parseRole(params.role ?? null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getServerSupabaseForUser() as any;

  const [
    { data: poolData },
    { data: prevMetaData },
  ] = await Promise.all([
    // HE-1/2/3/4: hero pool with latest meta
    db.rpc("get_hero_pool_with_meta", {
      p_role: role === "all" ? null : role,
      p_rank_bracket: "legend",
    }),

    // HE-3: previous day meta for patch impact
    db
      .from("hero_meta_daily")
      .select("hero_id, win_rate")
      .eq("rank_bracket", "legend")
      .eq("captured_on", new Date(Date.now() - 86400_000).toISOString().slice(0, 10)),
  ]);

  const pool = (poolData as HeroPoolWithMetaRow[] | null) ?? [];
  const prevMeta = ((prevMetaData as Pick<HeroMetaDaily, "hero_id" | "win_rate">[] | null) ?? [])
    .reduce<Record<number, number>>((acc, h) => {
      if (h.win_rate != null) acc[h.hero_id] = h.win_rate;
      return acc;
    }, {});

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="ฮีโร่"
        title="Hero Pool"
        description="ฝีมือของคุณกับแต่ละฮีโร่ เทียบกับเมต้าปัจจุบัน"
        actions={<RangeSelector currentRange="all" currentRole={role} showRange={false} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* HE-1: 4-quadrant scatter — a real chart, needs the room */}
        <div className="xl:col-span-2">
          <PoolScatter data={pool} />
        </div>

        {/* HE-2: Recommendations — a short ranked list, fits the rail */}
        <HeroRecommendations pool={pool} />
      </div>

      {/* HE-3: Patch impact */}
      <PatchImpact heroes={pool} previousMeta={prevMeta} />

      {/* HE-4: Full table */}
      <HeroTable heroes={pool} />
    </div>
  );
}
