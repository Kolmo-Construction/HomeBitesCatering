import React, { useState, useEffect, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Check as CheckIcon, Info } from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { getMenuThemeData, type DatabaseMenuItem } from "../data/generatedMenuData";

// American BBQ Tier Configuration
const AMERICAN_BBQ_TIERS = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    price: 32,
    description: "Classic BBQ experience with traditional favorites",
    limits: {
      mains: 3,
      sides: 3,
      salads: 2,
      sauces: 2,
      condiments: 3
    }
  },
  silver: {
    id: "silver", 
    name: "Silver",
    price: 38,
    description: "Enhanced BBQ selection with premium cuts and variety",
    limits: {
      mains: 4,
      sides: 4,
      salads: 3,
      sauces: 3,
      condiments: 4
    }
  },
  gold: {
    id: "gold",
    name: "Gold", 
    price: 46,
    description: "Premium BBQ experience with specialty items and carving stations",
    limits: {
      mains: 6,
      sides: 5,
      salads: 4,
      sauces: 4,
      condiments: 5
    }
  },
  platinum: {
    id: "platinum",
    name: "Platinum",
    price: 54,
    description: "Ultimate BBQ feast with all premium options and unlimited selections",
    limits: {
      mains: 8,
      sides: 6,
      salads: 5,
      sauces: 5,
      condiments: 6
    }
  }
};

interface AmericanBBQTierSelectionProps {
  onNext: () => void;
  onPrevious: () => void;
}

