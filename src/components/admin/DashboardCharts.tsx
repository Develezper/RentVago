"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#e95216", "#ffc300", "#94856b", "#6c6760"];

interface ChartDataItem {
  name: string;
  value: number;
}

export interface DashboardMetrics {
  userData: Array<{ name: string; usuarios: number }>;
  leaseData: ChartDataItem[];
}

interface OriginDataItem {
  name: string;
  value: number;
}

export default function DashboardCharts({
  data,
  originData,
}: {
  data: DashboardMetrics;
  originData: OriginDataItem[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 h-75 animate-pulse bg-white/5 rounded-2xl" />
    );
  }

  const gridStroke = "var(--color-chart-grid)";
  const axisStroke = "var(--color-chart-axis)";
  const barTooltipBg = "var(--color-chart-tooltip-bg)";
  const barTooltipBorder = "var(--color-chart-tooltip-border)";
  const barTooltipColor = "var(--color-chart-tooltip-fg)";
  const pieTooltipBg = "var(--color-chart-pie-tooltip-bg)";
  const pieTooltipBorder = "var(--color-chart-pie-tooltip-border)";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 w-full">
      <div className="admin-chart-surface bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Origen de Propiedades
        </h3>
        <div className="h-75 w-full">
          <ResponsiveContainer width="99%" height={300}>
            <BarChart data={originData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: barTooltipBg,
                  border: `1px solid ${barTooltipBorder}`,
                  borderRadius: "12px",
                }}
                itemStyle={{ color: barTooltipColor, fontSize: "12px" }}
                labelStyle={{ color: barTooltipColor }}
              />
              <Bar dataKey="value" fill="var(--color-green-500)" radius={[6, 6, 0, 0]} barSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-chart-surface bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Estado de Arriendos
        </h3>
        <div className="h-75 w-full">
          <ResponsiveContainer width="99%" height={300}>
            <PieChart>
              <Pie
                data={data.leaseData}
                innerRadius={70}
                outerRadius={95}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {data.leaseData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: pieTooltipBg,
                  border: `1px solid ${pieTooltipBorder}`,
                  borderRadius: "12px",
                  color: barTooltipColor,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
