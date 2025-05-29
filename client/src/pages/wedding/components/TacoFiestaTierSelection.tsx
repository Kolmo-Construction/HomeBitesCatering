import React, { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Check as CheckIcon } from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { getTacoFiestaItemsByType, type DatabaseMenuItem } from "../data/generatedMenuData";

// Taco Fiesta Tier Configuration
const TACO_FIESTA_TIERS = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    price: 28,
    description: "Essential Taco Fiesta experience with carefully curated selections",
    limits: {
      mains: 3,
      sides: 2,
      salads: 2,
      sauces: 3,
      condiments: 4
    }
  },
  silver: {
    id: "silver", 
    name: "Silver",
    price: 34,
    description: "Enhanced selection with more variety and premium options",
    limits: {
      mains: 4,
      sides: 3,
      salads: 3,
      sauces: 4,
      condiments: 6
    }
  },
  gold: {
    id: "gold",
    name: "Gold", 
    price: 42,
    description: "Premium experience with extensive choices and specialty items",
    limits: {
      mains: 6,
      sides: 4,
      salads: 4,
      sauces: 5,
      condiments: 8
    }
  },
  platinum: {
    id: "platinum",
    name: "Platinum",
    price: 52,
    description: "Ultimate Taco Fiesta with unlimited selections from all categories",
    limits: {
      mains: 8,
      sides: 6,
      salads: 5,
      sauces: 6,
      condiments: 10
    }
  }
};

// Category mapping for proper organization
const CATEGORY_MAPPING = {
  // Proteins/Mains
  stuffed_poblano: "mains",
  barbacoa: "mains", 
  pork_carnitas: "mains",
  pork_belly: "mains",
  flank_steak_fajitas: "mains",
  ground_beef: "mains",
  chorizo: "mains",
  mexican_chicken: "mains", 
  beef_birria: "mains",
  cod: "mains",
  shrimp: "mains",
  tofu: "mains",
  roasted_vegetables: "mains",
  
  // Sides
  cilantro_lime_rice: "sides",
  mexican_rice: "sides", 
  grilled_vegetables: "sides",
  refried_beans: "sides",
  jalapeno_cornbread: "sides",
  elotes: "sides",
  rice_and_beans: "sides",
  veg_empanadas: "sides",
  
  // Salads
  mexican_slaw: "salads",
  escabeche: "salads",
  pickled_cabbage: "salads",
  
  // Sauces
  pico_de_gallo: "sauces",
  fresh_mango_salsa: "sauces",
  pineapple_habanero: "sauces", 
  cucumber_apple: "sauces",
  salsa_roja: "sauces",
  salsa_verde: "sauces",
  creamy_salsa_verde: "sauces",
  chorizo_queso_dip: "sauces",
  queso_dip: "sauces",
  guacamole: "sauces",
  
  // Condiments
  shredded_cheese: "condiments",
  diced_onions: "condiments",
  jalapenos: "condiments",
  sour_cream: "condiments", 
  vegan_cheese: "condiments",
  lime_wedges: "condiments",
  sliced_radish: "condiments",
  diced_bell_peppers: "condiments",
  fire_roasted_peppers: "condiments",
  cilantro: "condiments"
};

