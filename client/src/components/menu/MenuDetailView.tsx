import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type MenuRecipeItem, LIFESTYLE_TAGS } from '@shared/schema';

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

interface MenuDetailViewProps {
  menu: any;
  onUpdate?: () => void;
}

const RECIPE_CATEGORIES = [
  { value: "appetizer", label: "Appetizers" },
  { value: "entree", label: "Main Courses" },
  { value: "side", label: "Sides" },
  { value: "dessert", label: "Desserts" },
  { value: "beverage", label: "Beverages" },
  { value: "sauce", label: "Sauces" },
  { value: "salad", label: "Salads" },
  { value: "condiment", label: "Condiments" },
  { value: "salsa", label: "Salsas" },
];

const getCategoryLabel = (category: string | null | undefined): string => {
  if (!category) return "Uncategorized";
  const found = RECIPE_CATEGORIES.find(c => c.value === category);
  return found?.label || category.charAt(0).toUpperCase() + category.slice(1);
};

export default function MenuDetailView({ menu, onUpdate }: MenuDetailViewProps) {
  const { data: allRecipes = [] } = useQuery({
    queryKey: ['/api/ingredients/recipes'],
  }) as { data: RecipeForMenu[] };

  const menuRecipes = useMemo((): MenuRecipeItem[] => {
    if (!menu?.recipes) return [];
    
    try {
      const recipesData = typeof menu.recipes === 'string' 
        ? JSON.parse(menu.recipes) 
        : menu.recipes;
      
      return Array.isArray(recipesData) ? recipesData : [];
    } catch (error) {
      console.error("Error parsing menu recipes:", error);
      return [];
    }
  }, [menu?.recipes]);

  const recipesWithDetails = useMemo(() => {
    return menuRecipes.map((menuRecipe) => {
      const recipe = allRecipes.find((r) => r.id === menuRecipe.recipeId);
      return {
        menuRecipe,
        recipe,
      };
    }).filter(item => item.recipe) as { menuRecipe: MenuRecipeItem; recipe: RecipeForMenu }[];
  }, [menuRecipes, allRecipes]);

  const recipesByCategory = useMemo(() => {
    const grouped: Record<string, { menuRecipe: MenuRecipeItem; recipe: RecipeForMenu }[]> = {};
    
    recipesWithDetails.forEach((item) => {
      const category = item.menuRecipe.category || item.recipe.category || "uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }, [recipesWithDetails]);

  const totalCost = recipesWithDetails.reduce((sum, { recipe }) => 
    sum + (recipe.totalCost || 0), 0
  );

  const eventTypeLabels: Record<string, string> = {
    wedding: "Wedding",
    corporate: "Corporate",
    birthday: "Birthday",
    anniversary: "Anniversary",
    graduation: "Graduation",
    holiday_party: "Holiday Party",
    fundraiser: "Fundraiser",
    conference: "Conference",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ChefHat className="h-6 w-6" />
              {menu.name}
            </span>
            <div className="flex gap-2">
              <Badge variant="outline">{menu.type}</Badge>
              {menu.eventType && (
                <Badge variant="secondary">
                  {eventTypeLabels[menu.eventType] || menu.eventType}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {menu.description && (
            <p className="text-muted-foreground mb-4">{menu.description}</p>
          )}
          
          <div className="flex gap-4 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">Recipes: </span>
              <span className="font-medium">{recipesWithDetails.length}</span>
            </div>
            {totalCost > 0 && (
              <div>
                <span className="text-muted-foreground">Total Cost: </span>
                <span className="font-medium text-green-600">{formatCurrency(totalCost)}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Visible: </span>
              <span className="font-medium">{menu.isPubliclyVisible ? "Yes" : "No"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">On Inquiry Form: </span>
              <span className="font-medium">{menu.displayOnCustomerForm ? "Yes" : "No"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.keys(recipesByCategory).length > 0 ? (
        Object.entries(recipesByCategory).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{getCategoryLabel(category)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map(({ menuRecipe, recipe }) => {
                  const allergenWarnings = recipe.dietaryFlags?.allergenWarnings || [];
                  const manualDesignations = recipe.dietaryFlags?.manualDesignations || [];
                  
                  return (
                    <div 
                      key={recipe.id} 
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                      data-testid={`menu-recipe-${recipe.id}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-orange-500" />
                          {recipe.name}
                        </div>
                        {recipe.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {manualDesignations.map((tag) => {
                            const tagInfo = LIFESTYLE_TAGS.find((t) => t.value === tag);
                            return (
                              <Badge key={tag} variant="default" className="text-xs bg-green-600">
                                {tagInfo?.label || tag}
                              </Badge>
                            );
                          })}
                          {allergenWarnings.map((warning) => (
                            <Badge key={warning} variant="destructive" className="text-xs">
                              {warning}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        {recipe.totalCost !== undefined && recipe.totalCost > 0 && (
                          <div className="text-green-600 font-medium">
                            {formatCurrency(recipe.totalCost)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No recipes in this menu yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
