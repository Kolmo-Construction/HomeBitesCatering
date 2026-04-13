import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, DollarSign, Search, ChefHat, Utensils, Info, Camera, Image, X, Play, Clock, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, GripVertical, Pause, Lightbulb, ListOrdered } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Recipe, type BaseIngredient, insertRecipeSchema, preparationStepSchema, type PreparationStep, DIETARY_TAGS, ALLERGEN_CONTAINS_TAGS, LIFESTYLE_TAGS, type RecipeDietaryFlags } from "@shared/schema";
import { formatCurrency, calculateIngredientCost } from "@shared/unitConversion";
import { ObjectUploader } from "@/components/ObjectUploader";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecipeWithCost extends Recipe {
  totalCost: number;
  ingredientCost?: number;
  laborCost?: number;
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
  const ingredientSearchRef = useRef<HTMLDivElement>(null);
  
  const [recipeImages, setRecipeImages] = useState<string[]>([]);
  const [preparationSteps, setPreparationSteps] = useState<PreparationStep[]>([]);
  const [manualDesignations, setManualDesignations] = useState<string[]>([]);
  const [viewingRecipe, setViewingRecipe] = useState<RecipeWithCost | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlayingSteps, setIsPlayingSteps] = useState(false);
  
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepInstruction, setNewStepInstruction] = useState("");
  const [newStepDuration, setNewStepDuration] = useState("");
  const [newStepTips, setNewStepTips] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ingredientSearchRef.current && !ingredientSearchRef.current.contains(event.target as Node)) {
        setShowIngredientDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      laborHours: 0,
      notes: "",
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecipe(null);
    setRecipeComponents([]);
    setRecipeImages([]);
    setPreparationSteps([]);
    setManualDesignations([]);
    form.reset({
      name: "",
      description: "",
      category: undefined,
      yield: 1,
      yieldUnit: "serving",
      laborHours: 0,
      notes: "",
    });
    setSelectedIngredientId(null);
    setIngredientQuantity("1");
    setIngredientUnit("pound");
    setIngredientPrepNotes("");
    setNewStepTitle("");
    setNewStepInstruction("");
    setNewStepDuration("");
    setNewStepTips("");
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
      laborHours: parseFloat(String(recipe.laborHours || "0")),
      notes: recipe.notes || "",
    });
    
    setRecipeImages(recipe.images || []);
    setPreparationSteps(recipe.preparationSteps || []);
    const flags = recipe.dietaryFlags as RecipeDietaryFlags | null;
    setManualDesignations(flags?.manualDesignations || []);

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
      if (fullRecipe.images) {
        setRecipeImages(fullRecipe.images);
      }
      if (fullRecipe.preparationSteps) {
        setPreparationSteps(fullRecipe.preparationSteps);
      }
    } catch (error) {
      console.error("Failed to fetch recipe components:", error);
    }

    setIsDialogOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const submitData = {
      ...data,
      images: recipeImages,
      preparationSteps: preparationSteps,
      dietaryFlags: {
        allergenWarnings: [], // Will be computed by server
        manualDesignations: manualDesignations,
      },
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
  
  const handleAddStep = () => {
    if (!newStepTitle.trim() || !newStepInstruction.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a step title and instruction",
        variant: "destructive",
      });
      return;
    }
    
    const newStep: PreparationStep = {
      stepNumber: preparationSteps.length + 1,
      title: newStepTitle.trim(),
      instruction: newStepInstruction.trim(),
      duration: newStepDuration ? parseInt(newStepDuration) : undefined,
      tips: newStepTips.trim() || undefined,
    };
    
    setPreparationSteps([...preparationSteps, newStep]);
    setNewStepTitle("");
    setNewStepInstruction("");
    setNewStepDuration("");
    setNewStepTips("");
  };
  
  const handleRemoveStep = (index: number) => {
    const updated = [...preparationSteps];
    updated.splice(index, 1);
    setPreparationSteps(updated.map((step, idx) => ({ ...step, stepNumber: idx + 1 })));
  };
  
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === preparationSteps.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...preparationSteps];
    const [removed] = updated.splice(index, 1);
    updated.splice(newIndex, 0, removed);
    setPreparationSteps(updated.map((step, idx) => ({ ...step, stepNumber: idx + 1 })));
  };
  
  const handleRemoveImage = (imageUrl: string) => {
    setRecipeImages(recipeImages.filter(img => img !== imageUrl));
  };
  
  const handleViewRecipe = (recipe: RecipeWithCost) => {
    setViewingRecipe(recipe);
    setActiveStepIndex(0);
    setIsPlayingSteps(false);
  };
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingSteps && viewingRecipe && viewingRecipe.preparationSteps && viewingRecipe.preparationSteps.length > 0) {
      const currentStep = viewingRecipe.preparationSteps[activeStepIndex];
      const duration = (currentStep.duration || 5) * 1000;
      
      timer = setTimeout(() => {
        if (activeStepIndex < viewingRecipe.preparationSteps!.length - 1) {
          setActiveStepIndex(prev => prev + 1);
        } else {
          setIsPlayingSteps(false);
        }
      }, duration);
    }
    return () => clearTimeout(timer);
  }, [isPlayingSteps, activeStepIndex, viewingRecipe]);

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

  const ingredientCost = recipeComponents.reduce((sum, comp) => sum + calculateComponentCost(comp), 0);
  const yieldAmount = form.watch("yield") || 1;
  const laborHoursValue = Number(form.watch("laborHours")) || 0;
  const laborCost = laborHoursValue * 35; // $35/hour
  const totalRecipeCost = ingredientCost + laborCost;
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
  
  const getCostStats = () => {
    if (recipes.length === 0) return null;
    
    const costs = recipes.map(r => r.totalCost || 0).sort((a, b) => a - b);
    const min = costs[0];
    const max = costs[costs.length - 1];
    const median = costs.length % 2 === 0 
      ? (costs[costs.length / 2 - 1] + costs[costs.length / 2]) / 2 
      : costs[Math.floor(costs.length / 2)];
    const average = costs.reduce((a, b) => a + b, 0) / costs.length;
    const q1 = costs[Math.floor(costs.length / 4)];
    const q3 = costs[Math.floor(costs.length * 3 / 4)];
    
    return { min, max, median, average, q1, q3 };
  };
  
  const costStats = getCostStats();

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
              <CardDescription>Cost Distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {costStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Lowest</p>
                      <p className="font-semibold text-lg">{formatCurrency(costStats.min)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Highest</p>
                      <p className="font-semibold text-lg">{formatCurrency(costStats.max)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Median</p>
                      <p className="font-semibold">{formatCurrency(costStats.median)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Average</p>
                      <p className="font-semibold">{formatCurrency(costStats.average)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2">Distribution Range</p>
                    <div className="flex h-8 rounded-md overflow-hidden gap-1 bg-muted">
                      <div 
                        className="bg-red-400 hover:bg-red-500 transition-colors"
                        style={{ width: '25%' }}
                        title={`0-25%: ${formatCurrency(costStats.min)} - ${formatCurrency(costStats.q1)}`}
                      />
                      <div 
                        className="bg-orange-400 hover:bg-orange-500 transition-colors"
                        style={{ width: '25%' }}
                        title={`25-50%: ${formatCurrency(costStats.q1)} - ${formatCurrency(costStats.median)}`}
                      />
                      <div 
                        className="bg-yellow-400 hover:bg-yellow-500 transition-colors"
                        style={{ width: '25%' }}
                        title={`50-75%: ${formatCurrency(costStats.median)} - ${formatCurrency(costStats.q3)}`}
                      />
                      <div 
                        className="bg-green-400 hover:bg-green-500 transition-colors"
                        style={{ width: '25%' }}
                        title={`75-100%: ${formatCurrency(costStats.q3)} - ${formatCurrency(costStats.max)}`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  <p>No recipes yet</p>
                </div>
              )}
            </CardContent>
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
                      <TableHead>Details</TableHead>
                      <TableHead>Dietary</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((recipe) => (
                      <TableRow key={recipe.id} data-testid={`row-recipe-${recipe.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {recipe.images && recipe.images.length > 0 && (
                              <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                                <img 
                                  src={recipe.images[0]} 
                                  alt={recipe.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <span>{recipe.name}</span>
                          </div>
                        </TableCell>
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
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary">{recipe.ingredientCount} ingredients</Badge>
                            {recipe.preparationSteps && recipe.preparationSteps.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {recipe.preparationSteps.length} steps
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const flags = recipe.dietaryFlags as RecipeDietaryFlags | null;
                            const allergenWarnings = flags?.allergenWarnings || [];
                            const manualDesignations = flags?.manualDesignations || [];
                            
                            if (allergenWarnings.length === 0 && manualDesignations.length === 0) {
                              return <span className="text-muted-foreground text-sm">—</span>;
                            }
                            
                            return (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {manualDesignations.slice(0, 2).map((tag) => {
                                  const tagInfo = LIFESTYLE_TAGS.find((t) => t.value === tag);
                                  return (
                                    <Badge key={tag} variant="default" className="text-xs bg-green-600">
                                      {tagInfo?.label || tag}
                                    </Badge>
                                  );
                                })}
                                {allergenWarnings.slice(0, 2).map((warning) => (
                                  <Badge key={warning} variant="destructive" className="text-xs">
                                    {warning}
                                  </Badge>
                                ))}
                                {(manualDesignations.length + allergenWarnings.length) > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{manualDesignations.length + allergenWarnings.length - 4}
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(recipe.totalCost || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {recipe.preparationSteps && recipe.preparationSteps.length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleViewRecipe(recipe)}
                                      data-testid={`button-view-${recipe.id}`}
                                    >
                                      <Play className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View cooking steps</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

                <FormField
                  control={form.control}
                  name="laborHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Labor Hours
                        <span className="text-xs font-normal text-muted-foreground">
                          (prep + cook, at $35/hr)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          placeholder="0"
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-labor-hours"
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        {field.value && field.value > 0
                          ? `≈ $${(Number(field.value) * 35).toFixed(2)} labor cost`
                          : "Optional — leave blank or 0 if no labor cost"}
                      </div>
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
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Dietary Certifications
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Manually certify this recipe for specific dietary requirements. Allergen warnings are auto-computed from ingredients.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select dietary certifications that apply to this entire recipe:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {LIFESTYLE_TAGS.map((tag) => (
                    <label
                      key={tag.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={manualDesignations.includes(tag.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setManualDesignations([...manualDesignations, tag.value]);
                          } else {
                            setManualDesignations(manualDesignations.filter(t => t !== tag.value));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid={`checkbox-dietary-${tag.value}`}
                      />
                      <span className="text-sm">{tag.label}</span>
                    </label>
                  ))}
                </div>
              </div>

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
                    <div className="md:col-span-4 relative" ref={ingredientSearchRef}>
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
                      <div className="bg-primary/10 rounded-lg p-4 min-w-[280px] space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ingredient Cost</span>
                          <span className="font-medium text-green-700">
                            {formatCurrency(ingredientCost)}
                          </span>
                        </div>
                        {laborHoursValue > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Labor ({laborHoursValue}h × $35)
                            </span>
                            <span className="font-medium text-blue-700">
                              {formatCurrency(laborCost)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm font-semibold">Total Cost</span>
                          <span className="text-2xl font-bold text-primary" data-testid="text-recipe-total-cost">
                            {formatCurrency(totalRecipeCost)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground pt-1">
                          Cost per {form.watch("yieldUnit") || "serving"}:
                          <span className="font-semibold ml-1" data-testid="text-cost-per-serving">
                            {formatCurrency(costPerServing)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
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

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Recipe Photos
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Upload photos of the final dish to help chefs visualize the result.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                </div>

                {recipeImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipeImages.map((imageUrl, index) => (
                      <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={imageUrl} 
                          alt={`Recipe photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => handleRemoveImage(imageUrl)}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      Upload images of the finished recipe. Images should clearly show the plating and presentation.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter image URL..."
                        id="image-url-input"
                        data-testid="input-image-url"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const input = document.getElementById('image-url-input') as HTMLInputElement;
                          if (input && input.value.trim()) {
                            setRecipeImages([...recipeImages, input.value.trim()]);
                            input.value = '';
                          }
                        }}
                        data-testid="button-add-image-url"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add URL
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ListOrdered className="h-5 w-5" />
                    Preparation Steps
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Add step-by-step instructions that chefs can follow. These will be displayed as an animated slideshow.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h3>
                  <Badge variant="secondary">{preparationSteps.length} steps</Badge>
                </div>

                {preparationSteps.length > 0 && (
                  <div className="space-y-3">
                    {preparationSteps.map((step, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group"
                      >
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                            data-testid={`button-step-up-${index}`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === preparationSteps.length - 1}
                            data-testid={`button-step-down-${index}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{step.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{step.instruction}</p>
                          <div className="flex gap-2 mt-2">
                            {step.duration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {step.duration}s
                              </Badge>
                            )}
                            {step.tips && (
                              <Badge variant="outline" className="text-xs">
                                <Lightbulb className="h-3 w-3 mr-1" />
                                Tip included
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-step-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium text-sm">Add New Step</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Step Title *</Label>
                      <Input
                        placeholder="e.g., Prepare the ingredients"
                        value={newStepTitle}
                        onChange={(e) => setNewStepTitle(e.target.value)}
                        data-testid="input-step-title"
                      />
                    </div>
                    <div>
                      <Label>Display Duration (seconds)</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g., 10"
                        value={newStepDuration}
                        onChange={(e) => setNewStepDuration(e.target.value)}
                        data-testid="input-step-duration"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Instruction *</Label>
                    <Textarea
                      placeholder="Describe what the chef should do in this step..."
                      value={newStepInstruction}
                      onChange={(e) => setNewStepInstruction(e.target.value)}
                      data-testid="input-step-instruction"
                    />
                  </div>
                  <div>
                    <Label>Tips (Optional)</Label>
                    <Input
                      placeholder="Any helpful tips for this step..."
                      value={newStepTips}
                      onChange={(e) => setNewStepTips(e.target.value)}
                      data-testid="input-step-tips"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddStep}
                    data-testid="button-add-step"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
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

      <Dialog open={!!viewingRecipe} onOpenChange={(open) => !open && setViewingRecipe(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {viewingRecipe?.name} - Preparation Guide
            </DialogTitle>
            <DialogDescription>
              Follow these steps to prepare the dish. Use the controls to navigate or auto-play.
            </DialogDescription>
          </DialogHeader>

          {viewingRecipe && viewingRecipe.preparationSteps && viewingRecipe.preparationSteps.length > 0 ? (
            <div className="flex-1 flex flex-col gap-6 py-4 overflow-hidden">
              <div className="flex items-center gap-2">
                {viewingRecipe.images && viewingRecipe.images.length > 0 && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={viewingRecipe.images[0]} 
                      alt={viewingRecipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Step {activeStepIndex + 1} of {viewingRecipe.preparationSteps.length}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveStepIndex(prev => Math.max(0, prev - 1))}
                        disabled={activeStepIndex === 0}
                        data-testid="button-prev-step"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant={isPlayingSteps ? "destructive" : "default"}
                        size="sm"
                        onClick={() => setIsPlayingSteps(!isPlayingSteps)}
                        data-testid="button-toggle-play"
                      >
                        {isPlayingSteps ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Auto-Play
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveStepIndex(prev => Math.min(viewingRecipe.preparationSteps!.length - 1, prev + 1))}
                        disabled={activeStepIndex === viewingRecipe.preparationSteps.length - 1}
                        data-testid="button-next-step"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((activeStepIndex + 1) / viewingRecipe.preparationSteps.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 min-h-[300px]">
                  <div 
                    key={activeStepIndex}
                    className="animate-in fade-in slide-in-from-right-5 duration-500"
                  >
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-lg">
                        {viewingRecipe.preparationSteps[activeStepIndex].stepNumber}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-4">
                          {viewingRecipe.preparationSteps[activeStepIndex].title}
                        </h2>
                        <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                          {viewingRecipe.preparationSteps[activeStepIndex].instruction}
                        </p>
                        
                        {viewingRecipe.preparationSteps[activeStepIndex].tips && (
                          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                            <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-yellow-800 dark:text-yellow-200">Chef's Tip:</span>
                              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                                {viewingRecipe.preparationSteps[activeStepIndex].tips}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {viewingRecipe.preparationSteps[activeStepIndex].duration && (
                          <div className="mt-4 flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Display time: {viewingRecipe.preparationSteps[activeStepIndex].duration} seconds</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {viewingRecipe.preparationSteps.map((step, index) => (
                  <Button
                    key={index}
                    variant={index === activeStepIndex ? "default" : "outline"}
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => {
                      setActiveStepIndex(index);
                      setIsPlayingSteps(false);
                    }}
                    data-testid={`button-step-nav-${index}`}
                  >
                    {step.stepNumber}. {step.title.length > 15 ? step.title.substring(0, 15) + '...' : step.title}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No preparation steps available for this recipe.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
