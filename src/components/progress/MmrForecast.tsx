"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { MmrSeriesRow, MmrForecastRow } from "@/types/database";
import { rankTierToName } from "@/lib/utils";

interface Props {
  series: MmrSeriesRow[];
  forecast: MmrForecastRow | null;
}

function buildForecastPoints(series: MmrSeriesRow[], f: MmrForecastRow) {
  if (!f.slope_per_week || !f.estimated_weeks) return [];
  const last = series[series.length - 1];
  const points: { date: string; projected: number; lo: number | null; hi: number | null }[] = [];
  const weeksAhead = Math.min(Math.ceil(f.estimated_weeks) + 1, 8);
  for (let w = 0; w <= weeksAhead; w++) {
    const d = new Date(last.start_time);
    d.setDate(d.getDate() + w * 7);
    const projected = (last.rank_tier ?? 0) + f.slope_per_week * w;
    points.push({
      date: d.toISOString().slice(0, 10),
      projected: Math.round(projected * 10) / 10,
      lo: f.confidence_low != null ? Math.round(f.confidence_low * 10) / 10 : null,
      hi: f.confidence_high != null ? Math.round(f.confidence_high * 10) / 10 : null,
    });
  }
  return points;
}

export function MmrForecast({ series, forecast }: Props) {
  if (series.length < 5) {
    return (
      <div className="card">
        <h2 className="section-title">แนวโน้ม MMR</h2>
        <p className="text-text-secondary text-sm mt-4">ต้องการเกมอย่างน้อย 5 เกมในช่วงนี้</p>
      </div>
    );
  }

  const chartData = series.map(m => ({
    date: m.start_time.slice(0, 10),
    rank_tier: m.rank_tier,
    ma7: m.ma7 ? Math.round(m.ma7 * 10) / 10 : null,
  }));

  const forecastPoints = forecast ? buildForecastPoints(series, forecast) : [];

  const nextRankName = forecast?.next_rank_tier ? rankTierToName(forecast.next_rank_tier) : null;
  const weeksEst = forecast?.estimated_weeks;

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="section-title">แนวโน้ม MMR</h2>
          {forecast && (
            <p className="text-sm text-text-secondary mt-1">
              {forecast.slope_per_week != null && forecast.slope_per_week > 0
                ? `+${forecast.slope_per_week} rank tier / สัปดาห์`
                : forecast.slope_per_week != null
                ? `${forecast.slope_per_week} rank tier / สัปดาห์`
                : "ไม่มีแนวโน้มชัดเจน"}
            </p>
          )}
        </div>
        {weeksEst != null && nextRankName && (
          <div className="text-right">
            <p className="text-xs text-text-secondary">คาดถึง</p>
            <p className="text-sm font-semibold text-accent-teal">{nextRankName}</p>
            <p className="text-xs text-text-secondary">ใน ~{weeksEst} สัปดาห์</p>
          </div>
        )}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
              labelStyle={{ color: "#999999", fontSize: 11 }}
              formatter={(v: number) => [rankTierToName(v), ""]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              dataKey="rank_tier"
              name="Rank tier"
              stroke="#4C9BE8"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              dataKey="ma7"
              name="MA-7"
              stroke="#2ACB4F"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {forecastPoints.length > 1 && (
        <div className="mt-4">
          <p className="text-xs text-text-secondary mb-2">การคาดการณ์ (เส้นประ)</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecastPoints}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
                  labelStyle={{ color: "#999999", fontSize: 11 }}
                />
                <Line
                  dataKey="projected"
                  name="คาดการณ์"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                />
                {forecast?.confidence_low != null && (
                  <ReferenceLine y={forecast.confidence_low} stroke="#4C9BE8" strokeDasharray="3 3" label={{ value: "90% CI", fill: "#999999", fontSize: 10 }} />
                )}
                {forecast?.confidence_high != null && (
                  <ReferenceLine y={forecast.confidence_high} stroke="#4C9BE8" strokeDasharray="3 3" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-[10px] text-text-secondary mt-2">
        คำนวณจาก {forecast?.sample_size ?? 0} เกมล่าสุด · Linear regression บน rank_tier × เวลา
      </p>
    </div>
  );
}
