"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SalesChartProps {
  data: Array<{ date: string; revenue: string | number }>;
}

const SalesChartImpl = dynamic(() => import("./sales-chart-impl"), {
  ssr: false,
  loading: () => (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sales Over Time (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
          Loading chart…
        </div>
      </CardContent>
    </Card>
  ),
});

export function SalesChart({ data }: SalesChartProps) {
  return <SalesChartImpl data={data} />;
}
