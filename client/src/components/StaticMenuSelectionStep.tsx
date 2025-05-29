import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Info, Heart, AlertTriangle } from "lucide-react";

// Import the pre-generated menu data (no API calls needed!)
import menuThemes from "@/data/generated/menuThemes.json";
import appetizerItems from "@/data/generated/menuItems_appetizer.json";
import entreeItems from "@/data/generated/menuItems_entree.json";
import sideItems from "@/data/generated/menuItems_side.json";
import dessertItems from "@/data/generated/menuItems_dessert.json";
import beverageItems from "@/data/generated/menuItems_beverage.json";

// Create category mapping
const categoryData = {
  appetizer: appetizerItems,
  entree: entreeItems,
  side: sideItems,
  dessert: dessertItems,
  beverage: beverageItems
};

// Utility functions
function getMenuItemsByCategory(category: string) {
  return categoryData[category as keyof typeof categoryData] || [];
}

function filterMenuItemsByDietary(items: any[], dietaryPrefs: string[] = [], allergens: string[] = []) {
  return items.filter(item => {
    if (allergens.length > 0) {
      const hasRestrictedAllergen = item.allergenAlerts?.some((allergen: string) =>
        allergens.some(userAllergen =>
          allergen.toLowerCase().includes(userAllergen.toLowerCase())
        )
      );
      if (hasRestrictedAllergen) return false;
    }
    
    if (dietaryPrefs.length > 0) {
      const suitsPreferences = dietaryPrefs.some(pref => {
        const prefLower = pref.toLowerCase();
        switch (prefLower) {
          case 'vegetarian': return item.isVegetarian;
          case 'vegan': return item.isVegan;
          case 'gluten_free': return item.isGlutenFree;
          case 'dairy_free': return item.isDairyFree;
          case 'nut_free': return item.isNutFree;
        }
        return item.suitableForDiets?.some((diet: string) =>
          diet.toLowerCase().includes(prefLower)
        );
      });
      if (!suitsPreferences) return false;
    }
    return true;
  });
}

