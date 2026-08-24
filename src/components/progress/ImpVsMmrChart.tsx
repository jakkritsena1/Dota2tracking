"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { WeeklyImpVsMmrRow } from "@/types/database";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Props {
  data: WeeklyImpVsMmrRow[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: WeeklyImpVsMmrRow & { mmr_delta: number } }[] }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="card text-xs space-y-1" style={{ minWidth: 140 }}>
      <p className="text-text-secondary">{format(new Date(d.week_start), "d MMM", { locale: th })}</p>
      <p>IMP: <span className="text-accent-blue font-medium">{d.avg_imp?.toFixed(1)}</span></p>
      <p>MMR change: <span className={d.mmr_delta >= 0 ? "text-win" : "text-loss"}>{d.mmr_delta >= 0 ? "+" : ""}{d.mmr_delta}</span></p>
      <p className="text-text-secondary">{d.games} เกม</p>
    </div>
  );
};

export function ImpVsMmrChart({ data }: Props) {
  if (data.length < 3) {
    return (
      <div className="card">
        <h2 className="section-title">IMP vs MMR</h2>
        <p className="text-text-secondary text-sm mt-4">ต้องการข้อมูลอย่างน้อย 3 สัปดาห์</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    mmr_delta: (d.rank_end ?? 0) - (d.rank_start ?? 0),
  })).filter(d => d.avg_imp != null);

  const avgImp = chartData.reduce((a, d) => a + (d.avg_imp ?? 0), 0) / chartData.length;

  return (
    <div className="card">
      <h2 className="section-title">IMP vs MMR รายสัปดาห์</h2>
      <p className="text-xs text-text-secondary mt-1 mb-4">
        แกน X = Impact เฉลี่ย · แกน Y = MMR เปลี่ยนแปลง (rank tier delta)
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A3B4C" />
            <XAxis
              dataKey="avg_imp"
              type="number"
              name="IMP"
              tick={{ fontSize: 10, fill: "#8899AA" }}
              tickLine={false}
              label={{ value: "Impact", position: "insideBottom", offset: -4, fill: "#8899AA", fontSize: 10 }}
            />
            <YAxis
              dataKey="mmr_delta"
              type="number"
              name="MMR delta"
              tick={{ fontSize: 10, fill: "#8899AA" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={avgImp} stroke="#4C9BE8" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#8899AA" />
            <Scatter
              data={chartData}
              fill="#4C9BE8"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-text-secondary mt-2">
        จุดแต่ละจุด = 1 สัปดาห์ · เส้นแนวตั้ง = IMP เฉลี่ย
      </p>
    </div>
  );
}
