"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { rankTierToName } from "@/lib/utils";
import type { MmrSeriesRow } from "@/types/database";

interface MmrChartProps {
  data: MmrSeriesRow[];
}

export function MmrChart({ data }: MmrChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        ยังไม่มีข้อมูล MMR
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: format(new Date(d.start_time), "dd/MM"),
    rankTier: d.rank_tier,
    ma7: Number(d.ma7),
    isWin: d.is_win,
    rankName: rankTierToName(d.rank_tier),
  }));

  const minVal = Math.min(...chartData.map((d) => d.rankTier)) - 1;
  const maxVal = Math.max(...chartData.map((d) => d.rankTier)) + 1;

  // Find rank-up moments (rank tier increased)
  const rankUpPoints = chartData
    .slice(1)
    .filter((d, i) => d.rankTier > chartData[i].rankTier)
    .map((d) => d.date);

  return (
    <section aria-label="กราฟ MMR journey">
      <p className="section-title">MMR Journey</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#999999", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal, maxVal]}
              tick={{ fill: "#999999", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => rankTierToName(v)}
            />
            <Tooltip
              contentStyle={{
                background: "#141414",
                border: "1px solid #262626",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#E6E6E6",
              }}
              formatter={(_: unknown, __: unknown, props: { payload?: { rankName?: string } }) => [
                props.payload?.rankName ?? "—",
                "Rank",
              ]}
            />

            {/* Rank-up vertical reference lines */}
            {rankUpPoints.map((date) => (
              <ReferenceLine
                key={date}
                x={date}
                stroke="#2ACB4F"
                strokeDasharray="4 2"
                strokeOpacity={0.6}
              />
            ))}

            {/* MA7 smooth line */}
            <Line
              type="monotone"
              dataKey="ma7"
              stroke="#4C9BE8"
              strokeWidth={2}
              dot={false}
              name="MA(7)"
              aria-hidden
            />

            {/* Raw rank tier */}
            <Line
              type="stepAfter"
              dataKey="rankTier"
              stroke="#4C9BE8"
              strokeOpacity={0.3}
              strokeWidth={1}
              dot={(props: { cx: number; cy: number; payload: { isWin: boolean } }) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={payload.isWin ? "#2ACB4F" : "#EC041F"}
                    stroke="none"
                  />
                );
              }}
              name="Rank Tier"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible data table */}
      <table className="sr-only">
        <caption>MMR Journey — Rank tier per match</caption>
        <thead>
          <tr>
            <th scope="col">วันที่</th>
            <th scope="col">Rank</th>
            <th scope="col">ผล</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((d, i) => (
            <tr key={i}>
              <td>{d.date}</td>
              <td>{d.rankName}</td>
              <td>{d.isWin ? "ชนะ" : "แพ้"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
