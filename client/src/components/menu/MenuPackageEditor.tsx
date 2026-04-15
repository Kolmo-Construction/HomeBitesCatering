import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  DollarSign,
  Users,
  Package,
  Save,
  X,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import AIRecipeDraftDialog from "./AIRecipeDraftDialog";

// Controlled price input that keeps its own text buffer while editing.
// Forcing `.toFixed(2)` on every keystroke fights the user's cursor; instead
// we mirror the raw typed string locally and only push parsed cents upward
// when the value is a valid non-negative number. On blur we reformat.
function PriceInput({
  cents,
  onChangeCents,
}: {
  cents: number;
  onChangeCents: (cents: number) => void;
}) {
  const [text, setText] = useState<string>((cents / 100).toFixed(2));

  // Sync when the underlying value changes from outside (e.g. adding a new tier)
  useEffect(() => {
    const parsed = parseFloat(text);
    if (isNaN(parsed) || Math.round(parsed * 100) !== cents) {
      setText((cents / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const parsed = parseFloat(next);
        if (!isNaN(parsed) && parsed >= 0) {
          onChangeCents(Math.round(parsed * 100));
        }
      }}
      onBlur={() => {
        const parsed = parseFloat(text);
        if (isNaN(parsed) || parsed < 0) {
          setText((cents / 100).toFixed(2));
        } else {
          setText(parsed.toFixed(2));
        }
      }}
    />
  );
}

interface MenuPackageTier {
  tierKey: string;
  tierName: string;
  pricePerPersonCents: number;
  description?: string;
  displayOrder: number;
  minGuestCount?: number;
  selectionLimits: Record<string, number>;
  included?: string[];
}

interface MenuCategoryItem {
  id: string;
  name: string;
  description?: string;
  upchargeCents?: number;
  recipeId?: number;
  dietaryTags?: string[];
}

interface MenuData {
  id: number;
  name: string;
  description?: string;
  themeKey?: string;
  displayOnCustomerForm: boolean;
  packages?: MenuPackageTier[];
  categoryItems?: Record<string, MenuCategoryItem[]>;
}

interface MenuPackageEditorProps {
  menuId: number;
  onClose: () => void;
}

export default function MenuPackageEditor({ menuId, onClose }: MenuPackageEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: menu, isLoading } = useQuery<MenuData>({
    queryKey: ["/api/menus", menuId],
    queryFn: async () => {
      const res = await fetch(`/api/menus/${menuId}`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
  });

  // Load available recipes for the dropdown picker
  interface RecipeOption {
    id: number;
    name: string;
    category: string | null;
    ingredientCount?: number;
  }
  const { data: availableRecipes = [] } = useQuery<RecipeOption[]>({
    queryKey: ["/api/ingredients/recipes"],
    queryFn: async () => {
      const res = await fetch("/api/ingredients/recipes");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Phase 3 — load margin analysis from real recipe costs
  interface TierMargin {
    tierKey: string;
    tierName: string;
    pricePerPersonCents: number;
    estimatedFoodCostCents: number;
    foodCostPercent: number;
    marginPerPersonCents: number;
    status: "excellent" | "healthy" | "tight" | "unhealthy";
    linkedItemCount: number;
    unlinkedItemCount: number;
  }
  const { data: marginData = [] } = useQuery<TierMargin[]>({
    queryKey: ["/api/quotes/menus", menuId, "margin"],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/menus/${menuId}/margin`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!menu,
  });

  const [themeKey, setThemeKey] = useState("");
  const [packages, setPackages] = useState<MenuPackageTier[]>([]);
  const [categoryItems, setCategoryItems] = useState<Record<string, MenuCategoryItem[]>>({});
  const [activeTab, setActiveTab] = useState<"packages" | "items">("packages");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // AI recipe draft state
  const [aiDraftFor, setAiDraftFor] = useState<{
    itemIndex: number;
    itemName: string;
    category: string;
  } | null>(null);

  // Load data when menu is fetched
  useEffect(() => {
    if (menu) {
      setThemeKey(menu.themeKey || "");
      setPackages(menu.packages || []);
      setCategoryItems(menu.categoryItems || {});
      // Default to first category
      const cats = Object.keys(menu.categoryItems || {});
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
      }
    }
  }, [menu]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        themeKey: themeKey || null,
        packages,
        categoryItems,
      };
      const res = await apiRequest("PATCH", `/api/menus/${menuId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", menuId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/menus/public"] });
      toast({
        title: "Saved",
        description: "Menu packages and items updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ========== Package tier management ==========
  const addPackage = () => {
    const newTier: MenuPackageTier = {
      tierKey: `tier_${Date.now()}`,
      tierName: "New Tier",
      pricePerPersonCents: 3000,
      description: "",
      displayOrder: packages.length + 1,
      selectionLimits: {},
    };
    setPackages([...packages, newTier]);
  };

  const updatePackage = (index: number, updates: Partial<MenuPackageTier>) => {
    const next = [...packages];
    next[index] = { ...next[index], ...updates };
    setPackages(next);
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updateSelectionLimit = (pkgIndex: number, category: string, limit: number) => {
    const next = [...packages];
    if (limit <= 0) {
      const { [category]: _, ...rest } = next[pkgIndex].selectionLimits;
      next[pkgIndex] = { ...next[pkgIndex], selectionLimits: rest };
    } else {
      next[pkgIndex] = {
        ...next[pkgIndex],
        selectionLimits: { ...next[pkgIndex].selectionLimits, [category]: limit },
      };
    }
    setPackages(next);
  };

  // ========== Category item management ==========
  const addCategory = () => {
    const name = prompt("Category name (e.g., protein, side, salad):");
    if (!name) return;
    const key = name.toLowerCase().replace(/\s+/g, "_");
    if (categoryItems[key]) {
      toast({ title: "Category exists", variant: "destructive" });
      return;
    }
    setCategoryItems({ ...categoryItems, [key]: [] });
    setSelectedCategory(key);
  };

  const removeCategory = (category: string) => {
    if (!confirm(`Remove category "${category}" and all its items?`)) return;
    const { [category]: _, ...rest } = categoryItems;
    setCategoryItems(rest);
    if (selectedCategory === category) {
      const remaining = Object.keys(rest);
      setSelectedCategory(remaining[0] || "");
    }
  };

  const addItem = (category: string) => {
    const newItem: MenuCategoryItem = {
      id: `item_${Date.now()}`,
      name: "New Item",
      upchargeCents: 0,
    };
    setCategoryItems({
      ...categoryItems,
      [category]: [...(categoryItems[category] || []), newItem],
    });
  };

  const updateItem = (category: string, index: number, updates: Partial<MenuCategoryItem>) => {
    const items = [...(categoryItems[category] || [])];
    items[index] = { ...items[index], ...updates };
    setCategoryItems({ ...categoryItems, [category]: items });
  };

  const removeItem = (category: string, index: number) => {
    const items = (categoryItems[category] || []).filter((_, i) => i !== index);
    setCategoryItems({ ...categoryItems, [category]: items });
  };

  const availableCategories = useMemo(
    () => Object.keys(categoryItems).sort(),
    [categoryItems],
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quote Form Packages
            {menu && <span className="text-gray-500 font-normal">— {menu.name}</span>}
          </DialogTitle>
          <DialogDescription>
            Manage tiers (Bronze/Silver/Gold/Diamond) and the items customers can select per category.
            Changes here update the public quote form immediately.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Theme Key */}
            <div className="flex items-center gap-4 py-3 px-1 border-y">
              <Label htmlFor="theme-key" className="text-sm font-medium">
                Theme Key (URL slug):
              </Label>
              <Input
                id="theme-key"
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="e.g., taco_fiesta, bbq, italy"
                className="max-w-xs"
              />
              <span className="text-xs text-gray-500">
                Required for this menu to appear on the quote form.
              </span>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="self-start">
                <TabsTrigger value="packages">
                  Tiers ({packages.length})
                </TabsTrigger>
                <TabsTrigger value="items">
                  Item Catalog ({Object.values(categoryItems).reduce((sum, items) => sum + items.length, 0)})
                </TabsTrigger>
              </TabsList>

              {/* =================== PACKAGES TAB =================== */}
              <TabsContent value="packages" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    {packages
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((pkg, idx) => {
                        const margin = marginData.find((m) => m.tierKey === pkg.tierKey);
                        const statusColors: Record<string, string> = {
                          excellent: "text-green-700 bg-green-50 border-green-200",
                          healthy: "text-emerald-700 bg-emerald-50 border-emerald-200",
                          tight: "text-amber-700 bg-amber-50 border-amber-200",
                          unhealthy: "text-red-700 bg-red-50 border-red-200",
                        };
                        return (
                        <Card key={pkg.tierKey}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                              <Input
                                value={pkg.tierName}
                                onChange={(e) =>
                                  updatePackage(idx, { tierName: e.target.value })
                                }
                                className="font-semibold text-lg max-w-xs"
                              />
                              <div className="flex items-center gap-2">
                                {margin && margin.linkedItemCount > 0 && (
                                  <div
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${statusColors[margin.status]}`}
                                    title={`Food cost: $${(margin.estimatedFoodCostCents / 100).toFixed(2)}/person (${margin.linkedItemCount} items linked to recipes, ${margin.unlinkedItemCount} not linked)`}
                                  >
                                    {margin.status === "unhealthy" ? (
                                      <AlertTriangle className="h-3 w-3" />
                                    ) : (
                                      <TrendingUp className="h-3 w-3" />
                                    )}
                                    <span>
                                      Food cost: {margin.foodCostPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePackage(idx)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs text-gray-500">Tier Key</Label>
                                <Input
                                  value={pkg.tierKey}
                                  onChange={(e) =>
                                    updatePackage(idx, { tierKey: e.target.value })
                                  }
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Price / Person
                                </Label>
                                <PriceInput
                                  cents={pkg.pricePerPersonCents}
                                  onChangeCents={(cents) =>
                                    updatePackage(idx, { pricePerPersonCents: cents })
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Min Guests (optional)
                                </Label>
                                <Input
                                  type="number"
                                  value={pkg.minGuestCount || ""}
                                  onChange={(e) =>
                                    updatePackage(idx, {
                                      minGuestCount: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    })
                                  }
                                  placeholder="None"
                                />
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs text-gray-500">Description</Label>
                              <Input
                                value={pkg.description || ""}
                                onChange={(e) =>
                                  updatePackage(idx, { description: e.target.value })
                                }
                                placeholder="e.g., 3 proteins, 2 sides, 3 salsas"
                              />
                            </div>

                            {/* Selection limits per category */}
                            <div>
                              <Label className="text-xs text-gray-500 mb-2 block">
                                Selection Limits (how many items a customer can pick per category)
                              </Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {availableCategories.map((cat) => (
                                  <div key={cat} className="flex items-center gap-2">
                                    <span className="text-sm capitalize min-w-[80px]">{cat}:</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={pkg.selectionLimits[cat] || ""}
                                      onChange={(e) =>
                                        updateSelectionLimit(
                                          idx,
                                          cat,
                                          parseInt(e.target.value || "0"),
                                        )
                                      }
                                      className="w-20"
                                      placeholder="0"
                                    />
                                  </div>
                                ))}
                              </div>
                              {availableCategories.length === 0 && (
                                <p className="text-xs text-amber-600">
                                  Add categories in the "Item Catalog" tab first.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}

                    <Button
                      variant="outline"
                      onClick={addPackage}
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* =================== ITEMS TAB =================== */}
              <TabsContent value="items" className="flex-1 overflow-hidden mt-4">
                <div className="flex gap-4 h-[50vh]">
                  {/* Category sidebar */}
                  <div className="w-48 flex flex-col gap-1 overflow-y-auto">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                          selectedCategory === cat
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <span className="capitalize truncate">{cat}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {categoryItems[cat]?.length || 0}
                        </Badge>
                      </button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addCategory}
                      className="justify-start text-gray-500 mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add category
                    </Button>
                  </div>

                  <Separator orientation="vertical" />

                  {/* Items list */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {selectedCategory ? (
                      <>
                        <div className="flex items-center justify-between pb-3">
                          <h3 className="font-semibold capitalize">{selectedCategory}</h3>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => addItem(selectedCategory)}>
                              <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCategory(selectedCategory)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="flex-1 pr-4">
                          <div className="space-y-2">
                            {(categoryItems[selectedCategory] || []).map((item, idx) => (
                              <div
                                key={item.id}
                                className="p-3 rounded-lg border bg-white space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={item.name}
                                    onChange={(e) =>
                                      updateItem(selectedCategory, idx, { name: e.target.value })
                                    }
                                    placeholder="Item name"
                                    className="flex-1"
                                  />
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-500">+$</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={((item.upchargeCents || 0) / 100).toFixed(2)}
                                      onChange={(e) =>
                                        updateItem(selectedCategory, idx, {
                                          upchargeCents: Math.round(
                                            parseFloat(e.target.value || "0") * 100,
                                          ),
                                        })
                                      }
                                      className="w-20 text-sm"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(selectedCategory, idx)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                {/* Recipe picker — links this menu item to an actual recipe
                                    for shopping list and margin calculation */}
                                <div className="flex items-center gap-2 pl-1">
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    Recipe:
                                  </span>
                                  <Select
                                    value={item.recipeId ? item.recipeId.toString() : "none"}
                                    onValueChange={(v) =>
                                      updateItem(selectedCategory, idx, {
                                        recipeId: v === "none" ? undefined : parseInt(v),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs flex-1">
                                      <SelectValue placeholder="Not linked (no ingredients)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        <span className="text-gray-500">Not linked</span>
                                      </SelectItem>
                                      {availableRecipes.map((r) => (
                                        <SelectItem key={r.id} value={r.id.toString()}>
                                          {r.name}
                                          {r.category && (
                                            <span className="text-gray-400 ml-2 text-xs">
                                              {r.category}
                                            </span>
                                          )}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {item.recipeId && (
                                    <Badge variant="secondary" className="text-xs">
                                      Linked
                                    </Badge>
                                  )}
                                  {!item.recipeId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setAiDraftFor({
                                          itemIndex: idx,
                                          itemName: item.name,
                                          category: selectedCategory,
                                        })
                                      }
                                      className="h-8 px-2 text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 hover:from-purple-200 hover:to-blue-200"
                                      title="Generate recipe with AI"
                                    >
                                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                                      Generate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {(categoryItems[selectedCategory] || []).length === 0 && (
                              <p className="text-sm text-gray-500 text-center py-8">
                                No items yet. Click "Add Item" to create one.
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        {availableCategories.length === 0
                          ? "No categories yet. Click 'Add category' to start."
                          : "Select a category"}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* AI Recipe Draft Dialog — generates a recipe with AI and links it back to the menu item */}
      {aiDraftFor && (
        <AIRecipeDraftDialog
          open={!!aiDraftFor}
          onOpenChange={(open) => !open && setAiDraftFor(null)}
          itemName={aiDraftFor.itemName}
          category={aiDraftFor.category}
          menuTheme={themeKey || undefined}
          menuThemeName={menu?.name}
          onRecipeCreated={(recipeId) => {
            // Auto-link the newly created recipe to the menu item
            if (aiDraftFor) {
              updateItem(aiDraftFor.category, aiDraftFor.itemIndex, { recipeId });
            }
            setAiDraftFor(null);
            toast({
              title: "Recipe linked",
              description: "The AI-drafted recipe is now linked to this menu item. Don't forget to save the menu.",
            });
          }}
        />
      )}
    </Dialog>
  );
}
