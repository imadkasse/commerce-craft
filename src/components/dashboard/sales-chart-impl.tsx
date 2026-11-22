"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SalesChartImplProps {
  data: Array<{ date: string; revenue: string | number }>;
}

export default function SalesChartImpl({ data }: SalesChartImplProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    revenue: Number(d.revenue),
  }));

  if (chartData.length === 0) {
    chartData.push({ date: "No data", revenue: 0 });
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sales Over Time (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(value) => [`$${(Number(value) || 0).toFixed(2)}`, "Revenue"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: "#6366f1", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
