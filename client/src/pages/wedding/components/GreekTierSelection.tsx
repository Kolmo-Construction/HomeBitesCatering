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

// Greek Menu Tier Configuration
const GREEK_TIERS = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    price: 30,
    description: "Traditional Greek flavors with classic taverna favorites",
    limits: {
      mains: 3,
      sides: 3,
      salads: 2,
      meze: 3,
      condiments: 4
    }
  },
  silver: {
    id: "silver", 
    name: "Silver",
    price: 36,
    description: "Enhanced Greek experience with seafood and premium selections",
    limits: {
      mains: 4,
      sides: 4,
      salads: 3,
      meze: 4,
      condiments: 5
    }
  },
  gold: {
    id: "gold",
    name: "Gold", 
    price: 44,
    description: "Premium Greek feast with specialty dishes and extensive meze",
    limits: {
      mains: 6,
      sides: 5,
      salads: 4,
      meze: 6,
      condiments: 6
    }
  },
  platinum: {
    id: "platinum",
    name: "Platinum",
    price: 52,
    description: "Ultimate Greek celebration with all specialties and unlimited variety",
    limits: {
      mains: 8,
      sides: 6,
      salads: 5,
      meze: 8,
      condiments: 7
    }
  }
};

interface GreekTierSelectionProps {
  onNext: () => void;
  onPrevious: () => void;
}

const GreekTierSelection: React.FC<GreekTierSelectionProps> = ({ onNext, onPrevious }) => {
  const { watch, setValue, getValues } = useFormContext<WeddingInquiryFormData>();
  
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({
    mains: [],
    sides: [],
    salads: [],
    meze: [],
    condiments: []
  });

  // Get Greek menu data
  const menuData = getMenuThemeData('theme_23');
  const [organizedItems, setOrganizedItems] = useState<Record<string, DatabaseMenuItem[]>>({});

  useEffect(() => {
    if (menuData?.allItems) {
      // Organize items by type for Greek cuisine
      const organized = {
        mains: menuData.allItems.filter(item => 
          item.category?.toLowerCase().includes('main') ||
          item.category?.toLowerCase().includes('meat') ||
          item.category?.toLowerCase().includes('seafood') ||
          item.category?.toLowerCase().includes('fish') ||
          item.category?.toLowerCase().includes('pasta')
        ),
        sides: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('side') ||
          item.category?.toLowerCase().includes('vegetable') ||
          item.category?.toLowerCase().includes('potato') ||
          item.category?.toLowerCase().includes('rice')
        ),
        salads: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('salad')
        ),
        meze: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('appetizer') ||
          item.category?.toLowerCase().includes('meze') ||
          item.name?.toLowerCase().includes('dolmades') ||
          item.name?.toLowerCase().includes('spanakopita') ||
          item.name?.toLowerCase().includes('saganaki')
        ),
        condiments: menuData.allItems.filter(item =>
          item.category?.toLowerCase().includes('dip') ||
          item.category?.toLowerCase().includes('condiment') ||
          item.name?.toLowerCase().includes('tzatziki') ||
          item.name?.toLowerCase().includes('hummus')
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
      meze: [],
      condiments: []
    });
  };

  const handleItemToggle = useCallback((type: string, itemId: string) => {
    if (!selectedTier) return;
    
    const tier = GREEK_TIERS[selectedTier as keyof typeof GREEK_TIERS];
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
    
    // Check minimum selections (at least 1 main, 1 side, 1 meze)
    return selectedItems.mains.length >= 1 && selectedItems.sides.length >= 1 && selectedItems.meze.length >= 1;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    
    // Save selections to form
    setValue("requestedTheme", "theme_23");
    setValue("selectedPackages", {
      greek: {
        tier: selectedTier,
        selections: selectedItems,
        price: GREEK_TIERS[selectedTier as keyof typeof GREEK_TIERS].price
      }
    });
    
    onNext();
  };

  const renderItemSection = (type: string, title: string, items: DatabaseMenuItem[]) => {
    if (!selectedTier || !items.length) return null;
    
    const tier = GREEK_TIERS[selectedTier as keyof typeof GREEK_TIERS];
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
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 
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
                            <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600 hover:text-blue-700">
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
        <p>Loading Greek menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          A Taste of Greece Package Selection
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Experience authentic Greek cuisine with our carefully curated packages. From traditional taverna dishes to premium seafood specialties.
        </p>
      </div>

      {/* Tier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.values(GREEK_TIERS).map((tier) => (
          <Card
            key={tier.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTier === tier.id ? "ring-4 ring-blue-500 ring-offset-2" : "border-gray-200"
            }`}
            onClick={() => handleTierSelection(tier.id)}
          >
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <div className="text-2xl font-bold text-blue-600">${tier.price}</div>
              <div className="text-sm text-gray-500">per person</div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
              <div className="space-y-1 text-xs">
                <div>Mains: {tier.limits.mains}</div>
                <div>Sides: {tier.limits.sides}</div>
                <div>Salads: {tier.limits.salads}</div>
                <div>Meze: {tier.limits.meze}</div>
                <div>Condiments: {tier.limits.condiments}</div>
              </div>
              {selectedTier === tier.id && (
                <div className="mt-3 flex items-center text-blue-600">
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
            Customize Your {GREEK_TIERS[selectedTier as keyof typeof GREEK_TIERS].name} Package
          </h3>
          
          {renderItemSection("mains", "Main Courses", organizedItems.mains || [])}
          {renderItemSection("sides", "Side Dishes", organizedItems.sides || [])}
          {renderItemSection("salads", "Greek Salads", organizedItems.salads || [])}
          {renderItemSection("meze", "Meze & Appetizers", organizedItems.meze || [])}
          {renderItemSection("condiments", "Dips & Condiments", organizedItems.condiments || [])}
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
          className="flex items-center px-6 py-3 text-lg bg-blue-600 hover:bg-blue-700"
        >
          Continue <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default GreekTierSelection;