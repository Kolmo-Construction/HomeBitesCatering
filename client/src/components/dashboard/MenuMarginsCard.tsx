import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";
import MenuMarginDetailDialog from "./MenuMarginDetailDialog";

type TierStatus = "excellent" | "healthy" | "tight" | "unhealthy";

interface TierMarginAnalysis {
  tierKey: string;
  tierName: string;
  pricePerPersonCents: number;
  estimatedFoodCostCents: number;
  foodCostPercent: number;
  marginPerPersonCents: number;
  status: TierStatus;
  linkedItemCount: number;
  unlinkedItemCount: number;
}

interface MenuMarginSummary {
  menuId: number;
  menuName: string;
  tiers: TierMarginAnalysis[];
}

const statusStyles: Record<TierStatus, string> = {
  excellent: "bg-green-100 text-green-800 border-green-200",
  healthy: "bg-emerald-100 text-emerald-800 border-emerald-200",
  tight: "bg-amber-100 text-amber-800 border-amber-200",
  unhealthy: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<TierStatus, string> = {
  excellent: "Excellent",
  healthy: "Healthy",
  tight: "Tight",
  unhealthy: "Unhealthy",
};

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MenuMarginsCard() {
  const { data, isLoading, error } = useQuery<MenuMarginSummary[]>({
    queryKey: ["/api/quotes/menus/margins"],
  });

  const [detailTarget, setDetailTarget] = useState<{
    menuId: number;
    tierKey: string;
  } | null>(null);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#8B7355]" />
            <h2 className="font-poppins text-lg font-semibold text-neutral-900">
              Menu Margins
            </h2>
          </div>
          <span className="text-xs text-neutral-500">
            Food + labor cost per tier
          </span>
        </div>

        {isLoading && (
          <div className="text-sm text-neutral-500 py-4">Calculating margins…</div>
        )}

        {error && (
          <div className="text-sm text-red-600 py-4">
            Failed to load margin data.
          </div>
        )}

        {data && data.length === 0 && (
          <div className="text-sm text-neutral-500 py-4">
            No menus found. Create a menu to see margin analysis.
          </div>
        )}

        {data && data.length > 0 && (
          <div className="space-y-5">
            {data.map((menu) => (
              <div key={menu.menuId}>
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/menus/${menu.menuId}`}>
                    <span className="font-semibold text-neutral-900 hover:text-[#8B7355] cursor-pointer">
                      {menu.menuName}
                    </span>
                  </Link>
                  {menu.tiers.length === 0 && (
                    <span className="text-xs text-neutral-400">No tiers</span>
                  )}
                </div>

                {menu.tiers.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
                          <th className="py-2 pr-3 font-medium">Tier</th>
                          <th className="py-2 pr-3 font-medium text-right">Price/pp</th>
                          <th className="py-2 pr-3 font-medium text-right">Cost/pp</th>
                          <th className="py-2 pr-3 font-medium text-right">Margin/pp</th>
                          <th className="py-2 pr-3 font-medium text-right">Cost %</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 pl-3 font-medium">Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {menu.tiers.map((tier) => {
                          const hasUnlinked = tier.unlinkedItemCount > 0;
                          return (
                            <tr
                              key={tier.tierKey}
                              onClick={() =>
                                setDetailTarget({
                                  menuId: menu.menuId,
                                  tierKey: tier.tierKey,
                                })
                              }
                              className="border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50 transition-colors"
                              title="Click to see cost breakdown"
                            >
                              <td className="py-2 pr-3 text-neutral-800 underline decoration-dotted decoration-neutral-400 underline-offset-4">
                                {tier.tierName}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                                {formatDollars(tier.pricePerPersonCents)}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums text-neutral-600">
                                {formatDollars(tier.estimatedFoodCostCents)}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums font-semibold text-neutral-900">
                                {formatDollars(tier.marginPerPersonCents)}
                              </td>
                              <td className="py-2 pr-3 text-right tabular-nums text-neutral-600">
                                {tier.foodCostPercent.toFixed(0)}%
                              </td>
                              <td className="py-2 pr-3">
                                <Badge
                                  variant="outline"
                                  className={statusStyles[tier.status]}
                                >
                                  {statusLabels[tier.status]}
                                </Badge>
                              </td>
                              <td className="py-2 pl-3 text-xs text-neutral-600">
                                <div className="flex items-center gap-1">
                                  <span>
                                    {tier.linkedItemCount} linked
                                  </span>
                                  {hasUnlinked && (
                                    <span
                                      className="flex items-center gap-0.5 text-amber-600"
                                      title={`${tier.unlinkedItemCount} item(s) not linked to a recipe — treated as $0 cost`}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      {tier.unlinkedItemCount}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <MenuMarginDetailDialog
        menuId={detailTarget?.menuId ?? null}
        tierKey={detailTarget?.tierKey ?? null}
        open={detailTarget != null}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
      />
    </Card>
  );
}
