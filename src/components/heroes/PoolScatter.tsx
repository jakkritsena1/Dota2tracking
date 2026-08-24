"use client";

import { useRouter } from "next/navigation";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import type { HeroPoolWithMetaRow } from "@/types/database";
import { HEROES } from "@/lib/hero-data";

interface Props {
  data: HeroPoolWithMetaRow[];
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { payload: HeroPoolWithMetaRow & { heroName: string } }[];
}) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="card text-xs space-y-1" style={{ minWidth: 160 }}>
      <p className="font-medium text-text-primary">{d.heroName}</p>
      <p>Player WR: <span className={d.player_wr >= 0.5 ? "text-win" : "text-loss"}>{(d.player_wr * 100).toFixed(1)}%</span></p>
      {d.meta_wr != null && <p>Meta WR: <span className="text-accent-blue">{(d.meta_wr * 100).toFixed(1)}%</span></p>}
      <p className="text-text-secondary">{d.games} เกม · {d.role}</p>
    </div>
  );
};

function dotColor(d: HeroPoolWithMetaRow): string {
  const goodPlayer = d.player_wr >= 0.5;
  const goodMeta = (d.meta_wr ?? 0.5) >= 0.51;
  if (goodPlayer && goodMeta) return "#2ACB4F"; // green: strong + meta
  if (goodPlayer && !goodMeta) return "#4C9BE8"; // blue: strong, meta weak
  if (!goodPlayer && goodMeta) return "#F59E0B"; // yellow: meta ok, you struggle
  return "#EC041F"; // red: avoid
}

export function PoolScatter({ data }: Props) {
  const router = useRouter();

  const chartData = data.map(d => ({
    ...d,
    heroName: HEROES[d.hero_id]?.displayName ?? `Hero ${d.hero_id}`,
    player_wr_pct: d.player_wr * 100,
    meta_wr_pct: (d.meta_wr ?? 0.5) * 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">Hero Pool Map</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูลฮีโร่</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">Hero Pool Map</h2>
      <p className="text-xs text-text-secondary mt-1 mb-4">
        แกน X = Win rate ของฉัน · แกน Y = Meta win rate · ขนาดจุด = จำนวนเกม
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="player_wr_pct"
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#999999" }}
              tickLine={false}
              label={{ value: "Player WR %", position: "insideBottom", offset: -8, fill: "#999999", fontSize: 10 }}
            />
            <YAxis
              dataKey="meta_wr_pct"
              type="number"
              domain={[40, 60]}
              tick={{ fontSize: 10, fill: "#999999" }}
              tickLine={false}
              axisLine={false}
              width={36}
              label={{ value: "Meta WR %", angle: -90, position: "insideLeft", fill: "#999999", fontSize: 10 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={50} stroke="#999999" strokeDasharray="3 3" />
            <ReferenceLine y={51} stroke="#999999" strokeDasharray="3 3" />
            <Scatter
              data={chartData}
              onClick={(d: HeroPoolWithMetaRow) => router.push(`/heroes/${d.hero_id}`)}
              cursor="pointer"
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={dotColor(d)} fillOpacity={0.85} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-win inline-block" />เล่นดี + เมต้าดี</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent-blue inline-block" />เล่นดี แต่เมต้าอ่อน</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent-yellow inline-block" />เมต้าดี แต่ยังไม่ถนัด</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-loss inline-block" />หลีกเลี่ยง</div>
      </div>
    </div>
  );
}
