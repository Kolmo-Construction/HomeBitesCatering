// client/src/components/form-steps/MenuSelectionStep.tsx
import React, { useState, useEffect } from "react"; // React and hooks
import { useFormContext } from "react-hook-form"; // RHF context
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Check, Check as CheckIcon } from "lucide-react";

import { EventInquiryFormData } from "@/types/form-types"; // Adjust path as needed
import { themeMenuData } from "@/data/themeMenuInfo"; // Adjust path as needed, this is crucial

const MenuSelectionStep = ({ 
  selectedTheme,
  guestCount,
  onPrevious,
  onNext 
}: { 
  selectedTheme: string;
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  const [selectedActualCategory, setSelectedActualCategory] = useState<string | null>(null);

  // Watch the selected packages (theme-specific)
  const selectedPackages = watch("selectedPackages") || {};
  const selectedPackage = selectedPackages[selectedTheme];
  const menuSelections = watch("menuSelections");

  // Initialize selectedPackages if it doesn't exist
  useEffect(() => {
    if (!selectedPackages) {
      setValue("selectedPackages", {});
    }
  }, [selectedPackages, setValue]);

  // Set hors d'oeuvres as the theme if no other theme is selected
  useEffect(() => {
    if (!selectedTheme || selectedTheme === "") {
      setValue("requestedTheme", "hors_doeuvres");
    }
  }, [selectedTheme, setValue]);

  // Display available menu themes for selection - define outside useEffect
  const handleThemeSelection = (theme: string) => {
    setValue("requestedTheme", theme);
  };

  // Get the theme menu data if theme is selected
  const themeData = selectedTheme ? themeMenuData[selectedTheme as keyof typeof themeMenuData] : null;

  // Show available menu themes instead of error message
  if (!themeData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Menu Selection</h2>
          <p className="text-2xl font-semibold text-primary mb-4">
            What would you like a quote for?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Object.keys(themeMenuData).map((themeKey) => (
            <Card 
              key={themeKey}
              className={`
                overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
                ${selectedTheme === themeKey ? 'ring-4 ring-primary ring-offset-2' : ''}
              `}
              onClick={() => handleThemeSelection(themeKey)}
            >
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">{themeMenuData[themeKey as keyof typeof themeMenuData].title}</h3>
                <p className="text-gray-600 mb-4">{themeMenuData[themeKey as keyof typeof themeMenuData].description}</p>
                <div className="flex justify-end">
                  <Button 
                    variant={selectedTheme === themeKey ? "default" : "outline"}
                    size="sm"
                  >
                    {selectedTheme === themeKey ? "Selected" : "Select This Menu"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }

  // Get category selection limits based on the selected package
  const getCategoryLimits = (categoryKey: string) => {
    if (!selectedPackage || !(themeData.categories as any)[categoryKey]) {
      return 0;
    }

    const category = (themeData.categories as any)[categoryKey];
    return category.limits?.[selectedPackage] || 0;
  };

  // Check if a category is available for the selected package
  const isCategoryAvailable = (categoryKey: string) => {
    return getCategoryLimits(categoryKey) > 0;
  };

  // Get quantity for an item in the menu selections
  const getItemQuantity = (categoryKey: string, itemId: string): number => {
    if (!menuSelections || !menuSelections[categoryKey]) {
      return 0;
    }

    const selectedItems = menuSelections[categoryKey] as Array<{id: string, quantity: number}>;
    const item = selectedItems.find((item: any) => typeof item === 'object' && item !== null && item.id === itemId);
    return item ? (item.quantity || 1) : 0;
  };

  // Count selected items in a category
  const getSelectedCount = (categoryKey: string) => {
    if (!menuSelections || !menuSelections[categoryKey]) {
      return 0;
    }
    return Array.isArray(menuSelections[categoryKey]) 
      ? menuSelections[categoryKey].length 
      : 0;
  };

  // Check if selection limit is reached for a category
  const isSelectionLimitReached = (categoryKey: string) => {
    const limit = getCategoryLimits(categoryKey);
    const count = getSelectedCount(categoryKey);
    return count >= limit;
  };

  // Handle selection of an item in a category
  const handleItemSelection = (categoryKey: string, itemId: string, isSelected: boolean, quantity: number = 1) => {
    // Make sure menuSelections[categoryKey] is initialized as an array
    const rawSelections = menuSelections?.[categoryKey];
    const currentSelections: Array<{id: string, quantity: number}> = Array.isArray(rawSelections)
      ? rawSelections.map((item: any) => typeof item === 'object' ? { ...item } : { id: item, quantity: 1 })
      : [];

    // Find if item already exists
    const existingItemIndex = currentSelections.findIndex((item: any) =>
      typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
    );

    if (isSelected) {
      if (existingItemIndex >= 0) {
        // Update existing item with new quantity
        currentSelections[existingItemIndex] = {
          id: itemId,
          quantity: quantity
        };
      } else {
        // Add new item if not at limit
        if (!isSelectionLimitReached(categoryKey)) {
          currentSelections.push({ id: itemId, quantity: quantity });
        }
      }
    } else {
      // Remove item
      if (existingItemIndex >= 0) {
        currentSelections.splice(existingItemIndex, 1);
      }
    }

    setValue(`menuSelections.${categoryKey}` as any, currentSelections as any);
  };

  // Removed duplicate useEffect

  // Check if an item is selected
  const isItemSelected = (categoryKey: string, itemId: string) => {
    if (!menuSelections || !menuSelections[categoryKey]) {
      return false;
    }

    const selectedItems = menuSelections[categoryKey] as any[];
    return selectedItems.some((item: any) =>
      typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
    );
  };

  // Handle Custom Menu selection differently
  if (selectedTheme === "custom_menu") {
    // We've moved the selectedActualCategory useState to the top of the component

    const handleActualCategorySelect = (categoryKey: string) => {
      setSelectedActualCategory(categoryKey);
    };

    const handleCustomItemSelection = (categoryKey: string, itemId: string, isSelected: boolean) => {
      // Initialize array if it doesn't exist
      const rawSelections = menuSelections?.[categoryKey];
      const currentSelections: Array<{id: string, quantity: number}> = Array.isArray(rawSelections)
        ? rawSelections.map((item: any) => typeof item === 'object' ? { ...item } : { id: item, quantity: 1 })
        : [];

      if (isSelected) {
        // Check if item already exists
        const existingItemIndex = currentSelections.findIndex((item: any) =>
          typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
        );

        if (existingItemIndex === -1) {
          // Add new item
          currentSelections.push({ id: itemId, quantity: 1 });
        }
      } else {
        // Remove item
        const existingItemIndex = currentSelections.findIndex((item: any) =>
          typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
        );

        if (existingItemIndex >= 0) {
          currentSelections.splice(existingItemIndex, 1);
        }
      }

      setValue(`menuSelections.${categoryKey}` as any, currentSelections as any);
    };

    const isCustomItemSelected = (categoryKey: string, itemId: string) => {
      if (!menuSelections || !menuSelections[categoryKey]) {
        return false;
      }

      const selectedItems = menuSelections[categoryKey] as any[];
      return selectedItems.some((item: any) =>
        typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
      );
    };

    // Get the theme data for custom_menu
    const customMenuData = themeMenuData.custom_menu as {
      title: string;
      description: string;
      customizable?: boolean;
      packages: any[];
      categories: Record<string, { title: string; description: string; limits: any; items: Array<{ id: string; name: string; upcharge: number }> }>;
    };

    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">{customMenuData.title}</h2>
          <p className="text-2xl font-semibold text-primary mb-4">
            What would you like a quote for?
          </p>
          <p className="text-lg text-gray-600">{customMenuData.description}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Main Category Selection */}
          {!selectedActualCategory ? (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Select a Cuisine Category</h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose which cuisine style you'd like to select from first. You can add more items from different categories later.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {Object.keys(customMenuData.categories).map((categoryKey) => {
                  const categoryDetails = customMenuData.categories[categoryKey];
                  if (!categoryDetails) return null; // Should not happen if data is well-formed
                  return (
                    <div
                      key={categoryKey}
                      className="border rounded-md p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => handleActualCategorySelect(categoryKey)}
                    >
                      <h4 className="text-lg font-medium mb-2">{categoryDetails.title}</h4>
                      <p className="text-sm text-gray-600">{categoryDetails.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // STAGE 2: Display items for the selectedActualCategory
            <div>
              <div className="flex items-center mb-6">
                <button
                  className="text-primary hover:underline flex items-center mr-2"
                  onClick={() => setSelectedActualCategory(null)} // Go back to category list
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to Categories
                </button>
                <span className="text-gray-500">→</span>
                <span className="ml-2 font-medium">
                  {customMenuData.categories[selectedActualCategory]?.title}
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-4">
                {customMenuData.categories[selectedActualCategory]?.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {customMenuData.categories[selectedActualCategory]?.description}
              </p>

              <div className="grid grid-cols-1 gap-3 mt-4">
                {customMenuData.categories[selectedActualCategory]?.items?.map((item) => {
                  if (!item) return null;
                  const isSelected = isCustomItemSelected(selectedActualCategory, item.id);
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-md p-3 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-primary/30'
                      }`}
                      onClick={() => handleCustomItemSelection(selectedActualCategory, item.id, !isSelected)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.upcharge > 0 ? (
                            <span className="text-amber-600 text-sm ml-2">
                              (+${item.upcharge.toFixed(2)} upcharge per person)
                            </span>
                          ) : null}
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white' : 'border border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary of all selected items */}
              <div className="mb-8 p-4 bg-gray-50 rounded-md">
                <h4 className="text-md font-semibold mb-2">Your Selections</h4>
                <div className="space-y-2">
                  {Object.keys(menuSelections || {}).map(categoryKey => {
                    const categoryItems = (menuSelections as any)[categoryKey];
                    if (!Array.isArray(categoryItems) || categoryItems.length === 0) return null;

                    // Find category name for display
                    const categoryName = customMenuData.categories[categoryKey]?.title || categoryKey;

                    return (
                      <div key={categoryKey} className="pl-2 border-l-2 border-primary/30">
                        <h5 className="font-medium text-sm">{categoryName}:</h5>
                        <ul className="list-disc list-inside ml-2">
                          {categoryItems.map((item: any) => {
                            if (typeof item !== 'object' || !item || !('id' in item)) return null;
                            // Find the item name from the menu data
                            const menuItem = customMenuData.categories[categoryKey]?.items.find(
                              (menuItem: any) => menuItem.id === item.id
                            );
                            return (
                              <li key={item.id} className="text-sm text-gray-600">
                                {menuItem?.name || item.id}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}

                  {/* Show message if nothing selected */}
                  {Object.keys(menuSelections || {}).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No items selected yet</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 p-4 bg-gray-50 rounded-md">
                <span className="text-sm">
                  Current category selections: {
                    Object.keys(menuSelections || {})
                      .filter(key => selectedActualCategory && key === selectedActualCategory)
                      .reduce((total: number, key: string) => {
                        const selections = (menuSelections as any)[key];
                        return total + (Array.isArray(selections) ? selections.length : 0);
                      }, 0)
                  }
                </span>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedActualCategory(null)}
                >
                  Choose Another Category
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <Button 
            type="button" 
            onClick={onNext}
            className="flex items-center"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // For other menu themes, use the original implementation
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">{themeData.title}</h2>
        <p className="text-2xl font-semibold text-primary mb-4">
          What would you like a quote for?
        </p>
        <p className="text-lg text-gray-600">
          Select your preferred package and menu items
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Package Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Select a Package</h3>

          <div className="grid grid-cols-1 gap-4">
            {themeData.packages && themeData.packages.map((pkg: any) => (
              <div key={pkg.id}>
                {pkg.minGuestCount > 0 && guestCount < pkg.minGuestCount ? (
                  // Disabled package with warning
                  <div className="border border-gray-200 rounded-md p-4 opacity-60 cursor-not-allowed">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium text-gray-500">{pkg.name}</h4>
                      <span className="text-lg font-semibold text-gray-500">${pkg.price} / person</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{pkg.description}</p>
                    <div className="flex items-center text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">
                        Minimum {pkg.minGuestCount} guests required for this package
                      </span>
                    </div>
                  </div>
                ) : (
                  // Active package
                  <div 
                    className={`border rounded-md p-4 cursor-pointer transition-all duration-200 ${
                      selectedPackage === pkg.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => setValue(`selectedPackages.${selectedTheme}`, pkg.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium">{pkg.name}</h4>
                      <span className="text-lg font-semibold">${pkg.price} / person</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                    <div className="flex justify-end">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        selectedPackage === pkg.id 
                          ? 'bg-primary text-white' 
                          : 'border border-gray-300'
                      }`}>
                        {selectedPackage === pkg.id && <CheckIcon className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Food Categories - Only show if a package is selected */}
        {selectedPackage && (
          <div className="space-y-8">
            {/* Map through available categories */}
            {Object.entries(themeData.categories).map(([categoryKey, category]) => {
              // Skip categories not available for this package
              if (!isCategoryAvailable(categoryKey)) return null;

              const selectionLimit = getCategoryLimits(categoryKey);
              const selectedCount = getSelectedCount(categoryKey);

              return (
                <div key={categoryKey} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{category.title}</h3>
                    <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                      selectedCount < selectionLimit 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {selectedCount < selectionLimit 
                        ? `Please select ${selectionLimit - selectedCount} more ${selectionLimit - selectedCount === 1 ? 'item' : 'items'}` 
                        : `${selectedCount} of ${selectionLimit} selected ✓`}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item) => {
                      // Special handling for add-ons with quantity input in Sandwich Factory
                      if (categoryKey === 'add_ons' && 'quantityInput' in themeData && themeData.quantityInput) {
                        return (
                          <div key={item.id} className="relative">
                            <div className="p-3 border rounded-md border-gray-200 hover:border-primary/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium">{item.name}</div>
                              </div>
                              <div className="flex items-center mt-2">
                                <Label htmlFor={`qty-${categoryKey}-${item.id}`} className="text-sm mr-2">
                                  Amount:
                                </Label>
                                <Input
                                  id={`qty-${categoryKey}-${item.id}`}
                                  type="number"
                                  min="0"
                                  className="w-20 text-right"
                                  value={getItemQuantity(categoryKey, item.id) || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    if (value > 0) {
                                      handleItemSelection(categoryKey, item.id, true, value);
                                    } else {
                                      handleItemSelection(categoryKey, item.id, false);
                                    }
                                  }}
                                />
                                {item.upcharge > 0 && getItemQuantity(categoryKey, item.id) > 0 && (
                                  <div className="ml-4 text-sm font-medium">
                                    Total: ${(item.upcharge * getItemQuantity(categoryKey, item.id)).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Regular checkbox selections for other categories
                        return (
                          <div key={item.id} className="relative">
                            <label className={`
                              flex items-center justify-between p-3 border rounded-md
                              ${isItemSelected(categoryKey, item.id) ? 'border-primary bg-primary/5' : 'border-gray-200'}
                              ${(!isItemSelected(categoryKey, item.id) && isSelectionLimitReached(categoryKey)) 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'cursor-pointer hover:border-primary/50'}
                            `}>
                              <div className="flex items-start">
                                <Checkbox
                                  checked={isItemSelected(categoryKey, item.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked === "indeterminate") return;
                                    handleItemSelection(categoryKey, item.id, !!checked);
                                  }}
                                  disabled={!isItemSelected(categoryKey, item.id) && isSelectionLimitReached(categoryKey)}
                                  className="mr-3 mt-0.5"
                                />
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.upcharge > 0 && (
                                    <div className="text-sm text-amber-600">+${item.upcharge.toFixed(2)} per person</div>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selectedPackage && (
          <div className="text-center p-8 bg-gray-50 rounded-md">
            <p className="text-gray-500">Please select a package above to view food options.</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
export default MenuSelectionStep;