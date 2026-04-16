import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Info, Heart, AlertTriangle } from "lucide-react";
import { 
  useWeddingMenuThemes, 
  useMenuItemsByCategory,
  useDietaryRecommendations,
  type EnrichedMenuItem,
  formatNutritionalInfo,
  checkDietaryCompatibility
} from "@/hooks/useMenuData";

interface EnhancedMenuSelectionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const EnhancedMenuSelectionStep: React.FC<EnhancedMenuSelectionStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch } = useFormContext();
  
  // Watch for dietary restrictions to provide recommendations
  const dietaryRestrictions = watch("dietaryRestrictions") || {};
  
  // State for filtering and display
  const [selectedCategory, setSelectedCategory] = useState<string>("appetizer");
  const [showDietaryInfo, setShowDietaryInfo] = useState<Record<string, boolean>>({});
  
  // Fetch rich menu data from database
  const { data: menuThemes, isLoading: themesLoading } = useWeddingMenuThemes();
  const { data: categoryItems, isLoading: itemsLoading } = useMenuItemsByCategory(selectedCategory);
  
  // Get dietary recommendations based on user preferences
  const userDietaryPrefs = Object.keys(dietaryRestrictions).filter(key => dietaryRestrictions[key]);
  const { data: recommendedItems } = useDietaryRecommendations(
    userDietaryPrefs,
    [], // We'll handle allergens separately
    selectedCategory
  );

  const categories = [
    { key: "appetizer", label: "Appetizers", icon: "🥗" },
    { key: "entree", label: "Main Courses", icon: "🍽️" },
    { key: "side", label: "Side Dishes", icon: "🥖" },
    { key: "dessert", label: "Desserts", icon: "🍰" },
    { key: "beverage", label: "Beverages", icon: "🥂" }
  ];

  const toggleDietaryInfo = (itemId: string) => {
    setShowDietaryInfo(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const renderDietaryBadges = (item: EnrichedMenuItem) => {
    const badges: React.ReactElement[] = [];

    // Basic dietary flags
    if (item.isVegetarian) badges.push(<Badge key="veg" variant="secondary" className="bg-green-100 text-green-800">Vegetarian</Badge>);
    if (item.isVegan) badges.push(<Badge key="vegan" variant="secondary" className="bg-green-100 text-green-800">Vegan</Badge>);
    if (item.isGlutenFree) badges.push(<Badge key="gf" variant="secondary" className="bg-blue-100 text-blue-800">Gluten-Free</Badge>);
    if (item.isDairyFree) badges.push(<Badge key="df" variant="secondary" className="bg-purple-100 text-purple-800">Dairy-Free</Badge>);
    if (item.isNutFree) badges.push(<Badge key="nf" variant="secondary" className="bg-orange-100 text-orange-800">Nut-Free</Badge>);

    // Rich dietary flags
    item.dietaryFlags.forEach(flag => {
      if (!badges.find(b => b.key === flag)) {
        badges.push(<Badge key={flag} variant="outline" className="text-xs">{flag.replace('_', ' ')}</Badge>);
      }
    });
    
    return badges;
  };

  const renderNutritionalInfo = (item: EnrichedMenuItem) => {
    const nutritionData = formatNutritionalInfo(item.nutritionalHighlights);
    
    if (Object.keys(nutritionData).length === 0) return null;
    
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <h5 className="font-medium text-sm mb-2">Nutritional Information</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(nutritionData).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCompatibilityIndicator = (item: EnrichedMenuItem) => {
    const compatibility = checkDietaryCompatibility(item, userDietaryPrefs, []);
    
    if (userDietaryPrefs.length === 0) return null;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${compatibility.compatible ? 'text-green-600' : 'text-red-600'}`}>
        {compatibility.compatible ? (
          <>
            <Heart className="w-3 h-3" />
            <span>Great match for your preferences!</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-3 h-3" />
            <span>{compatibility.reason}</span>
          </>
        )}
      </div>
    );
  };

  const renderMenuItem = (item: EnrichedMenuItem) => (
    <Card key={item.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            {item.description && (
              <CardDescription className="mt-1">{item.description}</CardDescription>
            )}
          </div>
          <div className="text-right">
            {item.price > 0 && (
              <div className="text-lg font-semibold">${item.price.toFixed(2)}</div>
            )}
            {item.upcharge > 0 && (
              <div className="text-sm text-orange-600">+${item.upcharge.toFixed(2)} upcharge</div>
            )}
          </div>
        </div>
        
        {/* Dietary badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {renderDietaryBadges(item)}
        </div>
        
        {/* Compatibility indicator */}
        {renderCompatibilityIndicator(item)}
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Customer guidance */}
        {item.customerGuidance && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{item.customerGuidance}</p>
          </div>
        )}
        
        {/* Preparation notes */}
        {item.preparationNotes && (
          <div className="mb-3">
            <p className="text-xs text-gray-600">
              <strong>Preparation:</strong> {item.preparationNotes}
            </p>
          </div>
        )}
        
        {/* Allergen alerts */}
        {item.allergenAlerts.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-red-600">
              <strong>Allergen Alert:</strong> {item.allergenAlerts.join(", ")}
            </p>
          </div>
        )}
        
        {/* Toggle for detailed nutritional info */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => toggleDietaryInfo(item.id)}
          className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
        >
          <Info className="w-3 h-3 mr-1" />
          {showDietaryInfo[item.id] ? 'Hide' : 'Show'} Nutritional Details
        </Button>
        
        {/* Detailed nutritional information */}
        {showDietaryInfo[item.id] && renderNutritionalInfo(item)}
        
        {/* Available lot sizes for catering */}
        {item.availableLotSizes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-1">Available serving sizes:</p>
            <div className="flex gap-1">
              {item.availableLotSizes.map(size => (
                <Badge key={size} variant="outline" className="text-xs">{size} servings</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (themesLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">Loading menu themes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Select Your Wedding Menu</h2>
        <p className="text-gray-600">
          Choose from our curated menu options with detailed dietary and nutritional information
        </p>
      </div>

      {/* Menu theme selection */}
      {menuThemes && menuThemes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Menu Themes</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {menuThemes.map(theme => (
              <Card key={theme.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{theme.name}</CardTitle>
                  <CardDescription>{theme.description}</CardDescription>
                  {theme.packages.map(pkg => (
                    <div key={pkg.id} className="mt-2">
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-gray-600">${pkg.price} per person</div>
                      {pkg.minGuestCount && (
                        <div className="text-xs text-gray-500">Minimum {pkg.minGuestCount} guests</div>
                      )}
                    </div>
                  ))}
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Browse Menu Items by Category</h3>
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Button
              key={category.key}
              variant={selectedCategory === category.key ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.key)}
              className="flex items-center gap-2"
            >
              <span>{category.icon}</span>
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu items display */}
      <div className="space-y-4">
        {itemsLoading ? (
          <div className="text-center">Loading menu items...</div>
        ) : categoryItems && categoryItems.length > 0 ? (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {/* Show recommended items first if user has dietary preferences */}
              {userDietaryPrefs.length > 0 && recommendedItems && recommendedItems.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-green-700 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Recommended for your dietary preferences
                  </h4>
                  {recommendedItems.slice(0, 3).map(renderMenuItem)}
                </div>
              )}
              
              {/* All items in category */}
              <div className="space-y-4">
                <h4 className="font-medium">All {categories.find(c => c.key === selectedCategory)?.label}</h4>
                {categoryItems.map(renderMenuItem)}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-gray-500">
            No menu items found for this category
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EnhancedMenuSelectionStep;