interface TacoFiestaTierSelectionProps {
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

const TacoFiestaTierSelection: React.FC<TacoFiestaTierSelectionProps> = ({
  guestCount,
  onPrevious,
  onNext,
}) => {
  const { watch, setValue } = useFormContext<WeddingInquiryFormData>();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    mains: [],
    sides: [],
    salads: [],
    sauces: [],
    condiments: []
  });

  // Get Taco Fiesta menu items from generated database data
  const organizedMenuItems = React.useMemo(() => {
    return getTacoFiestaItemsByType();
  }, []);

  const handleTierSelection = (tierId: string) => {
    setSelectedTier(tierId);
    // Reset selections when changing tiers
    setSelectedItems({
      mains: [],
      sides: [],
      salads: [],
      sauces: [],
      condiments: []
    });
    setValue("selectedPackages", { taco_fiesta: tierId });
  };

  const handleItemSelection = (category: string, itemId: string, isSelected: boolean) => {
    const tier = selectedTier ? TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS] : null;
    if (!tier) return;

    const currentSelections = selectedItems[category] || [];
    const limit = tier.limits[category as keyof typeof tier.limits];

    if (isSelected) {
      if (currentSelections.length < limit) {
        setSelectedItems(prev => ({
          ...prev,
          [category]: [...currentSelections, itemId]
        }));
      }
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [category]: currentSelections.filter(id => id !== itemId)
      }));
    }
  };

  const isItemSelected = (category: string, itemId: string) => {
    return selectedItems[category]?.includes(itemId) || false;
  };

  const isSelectionLimitReached = (category: string) => {
    const tier = selectedTier ? TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS] : null;
    if (!tier) return false;
    
    const currentCount = selectedItems[category]?.length || 0;
    const limit = tier.limits[category as keyof typeof tier.limits];
    return currentCount >= limit;
  };

  const renderNutritionalBadges = (item: any) => {
    if (!item.additional_dietary_metadata?.nutritional_highlights) return null;

    const nutrition = item.additional_dietary_metadata.nutritional_highlights;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {nutrition.calories && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800">
            {nutrition.calories.min}-{nutrition.calories.max} cal
          </Badge>
        )}
        {nutrition.protein && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-800">
            {nutrition.protein.min}-{nutrition.protein.max}g protein
          </Badge>
        )}
        {nutrition.carbs && (
          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-800">
            {nutrition.carbs.min}-{nutrition.carbs.max}g carbs
          </Badge>
        )}
      </div>
    );
  };

  const renderDietaryFlags = (item: any) => {
    const flags = [];
    if (item.is_vegetarian) flags.push(<Badge key="veg" variant="secondary" className="text-xs bg-green-100 text-green-800">Vegetarian</Badge>);
    if (item.is_vegan) flags.push(<Badge key="vegan" variant="secondary" className="text-xs bg-green-100 text-green-800">Vegan</Badge>);
    if (item.is_gluten_free) flags.push(<Badge key="gf" variant="secondary" className="text-xs bg-blue-100 text-blue-800">Gluten-Free</Badge>);
    if (item.is_dairy_free) flags.push(<Badge key="df" variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Dairy-Free</Badge>);
    
    return flags.length > 0 ? <div className="flex flex-wrap gap-1 mt-1">{flags}</div> : null;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading Taco Fiesta menu...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Taco Fiesta Menu Selection</h2>
        <p className="text-lg text-gray-600 mb-4">
          Choose your tier and customize your authentic Mexican feast
        </p>
        <p className="text-sm text-gray-500">
          Serving {guestCount} guests
        </p>
      </div>

      {/* Tier Selection */}
      {!selectedTier && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Object.values(TACO_FIESTA_TIERS).map((tier) => (
            <Card
              key={tier.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105"
              onClick={() => handleTierSelection(tier.id)}
            >
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 p-4">
                <CardTitle className="text-xl font-semibold text-gray-800">{tier.name}</CardTitle>
                <div className="text-2xl font-bold text-red-600">${tier.price}/person</div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                <div className="space-y-1 text-xs">
                  <div>• {tier.limits.mains} Protein/Main choices</div>
                  <div>• {tier.limits.sides} Side dishes</div>
                  <div>• {tier.limits.salads} Fresh salads</div>
                  <div>• {tier.limits.sauces} Salsas & sauces</div>
                  <div>• {tier.limits.condiments} Condiments & toppings</div>
                </div>
                <div className="mt-4 text-lg font-semibold text-gray-900">
                  Total: ${(tier.price * guestCount).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Menu Selection */}
      {selectedTier && (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS].name} Package
              </h3>
              <p className="text-gray-600">
                ${TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS].price}/person
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setSelectedTier(null)}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Change Tier
            </Button>
          </div>

          {/* Category Sections */}
          {Object.entries(organizedMenuItems).map(([category, items]) => {
            if (items.length === 0) return null;
            
            const tier = TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS];
            const limit = tier.limits[category as keyof typeof tier.limits];
            const selected = selectedItems[category]?.length || 0;
            const categoryTitles = {
              mains: "Proteins & Main Dishes",
              sides: "Sides & Accompaniments", 
              salads: "Fresh Salads",
              sauces: "Salsas & Sauces",
              condiments: "Condiments & Toppings"
            };

            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold">
                      {categoryTitles[category as keyof typeof categoryTitles]}
                    </CardTitle>
                    <Badge 
                      variant={selected === limit ? "default" : "outline"}
                      className={selected === limit ? "bg-green-600" : ""}
                    >
                      {selected}/{limit} selected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => {
                      const isSelected = isItemSelected(category, item.id);
                      const isDisabled = !isSelected && isSelectionLimitReached(category);
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-red-50 border-red-500 shadow-md' 
                              : isDisabled
                              ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                              : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                          }`}
                          onClick={() => !isDisabled && handleItemSelection(category, item.id, !isSelected)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => handleItemSelection(category, item.id, !!checked)}
                                  className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                />
                                <span className="font-medium text-sm">{item.name}</span>
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-600 mt-1 italic">
                                  {item.description.slice(0, 100)}...
                                </p>
                              )}
                              {renderDietaryFlags(item)}
                              {renderNutritionalBadges(item)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Selection Summary */}
          <Card className="bg-gradient-to-r from-orange-50 to-red-50">
            <CardContent className="p-6">
              <h4 className="text-lg font-semibold mb-4">Your Taco Fiesta Selection Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Package Details:</h5>
                  <p className="text-sm">
                    {TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS].name} - 
                    ${TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS].price}/person
                  </p>
                  <p className="text-sm">
                    Total Cost: ${(TACO_FIESTA_TIERS[selectedTier as keyof typeof TACO_FIESTA_TIERS].price * guestCount).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Items Selected:</h5>
                  {Object.entries(selectedItems).map(([category, items]) => (
                    <p key={category} className="text-sm">
                      {category.charAt(0).toUpperCase() + category.slice(1)}: {items.length} items
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <Button type="button" variant="outline" onClick={onPrevious} className="flex items-center px-6 py-3 text-lg">
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        {selectedTier && (
          <Button 
            type="button" 
            onClick={onNext} 
            className="flex items-center bg-red-600 hover:bg-red-700 px-6 py-3 text-lg text-white"
          >
            Continue <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default TacoFiestaTierSelection;