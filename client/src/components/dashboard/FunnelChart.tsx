/**
 * Tier 2, Item 6: Conversion Funnel Dashboard Widget
 *
 * Visual funnel showing stage counts, conversion rates, and key metrics.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Clock, ArrowRight } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface ConversionRate {
  from: string | null;
  to: string;
  rate: number;
}

interface FunnelData {
  stages: FunnelStage[];
  conversionRates: ConversionRate[];
  avgDaysToClose: number;
  thisMonth: { opportunities: number; revenue: number };
  lastMonth: { opportunities: number; revenue: number };
}

export default function FunnelChart() {
  const { data, isLoading } = useQuery<FunnelData>({
    queryKey: ["/api/reports/funnel"],
    queryFn: async () => {
      const res = await fetch("/api/reports/funnel");
      if (!res.ok) throw new Error("Failed to fetch funnel data");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Sales Funnel</CardTitle></CardHeader>
        <CardContent><div className="h-48 animate-pulse bg-gray-100 rounded" /></CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.stages.map((s) => s.count), 1);
  const revenueChange = data.lastMonth.revenue > 0
    ? Math.round(((data.thisMonth.revenue - data.lastMonth.revenue) / data.lastMonth.revenue) * 100)
    : 0;
  const oppChange = data.lastMonth.opportunities > 0
    ? Math.round(((data.thisMonth.opportunities - data.lastMonth.opportunities) / data.lastMonth.opportunities) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sales Funnel</CardTitle>
        <CardDescription>
          Stage-by-stage conversion from leads to booked events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Funnel bars */}
        <div className="space-y-2 mb-6">
          {data.stages.map((stage, i) => {
            const widthPct = Math.max((stage.count / maxCount) * 100, 8);
            const rate = data.conversionRates[i];
            return (
              <div key={stage.name} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 text-right shrink-0">{stage.name}</div>
                <div className="flex-1 relative">
                  <div
                    className="h-7 rounded-r-md flex items-center px-2 transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: stage.color,
                      minWidth: "32px",
                    }}
                  >
                    <span className="text-xs font-bold text-white">{stage.count}</span>
                  </div>
                </div>
                <div className="w-14 text-xs text-right shrink-0">
                  {rate.from && (
                    <span className={cn(
                      "font-medium",
                      rate.rate >= 50 ? "text-green-600" : rate.rate >= 25 ? "text-amber-600" : "text-red-500"
                    )}>
                      {rate.rate}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Avg Days to Close</div>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-lg font-bold">{data.avgDaysToClose}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">New Opps (MoM)</div>
            <div className="flex items-center justify-center gap-1">
              {oppChange >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              <span className="text-lg font-bold">{data.thisMonth.opportunities}</span>
              <span className={cn("text-xs", oppChange >= 0 ? "text-green-600" : "text-red-500")}>
                {oppChange >= 0 ? "+" : ""}{oppChange}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">Revenue (MoM)</div>
            <div className="flex items-center justify-center gap-1">
              {revenueChange >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              <span className="text-lg font-bold">${(data.thisMonth.revenue / 100).toLocaleString()}</span>
              {data.lastMonth.revenue > 0 && (
                <span className={cn("text-xs", revenueChange >= 0 ? "text-green-600" : "text-red-500")}>
                  {revenueChange >= 0 ? "+" : ""}{revenueChange}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
