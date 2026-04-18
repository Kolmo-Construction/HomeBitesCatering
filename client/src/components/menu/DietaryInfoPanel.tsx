import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Leaf, 
  Wheat, 
  Milk, 
  Nut, 
  Utensils, 
  AlertTriangle,
  Heart,
  Zap,
  Scale
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  dietaryFlags: string[];
  allergenAlerts: string[];
  nutritionalHighlights: {
    calories?: { min: number; max: number; unit: string };
    protein?: { min: number; max: number; unit: string };
    fat?: { min: number; max: number; unit: string };
    carbs?: { min: number; max: number; unit: string };
    fiber?: { min: number; max: number; unit: string };
  };
}

interface DietaryInfoPanelProps {
  selectedItems: MenuItem[];
}

const DietaryInfoPanel: React.FC<DietaryInfoPanelProps> = ({ selectedItems }) => {
  // Calculate dietary summary
  const dietarySummary = {
    totalItems: selectedItems.length,
    vegetarian: selectedItems.filter(item => item.isVegetarian).length,
    vegan: selectedItems.filter(item => item.isVegan).length,
    glutenFree: selectedItems.filter(item => item.isGlutenFree).length,
    dairyFree: selectedItems.filter(item => item.isDairyFree).length,
    nutFree: selectedItems.filter(item => item.isNutFree).length
  };

  // Collect all allergen alerts
  const allergenAlerts = [
    ...new Set(
      selectedItems.flatMap(item => item.allergenAlerts || [])
    )
  ];

  // Collect dietary flags
  const dietaryFlags = [
    ...new Set(
      selectedItems.flatMap(item => item.dietaryFlags || [])
    )
  ];

  // Calculate nutritional quotes
  const nutritionalQuote = selectedItems.reduce((acc, item) => {
    const nutrition = item.nutritionalHighlights || {};
    
    if (nutrition.calories) {
      acc.calories.min += nutrition.calories.min;
      acc.calories.max += nutrition.calories.max;
    }
    if (nutrition.protein) {
      acc.protein.min += nutrition.protein.min;
      acc.protein.max += nutrition.protein.max;
    }
    if (nutrition.fat) {
      acc.fat.min += nutrition.fat.min;
      acc.fat.max += nutrition.fat.max;
    }
    if (nutrition.carbs) {
      acc.carbs.min += nutrition.carbs.min;
      acc.carbs.max += nutrition.carbs.max;
    }
    
    return acc;
  }, {
    calories: { min: 0, max: 0 },
    protein: { min: 0, max: 0 },
    fat: { min: 0, max: 0 },
    carbs: { min: 0, max: 0 }
  });

  const getDietaryIcon = (type: string) => {
    switch (type) {
      case 'vegetarian':
        return <Leaf className="h-4 w-4 text-green-600" />;
      case 'vegan':
        return <Leaf className="h-4 w-4 text-emerald-600" />;
      case 'glutenFree':
        return <Wheat className="h-4 w-4 text-amber-600" />;
      case 'dairyFree':
        return <Milk className="h-4 w-4 text-blue-600" />;
      case 'nutFree':
        return <Nut className="h-4 w-4 text-orange-600" />;
      default:
        return <Utensils className="h-4 w-4" />;
    }
  };

  const getDietaryLabel = (type: string) => {
    switch (type) {
      case 'vegetarian':
        return 'Vegetarian';
      case 'vegan':
        return 'Vegan';
      case 'glutenFree':
        return 'Gluten Free';
      case 'dairyFree':
        return 'Dairy Free';
      case 'nutFree':
        return 'Nut Free';
      default:
        return type;
    }
  };

  const getDietaryPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  if (selectedItems.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Dietary Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Select menu items to see dietary information and nutritional quotes
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500" />
          Dietary Information
          <Badge variant="secondary" className="ml-auto">
            {selectedItems.length} items selected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dietary Compatibility */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Dietary Compatibility
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(dietarySummary).map(([key, count]) => {
              if (key === 'totalItems') return null;
              const percentage = getDietaryPercentage(count, dietarySummary.totalItems);
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getDietaryIcon(key)}
                      <span className="text-sm font-medium">
                        {getDietaryLabel(key)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {count}/{dietarySummary.totalItems}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {percentage}% compatible
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Allergen Alerts */}
        {allergenAlerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Allergen Alerts
            </h4>
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-amber-800">
                    Please review the following allergen information:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {allergenAlerts.map((alert, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="border-amber-300 text-amber-800 bg-amber-100"
                      >
                        {alert}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Dietary Flags */}
        {dietaryFlags.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Dietary Features
            </h4>
            <div className="flex flex-wrap gap-2">
              {dietaryFlags.map((flag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="bg-green-100 text-green-800 border-green-300"
                >
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Nutritional Quotes */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Estimated Nutritional Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {nutritionalQuote.calories.max > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border">
                <Zap className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="text-sm font-medium">Calories</p>
                  <p className="text-lg font-bold text-rose-600">
                    {nutritionalQuote.calories.min}-{nutritionalQuote.calories.max}
                  </p>
                </div>
              </div>
            )}
            
            {nutritionalQuote.protein.max > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                <Scale className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Protein</p>
                  <p className="text-lg font-bold text-blue-600">
                    {nutritionalQuote.protein.min}-{nutritionalQuote.protein.max}g
                  </p>
                </div>
              </div>
            )}
            
            {nutritionalQuote.fat.max > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border">
                <Utensils className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Fat</p>
                  <p className="text-lg font-bold text-amber-600">
                    {nutritionalQuote.fat.min}-{nutritionalQuote.fat.max}g
                  </p>
                </div>
              </div>
            )}
            
            {nutritionalQuote.carbs.max > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border">
                <Wheat className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Carbs</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {nutritionalQuote.carbs.min}-{nutritionalQuote.carbs.max}g
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Items List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Selected Items
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex gap-1">
                  {item.isVegan && <Leaf className="h-3 w-3 text-emerald-600" />}
                  {item.isVegetarian && !item.isVegan && <Leaf className="h-3 w-3 text-green-600" />}
                  {item.isGlutenFree && <Wheat className="h-3 w-3 text-amber-600" />}
                  {item.isDairyFree && <Milk className="h-3 w-3 text-blue-600" />}
                  {item.isNutFree && <Nut className="h-3 w-3 text-orange-600" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DietaryInfoPanel;