const AmericanBBQTierSelection: React.FC<AmericanBBQTierSelectionProps> = ({ onNext, onPrevious }) => {
  const { watch, setValue, getValues } = useFormContext<WeddingInquiryFormData>();
  
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    mains: [],
    sides: [],
    salads: [],
    sauces: [],
    condiments: []
  });

  // Get American BBQ menu data
  const menuData = getMenuThemeData('custom_american_bbq');
  const [organizedItems, setOrganizedItems] = useState<Record<string, DatabaseMenuItem[]>>({});

  useEffect(() => {
    if (menuData?.allItems) {
      // Organize items by type for American BBQ
      const organized = {
        mains: menuData.allItems.filter(item => 
          item.category?.toLowerCase().includes('main') ||
          item.category?.toLowerCase().includes('beef') ||
          item.category?.toLowerCase().includes('pork') ||
          item.category?.toLowerCase().includes('chicken') ||
          item.category?.toLowerCase().includes('seafood') ||
          item.category?.toLowerCase().includes('lamb')
        ),
        sides: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('side') ||
          item.category?.toLowerCase().includes('vegetable') ||
          item.category?.toLowerCase().includes('bread')
        ),
        salads: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('salad')
        ),
        sauces: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('sauce') ||
          item.category?.toLowerCase().includes('bbq')
        ),
        condiments: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('condiment') ||
          item.category?.toLowerCase().includes('topping')
        )
      };
      setOrganizedItems(organized);
    }
  }, [menuData]);

  const handleTierSelection = (tierId: string) => {
    setSelectedTier(tierId);
    // Reset selections when tier changes
    setSelectedItems({
      mains: [],
      sides: [],
      salads: [],
      sauces: [],
      condiments: []
    });
  };

  const handleItemToggle = useCallback((type: string, itemId: string) => {
    if (!selectedTier) return;
    
    const tier = AMERICAN_BBQ_TIERS[selectedTier as keyof typeof AMERICAN_BBQ_TIERS];
    const limit = tier.limits[type as keyof typeof tier.limits];
    
    setSelectedItems(prev => {
      const currentItems = prev[type] || [];
      const isSelected = currentItems.includes(itemId);
      
      if (isSelected) {
        return {
          ...prev,
          [type]: currentItems.filter(id => id !== itemId)
        };
      } else if (currentItems.length < limit) {
        return {
          ...prev,
          [type]: [...currentItems, itemId]
        };
      }
      
      return prev;
    });
  }, [selectedTier]);

  const canProceed = () => {
    if (!selectedTier) return false;
    
    const tier = AMERICAN_BBQ_TIERS[selectedTier as keyof typeof AMERICAN_BBQ_TIERS];
    
    // Check minimum selections (at least 1 main, 1 side)
    return selectedItems.mains.length >= 1 && selectedItems.sides.length >= 1;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    
    // Save selections to form
    setValue("requestedTheme", "custom_american_bbq");
    setValue("selectedPackages", {
      american_bbq: {
        tier: selectedTier,
        selections: selectedItems,
        price: AMERICAN_BBQ_TIERS[selectedTier as keyof typeof AMERICAN_BBQ_TIERS].price
      }
    });
    
    onNext();
  };

  const renderItemSection = (type: string, title: string, items: DatabaseMenuItem[]) => {
    if (!selectedTier || !items.length) return null;
    
    const tier = AMERICAN_BBQ_TIERS[selectedTier as keyof typeof AMERICAN_BBQ_TIERS];
    const limit = tier.limits[type as keyof typeof tier.limits];
    const selected = selectedItems[type] || [];
    
    return (
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {title}
          <Badge variant="outline">{selected.length}/{limit}</Badge>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const isSelected = selected.includes(item.id);
            const canSelect = selected.length < limit || isSelected;
            
            return (
              <Card 
                key={item.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-orange-500 bg-orange-50' : 
                  canSelect ? 'hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => canSelect && handleItemToggle(type, item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={isSelected}
                      disabled={!canSelect}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{item.name}</h5>
                        {item.additional_dietary_metadata?.dietary_flags_list?.includes('VEGETARIAN') && (
                          <Badge variant="secondary" className="text-xs">Vegetarian</Badge>
                        )}
                        {item.additional_dietary_metadata?.dietary_flags_list?.includes('VEGAN') && (
                          <Badge variant="secondary" className="text-xs">Vegan</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                      {item.additional_dietary_metadata && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-0 h-auto text-orange-600 hover:text-orange-700">
                              <Info className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>{item.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <p className="text-sm">{item.description}</p>
                              {item.additional_dietary_metadata.nutritional_highlights && (
                                <div>
                                  <h4 className="font-medium mb-2">Nutritional Info</h4>
                                  <div className="text-sm space-y-1">
                                    {item.additional_dietary_metadata.nutritional_highlights.calories && (
                                      <p>Calories: {item.additional_dietary_metadata.nutritional_highlights.calories.min}-{item.additional_dietary_metadata.nutritional_highlights.calories.max} {item.additional_dietary_metadata.nutritional_highlights.calories.unit}</p>
                                    )}
                                    {item.additional_dietary_metadata.nutritional_highlights.protein && (
                                      <p>Protein: {item.additional_dietary_metadata.nutritional_highlights.protein.min}-{item.additional_dietary_metadata.nutritional_highlights.protein.max} {item.additional_dietary_metadata.nutritional_highlights.protein.unit}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (!menuData) {
    return (
      <div className="text-center py-8">
        <p>Loading American BBQ menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          American BBQ Package Selection
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose your BBQ experience level and customize your menu selections. Each tier offers different quantities and premium options.
        </p>
      </div>

      {/* Tier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.values(AMERICAN_BBQ_TIERS).map((tier) => (
          <Card
            key={tier.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTier === tier.id ? "ring-4 ring-orange-500 ring-offset-2" : "border-gray-200"
            }`}
            onClick={() => handleTierSelection(tier.id)}
          >
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <div className="text-2xl font-bold text-orange-600">${tier.price}</div>
              <div className="text-sm text-gray-500">per person</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
              <div className="space-y-1 text-xs">
                <div>Mains: {tier.limits.mains}</div>
                <div>Sides: {tier.limits.sides}</div>
                <div>Salads: {tier.limits.salads}</div>
                <div>Sauces: {tier.limits.sauces}</div>
                <div>Condiments: {tier.limits.condiments}</div>
              </div>
              {selectedTier === tier.id && (
                <div className="mt-3 flex items-center text-orange-600">
                  <CheckIcon className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Selected</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Menu Item Selection */}
      {selectedTier && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-center mb-6">
            Customize Your {AMERICAN_BBQ_TIERS[selectedTier as keyof typeof AMERICAN_BBQ_TIERS].name} Package
          </h3>
          
          {renderItemSection("mains", "Main Courses", organizedItems.mains || [])}
          {renderItemSection("sides", "Side Dishes", organizedItems.sides || [])}
          {renderItemSection("salads", "Salads", organizedItems.salads || [])}
          {renderItemSection("sauces", "Sauces & BBQ", organizedItems.sauces || [])}
          {renderItemSection("condiments", "Condiments & Toppings", organizedItems.condiments || [])}
        </div>
      )}

      <div className="flex justify-between mt-10">
        <Button type="button" variant="outline" onClick={onPrevious} className="flex items-center px-6 py-3 text-lg">
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button 
          type="button" 
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex items-center px-6 py-3 text-lg bg-orange-600 hover:bg-orange-700"
        >
          Continue <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default AmericanBBQTierSelection;