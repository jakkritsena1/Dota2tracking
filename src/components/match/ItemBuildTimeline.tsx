"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { HeroAvatar } from "@/components/ui/HeroAvatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getItemName, itemIconUrl, ITEMS } from "@/lib/item-data";
import { getHeroName } from "@/lib/hero-data";
import { cn, formatClock } from "@/lib/utils";
import type { LiveMatchPlayer } from "@/lib/stratz-match";

// Regs, wards, TPs and stat-sticks are bought continuously all game; leaving
// them in makes every build look identical and pushes the actual item
// progression off the right edge. They stay one click away rather than being
// dropped outright, because support ward timings are genuinely worth reading.
const CONSUMABLE_IDS = new Set([
  16,  // Iron Branch
  38,  // Clarity
  39,  // Healing Salve
  40,  // Dust
  41,  // Bottle
  42,  // Observer Ward
  43,  // Sentry Ward
  44,  // Tango
  46,  // Town Portal Scroll
  188, // Smoke of Deceit
  216, // Enchanted Mango
  217, // Recipe: Ward Dispenser
  218, // Ward Dispenser
  237, // Faerie Fire
  241, // Tango (shared)
  257, // Tome of Knowledge
  299, // Greater Faerie Fire
  1123, // Blood Grenade
]);

function isConsumable(itemId: number): boolean {
  if (CONSUMABLE_IDS.has(itemId)) return true;
  // Recipes are a purchase step, not an item — they'd double-count every
  // upgrade that already shows up as its finished component.
  return ITEMS[itemId]?.shortName.startsWith("recipe_") ?? false;
}

type Filter = "core" | "all";

export default function ItemBuildTimeline({
  players,
  trackedSteamAccountId,
}: {
  players: LiveMatchPlayer[];
  trackedSteamAccountId?: number;
}) {
  const [filter, setFilter] = useState<Filter>("core");

  const rows = useMemo(() => {
    const ordered = [
      ...players.filter((p) => p.isRadiant),
      ...players.filter((p) => !p.isRadiant),
    ];
    return ordered.map((p) => ({
      player: p,
      purchases: [...p.itemPurchases]
        .filter((i) => i.itemId > 0 && (filter === "all" || !isConsumable(i.itemId)))
        .sort((a, b) => a.time - b.time),
    }));
  }, [players, filter]);

  const hasAny = rows.some((r) => r.purchases.length > 0);
  if (!hasAny) return null;

  return (
    <Card padded={false}>
      <CardHeader
        title="ลำดับการซื้อของ"
        subtitle="เรียงตามเวลาที่ซื้อจริง — ดูว่าไอเทมชิ้นสำคัญมาถึงช้าหรือเร็วกว่าคู่แข่ง"
        icon={<ShoppingBag size={14} />}
        action={
          <SegmentedControl
            ariaLabel="ตัวกรองไอเทม"
            value={filter}
            onChange={setFilter}
            segments={[
              { value: "core", label: "ไอเทมหลัก" },
              { value: "all", label: "ทั้งหมด" },
            ]}
          />
        }
      />

      <ul className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        {rows.map(({ player, purchases }) => {
          const isTracked =
            trackedSteamAccountId != null && player.steamAccountId === trackedSteamAccountId;
          return (
            <li
              key={player.steamAccountId || player.heroId}
              className={cn(
                "flex items-start gap-3 px-4 py-3",
                isTracked && "bg-accent-teal-dim/40",
              )}
            >
              <div className="flex items-center gap-2 w-32 shrink-0 pt-0.5">
                <HeroAvatar
                  heroId={player.heroId}
                  size="sm"
                  ring={player.isRadiant ? "radiant" : "dire"}
                />
                <span className="text-xs text-text-secondary truncate">
                  {getHeroName(player.heroId)}
                </span>
              </div>

              {purchases.length === 0 ? (
                <p className="text-xs text-text-muted pt-2">ไม่มีข้อมูลการซื้อ</p>
              ) : (
                <div className="scroll-x flex-1 min-w-0">
                  <ol className="flex items-start gap-1.5 pb-1">
                    {purchases.map((purchase, i) => {
                      const icon = itemIconUrl(purchase.itemId);
                      return (
                        <li key={`${purchase.itemId}-${purchase.time}-${i}`} className="shrink-0">
                          <Tooltip
                            content={
                              <>
                                <span className="block text-text-primary font-semibold">
                                  {getItemName(purchase.itemId)}
                                </span>
                                <span className="block">ซื้อเมื่อ {formatClock(purchase.time)}</span>
                              </>
                            }
                          >
                            <span className="flex flex-col items-center gap-0.5">
                              <span className="relative block h-7 w-9 rounded-sm overflow-hidden bg-bg-secondary ring-hairline">
                                {icon ? (
                                  <Image
                                    src={icon}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="36px"
                                    unoptimized
                                  />
                                ) : null}
                              </span>
                              <span className="text-[0.5625rem] font-mono tabular-nums text-text-muted leading-none">
                                {formatClock(purchase.time)}
                              </span>
                            </span>
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
