"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import type { RadarScoreRow } from "@/types/database";

interface Props {
  scores: RadarScoreRow[];
}

const AXIS_LABELS: Record<string, string> = {
  laning: "Laning",
  farming: "Farming",
  teamfight: "Teamfight",
  objective: "Objective",
  vision: "Vision",
  survival: "Survival",
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: RadarScoreRow }[] }) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="card text-xs space-y-1" style={{ minWidth: 140 }}>
      <p className="font-medium">{AXIS_LABELS[d.axis] ?? d.axis}</p>
      <p>คะแนน: <span className="text-accent-blue font-bold">{d.score}/100</span></p>
      {d.my_avg != null && <p>ค่าเฉลี่ยของฉัน: {d.my_avg}</p>}
      {d.p50_value != null && <p>Median bracket: {d.p50_value}</p>}
      {d.sample_size > 0 && <p className="text-text-secondary">{d.sample_size} เกม</p>}
    </div>
  );
};

export function RadarAxes({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">ทักษะทั้ง 6 ด้าน</h2>
        <p className="text-text-secondary text-sm mt-4">ยังไม่มีข้อมูลเพียงพอ</p>
      </div>
    );
  }

  const data = scores.map(s => ({
    ...s,
    axis: AXIS_LABELS[s.axis] ?? s.axis,
    fullMark: 100,
  }));

  return (
    <div className="card">
      <h2 className="section-title">ทักษะทั้ง 6 ด้าน</h2>
      <div className="h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
            <PolarGrid stroke="#2A3B4C" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 11, fill: "#8899AA" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#8899AA" }}
              axisLine={false}
            />
            <Radar
              dataKey="score"
              stroke="#4C9BE8"
              fill="#4C9BE8"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Axis breakdown table */}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-secondary border-b border-border">
              <th className="text-left py-1.5 pr-4 font-medium">ด้าน</th>
              <th className="text-right py-1.5 pr-4 font-medium">คะแนน</th>
              <th className="text-right py-1.5 pr-4 font-medium">ของฉัน</th>
              <th className="text-right py-1.5 font-medium">Median</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {scores.map(s => (
              <tr key={s.axis}>
                <td className="py-1.5 pr-4 text-text-primary">{AXIS_LABELS[s.axis] ?? s.axis}</td>
                <td className={`py-1.5 pr-4 text-right font-bold ${s.score >= 60 ? "text-win" : s.score >= 40 ? "text-text-primary" : "text-loss"}`}>
                  {s.score}
                </td>
                <td className="py-1.5 pr-4 text-right text-text-secondary">{s.my_avg ?? "—"}</td>
                <td className="py-1.5 text-right text-text-secondary">{s.p50_value ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
