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

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 w-full">
      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
          Origen de Propiedades
        </h3>
        <div className="h-75 w-full">
          <ResponsiveContainer width="99%" height={300}>
            <BarChart data={originData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#fff", fontSize: "12px" }}
              />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
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
                  backgroundColor: "#000",
                  border: "1px solid #333",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
