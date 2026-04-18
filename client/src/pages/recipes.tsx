import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, DollarSign, Search, ChefHat, Utensils, Info, Camera, Image, X, Play, Clock, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, GripVertical, Pause, Lightbulb, ListOrdered, Link2, CalendarDays, Leaf, AlertTriangle, Scale, Eye, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Recipe, type BaseIngredient, insertRecipeSchema, preparationStepSchema, type PreparationStep, DIETARY_TAGS, ALLERGEN_CONTAINS_TAGS, LIFESTYLE_TAGS, type RecipeDietaryFlags } from "@shared/schema";
import { formatCurrency, calculateIngredientCost, convertToPurchaseUnits } from "@shared/unitConversion";
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

interface RecipeDashboardStats {
  menuLinkage: {
    totalRecipes: number;
    linkedRecipes: number;
    orphanCount: number;
    topUsed: { id: number; name: string; menuCount: number }[];
  };
  upcomingEvents: {
    windowDays: number;
    eventCount: number;
    recipeCount: number;
    nextEventDate: string | null;
  };
  dietaryCoverage: {
    total: number;
    uncertified: number;
    byTag: { tag: string; label: string; count: number }[];
  };
  laborLeaders: {
    totalHours: number;
    recipesWithLabor: number;
    top: { id: number; name: string; laborHours: number; laborCost: number }[];
  };
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
  { value: "salsa", label: "Salsa" },
  { value: "condiment", label: "Condiment" },
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
  { value: "pound", label: "Pound (lb)" },
  { value: "ounce", label: "Ounce (oz)" },
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

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function linkifyText(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function RecipesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  type RecipeSortField = "name" | "category" | "yield" | "cost";
  const [sortField, setSortField] = useState<RecipeSortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [detailRecipe, setDetailRecipe] = useState<RecipeWithCost | null>(null);

  const toggleSort = (field: RecipeSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: RecipeSortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  };
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
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Inline conversion fix dialog — opened by clicking "Needs conversion"
  // on a recipe ingredient row. Lets the chef teach the system how this
  // ingredient's recipe unit relates to its purchase unit, without leaving
  // the recipe builder.
  const [fixingConversion, setFixingConversion] = useState<{
    baseIngredientId: number;
    ingredientName: string;
    recipeUnit: string;
    purchaseUnit: string;
    purchaseQuantity: number;
    purchasePrice: number;
  } | null>(null);
  const [fixFactor, setFixFactor] = useState<string>("");
  const [savingFix, setSavingFix] = useState(false);

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

  const { data: dashboardStats } = useQuery<RecipeDashboardStats>({
    queryKey: ["/api/ingredients/recipes/dashboard-stats"],
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
  
  const handleUpdateStep = (index: number, field: keyof PreparationStep, value: string | number | undefined) => {
    const updated = [...preparationSteps];
    updated[index] = { ...updated[index], [field]: value };
    setPreparationSteps(updated);
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
        component.unit,
        (baseIngredient.unitConversions as Record<string, number>) || undefined,
        baseIngredient.yieldPct != null
          ? parseFloat(baseIngredient.yieldPct)
          : null,
      );
    } catch (error) {
      return 0;
    }
  };

  // Open the inline fix dialog for a component that can't be converted yet
  const openFixConversion = (component: RecipeComponentItem) => {
    const baseIngredient = component.baseIngredient ||
      baseIngredients.find((bi) => bi.id === component.baseIngredientId);
    if (!baseIngredient) return;
    setFixingConversion({
      baseIngredientId: baseIngredient.id,
      ingredientName: baseIngredient.name,
      recipeUnit: component.unit,
      purchaseUnit: baseIngredient.purchaseUnit,
      purchaseQuantity: parseFloat(baseIngredient.purchaseQuantity) || 1,
      purchasePrice: parseFloat(baseIngredient.purchasePrice) || 0,
    });
    setFixFactor("");
  };

  const saveConversionFix = async () => {
    if (!fixingConversion) return;
    const factor = parseFloat(fixFactor);
    if (!isFinite(factor) || factor <= 0) {
      toast({
        title: "Need a number",
        description: "Enter how many " + fixingConversion.purchaseUnit + " are in 1 " + fixingConversion.recipeUnit + ".",
        variant: "destructive",
      });
      return;
    }
    setSavingFix(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/ingredients/base-ingredients/${fixingConversion.baseIngredientId}/unit-conversion`,
        {
          recipeUnit: fixingConversion.recipeUnit,
          purchaseUnitFactor: factor,
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      // Refresh the base ingredients list so the inline calculator picks up
      // the new conversion immediately.
      await queryClient.invalidateQueries({
        queryKey: ["/api/ingredients/base-ingredients"],
      });
      toast({
        title: "Conversion saved",
        description: `1 ${fixingConversion.recipeUnit} of ${fixingConversion.ingredientName} = ${factor} ${fixingConversion.purchaseUnit}`,
      });
      setFixingConversion(null);
      setFixFactor("");
    } catch (e: any) {
      toast({
        title: "Couldn't save",
        description: e?.message ?? "Try again",
        variant: "destructive",
      });
    } finally {
      setSavingFix(false);
    }
  };

  // Compute how much of this ingredient we'd have to BUY (in purchase units)
  // for one full batch of the recipe, plus per-serving. Returns null if we
  // can't convert — the UI then shows a "missing conversion" warning so the
  // chef can fix the base ingredient in place.
  const computeBuyPreview = (
    component: RecipeComponentItem,
  ): {
    totalBuy: number;
    totalBuyUnit: string;
    perServing: number;
    perServingGrams: number | null;
    error: string | null;
  } | null => {
    const baseIngredient = component.baseIngredient ||
      baseIngredients.find((bi) => bi.id === component.baseIngredientId);
    if (!baseIngredient) return null;
    const yieldAmount = parseFloat(String(form.watch("yield") || 1)) || 1;
    try {
      const totalBuy = convertToPurchaseUnits(
        component.quantity,
        component.unit,
        baseIngredient.purchaseUnit,
        (baseIngredient.unitConversions as Record<string, number>) || undefined,
        baseIngredient.yieldPct != null
          ? parseFloat(baseIngredient.yieldPct)
          : null,
      );
      const perServing = totalBuy / yieldAmount;
      // Try to also express per-serving in grams for chef intuition
      let perServingGrams: number | null = null;
      try {
        perServingGrams = convertToPurchaseUnits(
          perServing,
          baseIngredient.purchaseUnit,
          "gram",
        );
      } catch {
        perServingGrams = null;
      }
      return {
        totalBuy,
        totalBuyUnit: baseIngredient.purchaseUnit,
        perServing,
        perServingGrams,
        error: null,
      };
    } catch (e: any) {
      return {
        totalBuy: 0,
        totalBuyUnit: baseIngredient.purchaseUnit,
        perServing: 0,
        perServingGrams: null,
        error:
          e?.message?.includes("Cannot convert")
            ? "No conversion from this unit to purchase unit"
            : "Conversion failed",
      };
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

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sortField) {
      case "name":
        return a.name.localeCompare(b.name) * dir;
      case "category":
        return (a.category || "").localeCompare(b.category || "") * dir;
      case "yield":
        return ((parseFloat(a.yield as any) || 0) - (parseFloat(b.yield as any) || 0)) * dir;
      case "cost":
        return ((a.totalCost || 0) - (b.totalCost || 0)) * dir;
      default:
        return 0;
    }
  });

  const nextEventLabel = (() => {
    if (!dashboardStats?.upcomingEvents.nextEventDate) return null;
    const d = new Date(dashboardStats.upcomingEvents.nextEventDate);
    if (Number.isNaN(d.getTime())) return null;
    const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (days <= 0) return `${dateStr} (today)`;
    if (days === 1) return `${dateStr} (tomorrow)`;
    return `${dateStr} (in ${days} days)`;
  })();

  const menuLinkagePct = dashboardStats && dashboardStats.menuLinkage.totalRecipes > 0
    ? Math.round((dashboardStats.menuLinkage.linkedRecipes / dashboardStats.menuLinkage.totalRecipes) * 100)
    : 0;

  const coveredDietaryTags = dashboardStats
    ? dashboardStats.dietaryCoverage.byTag.filter(t => t.count > 0)
    : [];

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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* 1. MENU LINKAGE HEALTH */}
          <Card data-testid="card-menu-linkage">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Menu Linkage
              </CardDescription>
              <CardTitle className="text-2xl">
                {dashboardStats
                  ? `${dashboardStats.menuLinkage.linkedRecipes}/${dashboardStats.menuLinkage.totalRecipes}`
                  : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  on menus
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardStats ? (
                <div className="space-y-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${menuLinkagePct}%` }}
                    />
                  </div>
                  {dashboardStats.menuLinkage.orphanCount > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {dashboardStats.menuLinkage.orphanCount} orphan{dashboardStats.menuLinkage.orphanCount !== 1 ? "s" : ""} (not on any menu)
                    </p>
                  )}
                  {dashboardStats.menuLinkage.topUsed.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Most used</p>
                      <ul className="space-y-0.5">
                        {dashboardStats.menuLinkage.topUsed.map(r => (
                          <li key={r.id} className="text-xs flex justify-between gap-2">
                            <span className="truncate">{r.name}</span>
                            <span className="text-muted-foreground shrink-0">{r.menuCount}×</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </CardContent>
          </Card>

          {/* 2. UPCOMING EVENT EXPOSURE */}
          <Card data-testid="card-upcoming-events">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Upcoming Events ({dashboardStats?.upcomingEvents.windowDays ?? 30}d)
              </CardDescription>
              <CardTitle className="text-2xl">
                {dashboardStats?.upcomingEvents.eventCount ?? "—"}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  event{dashboardStats?.upcomingEvents.eventCount === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardStats ? (
                dashboardStats.upcomingEvents.eventCount > 0 ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipes feeding them</span>
                      <span className="font-semibold">{dashboardStats.upcomingEvents.recipeCount}</span>
                    </div>
                    {nextEventLabel && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Next event</span>
                        <span className="font-semibold">{nextEventLabel}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground pt-1 border-t">
                      These recipes are about to hit the kitchen — make sure costs and prep are accurate.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No confirmed events in the next 30 days.</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </CardContent>
          </Card>

          {/* 3. DIETARY COVERAGE */}
          <Card data-testid="card-dietary-coverage">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Leaf className="h-3.5 w-3.5" />
                Dietary Coverage
              </CardDescription>
              <CardTitle className="text-2xl">
                {dashboardStats
                  ? `${dashboardStats.dietaryCoverage.total - dashboardStats.dietaryCoverage.uncertified}/${dashboardStats.dietaryCoverage.total}`
                  : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  certified
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardStats ? (
                <div className="space-y-2">
                  {coveredDietaryTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {coveredDietaryTags.map(t => (
                        <Badge key={t.tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t.label} {t.count}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No recipes certified yet.</p>
                  )}
                  {dashboardStats.dietaryCoverage.uncertified > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1 border-t">
                      <AlertTriangle className="h-3 w-3" />
                      {dashboardStats.dietaryCoverage.uncertified} without any designation
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}
            </CardContent>
          </Card>

          {/* 4. LABOR-HOUR LEADERS */}
          <Card data-testid="card-labor-leaders">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Labor-Hour Leaders
              </CardDescription>
              <CardTitle className="text-2xl">
                {dashboardStats ? `${dashboardStats.laborLeaders.totalHours.toFixed(1)}h` : "—"}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dashboardStats ? (
                dashboardStats.laborLeaders.top.length > 0 ? (
                  <ul className="space-y-1">
                    {dashboardStats.laborLeaders.top.map(r => (
                      <li key={r.id} className="text-xs flex justify-between gap-2">
                        <span className="truncate">{r.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          {r.laborHours.toFixed(1)}h · {formatCurrency(r.laborCost)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No labor hours logged yet.</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">Loading…</p>
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
            ) : sortedRecipes.length === 0 ? (
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
                      <TableHead
                        onClick={() => toggleSort("name")}
                        className="cursor-pointer select-none hover:bg-muted/50"
                        data-testid="header-sort-name"
                      >
                        Recipe Name<SortIcon field="name" />
                      </TableHead>
                      <TableHead
                        onClick={() => toggleSort("category")}
                        className="cursor-pointer select-none hover:bg-muted/50"
                        data-testid="header-sort-category"
                      >
                        Category<SortIcon field="category" />
                      </TableHead>
                      <TableHead
                        onClick={() => toggleSort("yield")}
                        className="cursor-pointer select-none hover:bg-muted/50"
                        data-testid="header-sort-yield"
                      >
                        Yield<SortIcon field="yield" />
                      </TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Dietary</TableHead>
                      <TableHead
                        onClick={() => toggleSort("cost")}
                        className="cursor-pointer select-none hover:bg-muted/50 text-right"
                        data-testid="header-sort-cost"
                      >
                        Total Cost<SortIcon field="cost" />
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecipes.map((recipe) => (
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
                              onClick={() => setDetailRecipe(recipe)}
                              data-testid={`button-view-details-${recipe.id}`}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRecipe(recipe)}
                              data-testid={`button-edit-${recipe.id}`}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRecipe(recipe)}
                              data-testid={`button-delete-${recipe.id}`}
                              title="Delete"
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
                          <TableHead>Buy / Per Person</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipeComponents.map((comp, index) => {
                          const baseIngredient = comp.baseIngredient ||
                            baseIngredients.find((bi) => bi.id === comp.baseIngredientId);
                          const cost = calculateComponentCost(comp);
                          const buyPreview = computeBuyPreview(comp);

                          return (
                            <TableRow key={index} data-testid={`row-component-${index}`}>
                              <TableCell className="font-medium">
                                {baseIngredient?.name || "Unknown"}
                                {baseIngredient?.yieldPct != null &&
                                  parseFloat(baseIngredient.yieldPct) < 1 && (
                                    <Badge
                                      variant="outline"
                                      className="ml-1.5 text-[10px] font-normal"
                                      title={`${Math.round(parseFloat(baseIngredient.yieldPct) * 100)}% yield — buy quantity is scaled up for trim/waste`}
                                    >
                                      yield {Math.round(parseFloat(baseIngredient.yieldPct) * 100)}%
                                    </Badge>
                                  )}
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
                              <TableCell
                                className="text-xs"
                                data-testid={`cell-buy-preview-${index}`}
                              >
                                {!buyPreview ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : buyPreview.error ? (
                                  <button
                                    type="button"
                                    onClick={() => openFixConversion(comp)}
                                    className="flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline decoration-dotted underline-offset-2"
                                    data-testid={`button-fix-conversion-${index}`}
                                    title="Click to teach the system this conversion"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate max-w-[170px]">
                                      Fix conversion
                                    </span>
                                  </button>
                                ) : (
                                  <div className="leading-tight">
                                    <div className="font-medium">
                                      {buyPreview.totalBuy.toFixed(
                                        buyPreview.totalBuy < 1 ? 3 : 2,
                                      )}{" "}
                                      {buyPreview.totalBuyUnit}
                                      <span className="text-muted-foreground font-normal"> total</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      {buyPreview.perServingGrams != null && buyPreview.perServingGrams > 0
                                        ? `${buyPreview.perServingGrams < 1 ? buyPreview.perServingGrams.toFixed(2) : Math.round(buyPreview.perServingGrams)}g / person`
                                        : `${buyPreview.perServing.toFixed(3)} ${buyPreview.totalBuyUnit} / person`}
                                    </div>
                                  </div>
                                )}
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
                        {editingStepIndex === index ? (
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Step Title *</Label>
                                <Input
                                  value={step.title}
                                  onChange={(e) => handleUpdateStep(index, 'title', e.target.value)}
                                  data-testid={`input-edit-step-title-${index}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Duration (seconds)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={step.duration ?? ""}
                                  onChange={(e) => handleUpdateStep(index, 'duration', e.target.value ? parseInt(e.target.value) : undefined)}
                                  data-testid={`input-edit-step-duration-${index}`}
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Instruction *</Label>
                              <Textarea
                                value={step.instruction}
                                onChange={(e) => handleUpdateStep(index, 'instruction', e.target.value)}
                                data-testid={`input-edit-step-instruction-${index}`}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tips (Optional)</Label>
                              <Input
                                value={step.tips ?? ""}
                                onChange={(e) => handleUpdateStep(index, 'tips', e.target.value || undefined)}
                                data-testid={`input-edit-step-tips-${index}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingStepIndex(null)}
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditingStepIndex(index)}>
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
                        )}
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditingStepIndex(editingStepIndex === index ? null : index)}
                            data-testid={`button-edit-step-${index}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveStep(index)}
                            data-testid={`button-remove-step-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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

      {/* Inline conversion fix dialog */}
      <Dialog
        open={!!fixingConversion}
        onOpenChange={(open) => {
          if (!open) {
            setFixingConversion(null);
            setFixFactor("");
          }
        }}
      >
        <DialogContent className="max-w-md" data-testid="dialog-fix-conversion">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-600" />
              Teach the system this conversion
            </DialogTitle>
            <DialogDescription>
              {fixingConversion && (
                <>
                  We don't yet know how to turn{" "}
                  <strong>{fixingConversion.recipeUnit}</strong> of{" "}
                  <strong>{fixingConversion.ingredientName}</strong> into{" "}
                  <strong>{fixingConversion.purchaseUnit}</strong>{" "}
                  (the way you buy it). Set it once and every recipe will use
                  it from now on.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {fixingConversion && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="text-muted-foreground text-xs mb-1">
                  Tip
                </div>
                <p>
                  Put 1 <strong>{fixingConversion.recipeUnit}</strong> of
                  &ldquo;{fixingConversion.ingredientName}&rdquo; on a scale
                  (or quote). How many{" "}
                  <strong>{fixingConversion.purchaseUnit}</strong> is it?
                </p>
                {fixingConversion.recipeUnit.toLowerCase() === "each" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Example: a whole chicken weighs about 4 lb → enter{" "}
                    <code>4</code>
                  </p>
                )}
                {(fixingConversion.recipeUnit.toLowerCase() === "cup" ||
                  fixingConversion.recipeUnit.toLowerCase() === "quart" ||
                  fixingConversion.recipeUnit.toLowerCase() ===
                    "tablespoon") && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Example: 1 cup of ketchup ≈ 0.6 lb → enter <code>0.6</code>
                  </p>
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="fix-factor" className="text-sm">
                    1 {fixingConversion.recipeUnit} =
                  </Label>
                  <Input
                    id="fix-factor"
                    type="number"
                    step="0.001"
                    min="0.001"
                    autoFocus
                    value={fixFactor}
                    onChange={(e) => setFixFactor(e.target.value)}
                    placeholder="e.g., 0.55"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveConversionFix();
                      }
                    }}
                    data-testid="input-fix-factor"
                  />
                </div>
                <div className="pb-2 text-sm text-muted-foreground whitespace-nowrap">
                  {fixingConversion.purchaseUnit}
                </div>
              </div>

              {fixFactor && parseFloat(fixFactor) > 0 && (
                <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40 p-3 text-xs text-green-900 dark:text-green-200">
                  <div className="font-semibold">Preview</div>
                  <div className="mt-1">
                    Cost per {fixingConversion.recipeUnit}:{" "}
                    <strong>
                      {formatCurrency(
                        (parseFloat(fixFactor) *
                          fixingConversion.purchasePrice) /
                          fixingConversion.purchaseQuantity,
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFixingConversion(null);
                setFixFactor("");
              }}
              data-testid="button-cancel-fix"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveConversionFix}
              disabled={savingFix || !fixFactor || parseFloat(fixFactor) <= 0}
              data-testid="button-save-fix"
            >
              {savingFix ? "Saving…" : "Save conversion"}
            </Button>
          </DialogFooter>
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

      {/* Recipe Details View Dialog */}
      <RecipeDetailDialog
        recipe={detailRecipe}
        onClose={() => setDetailRecipe(null)}
        onEdit={(r) => {
          setDetailRecipe(null);
          handleEditRecipe(r);
        }}
      />

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
                              <p className="text-yellow-700 dark:text-yellow-300 mt-1 whitespace-pre-wrap">
                                {linkifyText(viewingRecipe.preparationSteps[activeStepIndex].tips!)}
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

// ── Recipe details dialog (read-only) ────────────────────────────────
function RecipeDetailDialog({
  recipe,
  onClose,
  onEdit,
}: {
  recipe: RecipeWithCost | null;
  onClose: () => void;
  onEdit: (r: RecipeWithCost) => void;
}) {
  const { data: full } = useQuery<any>({
    queryKey: [`/api/ingredients/recipes/${recipe?.id}`],
    enabled: !!recipe,
  });

  const components: any[] = full?.components || [];
  const steps = (recipe?.preparationSteps as PreparationStep[]) || [];
  const dietary = recipe?.dietaryFlags as RecipeDietaryFlags | null;
  const allergenWarnings = dietary?.allergenWarnings || [];
  const manualTags = dietary?.manualDesignations || [];

  return (
    <Dialog open={!!recipe} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-recipe-detail">
        <DialogHeader>
          <DialogTitle>{recipe?.name}</DialogTitle>
          <DialogDescription>Recipe details</DialogDescription>
        </DialogHeader>

        {recipe && (
          <div className="space-y-4 text-sm">
            {recipe.description && (
              <div>
                <div className="text-muted-foreground text-xs uppercase">Description</div>
                <div className="mt-1">{recipe.description}</div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-muted-foreground text-xs uppercase">Category</div>
                <div className="mt-1">
                  <Badge variant="outline">{recipe.category || "—"}</Badge>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Yield</div>
                <div className="mt-1">
                  {recipe.yield} {recipe.yieldUnit || "serving"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Labor Hours</div>
                <div className="mt-1">{recipe.laborHours || "0"}h</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Ingredients</div>
                <div className="mt-1">{recipe.ingredientCount}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-3">
              <div>
                <div className="text-muted-foreground text-xs uppercase">Total Cost</div>
                <div className="mt-1 font-medium">${(recipe.totalCost || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Ingredient Cost</div>
                <div className="mt-1">${(recipe.ingredientCost || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase">Cost / Serving</div>
                <div className="mt-1 font-medium">${(recipe.costPerServing || 0).toFixed(2)}</div>
              </div>
            </div>

            {components.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs uppercase mb-2">Ingredients</div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Prep Notes</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {components.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.baseIngredient?.name || "—"}</TableCell>
                          <TableCell>{c.quantity}</TableCell>
                          <TableCell>{c.unit}</TableCell>
                          <TableCell className="text-muted-foreground">{c.prepNotes || "—"}</TableCell>
                          <TableCell className="text-right">
                            ${parseFloat(c.calculatedCost ?? "0").toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {steps.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs uppercase mb-2">Preparation Steps</div>
                <ol className="space-y-2">
                  {steps
                    .slice()
                    .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
                    .map((s, idx) => (
                      <li key={idx} className="flex gap-3 border rounded-md p-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                          {s.stepNumber || idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{s.title}</div>
                          {s.instruction && <div className="text-muted-foreground mt-1">{s.instruction}</div>}
                          {s.duration ? (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {s.duration} min
                            </div>
                          ) : null}
                          {(s as any).tips && (
                            <div className="text-xs italic text-amber-700 mt-1 flex gap-1">
                              <Lightbulb className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span>{linkifyText((s as any).tips)}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                </ol>
              </div>
            )}

            {(allergenWarnings.length > 0 || manualTags.length > 0) && (
              <div>
                <div className="text-muted-foreground text-xs uppercase mb-2">Dietary Flags</div>
                <div className="flex flex-wrap gap-1">
                  {allergenWarnings.map((w) => (
                    <Badge key={`a-${w}`} variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" /> contains {w}
                    </Badge>
                  ))}
                  {manualTags.map((t) => (
                    <Badge key={`m-${t}`} variant="secondary" className="text-xs">
                      <Leaf className="h-3 w-3 mr-1" /> {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {recipe.notes && (
              <div>
                <div className="text-muted-foreground text-xs uppercase">Notes</div>
                <div className="mt-1 whitespace-pre-wrap">{recipe.notes}</div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-detail">
            Close
          </Button>
          {recipe && (
            <Button onClick={() => onEdit(recipe)} data-testid="button-edit-from-detail">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
