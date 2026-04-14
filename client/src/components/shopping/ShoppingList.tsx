import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCanViewFinancials } from "@/hooks/usePermissions";
import {
  ShoppingCart,
  Printer,
  Download,
  AlertTriangle,
  Package,
  DollarSign,
  Users,
  ChefHat,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShoppingListLine {
  baseIngredientId: number;
  name: string;
  category: string;
  totalQuantity: number;
  purchaseUnit: string;
  // undefined when the server strips it for non-admin roles
  estimatedCost?: number;
  supplier: string | null;
  sku: string | null;
  usedInRecipes: string[];
}

interface ShoppingListData {
  quoteRequestId: number;
  eventSummary: {
    eventType: string;
    eventDate: string | null;
    guestCount: number;
    venueName: string | null;
    menuThemeName: string | null;
    menuTierName: string | null;
  };
  portionMultiplier: number;
  groupedByCategory: Record<string, ShoppingListLine[]>;
  allLines: ShoppingListLine[];
  // Financial rollups — undefined when the server strips them for non-admin roles
  totalEstimatedCost?: number;
  totalLaborCost?: number;
  totalFullyLoadedCost?: number;
  totalLaborHours: number;
  totalLineCount: number;
  unlinkedItems: Array<{ category: string; itemName: string; reason: string }>;
  resolvedRecipes: Array<{
    recipeId: number;
    recipeName: string;
    scaledBy: number;
    laborHoursPerBatch: number;
  }>;
}

// Nice labels for ingredient categories
const CATEGORY_LABELS: Record<string, string> = {
  meat: "Meat & Poultry",
  seafood: "Seafood",
  produce: "Produce",
  dairy: "Dairy & Eggs",
  dry_goods: "Dry Goods & Grains",
  spices: "Spices & Seasonings",
  oils: "Oils & Fats",
  beverages: "Beverages",
  other: "Other",
};

const CATEGORY_ORDER = [
  "meat",
  "seafood",
  "produce",
  "dairy",
  "dry_goods",
  "spices",
  "oils",
  "beverages",
  "other",
];

const CATEGORY_COLORS: Record<string, string> = {
  meat: "bg-red-50 border-red-200",
  seafood: "bg-blue-50 border-blue-200",
  produce: "bg-green-50 border-green-200",
  dairy: "bg-yellow-50 border-yellow-200",
  dry_goods: "bg-amber-50 border-amber-200",
  spices: "bg-orange-50 border-orange-200",
  oils: "bg-lime-50 border-lime-200",
  beverages: "bg-cyan-50 border-cyan-200",
  other: "bg-gray-50 border-gray-200",
};

interface ShoppingListProps {
  /** Quote request ID to generate shopping list from */
  quoteRequestId?: number;
  /** Event ID — will look up originating quote request */
  eventId?: number;
}

export default function ShoppingList({ quoteRequestId, eventId }: ShoppingListProps) {
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const canViewFinancials = useCanViewFinancials();

  const endpoint = quoteRequestId
    ? `/api/quotes/quote-requests/${quoteRequestId}/shopping-list`
    : eventId
      ? `/api/quotes/events/${eventId}/shopping-list`
      : null;

  const queryKey = [endpoint, multiplier];

  const { data, isLoading, error, refetch } = useQuery<ShoppingListData>({
    queryKey,
    queryFn: async () => {
      if (!endpoint) throw new Error("No ID provided");
      const url = multiplier !== null ? `${endpoint}?multiplier=${multiplier}` : endpoint;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || "Failed to load shopping list");
      }
      return res.json();
    },
    enabled: !!endpoint,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to generate shopping list</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  const hasIngredients = data.totalLineCount > 0;
  const hasUnlinked = data.unlinkedItems.length > 0;
  const currentMultiplier = multiplier ?? data.portionMultiplier;

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = canViewFinancials
      ? ["Category", "Ingredient", "Quantity", "Unit", "Estimated Cost", "Supplier", "SKU", "Used In"]
      : ["Category", "Ingredient", "Quantity", "Unit", "Supplier", "SKU", "Used In"];
    const rows = [
      headers,
      ...data.allLines.map((line) => {
        const base = [
          CATEGORY_LABELS[line.category] || line.category,
          line.name,
          line.totalQuantity.toString(),
          line.purchaseUnit,
        ];
        if (canViewFinancials) {
          base.push(line.estimatedCost != null ? line.estimatedCost.toFixed(2) : "");
        }
        base.push(line.supplier || "", line.sku || "", line.usedInRecipes.join(", "));
        return base;
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopping-list-${data.eventSummary.menuThemeName || "event"}-${data.eventSummary.guestCount}guests.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sort categories
  const sortedCategories = Object.keys(data.groupedByCategory).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header summary */}
      <Card className="print:shadow-none print:border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-5 w-5" />
                Shopping List
              </CardTitle>
              <CardDescription className="mt-1">
                {data.eventSummary.menuThemeName || "Event"} —{" "}
                {data.eventSummary.menuTierName || "Custom"} tier for{" "}
                {data.eventSummary.guestCount} guests
                {data.eventSummary.eventDate && (
                  <> • {new Date(data.eventSummary.eventDate).toLocaleDateString()}</>
                )}
                {data.eventSummary.venueName && <> • {data.eventSummary.venueName}</>}
              </CardDescription>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Stats row — ingredients, recipes, portions, labor hours */}
          <div className={cn("grid gap-3 mb-3", canViewFinancials ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Package className="h-3 w-3" /> Ingredients
              </div>
              <div className="text-2xl font-bold">{data.totalLineCount}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <ChefHat className="h-3 w-3" /> Recipes
              </div>
              <div className="text-2xl font-bold">{data.resolvedRecipes.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Users className="h-3 w-3" /> Portions / guest
              </div>
              <div className="text-2xl font-bold">{currentMultiplier.toFixed(1)}x</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-xs text-blue-700 flex items-center gap-1">
                <ChefHat className="h-3 w-3" /> Prep time
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {data.totalLaborHours.toFixed(1)}h
              </div>
            </div>
          </div>

          {/* Cost summary — admin only; chefs don't see dollar rollups */}
          {canViewFinancials && data.totalEstimatedCost != null && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="text-xs text-green-700 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Ingredient Cost
                </div>
                <div className="text-xl font-bold text-green-700">
                  ${data.totalEstimatedCost.toFixed(2)}
                </div>
                <div className="text-[10px] text-green-600 mt-0.5">What Mike buys</div>
              </div>
              {data.totalLaborCost != null && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-blue-700 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Labor Cost
                  </div>
                  <div className="text-xl font-bold text-blue-700">
                    ${data.totalLaborCost.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    {data.totalLaborHours.toFixed(1)} hrs × $35
                  </div>
                </div>
              )}
              {data.totalFullyLoadedCost != null && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="text-xs text-purple-700 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Fully Loaded
                  </div>
                  <div className="text-xl font-bold text-purple-700">
                    ${data.totalFullyLoadedCost.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-purple-600 mt-0.5">Cost to execute</div>
                </div>
              )}
            </div>
          )}

          {/* Portion multiplier slider */}
          <div className="space-y-2 print:hidden">
            <div className="flex items-center justify-between">
              <Label htmlFor="multiplier" className="text-xs text-gray-600">
                Portion multiplier
                <span className="ml-1 text-gray-400 font-normal">
                  (portions per guest per item)
                </span>
              </Label>
              <span className="text-sm font-medium">{currentMultiplier.toFixed(2)}x</span>
            </div>
            <Slider
              id="multiplier"
              min={0.3}
              max={1.5}
              step={0.1}
              value={[currentMultiplier]}
              onValueChange={(v) => setMultiplier(v[0])}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Default: {data.portionMultiplier.toFixed(1)}x (based on service style).
              Adjust higher to overcook, lower to be conservative.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Unlinked items warning */}
      {hasUnlinked && (
        <Alert className="border-amber-200 bg-amber-50 print:hidden">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">
            {data.unlinkedItems.length} item{data.unlinkedItems.length > 1 ? "s" : ""} not yet linked to recipes
          </AlertTitle>
          <AlertDescription className="text-amber-800 space-y-2">
            <p className="text-sm">
              These items have been selected by the customer but don't have a recipe attached, so
              their ingredients aren't in the shopping list below. Link them in the Menu Package Editor
              to include their ingredients automatically.
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {data.unlinkedItems.slice(0, 8).map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-white">
                  {item.itemName}
                </Badge>
              ))}
              {data.unlinkedItems.length > 8 && (
                <Badge variant="outline" className="text-xs bg-white">
                  +{data.unlinkedItems.length - 8} more
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!hasIngredients && (
        <Card className="print:hidden">
          <CardContent className="py-10 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">No shopping list yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              This quote's selected menu items aren't linked to recipes. Once you link them
              in <span className="font-medium">Menus → ⚙️ → Item Catalog</span>, the shopping
              list will populate automatically based on ingredient data and guest count.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Shopping list by category */}
      {hasIngredients &&
        sortedCategories.map((category) => {
          const lines = data.groupedByCategory[category];
          const categoryTotal = canViewFinancials
            ? lines.reduce((sum, l) => sum + (l.estimatedCost ?? 0), 0)
            : null;
          return (
            <Card
              key={category}
              className={cn(
                "print:break-inside-avoid print:shadow-none print:border",
                CATEGORY_COLORS[category] || "",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {CATEGORY_LABELS[category] || category}{" "}
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      ({lines.length} item{lines.length > 1 ? "s" : ""})
                    </span>
                  </CardTitle>
                  {categoryTotal != null && (
                    <span className="text-sm font-semibold text-gray-700">
                      ${categoryTotal.toFixed(2)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {lines.map((line) => (
                    <div
                      key={line.baseIngredientId}
                      className="flex items-start justify-between gap-3 py-2 border-b border-gray-200/60 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{line.name}</span>
                          {line.supplier && (
                            <Badge variant="outline" className="text-xs bg-white/70">
                              {line.supplier}
                            </Badge>
                          )}
                        </div>
                        {line.usedInRecipes.length > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            Used in: {line.usedInRecipes.join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-semibold text-sm">
                          {line.totalQuantity} {line.purchaseUnit}
                          {line.totalQuantity !== 1 && !line.purchaseUnit.endsWith("s") ? "s" : ""}
                        </div>
                        {canViewFinancials && line.estimatedCost != null && (
                          <div className="text-xs text-gray-600">
                            ${line.estimatedCost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

      {/* Resolved recipes (transparency) */}
      {hasIngredients && (
        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Recipes Used
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 text-sm">
              {data.resolvedRecipes.map((r) => (
                <div key={r.recipeId} className="flex justify-between text-gray-700">
                  <span>{r.recipeName}</span>
                  <span className="text-gray-500 text-xs">
                    × {r.scaledBy.toFixed(1)} batches
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
