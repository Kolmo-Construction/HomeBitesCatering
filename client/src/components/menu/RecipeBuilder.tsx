import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, DollarSign, Info } from "lucide-react";
import { type BaseIngredient } from "@shared/schema";
import { calculateIngredientCost, formatCurrency, getSupportedUnits } from "@shared/unitConversion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RecipeIngredientItem {
  id?: number;
  baseIngredientId: number;
  baseIngredient?: BaseIngredient;
  quantity: number;
  unit: string;
  prepNotes?: string;
}

interface RecipeBuilderProps {
  menuItemId?: string;
  recipeIngredients: RecipeIngredientItem[];
  onRecipeChange: (ingredients: RecipeIngredientItem[]) => void;
  onCostChange?: (cost: number) => void;
  currentPrice?: number | null;
}

const COMMON_UNITS = [
  { value: "pound", label: "Pound (lb)" },
  { value: "ounce", label: "Ounce (oz)" },
  { value: "kilogram", label: "Kilogram (kg)" },
  { value: "gram", label: "Gram (g)" },
  { value: "gallon", label: "Gallon (gal)" },
  { value: "quart", label: "Quart (qt)" },
  { value: "liter", label: "Liter (L)" },
  { value: "cup", label: "Cup" },
  { value: "tablespoon", label: "Tablespoon (tbsp)" },
  { value: "teaspoon", label: "Teaspoon (tsp)" },
  { value: "each", label: "Each" },
];

