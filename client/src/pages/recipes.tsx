import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, DollarSign, Search, ChefHat, Utensils, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Recipe, type BaseIngredient, insertRecipeSchema } from "@shared/schema";
import { formatCurrency, calculateIngredientCost } from "@shared/unitConversion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecipeWithCost extends Recipe {
  totalCost: number;
  costPerServing: number;
  ingredientCount: number;
}

interface RecipeComponentItem {
  id?: number;
  baseIngredientId: number;
  baseIngredient?: BaseIngredient;
  quantity: number;
  unit: string;
  prepNotes?: string;
  calculatedCost?: number;
}

const formSchema = insertRecipeSchema.extend({
  name: z.string().min(1, "Recipe name is required"),
});

type FormValues = z.infer<typeof formSchema>;

const RECIPE_CATEGORIES = [
  { value: "entree", label: "Entree" },
  { value: "appetizer", label: "Appetizer" },
  { value: "side", label: "Side Dish" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
  { value: "sauce", label: "Sauce/Dressing" },
  { value: "component", label: "Component" },
  { value: "other", label: "Other" },
];

const YIELD_UNITS = [
  { value: "serving", label: "Serving(s)" },
  { value: "portion", label: "Portion(s)" },
  { value: "batch", label: "Batch" },
  { value: "cup", label: "Cup(s)" },
  { value: "quart", label: "Quart(s)" },
  { value: "gallon", label: "Gallon(s)" },
  { value: "piece", label: "Piece(s)" },
  { value: "dozen", label: "Dozen" },
];

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

export default function RecipesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithCost | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeWithCost | null>(null);
  const [recipeComponents, setRecipeComponents] = useState<RecipeComponentItem[]>([]);
  
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState<string>("");
  const [showIngredientDropdown, setShowIngredientDropdown] = useState<boolean>(false);
  const [ingredientQuantity, setIngredientQuantity] = useState<string>("1");
  const [ingredientUnit, setIngredientUnit] = useState<string>("pound");
  const [ingredientPrepNotes, setIngredientPrepNotes] = useState<string>("");

  const { data: recipes = [], isLoading } = useQuery<RecipeWithCost[]>({
    queryKey: ["/api/ingredients/recipes", { category: categoryFilter, search: searchQuery }],
  });

  const { data: baseIngredients = [] } = useQuery<BaseIngredient[]>({
    queryKey: ["/api/ingredients/base-ingredients"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues & { components: RecipeComponentItem[] }) => {
      const res = await apiRequest("POST", "/api/ingredients/recipes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/recipes"] });
      toast({ title: "Success", description: "Recipe created successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create recipe",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues & { components: RecipeComponentItem[] } }) => {
      const res = await apiRequest("PUT", `/api/ingredients/recipes/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/recipes"] });
      toast({ title: "Success", description: "Recipe updated successfully" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update recipe",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/ingredients/recipes/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ingredients/recipes"] });
      toast({ title: "Success", description: "Recipe deleted successfully" });
      setDeletingRecipe(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      yield: 1,
      yieldUnit: "serving",
      notes: "",
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecipe(null);
    setRecipeComponents([]);
    form.reset({
      name: "",
      description: "",
      category: undefined,
      yield: 1,
      yieldUnit: "serving",
      notes: "",
    });
    setSelectedIngredientId(null);
    setIngredientQuantity("1");
    setIngredientUnit("pound");
    setIngredientPrepNotes("");
  };

  const handleOpenNewRecipe = () => {
    handleCloseDialog();
    setIsDialogOpen(true);
  };

  const handleEditRecipe = async (recipe: RecipeWithCost) => {
    setEditingRecipe(recipe);
    form.reset({
      name: recipe.name,
      description: recipe.description || "",
      category: recipe.category || undefined,
      yield: parseFloat(recipe.yield || "1"),
      yieldUnit: recipe.yieldUnit || "serving",
      notes: recipe.notes || "",
    });

    try {
      const res = await fetch(`/api/ingredients/recipes/${recipe.id}`);
      const fullRecipe = await res.json();
      if (fullRecipe.components) {
        setRecipeComponents(fullRecipe.components.map((comp: any) => ({
          id: comp.id,
          baseIngredientId: comp.baseIngredientId,
          baseIngredient: comp.baseIngredient,
          quantity: parseFloat(comp.quantity),
          unit: comp.unit,
          prepNotes: comp.prepNotes,
          calculatedCost: comp.calculatedCost,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch recipe components:", error);
    }

    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const submitData = {
      ...data,
      components: recipeComponents.map((comp) => ({
        baseIngredientId: comp.baseIngredientId,
        quantity: comp.quantity,
        unit: comp.unit,
        prepNotes: comp.prepNotes,
      })),
    };

    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const calculateComponentCost = (component: RecipeComponentItem): number => {
    const baseIngredient = component.baseIngredient || 
      baseIngredients.find((bi) => bi.id === component.baseIngredientId);
    
    if (!baseIngredient) return 0;

    try {
      return calculateIngredientCost(
        parseFloat(baseIngredient.purchasePrice),
        parseFloat(baseIngredient.purchaseQuantity),
        baseIngredient.purchaseUnit,
        component.quantity,
        component.unit
      );
    } catch (error) {
      console.error("Error calculating cost:", error);
      return 0;
    }
  };

  const totalRecipeCost = recipeComponents.reduce((sum, comp) => sum + calculateComponentCost(comp), 0);
  const yieldAmount = form.watch("yield") || 1;
  const costPerServing = yieldAmount > 0 ? totalRecipeCost / yieldAmount : totalRecipeCost;

  const handleAddComponent = () => {
    if (!selectedIngredientId) return;

    const baseIngredient = baseIngredients.find((bi) => bi.id === selectedIngredientId);
    if (!baseIngredient) return;

    const newComponent: RecipeComponentItem = {
      baseIngredientId: selectedIngredientId,
      baseIngredient,
      quantity: parseFloat(ingredientQuantity) || 1,
      unit: ingredientUnit,
      prepNotes: ingredientPrepNotes || undefined,
    };

    setRecipeComponents([...recipeComponents, newComponent]);
    setSelectedIngredientId(null);
    setIngredientQuantity("1");
    setIngredientUnit("pound");
    setIngredientPrepNotes("");
  };

  const handleRemoveComponent = (index: number) => {
    const updated = [...recipeComponents];
    updated.splice(index, 1);
    setRecipeComponents(updated);
  };

  const handleUpdateComponent = (index: number, field: keyof RecipeComponentItem, value: any) => {
    const updated = [...recipeComponents];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeComponents(updated);
  };

  const availableIngredients = baseIngredients.filter(
    (bi) => !recipeComponents.some((rc) => rc.baseIngredientId === bi.id)
  );

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || recipe.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalRecipes = recipes.length;
  const totalIngredientCost = recipes.reduce((sum, r) => sum + (r.totalCost || 0), 0);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" data-testid="page-recipes">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <ChefHat className="h-8 w-8" />
              Recipes
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage recipes with automatic ingredient cost calculation
            </p>
          </div>
          <Button onClick={handleOpenNewRecipe} data-testid="button-add-recipe">
            <Plus className="mr-2 h-4 w-4" />
            New Recipe
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Recipes</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-recipes">
                {totalRecipes}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Categories</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-categories">
                {new Set(recipes.map((r) => r.category).filter(Boolean)).size}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Ingredient Cost</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2" data-testid="text-total-cost">
                <DollarSign className="h-6 w-6 text-green-600" />
                {formatCurrency(totalIngredientCost)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {RECIPE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-12" data-testid="text-loading">Loading...</div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-recipes">
                <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No recipes found</p>
                <p className="text-sm mt-1">Create your first recipe to start tracking ingredient costs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipe Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Ingredients</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Cost/Serving</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((recipe) => (
                      <TableRow key={recipe.id} data-testid={`row-recipe-${recipe.id}`}>
                        <TableCell className="font-medium">{recipe.name}</TableCell>
                        <TableCell>
                          {recipe.category ? (
                            <Badge variant="outline">
                              {RECIPE_CATEGORIES.find((c) => c.value === recipe.category)?.label || recipe.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {parseFloat(recipe.yield || "1")} {recipe.yieldUnit || "serving"}(s)
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{recipe.ingredientCount} ingredients</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(recipe.totalCost || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(recipe.costPerServing || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRecipe(recipe)}
                              data-testid={`button-edit-${recipe.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRecipe(recipe)}
                              data-testid={`button-delete-${recipe.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? "Edit Recipe" : "Create New Recipe"}</DialogTitle>
            <DialogDescription>
              {editingRecipe 
                ? "Update the recipe details and ingredients below" 
                : "Add a new recipe by filling in the details and adding ingredients"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Classic Hamburger" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RECIPE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the recipe..." 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-description" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yield"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yield Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0.5" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          data-testid="input-yield" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yieldUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yield Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "serving"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-yield-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {YIELD_UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preparation Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special preparation instructions..." 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-notes" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Recipe Ingredients
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Add ingredients from your base ingredients inventory. Costs are calculated automatically.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-sm">Add Ingredient</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 relative">
                      <Label>Ingredient</Label>
                      <div className="relative">
                        <Input
                          placeholder="Search ingredients..."
                          value={ingredientSearch}
                          onChange={(e) => {
                            setIngredientSearch(e.target.value);
                            setShowIngredientDropdown(true);
                          }}
                          onFocus={() => setShowIngredientDropdown(true)}
                          data-testid="input-search-ingredient"
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                      
                      {showIngredientDropdown && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-input rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                          {availableIngredients.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              {baseIngredients.length === 0
                                ? "No base ingredients available"
                                : "All ingredients added"}
                            </div>
                          ) : (
                            availableIngredients
                              .filter((ing) =>
                                ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
                                ing.sku?.toLowerCase().includes(ingredientSearch.toLowerCase())
                              )
                              .map((ingredient) => (
                                <button
                                  key={ingredient.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedIngredientId(ingredient.id);
                                    setIngredientSearch(ingredient.name);
                                    setShowIngredientDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-accent flex items-center justify-between group"
                                  data-testid={`button-ingredient-${ingredient.id}`}
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium">{ingredient.name}</span>
                                    {ingredient.sku && (
                                      <span className="text-xs text-muted-foreground">SKU: {ingredient.sku}</span>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {formatCurrency(
                                      parseFloat(ingredient.purchasePrice) /
                                        parseFloat(ingredient.purchaseQuantity)
                                    )}
                                    /{ingredient.purchaseUnit}
                                  </Badge>
                                </button>
                              ))
                          )}
                        </div>
                      )}
                      {selectedIngredientId && (
                        <p className="text-xs text-green-600 mt-1">✓ Selected</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={ingredientQuantity}
                        onChange={(e) => setIngredientQuantity(e.target.value)}
                        placeholder="1"
                        data-testid="input-ingredient-quantity"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Unit</Label>
                      <Select value={ingredientUnit} onValueChange={setIngredientUnit}>
                        <SelectTrigger data-testid="select-ingredient-unit">
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
                        value={ingredientPrepNotes}
                        onChange={(e) => setIngredientPrepNotes(e.target.value)}
                        placeholder="e.g., diced, minced"
                        data-testid="input-ingredient-prep-notes"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        onClick={handleAddComponent}
                        disabled={!selectedIngredientId || !ingredientQuantity || !ingredientUnit}
                        size="icon"
                        data-testid="button-add-component"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {recipeComponents.length > 0 ? (
                  <div className="space-y-4">
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
                        {recipeComponents.map((comp, index) => {
                          const baseIngredient = comp.baseIngredient || 
                            baseIngredients.find((bi) => bi.id === comp.baseIngredientId);
                          const cost = calculateComponentCost(comp);

                          return (
                            <TableRow key={index} data-testid={`row-component-${index}`}>
                              <TableCell className="font-medium">
                                {baseIngredient?.name || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={comp.quantity}
                                  onChange={(e) =>
                                    handleUpdateComponent(index, "quantity", parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20"
                                  data-testid={`input-comp-quantity-${index}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={comp.unit}
                                  onValueChange={(value) => handleUpdateComponent(index, "unit", value)}
                                >
                                  <SelectTrigger className="w-28" data-testid={`select-comp-unit-${index}`}>
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
                                  value={comp.prepNotes || ""}
                                  onChange={(e) => handleUpdateComponent(index, "prepNotes", e.target.value)}
                                  placeholder="e.g., diced"
                                  className="w-28"
                                  data-testid={`input-comp-prep-${index}`}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(cost)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveComponent(index)}
                                  data-testid={`button-remove-comp-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="flex justify-end">
                      <div className="bg-primary/10 rounded-lg p-4 min-w-[240px]">
                        <div className="text-sm text-muted-foreground mb-1">Total Ingredient Cost</div>
                        <div className="text-2xl font-bold text-green-600" data-testid="text-recipe-total-cost">
                          {formatCurrency(totalRecipeCost)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                          Cost per {form.watch("yieldUnit") || "serving"}: 
                          <span className="font-semibold ml-1" data-testid="text-cost-per-serving">
                            {formatCurrency(costPerServing)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {recipeComponents.length} ingredient{recipeComponents.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No ingredients added yet</p>
                    <p className="text-sm mt-1">Add ingredients above to build your recipe</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-recipe"
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingRecipe ? "Update Recipe" : "Create Recipe"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRecipe} onOpenChange={() => setDeletingRecipe(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRecipe?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRecipe && deleteMutation.mutate(deletingRecipe.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
