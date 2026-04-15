import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Utensils } from "lucide-react";

type TierStatus = "excellent" | "healthy" | "tight" | "unhealthy";

interface MarginItemDetail {
  itemId: string;
  itemName: string;
  recipeId: number | null;
  linked: boolean;
  ingredientCostCents: number | null;
  laborCostCents: number | null;
  laborHours: number | null;
  totalCostCents: number | null;
  yieldAmount: number | null;
  yieldUnit: string | null;
  upchargeCents: number;
}

interface MarginCategoryDetail {
  category: string;
  selectionLimit: number;
  itemCount: number;
  linkedCount: number;
  unlinkedCount: number;
  averageItemCostCents: number;
  contributionCents: number;
  items: MarginItemDetail[];
}

interface TierMarginDetail {
  menuId: number;
  menuName: string;
  laborRateCentsPerHour: number;
  tierKey: string;
  tierName: string;
  pricePerPersonCents: number;
  estimatedFoodCostCents: number;
  foodCostPercent: number;
  marginPerPersonCents: number;
  status: TierStatus;
  linkedItemCount: number;
  unlinkedItemCount: number;
  categories: MarginCategoryDetail[];
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

const statusExplanation: Record<TierStatus, string> = {
  excellent: "Food + labor cost is ≤ 25% of the tier price — strong margin.",
  healthy: "Food + labor cost is 26–32% of the tier price — typical catering range.",
  tight: "Food + labor cost is 33–40% of the tier price — margin is tight, review pricing.",
  unhealthy: "Food + labor cost is > 40% of the tier price — losing money or near break-even.",
};

function formatDollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toFixed(2)}`;
}

interface Props {
  menuId: number | null;
  tierKey: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MenuMarginDetailDialog({
  menuId,
  tierKey,
  open,
  onOpenChange,
}: Props) {
  const enabled = open && menuId != null && tierKey != null;

  const { data, isLoading, error } = useQuery<TierMarginDetail>({
    queryKey: [`/api/quotes/menus/${menuId}/margin/${tierKey}`],
    enabled,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {data ? `${data.menuName} — ${data.tierName}` : "Margin details"}
          </DialogTitle>
          <DialogDescription>
            Full cost breakdown: ingredients + labor per item, averaged by category selection.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="text-sm text-neutral-500 py-8 text-center">
            Loading breakdown…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 py-8 text-center">
            Failed to load breakdown.
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Tier summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryTile label="Price / person" value={formatDollars(data.pricePerPersonCents)} />
              <SummaryTile label="Cost / person" value={formatDollars(data.estimatedFoodCostCents)} />
              <SummaryTile
                label="Margin / person"
                value={formatDollars(data.marginPerPersonCents)}
                valueClass={data.marginPerPersonCents < 0 ? "text-red-700" : "text-neutral-900"}
              />
              <SummaryTile label="Cost %" value={`${data.foodCostPercent.toFixed(1)}%`} />
            </div>

            {/* Status explanation */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={statusStyles[data.status]}>
                  {statusLabels[data.status]}
                </Badge>
                <span className="text-xs text-neutral-500">
                  Labor costed at ${(data.laborRateCentsPerHour / 100).toFixed(0)}/hr
                </span>
              </div>
              <p className="text-sm text-neutral-700">{statusExplanation[data.status]}</p>
              {data.unlinkedItemCount > 0 && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.unlinkedItemCount} item(s) in this tier are not linked to a recipe and
                  are counted as $0 cost — real margin is likely lower than shown.
                </p>
              )}
            </div>

            {/* Category breakdown */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
                Cost by selection category
              </h3>
              {data.categories.length === 0 && (
                <p className="text-sm text-neutral-500">
                  This tier has no selection categories defined.
                </p>
              )}
              {data.categories.map((cat) => (
                <CategorySection key={cat.category} category={cat} />
              ))}
            </div>

            {/* How it's calculated */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
              <p className="font-semibold mb-1">How this is calculated</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  For each category, we average the per-serving cost of all <em>linked</em> items
                  and multiply by the number the tier allows a guest to pick.
                </li>
                <li>
                  Per-item cost = ingredient cost (purchase price × recipe quantity, yield-adjusted)
                  + labor cost (recipe labor hours × ${(data.laborRateCentsPerHour / 100).toFixed(0)}/hr),
                  divided by the recipe yield.
                </li>
                <li>
                  Unlinked items contribute $0 to the average — link them to a recipe for an
                  accurate number.
                </li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  valueClass = "text-neutral-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold tabular-nums mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}

function CategorySection({ category }: { category: MarginCategoryDetail }) {
  return (
    <div className="rounded-lg border border-neutral-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-neutral-500" />
          <span className="font-semibold text-neutral-900 capitalize">
            {category.category}
          </span>
          <span className="text-xs text-neutral-500">
            (guest picks {category.selectionLimit} of {category.itemCount})
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-600 mt-2 md:mt-0">
          <span>
            Avg item:{" "}
            <strong className="tabular-nums text-neutral-900">
              {formatDollars(category.averageItemCostCents)}
            </strong>
          </span>
          <span>
            Contributes:{" "}
            <strong className="tabular-nums text-neutral-900">
              {formatDollars(category.contributionCents)}
            </strong>
          </span>
          {category.unlinkedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {category.unlinkedCount} unlinked
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
              <th className="py-2 px-4 font-medium">Item</th>
              <th className="py-2 px-4 font-medium text-right">Ingredient</th>
              <th className="py-2 px-4 font-medium text-right">Labor</th>
              <th className="py-2 px-4 font-medium text-right">Total / serving</th>
              <th className="py-2 px-4 font-medium">Yield</th>
            </tr>
          </thead>
          <tbody>
            {category.items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 px-4 text-xs text-neutral-400 italic">
                  No items in this category
                </td>
              </tr>
            )}
            {category.items.map((item) => (
              <tr
                key={item.itemId}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="py-2 px-4">
                  <div className="font-medium text-neutral-800">{item.itemName}</div>
                  {!item.linked && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Not linked to a recipe
                    </div>
                  )}
                </td>
                <td className="py-2 px-4 text-right tabular-nums text-neutral-600">
                  {formatDollars(item.ingredientCostCents)}
                </td>
                <td className="py-2 px-4 text-right tabular-nums text-neutral-600">
                  {item.linked && item.laborHours != null ? (
                    <div className="flex items-center justify-end gap-1">
                      {formatDollars(item.laborCostCents)}
                      <span
                        className="text-xs text-neutral-400"
                        title={`${item.laborHours}h @ recipe labor rate`}
                      >
                        <Clock className="h-3 w-3 inline" />
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 px-4 text-right tabular-nums font-semibold text-neutral-900">
                  {formatDollars(item.totalCostCents)}
                </td>
                <td className="py-2 px-4 text-xs text-neutral-500">
                  {item.yieldAmount != null
                    ? `${item.yieldAmount} ${item.yieldUnit ?? "serving"}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