export default function RecipeBuilder({
  menuItemId,
  recipeIngredients,
  onRecipeChange,
  onCostChange,
  currentPrice,
}: RecipeBuilderProps) {
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [unit, setUnit] = useState<string>("pound");
  const [prepNotes, setPrepNotes] = useState<string>("");

  // Fetch all base ingredients
  const { data: baseIngredients = [], isLoading } = useQuery<BaseIngredient[]>({
    queryKey: ["/api/ingredients/base-ingredients"],
  });

  // Calculate cost for a single recipe ingredient
  const calculateCost = (recipeItem: RecipeIngredientItem): number => {
    const baseIngredient = recipeItem.baseIngredient || 
      baseIngredients.find((bi) => bi.id === recipeItem.baseIngredientId);
    
    if (!baseIngredient) return 0;

    try {
      return calculateIngredientCost(
        parseFloat(baseIngredient.purchasePrice),
        parseFloat(baseIngredient.purchaseQuantity),
        baseIngredient.purchaseUnit,
        recipeItem.quantity,
        recipeItem.unit,
        (baseIngredient.unitConversions as Record<string, number>) || undefined,
        baseIngredient.yieldPct != null
          ? parseFloat(baseIngredient.yieldPct)
          : null,
      );
    } catch (error) {
      return 0;
    }
  };

  // Calculate total recipe cost
  const totalCost = recipeIngredients.reduce((sum, item) => sum + calculateCost(item), 0);
  
  // Notify parent component of cost changes
  useEffect(() => {
    if (onCostChange) {
      console.log("RecipeBuilder: Calculated total cost:", totalCost);
      console.log("RecipeBuilder: Recipe ingredients:", recipeIngredients);
      onCostChange(totalCost);
    }
  }, [totalCost]);

  // Add ingredient to recipe
  const handleAddIngredient = () => {
    if (!selectedIngredientId) return;

    const baseIngredient = baseIngredients.find((bi) => bi.id === selectedIngredientId);
    if (!baseIngredient) return;

    const newIngredient: RecipeIngredientItem = {
      baseIngredientId: selectedIngredientId,
      baseIngredient,
      quantity: parseFloat(quantity) || 1,
      unit,
      prepNotes: prepNotes || undefined,
    };

    onRecipeChange([...recipeIngredients, newIngredient]);
    
    // Reset form
    setSelectedIngredientId(null);
    setQuantity("1");
    setUnit("pound");
    setPrepNotes("");
  };

  // Remove ingredient from recipe
  const handleRemoveIngredient = (index: number) => {
    const updated = [...recipeIngredients];
    updated.splice(index, 1);
    onRecipeChange(updated);
  };

  // Update ingredient quantity or unit
  const handleUpdateIngredient = (
    index: number,
    field: keyof RecipeIngredientItem,
    value: any
  ) => {
    const updated = [...recipeIngredients];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onRecipeChange(updated);
  };

  // Get available ingredients (exclude already added ones)
  const availableIngredients = baseIngredients.filter(
    (bi) => !recipeIngredients.some((ri) => ri.baseIngredientId === bi.id)
  );

  return (
    <Card data-testid="recipe-builder">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Recipe & Costing
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="inline-flex">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Add ingredients to build this menu item's recipe. Costs are automatically
                  calculated based on ingredient prices and quantities.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Define the ingredients and portions that make up this menu item
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Ingredient Form */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium">Add Ingredient</h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <Label>Ingredient *</Label>
              <Select
                value={selectedIngredientId?.toString() || ""}
                onValueChange={(value) => setSelectedIngredientId(parseInt(value))}
              >
                <SelectTrigger data-testid="select-ingredient">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {availableIngredients.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {baseIngredients.length === 0
                        ? "No base ingredients available. Add some first."
                        : "All ingredients already added to this recipe"}
                    </div>
                  ) : (
                    availableIngredients.map((ingredient) => (
                      <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{ingredient.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {formatCurrency(
                              parseFloat(ingredient.purchasePrice) /
                                parseFloat(ingredient.purchaseQuantity)
                            )}
                            /{ingredient.purchaseUnit}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                data-testid="input-quantity"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Unit *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger data-testid="select-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Label>Prep Notes</Label>
              <Input
                value={prepNotes}
                onChange={(e) => setPrepNotes(e.target.value)}
                placeholder="e.g., diced, minced"
                data-testid="input-prep-notes"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <Button
                type="button"
                onClick={handleAddIngredient}
                disabled={!selectedIngredientId || !quantity || !unit}
                size="icon"
                data-testid="button-add-ingredient"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Recipe Ingredients Table */}
        {recipeIngredients.length > 0 ? (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Prep Notes</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeIngredients.map((item, index) => {
                    const baseIngredient =
                      item.baseIngredient ||
                      baseIngredients.find((bi) => bi.id === item.baseIngredientId);
                    const cost = calculateCost(item);

                    return (
                      <TableRow key={index} data-testid={`row-recipe-ingredient-${index}`}>
                        <TableCell className="font-medium">
                          {baseIngredient?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateIngredient(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24"
                            data-testid={`input-quantity-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => handleUpdateIngredient(index, "unit", value)}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-unit-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_UNITS.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.prepNotes || ""}
                            onChange={(e) =>
                              handleUpdateIngredient(index, "prepNotes", e.target.value)
                            }
                            placeholder="e.g., diced"
                            className="w-32"
                            data-testid={`input-prep-notes-${index}`}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span data-testid={`text-cost-${index}`}>{formatCurrency(cost)}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveIngredient(index)}
                            data-testid={`button-remove-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Total Cost */}
            <div className="flex justify-end">
              <div className="bg-primary/10 rounded-lg p-4 min-w-[200px]">
                <div className="text-sm text-muted-foreground mb-1">Total Ingredient Cost</div>
                <div className="text-2xl font-bold" data-testid="text-total-cost">
                  {formatCurrency(totalCost)}
                </div>
                
                {/* Price Change Indicator */}
                {currentPrice && currentPrice > 0 && (
                  <div className="mt-2 pt-2 border-t border-primary/20">
                    <div className="text-xs text-muted-foreground">Current Menu Price: {formatCurrency(currentPrice)}</div>
                    {Math.abs(totalCost - currentPrice) > 0.01 && (
                      <div className={`text-sm font-semibold mt-1 flex items-center gap-1 ${
                        totalCost > currentPrice 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {totalCost > currentPrice ? '↑' : '↓'}
                        <span>
                          {totalCost > currentPrice ? 'Increased' : 'Decreased'} by {formatCurrency(Math.abs(totalCost - currentPrice))}
                        </span>
                      </div>
                    )}
                    {Math.abs(totalCost - currentPrice) <= 0.01 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        ✓ Cost matches price
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-1">
                  {recipeIngredients.length} ingredient
                  {recipeIngredients.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg" data-testid="text-no-ingredients">
            <p>No ingredients added yet</p>
            <p className="text-sm mt-1">Add ingredients above to start building your recipe</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
