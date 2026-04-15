import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GripVertical, X, Plus, Save, Trash2, Search, ChefHat } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { insertMenuSchema, type Recipe, type MenuRecipeItem, LIFESTYLE_TAGS, ALLERGEN_CONTAINS_TAGS } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface RecipeForMenu {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  totalCost?: number;
  dietaryFlags?: {
    allergenWarnings: string[];
    manualDesignations: string[];
  };
}

const formSchema = z.object({
  name: z.string().min(1, "Menu name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Menu type is required"),
  eventType: z.string().default("other"),
  displayOnCustomerForm: z.boolean().optional(),
  isPubliclyVisible: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MenuBuilderProps {
  menu?: any;
  isEditing?: boolean;
}

const RECIPE_CATEGORIES = [
  { value: "appetizer", label: "Appetizers" },
  { value: "entree", label: "Main Courses" },
  { value: "side", label: "Sides" },
  { value: "dessert", label: "Desserts" },
  { value: "beverage", label: "Beverages" },
  { value: "sauce", label: "Sauces" },
  { value: "salad", label: "Salads" },
];

const getCategoryLabel = (category: string | null): string => {
  if (!category) return "Uncategorized";
  const found = RECIPE_CATEGORIES.find(c => c.value === category);
  return found?.label || category.charAt(0).toUpperCase() + category.slice(1);
};

function SortableRecipeItem({ 
  recipe, 
  menuRecipe,
  onCategoryChange, 
  onRemove
}: { 
  recipe: RecipeForMenu;
  menuRecipe: MenuRecipeItem;
  onCategoryChange: (recipeId: number, category: string) => void;
  onRemove: (recipeId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: recipe.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const allergenWarnings = recipe.dietaryFlags?.allergenWarnings || [];
  const manualDesignations = recipe.dietaryFlags?.manualDesignations || [];

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-2 bg-white p-3 border rounded-md mb-2"
      data-testid={`sortable-recipe-${recipe.id}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-orange-500" />
          {recipe.name}
        </div>
        <div className="text-sm text-gray-500">
          {getCategoryLabel(recipe.category)}
          {recipe.totalCost !== undefined && (
            <span className="ml-2 text-green-600">
              Cost: {formatCurrency(recipe.totalCost)}
            </span>
          )}
        </div>
        {recipe.description && (
          <div className="text-xs text-gray-400 mt-1 line-clamp-1">
            {recipe.description}
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
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
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select 
          value={menuRecipe.category || recipe.category || "entree"} 
          onValueChange={(value) => onCategoryChange(recipe.id, value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECIPE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={() => onRemove(recipe.id)} data-testid={`button-remove-recipe-${recipe.id}`}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

export default function MenuBuilder({ menu, isEditing = false }: MenuBuilderProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const getMenuRecipes = (): MenuRecipeItem[] => {
    if (!menu || !menu.recipes) return [];
    try {
      const recipesData = typeof menu.recipes === 'string' 
        ? JSON.parse(menu.recipes) 
        : menu.recipes;
      return Array.isArray(recipesData) ? recipesData : [];
    } catch (error) {
      console.error("Error parsing menu recipes:", error);
      return [];
    }
  };

  const [selectedRecipes, setSelectedRecipes] = useState<MenuRecipeItem[]>(getMenuRecipes());
  const [recipeSearch, setRecipeSearch] = useState("");
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false);
  const [pendingRecipeIds, setPendingRecipeIds] = useState<Set<number>>(new Set());
  
  const { data: recipes = [], isLoading: isLoadingRecipes } = useQuery({
    queryKey: ["/api/ingredients/recipes"],
  }) as { data: RecipeForMenu[], isLoading: boolean };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: menu?.name || "",
      description: menu?.description || "",
      type: menu?.type || "standard",
      eventType: menu?.eventType || "other",
      displayOnCustomerForm: menu?.displayOnCustomerForm || false,
      isPubliclyVisible: menu?.isPubliclyVisible ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/menus", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu created",
        description: "The menu has been created successfully.",
      });
      navigate("/menus");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create menu",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/menus/${menu.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus", menu.id] });
      toast({
        title: "Menu updated",
        description: "The menu has been updated successfully.",
      });
      navigate("/menus");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    const menuData = {
      ...data,
      recipes: selectedRecipes,
    };

    if (isEditing) {
      updateMutation.mutate(menuData);
    } else {
      createMutation.mutate(menuData);
    }
  };

  const togglePendingRecipe = (recipeId: number) => {
    setPendingRecipeIds(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleAddPendingRecipes = () => {
    if (pendingRecipeIds.size === 0) return;

    const toAdd: MenuRecipeItem[] = [];
    pendingRecipeIds.forEach(id => {
      if (selectedRecipes.some(r => r.recipeId === id)) return;
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return;
      toAdd.push({
        recipeId: recipe.id,
        category: recipe.category || undefined,
      });
    });

    if (toAdd.length === 0) return;

    setSelectedRecipes([...selectedRecipes, ...toAdd]);
    setPendingRecipeIds(new Set());
    setRecipeSearch("");
    setShowRecipeDropdown(false);
    toast({
      title: `${toAdd.length} recipe${toAdd.length === 1 ? "" : "s"} added`,
    });
  };

  const handleSelectAllVisible = () => {
    setPendingRecipeIds(prev => {
      const next = new Set(prev);
      visibleAvailableRecipes.forEach(r => next.add(r.id));
      return next;
    });
  };

  const handleClearPending = () => {
    setPendingRecipeIds(new Set());
  };

  const handleRemoveRecipe = (recipeId: number) => {
    setSelectedRecipes(selectedRecipes.filter(r => r.recipeId !== recipeId));
  };

  const handleCategoryChange = (recipeId: number, category: string) => {
    setSelectedRecipes(selectedRecipes.map(r => 
      r.recipeId === recipeId ? { ...r, category } : r
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSelectedRecipes((items) => {
        const oldIndex = items.findIndex(item => item.recipeId === active.id);
        const newIndex = items.findIndex(item => item.recipeId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const availableRecipes = recipes.filter(recipe =>
    !selectedRecipes.some(r => r.recipeId === recipe.id) &&
    recipe.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const visibleAvailableRecipes = availableRecipes.slice(0, 10);

  const selectedRecipeDetails = selectedRecipes.map(menuRecipe => ({
    menuRecipe,
    recipe: recipes.find(r => r.id === menuRecipe.recipeId),
  })).filter(item => item.recipe) as { menuRecipe: MenuRecipeItem; recipe: RecipeForMenu }[];

  const totalCost = selectedRecipeDetails.reduce((sum, { recipe }) => 
    sum + (recipe.totalCost || 0), 0
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-6 w-6" />
          {isEditing ? "Edit Menu" : "Create New Menu"}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter menu name" {...field} data-testid="input-menu-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-menu-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
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
                      placeholder="Describe this menu..." 
                      {...field} 
                      value={field.value || ""}
                      data-testid="input-menu-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-event-type">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="graduation">Graduation</SelectItem>
                      <SelectItem value="holiday_party">Holiday Party</SelectItem>
                      <SelectItem value="fundraiser">Fundraiser</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="displayOnCustomerForm"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-display-on-form"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Show on customer inquiry form</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPubliclyVisible"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-publicly-visible"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Publicly visible</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Menu Recipes
                <Badge variant="secondary" className="ml-2">
                  {selectedRecipes.length} recipes
                </Badge>
                {totalCost > 0 && (
                  <Badge variant="outline" className="ml-2 text-green-600">
                    Total Cost: {formatCurrency(totalCost)}
                  </Badge>
                )}
              </h3>

              <div className="relative mb-4">
                <div className="relative">
                  <Input
                    placeholder="Search recipes to add..."
                    value={recipeSearch}
                    onChange={(e) => {
                      setRecipeSearch(e.target.value);
                      setShowRecipeDropdown(true);
                    }}
                    onFocus={() => setShowRecipeDropdown(true)}
                    data-testid="input-search-recipe"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {showRecipeDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-input rounded-md shadow-lg z-10 max-h-80 overflow-hidden flex flex-col">
                    {isLoadingRecipes ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Loading recipes...
                      </div>
                    ) : availableRecipes.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {recipes.length === 0
                          ? "No recipes available. Create recipes first."
                          : "All recipes added or no matches"}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 text-xs">
                          <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={handleSelectAllVisible}
                            data-testid="button-select-all-recipes"
                          >
                            Select all ({visibleAvailableRecipes.length})
                          </button>
                          {pendingRecipeIds.size > 0 && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:underline"
                              onClick={handleClearPending}
                              data-testid="button-clear-pending-recipes"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto flex-1">
                          {visibleAvailableRecipes.map((recipe) => {
                            const checked = pendingRecipeIds.has(recipe.id);
                            return (
                              <label
                                key={recipe.id}
                                className="flex items-start gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                data-testid={`dropdown-recipe-${recipe.id}`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => togglePendingRecipe(recipe.id)}
                                  className="mt-1"
                                  data-testid={`checkbox-recipe-${recipe.id}`}
                                />
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    <ChefHat className="h-4 w-4 text-orange-500" />
                                    {recipe.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {getCategoryLabel(recipe.category)}
                                    {recipe.totalCost !== undefined && (
                                      <span className="ml-2 text-green-600">
                                        {formatCurrency(recipe.totalCost)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t bg-muted/20">
                          <span className="text-xs text-muted-foreground">
                            {pendingRecipeIds.size} selected
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowRecipeDropdown(false);
                                setPendingRecipeIds(new Set());
                              }}
                              data-testid="button-cancel-add-recipes"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={pendingRecipeIds.size === 0}
                              onClick={handleAddPendingRecipes}
                              data-testid="button-add-selected-recipes"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add {pendingRecipeIds.size > 0 ? pendingRecipeIds.size : ""}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {selectedRecipeDetails.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedRecipeDetails.map(({ recipe }) => recipe.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {selectedRecipeDetails.map(({ menuRecipe, recipe }) => (
                      <SortableRecipeItem
                        key={recipe.id}
                        recipe={recipe}
                        menuRecipe={menuRecipe}
                        onCategoryChange={handleCategoryChange}
                        onRemove={handleRemoveRecipe}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recipes added yet</p>
                  <p className="text-sm">Search and add recipes above to build your menu</p>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/menus")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-menu"
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Update Menu" : "Create Menu"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
