/**
 * Tier 2, Item 7: Stale Deals / Time-in-Stage Alert Widget
 *
 * Shows opportunities and quotes that have been sitting in a stage too long.
 * Configurable thresholds per stage.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";

// Configurable thresholds: max days in each stage before flagging
const STAGE_THRESHOLDS: Record<string, number> = {
  new: 5,
  contacted: 7,
  qualified: 5,
  proposal: 10,
  // Quotes
  draft: 3,
  sent: 5,
  viewed: 3,
};

interface StaleItem {
  id: number;
  name: string;
  status: string;
  daysInStage: number;
  threshold: number;
  type: "opportunity" | "quote";
  href: string;
  severity: "warning" | "critical"; // warning = over threshold, critical = 2x threshold
}

export default function StaleDealsAlert() {
  const { data: opportunities = [] } = useQuery<any[]>({
    queryKey: ["/api/opportunities"],
  });
  const { data: quotes = [] } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const staleItems = useMemo(() => {
    const items: StaleItem[] = [];
    const now = Date.now();

    // Check opportunities
    for (const opp of opportunities) {
      if (opp.status === "archived" || opp.status === "booked" || opp.status === "lost") continue;
      const threshold = STAGE_THRESHOLDS[opp.status];
      if (!threshold) continue;

      const ref = opp.statusChangedAt || opp.updatedAt;
      const days = Math.floor((now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
      if (days >= threshold) {
        items.push({
          id: opp.id,
          name: `${opp.firstName} ${opp.lastName}`,
          status: opp.status,
          daysInStage: days,
          threshold,
          type: "opportunity",
          href: `/opportunities/${opp.id}`,
          severity: days >= threshold * 2 ? "critical" : "warning",
        });
      }
    }

    // Check quotes
    for (const est of quotes) {
      if (est.status === "accepted" || est.status === "declined") continue;
      const threshold = STAGE_THRESHOLDS[est.status];
      if (!threshold) continue;

      const ref = est.sentAt || est.updatedAt || est.createdAt;
      const days = Math.floor((now - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
      if (days >= threshold) {
        items.push({
          id: est.id,
          name: `Quote #${est.id}`,
          status: est.status,
          daysInStage: days,
          threshold,
          type: "quote",
          href: `/quotes/${est.id}/view`,
          severity: days >= threshold * 2 ? "critical" : "warning",
        });
      }
    }

    // Sort: critical first, then by days descending
    items.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
      return b.daysInStage - a.daysInStage;
    });

    return items;
  }, [opportunities, quotes]);

  const criticalCount = staleItems.filter((i) => i.severity === "critical").length;

  return (
    <Card className={cn(
      staleItems.length > 0 && "border-amber-200",
      criticalCount > 0 && "border-red-200"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", criticalCount > 0 ? "text-red-500" : "text-amber-500")} />
            Deals Needing Attention
          </span>
          {staleItems.length > 0 && (
            <Badge variant="secondary" className={cn(
              criticalCount > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
            )}>
              {staleItems.length}
            </Badge>
          )}
        </CardTitle>
        {staleItems.length === 0 && (
          <CardDescription>All deals are moving through the pipeline on schedule.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {staleItems.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">No stale deals</div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {staleItems.slice(0, 10).map((item) => (
              <Link key={`${item.type}-${item.id}`} href={item.href}>
                <div className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition",
                  item.severity === "critical" ? "border-red-200 bg-red-50/50" : "border-amber-100"
                )}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                        {item.status}
                      </Badge>
                      <span className="capitalize">{item.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      item.severity === "critical" ? "text-red-600" : "text-amber-600"
                    )}>
                      <Clock className="h-3 w-3" />
                      {item.daysInStage}d
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300" />
                  </div>
                </div>
              </Link>
            ))}
            {staleItems.length > 10 && (
              <div className="text-xs text-center text-gray-500 pt-1">
                + {staleItems.length - 10} more stale deals
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