interface StaticMenuSelectionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const StaticMenuSelectionStep: React.FC<StaticMenuSelectionStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch } = useFormContext();
  
  // Watch for dietary restrictions to provide recommendations
  const dietaryRestrictions = watch("dietaryRestrictions") || {};
  
  // State for filtering and display
  const [selectedCategory, setSelectedCategory] = useState<string>("appetizer");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showDietaryInfo, setShowDietaryInfo] = useState<Record<string, boolean>>({});
  
  // Get menu data from pre-generated static files
  const categoryItems = getMenuItemsByCategory(selectedCategory);
  
  // Get dietary recommendations based on user preferences
  const userDietaryPrefs = Object.keys(dietaryRestrictions).filter(key => dietaryRestrictions[key]);
  const recommendedItems = filterMenuItemsByDietary(categoryItems, userDietaryPrefs, []);

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

  const formatNutritionalInfo = (highlights: any) => {
    const formatted: Record<string, string> = {};
    
    Object.entries(highlights).forEach(([key, value]: [string, any]) => {
      if (value && value.min !== undefined && value.max !== undefined) {
        formatted[key] = `${value.min}-${value.max} ${value.unit}`;
      }
    });
    
    return formatted;
  };

  const checkDietaryCompatibility = (item: any, userPreferences: string[]) => {
    if (userPreferences.length === 0) return { compatible: true, reason: null };
    
    // Check if item meets dietary requirements
    const meetsPreferences = userPreferences.some(pref => {
      const prefLower = pref.toLowerCase();
      
      // Check basic flags
      switch (prefLower) {
        case 'vegetarian': return item.isVegetarian;
        case 'vegan': return item.isVegan;
        case 'gluten_free': return item.isGlutenFree;
        case 'dairy_free': return item.isDairyFree;
        case 'nut_free': return item.isNutFree;
      }
      
      // Check suitable diet preferences
      return item.suitableForDiets.some((diet: string) =>
        diet.toLowerCase().includes(prefLower)
      );
    });
    
    if (!meetsPreferences) {
      return { compatible: false, reason: 'Does not match dietary preferences' };
    }
    
    return { compatible: true, reason: null };
  };

  const renderDietaryBadges = (item: any) => {
    const badges = [];
    
    // Basic dietary flags
    if (item.isVegetarian) badges.push(<Badge key="veg" variant="secondary" className="bg-green-100 text-green-800">Vegetarian</Badge>);
    if (item.isVegan) badges.push(<Badge key="vegan" variant="secondary" className="bg-green-100 text-green-800">Vegan</Badge>);
    if (item.isGlutenFree) badges.push(<Badge key="gf" variant="secondary" className="bg-blue-100 text-blue-800">Gluten-Free</Badge>);
    if (item.isDairyFree) badges.push(<Badge key="df" variant="secondary" className="bg-purple-100 text-purple-800">Dairy-Free</Badge>);
    if (item.isNutFree) badges.push(<Badge key="nf" variant="secondary" className="bg-orange-100 text-orange-800">Nut-Free</Badge>);
    
    // Rich dietary flags
    item.dietaryFlags.forEach((flag: string) => {
      if (!badges.find(b => b.key === flag)) {
        badges.push(<Badge key={flag} variant="outline" className="text-xs">{flag.replace('_', ' ')}</Badge>);
      }
    });
    
    return badges;
  };

  const renderNutritionalInfo = (item: any) => {
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

  const renderCompatibilityIndicator = (item: any) => {
    const compatibility = checkDietaryCompatibility(item, userDietaryPrefs);
    
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

  const renderMenuItem = (item: any) => (
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
        {item.allergenAlerts && item.allergenAlerts.length > 0 && (
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
        {item.availableLotSizes && item.availableLotSizes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-1">Available serving sizes:</p>
            <div className="flex gap-1">
              {item.availableLotSizes.map((size: number) => (
                <Badge key={size} variant="outline" className="text-xs">{size} servings</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Select Your Wedding Menu</h2>
        <p className="text-gray-600">
          Choose from our curated menu options with detailed dietary and nutritional information
        </p>
      </div>

      {/* Wedding Theme Menus */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Choose Your Wedding Menu Theme</h3>
        <p className="text-gray-600 mb-6">
          Select one of our curated wedding themes, each featuring authentic dishes with detailed dietary and nutritional information.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Taste of Italy Wedding Theme */}
          <Card 
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 rounded-lg ${
              selectedTheme === 'italy' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedTheme(selectedTheme === 'italy' ? null : 'italy')}
          >
            <CardHeader className="bg-red-50 p-4">
              <CardTitle className="text-xl font-semibold text-gray-800">Taste of Italy Wedding</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Celebrate with authentic Italian flavors and traditional recipes</p>
              <div className="space-y-2">
                <div className="text-sm font-medium">Bronze Package - $32/person</div>
                <div className="text-sm font-medium">Silver Package - $45/person</div>
                <div className="text-sm font-medium">Gold Package - $58/person</div>
              </div>
              <div className="mt-4 text-xs text-gray-500">Minimum 50 guests</div>
              {selectedTheme === 'italy' && (
                <div className="mt-3 text-sm font-medium text-red-600">✓ Selected - View items below</div>
              )}
            </CardContent>
          </Card>

          {/* Taco Fiesta Wedding Theme */}
          <Card 
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 rounded-lg ${
              selectedTheme === 'taco_fiesta' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedTheme(selectedTheme === 'taco_fiesta' ? null : 'taco_fiesta')}
          >
            <CardHeader className="bg-orange-50 p-4">
              <CardTitle className="text-xl font-semibold text-gray-800">Taco Fiesta Wedding</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Vibrant Mexican-inspired celebration with fresh, bold flavors</p>
              <div className="space-y-2">
                <div className="text-sm font-medium">Casual Package - $28/person</div>
                <div className="text-sm font-medium">Premium Package - $38/person</div>
                <div className="text-sm font-medium">Deluxe Package - $48/person</div>
              </div>
              <div className="mt-4 text-xs text-gray-500">Minimum 30 guests</div>
              {selectedTheme === 'taco_fiesta' && (
                <div className="mt-3 text-sm font-medium text-orange-600">✓ Selected - View items below</div>
              )}
            </CardContent>
          </Card>

          {/* Mediterranean Wedding Theme */}
          <Card 
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 rounded-lg ${
              selectedTheme === 'mediterranean' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedTheme(selectedTheme === 'mediterranean' ? null : 'mediterranean')}
          >
            <CardHeader className="bg-blue-50 p-4">
              <CardTitle className="text-xl font-semibold text-gray-800">Mediterranean Wedding</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Fresh, healthy cuisine inspired by the Mediterranean coast</p>
              <div className="space-y-2">
                <div className="text-sm font-medium">Classic Package - $35/person</div>
                <div className="text-sm font-medium">Premium Package - $48/person</div>
                <div className="text-sm font-medium">Luxury Package - $62/person</div>
              </div>
              <div className="mt-4 text-xs text-gray-500">Minimum 40 guests</div>
              {selectedTheme === 'mediterranean' && (
                <div className="mt-3 text-sm font-medium text-blue-600">✓ Selected - View items below</div>
              )}
            </CardContent>
          </Card>

          {/* American Classic Wedding Theme */}
          <Card 
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 rounded-lg ${
              selectedTheme === 'american' ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedTheme(selectedTheme === 'american' ? null : 'american')}
          >
            <CardHeader className="bg-green-50 p-4">
              <CardTitle className="text-xl font-semibold text-gray-800">American Classic Wedding</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">Traditional American favorites perfect for any celebration</p>
              <div className="space-y-2">
                <div className="text-sm font-medium">Essential Package - $30/person</div>
                <div className="text-sm font-medium">Premium Package - $42/person</div>
                <div className="text-sm font-medium">Signature Package - $55/person</div>
              </div>
              <div className="mt-4 text-xs text-gray-500">Minimum 35 guests</div>
              {selectedTheme === 'american' && (
                <div className="mt-3 text-sm font-medium text-green-600">✓ Selected - View items below</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Menu Items Section */}
      {selectedTheme ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {selectedTheme === 'taco_fiesta' && 'Taco Fiesta Menu Items'}
            {selectedTheme === 'italy' && 'Italian Wedding Menu Items'}
            {selectedTheme === 'mediterranean' && 'Mediterranean Menu Items'}
            {selectedTheme === 'american' && 'American Classic Menu Items'}
          </h3>
          <p className="text-gray-600">
            These authentic dishes are included in your selected theme, with rich dietary and nutritional information
          </p>
          <Button 
            variant="outline" 
            onClick={() => setSelectedTheme(null)}
            className="mb-4"
          >
            ← Back to Theme Selection
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Browse All Menu Items by Category</h3>
          <p className="text-gray-600">Or explore our complete database of dishes with comprehensive dietary information</p>
          
          {/* Category tabs for browsing database items */}
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
      )}

      {/* Menu items display */}
      <div className="space-y-4">
        {categoryItems && categoryItems.length > 0 ? (
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

export default StaticMenuSelectionStep;