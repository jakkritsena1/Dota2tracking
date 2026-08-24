"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ROLE_COLORS: Record<string, string> = {
  carry:       "#4C9BE8",
  mid:         "#8B5CF6",
  offlane:     "#F59E0B",
  support:     "#45B26B",
  hardsupport: "#EF4444",
};

const ROLE_LABELS: Record<string, string> = {
  carry:       "Carry",
  mid:         "Mid",
  offlane:     "Offlane",
  support:     "Support",
  hardsupport: "Hard Support",
};

interface RolePieChartProps {
  data: Array<{ role: string; count: number }>;
}

export function RolePieChart({ data }: RolePieChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleClick(role: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", role);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        ยังไม่มีข้อมูล
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: ROLE_LABELS[d.role] ?? d.role,
    value: d.count,
    role: d.role,
  }));

  return (
    <section aria-label="สัดส่วนการเล่นแต่ละตำแหน่ง">
      <p className="section-title">ตำแหน่งที่เล่น</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              dataKey="value"
              onClick={(entry) => handleClick(entry.role)}
              cursor="pointer"
              aria-label="กราฟสัดส่วนตำแหน่ง"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.role}
                  fill={ROLE_COLORS[entry.role] ?? "#8B9DB5"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#1E2D3E",
                border: "1px solid #2A3B50",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#F0F4F8",
              }}
              formatter={(value: number, name: string) => [`${value} เกม`, name]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: "#8B9DB5", fontSize: "12px" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Data table for accessibility */}
      <table className="sr-only">
        <caption>สัดส่วนการเล่นแต่ละตำแหน่ง</caption>
        <thead>
          <tr>
            <th scope="col">ตำแหน่ง</th>
            <th scope="col">จำนวนเกม</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((d) => (
            <tr key={d.role}>
              <td>{d.name}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
