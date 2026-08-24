"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { rankTierToName } from "@/lib/utils";

interface RolePoint {
  date: string;
  [role: string]: number | string | null;
}

interface Props {
  data: RolePoint[];
  roles: string[];
}

const ROLE_COLORS: Record<string, string> = {
  carry: "#4C9BE8",
  mid: "#F59E0B",
  offlane: "#EC041F",
  support: "#2ACB4F",
  hardsupport: "#A78BFA",
};

export function RoleMmrLines({ data, roles }: Props) {
  if (data.length === 0 || roles.length === 0) {
    return (
      <div className="card">
        <h2 className="section-title">MMR แยกตามบทบาท</h2>
        <p className="text-text-secondary text-sm mt-4">
          ต้องการอย่างน้อย 20 เกมต่อบทบาทเพื่อแสดงกราฟ
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="section-title">MMR แยกตามบทบาท</h2>
      <div className="h-56 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#999999" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: "#999999" }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => rankTierToName(v)}
            />
            <Tooltip
              contentStyle={{ background: "#141414", border: "1px solid #262626", borderRadius: 8 }}
              labelStyle={{ color: "#999999", fontSize: 11 }}
              formatter={(v: number, name: string) => [rankTierToName(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {roles.map(role => (
              <Line
                key={role}
                dataKey={role}
                name={role}
                stroke={ROLE_COLORS[role] ?? "#999999"}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
