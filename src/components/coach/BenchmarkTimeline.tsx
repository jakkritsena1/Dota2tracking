"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { Benchmark } from "@/types/database";

interface TimelinePoint {
  date: string;
  my_gpm: number | null;
  my_xpm: number | null;
  p50_gpm: number | null;
  p50_xpm: number | null;
}

interface Props {
  data: TimelinePoint[];
  benchmarks: Benchmark[];
}

export function BenchmarkTimeline({ data, benchmarks }: Props) {
  const latestGpm = benchmarks.find(b => b.metric === "gpm");
  const latestXpm = benchmarks.find(b => b.metric === "xpm");

  if (data.length < 3) {
    return (
      <div className="card">
        <h2 className="section-title">เทียบกับ Bracket เฉลี่ย</h2>
        <p className="text-text-secondary text-sm mt-4">
          ต้องการข้อมูลอย่างน้อย 3 จุดเพื่อแสดงกราฟ
        </p>
        {latestGpm && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-bg-hover text-center">
              <p className="text-xs text-text-secondary">Bracket p50 GPM</p>
              <p className="text-xl font-bold text-accent-blue">{latestGpm.p50}</p>
            </div>
            {latestXpm && (
              <div className="p-3 rounded-lg bg-bg-hover text-center">
                <p className="text-xs text-text-secondary">Bracket p50 XPM</p>
                <p className="text-xl font-bold text-accent-blue">{latestXpm.p50}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">เทียบกับ Bracket เฉลี่ย (GPM)</h2>
      <div className="h-56 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
              labelStyle={{ color: "#999999", fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              dataKey="my_gpm"
              name="GPM ของฉัน"
              stroke="#4C9BE8"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="p50_gpm"
              name="Bracket p50"
              stroke="#999999"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              connectNulls
            />
            {latestGpm?.p25 != null && (
              <ReferenceLine
                y={latestGpm.p25}
                stroke="#EC041F"
                strokeDasharray="3 3"
                label={{ value: "p25", fill: "#EC041F", fontSize: 9 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-text-secondary mt-2">
        เส้นประ = Median bracket ปัจจุบัน · เส้นแดง = p25 (ต่ำกว่านี้คือปัญหา)
      </p>
    </div>
  );
}
