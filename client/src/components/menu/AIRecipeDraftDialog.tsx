import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChefHat,
  ListOrdered,
  ShieldAlert,
  DollarSign,
  ChevronsUpDown,
  Check,
} from "lucide-react";

// ============================================================================
// Searchable ingredient combobox
// ============================================================================

interface BaseIngredientOption {
  id: number;
  name: string;
  category: string;
  purchaseUnit: string;
}

interface IngredientComboboxProps {
  ingredients: BaseIngredientOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  placeholder?: string;
}

/**
 * Searchable combobox for picking a base ingredient.
 * Filters as the user types — searches name, category, and purchase unit.
 */
function IngredientCombobox({
  ingredients,
  selectedId,
  onSelect,
  placeholder = "Pick a base ingredient...",
}: IngredientComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = ingredients.find((i) => i.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-sm font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.name}
              <span className="text-gray-400 ml-2 text-xs">
                {selected.category} · {selected.purchaseUnit}
              </span>
            </span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[380px] max-w-[calc(100vw-2rem)]" align="start">
        <Command
          filter={(value, search) => {
            // Custom filter: match against name, category, and purchase unit (stored in the value string)
            // We encode the searchable string as the value, so CMDK's built-in filter handles it.
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search ingredients..." className="h-9" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No ingredient found.</CommandEmpty>
            <CommandGroup>
              {ingredients.map((ing) => {
                // The value string is what CMDK searches against — include name + category + unit
                const searchValue = `${ing.name} ${ing.category} ${ing.purchaseUnit}`;
                return (
                  <CommandItem
                    key={ing.id}
                    value={searchValue}
                    onSelect={() => {
                      onSelect(ing.id);
                      setOpen(false);
                    }}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{ing.name}</div>
                      <div className="text-xs text-gray-500">
                        {ing.category} · {ing.purchaseUnit}
                      </div>
                    </div>
                    {selectedId === ing.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Types
// ============================================================================

interface AIRecipeDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  category: string;
  menuTheme?: string;
  menuThemeName?: string;
  onRecipeCreated: (recipeId: number) => void;
}

interface DraftRecipeComponent {
  ingredientName: string;
  matchedIngredientId: number | null;
  matchedIngredientName: string | null;
  matchConfidence: "exact" | "fuzzy" | "none";
  quantity: number;
  unit: string;
  prepNotes?: string;
}

interface DraftPreparationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  duration?: number;
}

interface DraftRecipe {
  name: string;
  description: string;
  category: string;
  yieldAmount: number;
  yieldUnit: string;
  laborHours: number;
  components: DraftRecipeComponent[];
  preparationSteps: DraftPreparationStep[];
  dietaryFlags: {
    allergenWarnings: string[];
    manualDesignations: string[];
  };
  estimatedFoodCostCents: number;
  estimatedLaborCostCents: number;
  unmatchedIngredients: string[];
}

interface BaseIngredient {
  id: number;
  name: string;
  category: string;
  purchaseUnit: string;
  unitConversions?: Record<string, number> | null;
}

// ============================================================================
// Constants
// ============================================================================

const RECIPE_CATEGORIES = [
  "appetizer",
  "entree",
  "side",
  "salad",
  "dessert",
  "sauce",
  "salsa",
  "condiment",
  "soup",
  "beverage",
];

const UNITS = [
  "pound",
  "ounce",
  "gram",
  "kilogram",
  "cup",
  "tablespoon",
  "teaspoon",
  "each",
  "gallon",
  "quart",
  "liter",
  "milliliter",
  "fl oz",
];

// ============================================================================
// Unit classification — used to detect when a conversion is needed
// ============================================================================

const WEIGHT_UNITS = new Set(["pound", "pounds", "lb", "lbs", "ounce", "ounces", "oz", "gram", "grams", "g", "kilogram", "kilograms", "kg"]);
const VOLUME_UNITS = new Set(["cup", "cups", "tablespoon", "tablespoons", "tbsp", "teaspoon", "teaspoons", "tsp", "gallon", "gallons", "gal", "quart", "quarts", "qt", "pint", "pints", "pt", "liter", "liters", "l", "milliliter", "milliliters", "ml", "fl oz", "fluid ounce"]);
const COUNT_UNITS = new Set(["each", "dozen", "doz", "case", "cases"]);

function unitCategory(unit: string): "weight" | "volume" | "count" | "unknown" {
  const u = unit.toLowerCase().trim();
  if (WEIGHT_UNITS.has(u)) return "weight";
  if (VOLUME_UNITS.has(u)) return "volume";
  if (COUNT_UNITS.has(u)) return "count";
  return "unknown";
}

/**
 * Returns true if converting recipeUnit → purchaseUnit requires a stored custom conversion.
 * That's true when they're in different unit categories (e.g., cup → pound).
 */
function needsCustomConversion(recipeUnit: string, purchaseUnit: string): boolean {
  const r = unitCategory(recipeUnit);
  const p = unitCategory(purchaseUnit);
  if (r === "unknown" || p === "unknown") return false; // can't tell, don't prompt
  return r !== p;
}

// ============================================================================
// Component
// ============================================================================

export default function AIRecipeDraftDialog({
  open,
  onOpenChange,
  itemName,
  category,
  menuTheme,
  menuThemeName,
  onRecipeCreated,
}: AIRecipeDraftDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<DraftRecipe | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Load base ingredients so the admin can manually re-match unmatched items
  const { data: baseIngredients = [] } = useQuery<BaseIngredient[]>({
    queryKey: ["/api/ingredients/base-ingredients"],
    queryFn: async () => {
      const res = await fetch("/api/ingredients/base-ingredients");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  // --------------------------------------------------------------------------
  // Draft generation
  // --------------------------------------------------------------------------
  const draftMutation = useMutation({
    mutationFn: async () => {
      const body = {
        itemName,
        category,
        menuTheme,
        menuThemeName,
        yieldAmount: draft?.yieldAmount ?? 10,
      };
      const res = await apiRequest("POST", "/api/ingredients/recipes/ai-draft", body);
      return (await res.json()) as DraftRecipe;
    },
    onSuccess: (data) => {
      setDraft(data);
      setDraftError(null);
    },
    onError: (error: Error) => {
      setDraftError(error.message || "Failed to draft recipe");
    },
  });

  // Trigger the draft whenever the dialog is opened
  useEffect(() => {
    if (open) {
      setDraft(null);
      setDraftError(null);
      draftMutation.mutate();
    } else {
      // Reset on close
      setDraft(null);
      setDraftError(null);
    }
    // We intentionally only re-run when `open` toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // --------------------------------------------------------------------------
  // Unit conversion persistence
  // --------------------------------------------------------------------------
  // Local draft state for per-row conversion input (keyed by component index)
  const [conversionDrafts, setConversionDrafts] = useState<Record<number, string>>({});

  const conversionMutation = useMutation({
    mutationFn: async (args: {
      baseIngredientId: number;
      recipeUnit: string;
      purchaseUnitFactor: number;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/ingredients/base-ingredients/${args.baseIngredientId}/unit-conversion`,
        { recipeUnit: args.recipeUnit, purchaseUnitFactor: args.purchaseUnitFactor },
      );
      return (await res.json()) as BaseIngredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/base-ingredients"] });
      toast({
        title: "Conversion saved",
        description: "Future recipes will use this automatically.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save conversion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveConversion = (idx: number, component: DraftRecipeComponent) => {
    if (!component.matchedIngredientId) return;
    const ing = baseIngredients.find((b) => b.id === component.matchedIngredientId);
    if (!ing) return;
    const factor = parseFloat(conversionDrafts[idx] || "");
    if (isNaN(factor) || factor <= 0) {
      toast({
        title: "Invalid number",
        description: "Enter a positive number for the conversion factor.",
        variant: "destructive",
      });
      return;
    }
    conversionMutation.mutate({
      baseIngredientId: ing.id,
      recipeUnit: component.unit,
      purchaseUnitFactor: factor,
    });
    // Clear the local draft so the UI picks up the new stored conversion
    setConversionDrafts((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // Save
  // --------------------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("No draft to save");

      const matchedComponents = draft.components.filter(
        (c) => c.matchedIngredientId !== null,
      );

      const payload = {
        name: draft.name,
        description: draft.description,
        category: draft.category,
        yield: draft.yieldAmount, // API expects `yield`
        yieldUnit: draft.yieldUnit,
        laborHours: draft.laborHours,
        preparationSteps: draft.preparationSteps,
        dietaryFlags: draft.dietaryFlags,
        components: matchedComponents.map((c) => ({
          baseIngredientId: c.matchedIngredientId,
          quantity: c.quantity,
          unit: c.unit,
          prepNotes: c.prepNotes,
        })),
      };

      const res = await apiRequest("POST", "/api/ingredients/recipes", payload);
      return (await res.json()) as { id: number };
    },
    onSuccess: (newRecipe) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/recipes"] });
      toast({
        title: "Recipe created and linked!",
        description: `"${draft?.name}" is now available.`,
      });
      onRecipeCreated(newRecipe.id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // --------------------------------------------------------------------------
  // Derived values
  // --------------------------------------------------------------------------
  const matchedCount = useMemo(
    () =>
      draft
        ? draft.components.filter((c) => c.matchedIngredientId !== null).length
        : 0,
    [draft],
  );

  const unmatchedCount = useMemo(
    () =>
      draft
        ? draft.components.filter((c) => c.matchedIngredientId === null).length
        : 0,
    [draft],
  );

  const totalComponents = draft?.components.length ?? 0;

  const foodCost = draft ? draft.estimatedFoodCostCents / 100 : 0;
  const laborCost = draft ? draft.laborHours * 35 : 0; // $35/hour
  const totalCost = foodCost + laborCost;
  const costDollars = foodCost.toFixed(2);
  const laborCostDollars = laborCost.toFixed(2);
  const totalCostDollars = totalCost.toFixed(2);
  const costPerServing =
    draft && draft.yieldAmount > 0
      ? (totalCost / draft.yieldAmount).toFixed(2)
      : "0.00";

  const canSave =
    !!draft &&
    draft.name.trim().length > 0 &&
    draft.category.trim().length > 0 &&
    draft.yieldAmount > 0 &&
    draft.yieldUnit.trim().length > 0 &&
    matchedCount > 0 &&
    !saveMutation.isPending;

  // --------------------------------------------------------------------------
  // Draft mutation helpers
  // --------------------------------------------------------------------------
  const updateDraft = (updates: Partial<DraftRecipe>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const updateComponent = (
    idx: number,
    updates: Partial<DraftRecipeComponent>,
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.components];
      next[idx] = { ...next[idx], ...updates };
      return { ...prev, components: next };
    });
  };

  const removeComponent = (idx: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        components: prev.components.filter((_, i) => i !== idx),
      };
    });
  };

  const addBlankComponent = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const blank: DraftRecipeComponent = {
        ingredientName: "",
        matchedIngredientId: null,
        matchedIngredientName: null,
        matchConfidence: "none",
        quantity: 1,
        unit: "each",
        prepNotes: "",
      };
      return { ...prev, components: [...prev.components, blank] };
    });
  };

  const handleManualMatch = (idx: number, baseIngredientId: string) => {
    const id = parseInt(baseIngredientId, 10);
    const found = baseIngredients.find((b) => b.id === id);
    if (!found) return;
    updateComponent(idx, {
      matchedIngredientId: found.id,
      matchedIngredientName: found.name,
      matchConfidence: "fuzzy",
    });
  };

  // Preparation step helpers
  const updateStep = (idx: number, updates: Partial<DraftPreparationStep>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.preparationSteps];
      next[idx] = { ...next[idx], ...updates };
      return { ...prev, preparationSteps: next };
    });
  };

  const removeStep = (idx: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = prev.preparationSteps
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }));
      return { ...prev, preparationSteps: next };
    });
  };

  const addStep = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextNumber = prev.preparationSteps.length + 1;
      return {
        ...prev,
        preparationSteps: [
          ...prev.preparationSteps,
          {
            stepNumber: nextNumber,
            title: `Step ${nextNumber}`,
            instruction: "",
          },
        ],
      };
    });
  };

  // --------------------------------------------------------------------------
  // Save handler
  // --------------------------------------------------------------------------
  const handleSave = () => {
    if (!draft) return;
    const beforeCount = draft.components.length;
    const matched = draft.components.filter(
      (c) => c.matchedIngredientId !== null,
    );
    const filteredOut = beforeCount - matched.length;
    if (filteredOut > 0) {
      toast({
        title: `${filteredOut} unmatched ingredient${filteredOut === 1 ? "" : "s"} skipped`,
        description:
          "Only ingredients matched to a base ingredient will be saved.",
      });
    }
    saveMutation.mutate();
  };

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------
  const subtitle = menuThemeName
    ? `${itemName} for ${menuThemeName}`
    : itemName;

  const renderMatchBadge = (component: DraftRecipeComponent) => {
    if (component.matchConfidence === "exact") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Matched
        </Badge>
      );
    }
    if (component.matchConfidence === "fuzzy") {
      return (
        <Badge
          className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1"
          title={component.matchedIngredientName || ""}
        >
          <AlertTriangle className="h-3 w-3" />
          Fuzzy: {component.matchedIngredientName}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1">
        <XCircle className="h-3 w-3" />
        Not matched
      </Badge>
    );
  };

  // --------------------------------------------------------------------------
  // JSX
  // --------------------------------------------------------------------------
  const isDrafting = draftMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-[#8A2BE2]" />
            AI-Drafted Recipe
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        {/* ================= LOADING STATE ================= */}
        {isDrafting && !draft && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] rounded-full blur-xl opacity-30 animate-pulse" />
              <div className="relative bg-white rounded-full p-4">
                <Sparkles className="h-10 w-10 text-[#8A2BE2] animate-pulse" />
              </div>
            </div>
            <p className="mt-6 text-lg font-medium text-gray-700">
              AI is drafting your recipe...
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Analyzing ingredients, estimating costs, and building prep steps.
            </p>
            <div className="mt-6 w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] animate-pulse rounded-full w-full" />
            </div>
          </div>
        )}

        {/* ================= ERROR STATE ================= */}
        {!isDrafting && draftError && !draft && (
          <div className="flex-1 flex items-center justify-center py-12 px-6">
            <div className="max-w-md w-full space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{draftError}</AlertDescription>
              </Alert>
              <Button
                onClick={() => {
                  setDraftError(null);
                  draftMutation.mutate();
                }}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* ================= LOADED STATE ================= */}
        {draft && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* =============== SECTION 1: METADATA =============== */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Recipe Details
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="recipe-name" className="text-xs text-gray-500">
                    Recipe Name
                  </Label>
                  <Input
                    id="recipe-name"
                    value={draft.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    placeholder="Recipe name"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="recipe-description"
                    className="text-xs text-gray-500"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="recipe-description"
                    value={draft.description}
                    onChange={(e) =>
                      updateDraft({ description: e.target.value })
                    }
                    placeholder="Short description of the dish"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Category</Label>
                    <Select
                      value={draft.category}
                      onValueChange={(v) => updateDraft({ category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {RECIPE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">
                      Yield Amount
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={draft.yieldAmount}
                      onChange={(e) =>
                        updateDraft({
                          yieldAmount: parseInt(e.target.value || "0", 10),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Yield Unit</Label>
                    <Input
                      value={draft.yieldUnit}
                      onChange={(e) =>
                        updateDraft({ yieldUnit: e.target.value })
                      }
                      placeholder="serving"
                    />
                  </div>
                  <div>
                    <Label
                      className="text-xs text-gray-500 flex items-center gap-1"
                      title="Kitchen hours to prepare this recipe at $35/hour"
                    >
                      Labor Hours
                    </Label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={draft.laborHours}
                      onChange={(e) =>
                        updateDraft({
                          laborHours: parseFloat(e.target.value || "0"),
                        })
                      }
                    />
                    <div className="text-[10px] text-gray-400 mt-1">
                      ${(draft.laborHours * 35).toFixed(2)} @ $35/hr
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* =============== SECTION 2: INGREDIENTS =============== */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Ingredients
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {matchedCount}/{totalComponents} matched
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {draft.components.map((component, idx) => (
                  <Card key={idx} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-1">
                          <Input
                            value={component.ingredientName}
                            onChange={(e) =>
                              updateComponent(idx, {
                                ingredientName: e.target.value,
                              })
                            }
                            placeholder="Ingredient name"
                            className="font-medium"
                          />
                          {component.matchedIngredientName &&
                            component.matchConfidence !== "none" && (
                              <p className="text-xs text-gray-500 pl-1">
                                Linked to:{" "}
                                <span className="font-medium">
                                  {component.matchedIngredientName}
                                </span>
                              </p>
                            )}
                        </div>
                        <div className="pt-1">{renderMatchBadge(component)}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeComponent(idx)}
                          className="text-red-500 hover:text-red-700 h-9 w-9 p-0"
                          aria-label="Remove ingredient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-gray-500 uppercase">
                            Qty
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={component.quantity}
                            onChange={(e) =>
                              updateComponent(idx, {
                                quantity: parseFloat(e.target.value || "0"),
                              })
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 uppercase">
                            Unit
                          </Label>
                          <Select
                            value={component.unit}
                            onValueChange={(v) =>
                              updateComponent(idx, { unit: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] text-gray-500 uppercase">
                            Prep Notes
                          </Label>
                          <Input
                            value={component.prepNotes || ""}
                            onChange={(e) =>
                              updateComponent(idx, {
                                prepNotes: e.target.value,
                              })
                            }
                            placeholder="e.g., diced"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Base ingredient picker — searchable combobox for manual matching */}
                      <div className="pt-1 border-t">
                        <Label
                          className={cn(
                            "text-[10px] uppercase font-medium",
                            component.matchedIngredientId === null
                              ? "text-red-600"
                              : "text-gray-500",
                          )}
                        >
                          {component.matchedIngredientId === null
                            ? "Manually match to base ingredient"
                            : "Base ingredient (change if needed)"}
                        </Label>
                        <div className="mt-1">
                          <IngredientCombobox
                            ingredients={baseIngredients}
                            selectedId={component.matchedIngredientId}
                            onSelect={(id) => handleManualMatch(idx, id.toString())}
                          />
                        </div>
                      </div>

                      {/* Unit conversion prompt — only appears when the recipe unit
                          is incompatible with the matched ingredient's purchase unit
                          AND no stored conversion exists yet. */}
                      {(() => {
                        if (!component.matchedIngredientId) return null;
                        const matched = baseIngredients.find(
                          (b) => b.id === component.matchedIngredientId,
                        );
                        if (!matched) return null;
                        if (!needsCustomConversion(component.unit, matched.purchaseUnit)) return null;

                        const storedFactor =
                          matched.unitConversions?.[component.unit.toLowerCase().trim()];

                        if (storedFactor) {
                          // A conversion already exists — just show a note
                          return (
                            <div className="pt-1 border-t">
                              <div className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  Using saved conversion: 1 {component.unit} ={" "}
                                  {storedFactor} {matched.purchaseUnit}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        // No conversion yet — prompt the admin
                        return (
                          <div className="pt-1 border-t">
                            <div className="bg-amber-50 border border-amber-200 rounded px-2.5 py-2 space-y-2">
                              <div className="flex items-start gap-1.5 text-[11px] text-amber-800">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                <div>
                                  <strong>Unit conversion needed.</strong> This recipe uses{" "}
                                  <strong>{component.unit}</strong>, but{" "}
                                  <strong>{matched.name}</strong> is purchased in{" "}
                                  <strong>{matched.purchaseUnit}</strong>. Define the conversion
                                  once and every future recipe will use it automatically.
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-gray-700">
                                  1 {component.unit} =
                                </span>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={conversionDrafts[idx] || ""}
                                  onChange={(e) =>
                                    setConversionDrafts((prev) => ({
                                      ...prev,
                                      [idx]: e.target.value,
                                    }))
                                  }
                                  placeholder="0.15"
                                  className="h-7 w-24 text-xs"
                                />
                                <span className="text-[11px] text-gray-700">
                                  {matched.purchaseUnit}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px] ml-auto"
                                  onClick={() => handleSaveConversion(idx, component)}
                                  disabled={
                                    !conversionDrafts[idx] ||
                                    conversionMutation.isPending
                                  }
                                >
                                  {conversionMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={addBlankComponent}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </section>

            <Separator />

            {/* =============== SECTION 3: PREPARATION STEPS =============== */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Preparation Steps
                </h3>
              </div>

              <div className="space-y-2">
                {draft.preparationSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 p-3 rounded-lg border bg-white"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8A2BE2] to-[#4169E1] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {step.stepNumber}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={step.title}
                        onChange={(e) =>
                          updateStep(idx, { title: e.target.value })
                        }
                        placeholder="Step title"
                        className="font-medium"
                      />
                      <Textarea
                        value={step.instruction}
                        onChange={(e) =>
                          updateStep(idx, { instruction: e.target.value })
                        }
                        placeholder="Instruction..."
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(idx)}
                      className="text-red-500 hover:text-red-700 h-9 w-9 p-0"
                      aria-label="Remove step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addStep}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </section>

            {/* =============== SECTION 4: DIETARY FLAGS =============== */}
            {(draft.dietaryFlags.allergenWarnings.length > 0 ||
              draft.dietaryFlags.manualDesignations.length > 0) && (
              <>
                <Separator />
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Dietary Flags
                    </h3>
                  </div>

                  {draft.dietaryFlags.allergenWarnings.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">
                        Allergen warnings
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {draft.dietaryFlags.allergenWarnings.map((w, i) => (
                          <Badge
                            key={i}
                            className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                          >
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {draft.dietaryFlags.manualDesignations.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">
                        Dietary designations
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {draft.dietaryFlags.manualDesignations.map((d, i) => (
                          <Badge
                            key={i}
                            className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
                          >
                            {d}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* ================= COST SUMMARY FOOTER ================= */}
        {draft && (
          <div className="border-t bg-gray-50 px-6 py-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Food:{" "}
                    <span className="font-semibold text-gray-900">
                      ${costDollars}
                    </span>
                  </span>
                </div>
                <div className="text-gray-600">
                  Labor:{" "}
                  <span className="font-semibold text-gray-900">
                    ${laborCostDollars}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">
                    ({draft.laborHours}h × $35)
                  </span>
                </div>
                <div className="text-gray-700 font-medium">
                  Total:{" "}
                  <span className="font-semibold text-gray-900">
                    ${totalCostDollars}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Per serving:{" "}
                <span className="font-semibold text-gray-900">
                  ${costPerServing}
                </span>
              </div>
            </div>
            {unmatchedCount > 0 && (
              <Alert className="bg-amber-50 border-amber-200 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-xs">
                  {unmatchedCount} unmatched ingredient
                  {unmatchedCount === 1 ? "" : "s"} will be skipped on save.
                  Match them above or remove them.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* ================= DIALOG FOOTER ================= */}
        <DialogFooter className="border-t px-6 py-3 flex-row sm:justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => draftMutation.mutate()}
            disabled={isDrafting || saveMutation.isPending}
          >
            {isDrafting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90 text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save & Link Recipe
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
