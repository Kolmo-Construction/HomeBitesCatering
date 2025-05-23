// client/src/components/form-steps/AppetizersStep.tsx
import React, { useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
// Shadcn/ui specific FormField, and other UI components
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { EventInquiryFormData } from "@/types/form-types"; // Adjust path as needed
import { appetizerData } from "@/data/appetizerData"; // Adjust path as needed
import { horsDoeurvesData } from "@/data/horsDoeurvesInfo"; // Adjust path as needed
const AppetizersStep = ({ 
  onPrevious,
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();

  // Get form values
  const appetizerService = watch("appetizerService");
  const appetizers = watch("appetizers");
  const horsDoeurvesSelections = watch("horsDoeurvesSelections");

  // Make sure we have the horsDoeurvesSelections structure initialized
  useEffect(() => {
    // Initialize horsDoeurvesSelections with empty structure if needed
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories) {
      setValue("horsDoeurvesSelections", {
        serviceStyle: horsDoeurvesSelections?.serviceStyle || "stationary",
        categories: {}
      });
    }

    // We don't modify requestedTheme here to avoid navigation issues
  }, []);

  // Initialize appetizers structure if needed
  const initializeCategory = (categoryId: string) => {
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }
  };

  // Handle service style selection
  const handleServiceStyleChange = (value: string) => {
    setValue("appetizerService", value as "stationary" | "passed");
  };

  // Initialize horsDoeurvesSelections if needed
  const initializeHorsDoeurvesSelections = () => {
    if (!horsDoeurvesSelections) {
      setValue("horsDoeurvesSelections", {
        serviceStyle: "stationary",
        categories: {}
      });
    }
  };

  // Handle Hors d'oeuvres service style selection
  const handleHorsDoeurvesServiceStyleChange = (value: string) => {
    initializeHorsDoeurvesSelections();
    setValue("horsDoeurvesSelections.serviceStyle", value as "stationary" | "passed");
  };

  // Handle matrix selection for hors d'oeuvres
  const handleHorsDoeurvesItemSelection = (categoryId: string, itemId: string, quantity: number | null) => {
    initializeHorsDoeurvesSelections();

    // Make sure the category exists
    if (!horsDoeurvesSelections?.categories?.[categoryId]) {
      setValue(`horsDoeurvesSelections.categories.${categoryId}`, {
        items: {}
      });
    }

    if (quantity === null) {
      // Clear selection
      if (horsDoeurvesSelections?.categories?.[categoryId]?.items?.[itemId]) {
        const updatedItems = { ...horsDoeurvesSelections.categories[categoryId].items };
        delete updatedItems[itemId];
        setValue(`horsDoeurvesSelections.categories.${categoryId}.items`, updatedItems);
      }
    } else {
      // Set selection
      const item = horsDoeurvesData.categories
        .find(cat => cat.id === categoryId)?.items
        .find(item => item.id === itemId);

      if (item) {
        setValue(`horsDoeurvesSelections.categories.${categoryId}.items.${itemId}`, {
          name: item.name,
          price: item.price,
          quantity
        });
      }
    }
  };

  // Get the selected quantity for an item in the matrix
  const getSelectedQuantity = (categoryId: string, itemId: string): number | null => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items?.[itemId]) {
      return null;
    }
    return horsDoeurvesSelections.categories[categoryId].items[itemId].quantity;
  };

  // Calculate total for specific hors d'oeuvres category
  const calculateCategoryTotal = (categoryId: string): number => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items) {
      return 0;
    }

    let categoryTotal = 0;
    const category = horsDoeurvesData.categories.find(c => c.id === categoryId);
    const items = horsDoeurvesSelections.categories[categoryId].items;

    // For per-person pricing (like charcuterie)
    if (category?.perPersonPricing) {
      const guestCount = watch("guestCount") || 0;

      Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.price) {
          categoryTotal += item.price * guestCount;
        }
      });
    } 
    // For item-based pricing (standard options)
    else {
      Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.quantity && item.price) {
          categoryTotal += item.price * item.quantity;
        }
      });
    }

    return categoryTotal;
  };

  // Count all selected items in a category
  const getCategorySelectionCount = (categoryId: string): number => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items) {
      return 0;
    }

    return Object.keys(horsDoeurvesSelections.categories[categoryId].items).length;
  };

  // Calculate total for all hors d'oeuvres
  const calculateHorsDoeurvesTotal = (): number => {
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories) {
      return 0;
    }

    let total = 0;

    // Calculate total for each category
    Object.keys(horsDoeurvesSelections.categories).forEach(categoryId => {
      total += calculateCategoryTotal(categoryId);
    });

    // Add passed service surcharge if applicable
    if (horsDoeurvesSelections.serviceStyle === "passed") {
      const guestCount = watch("guestCount") || 0;
      total += 5 * guestCount; // $5 per guest surcharge
    }

    return total;
  };

  // Handle appetizer quantity change
  const handleQuantityChange = (categoryId: string, itemId: string, itemName: string, quantity: number) => {
    // Make sure the category exists
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }

    // Find if the item already exists
    const existingItems = appetizers[categoryId] || [];
    const existingItemIndex = existingItems.findIndex(item => item.name === itemName);

    if (quantity === 0) {
      // Remove item if quantity is 0
      if (existingItemIndex !== -1) {
        const newItems = [...existingItems];
        newItems.splice(existingItemIndex, 1);
        setValue(`appetizers.${categoryId}`, newItems);
      }
    } else {
      // Update or add item
      if (existingItemIndex !== -1) {
        // Update existing item
        const newItems = [...existingItems];
        newItems[existingItemIndex] = { name: itemName, quantity };
        setValue(`appetizers.${categoryId}`, newItems);
      } else {
        // Add new item
        setValue(`appetizers.${categoryId}`, [...existingItems, { name: itemName, quantity }]);
      }
    }
  };

  // Get quantity for an item
  const getItemQuantity = (categoryId: string, itemName: string): number => {
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) {
      return 0;
    }

    const item = appetizers[categoryId].find(item => item && item.name === itemName);
    return item ? item.quantity : 0;
  };

  // Handle spread selection
  const handleSpreadSelection = (itemId: string, itemName: string, isSelected: boolean) => {
    const categoryId = "spreads";
    initializeCategory(categoryId);

    const spreadsCategory = appetizerData.categories.find(cat => cat.id === categoryId);
    if (!spreadsCategory) return;

    const existingItems = appetizers[categoryId] || [];
    const existingItemIndex = existingItems.findIndex(item => item.name === itemName);

    if (isSelected) {
      // Check if we're at the selection limit
      if (existingItems.length >= spreadsCategory.selectLimit && existingItemIndex === -1) {
        return; // At limit, don't add
      }

      // Add item with default quantity of 1 (will be updated later with serving size)
      if (existingItemIndex === -1) {
        setValue(`appetizers.${categoryId}`, [...existingItems, { name: itemName, quantity: 1 }]);
      }
    } else {
      // Remove item
      if (existingItemIndex !== -1) {
        const newItems = [...existingItems];
        newItems.splice(existingItemIndex, 1);
        setValue(`appetizers.${categoryId}`, newItems);
      }
    }
  };

  // Handle spread serving size change
  const handleSpreadServingSizeChange = (servingSize: number) => {
    const categoryId = "spreads";
    const existingItems = appetizers[categoryId] || [];

    // Update quantity for all selected spreads
    const updatedItems = existingItems.map(item => ({
      ...item,
      quantity: servingSize
    }));

    setValue(`appetizers.${categoryId}`, updatedItems);
  };

  // Check if a spread is selected
  const isSpreadSelected = (itemName: string): boolean => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) return false;

    return appetizers[categoryId].some(item => item && item.name === itemName);
  };

  // Count selected spreads
  const getSelectedSpreadsCount = (): number => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) return 0;

    return appetizers[categoryId].length;
  };

  // Get the spreads serving size
  const getSpreadsServingSize = (): number => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId]) || appetizers[categoryId].length === 0) {
      return 24; // Default to first serving size
    }

    // All spreads have the same quantity/serving size
    return appetizers[categoryId][0].quantity || 24;
  };

  // Check if spreads selection limit is reached
  const isSpreadsLimitReached = (): boolean => {
    const categoryId = "spreads";
    const spreadsCategory = appetizerData.categories.find(cat => cat.id === categoryId);
    if (!spreadsCategory) return false;

    const selectedCount = getSelectedSpreadsCount();
    return selectedCount >= (spreadsCategory.selectLimit || 3);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Hors d'oeuvres</h2>
        <p className="text-lg text-gray-600">
          Select appetizers to enhance your event
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* General Notes and Instructions */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-lg font-medium mb-2">General Notes for Hors d'oeuvres:</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>When selecting a service style, there is a minimum $5.00 per guest surcharge for "Passed" service, depending on the number of guests and service duration.</li>
            <li>Items are offered in specific lot sizes as indicated for each category.</li>
            <li>Click the radio buttons to select the quantity for each item you want.</li>
          </ul>
        </div>

        {/* Service Style Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Style</h3>

          <RadioGroup 
            value={horsDoeurvesSelections?.serviceStyle || "stationary"} 
            onValueChange={handleHorsDoeurvesServiceStyleChange}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stationary" id="stationary-buffet" />
              <Label htmlFor="stationary-buffet">Stationary buffet</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passed" id="passed-service" />
              <Label htmlFor="passed-service">Passed by Servers</Label>
            </div>
          </RadioGroup>

          {horsDoeurvesSelections?.serviceStyle === "passed" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Passed service includes a minimum $5.00 per guest surcharge for additional service staff.
              </p>
            </div>
          )}
        </div>

        {/* Matrix Selection for Hors d'oeuvres */}
        <div className="space-y-12">
          {horsDoeurvesData.categories.map((category) => {
            // Special handling for spreads which uses a different UI
            if (category.id === "spreads") {
              // Calculate selectedCount at a higher scope level to fix the scoping issue
              const currentSpreadsCategorySelections = horsDoeurvesSelections?.categories?.[category.id]?.items;
              const selectedCountForSpreads = currentSpreadsCategorySelections ? 
                Object.keys(currentSpreadsCategorySelections).length : 0;

              return (
                <div key={category.id} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.description}</p>
                      <p className="text-sm text-gray-500 mt-1">Select up to {category.selectLimit} options ({selectedCountForSpreads} selected)</p>
                    </div>
                    {category.basePrice && (
                      <div className="text-lg font-medium">${category.basePrice.toFixed(2)} <span className="text-sm text-gray-500">per person</span></div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {category.items.map((item) => {
                      const isSelected = currentSpreadsCategorySelections?.[item.id] !== undefined;
                      const isAtLimit = selectedCountForSpreads >= (category.selectLimit || 3) && !isSelected;

                      return (
                        <div key={item.id} className="relative">
                          <label className={`
                            flex items-center p-3 border rounded-md cursor-pointer
                            ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}
                            ${isAtLimit ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                          `}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked === "indeterminate") return;
                                if (checked) {
                                  if (selectedCountForSpreads < (category.selectLimit || 3)) {
                                    handleHorsDoeurvesItemSelection(category.id, item.id, category.servingSizes?.[0] || 24);
                                  }
                                } else {
                                  handleHorsDoeurvesItemSelection(category.id, item.id, null);
                                }
                              }}
                              disabled={isAtLimit}
                              className="mr-3"
                            />
                            <div className="font-medium">{item.name}</div>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  {/* Serving Size Selection for spreads */}
                  {selectedCountForSpreads > 0 && category.servingSizes && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="font-medium mb-2">Select serving size:</h4>
                      <RadioGroup 
                        value={String(
                          currentSpreadsCategorySelections?.[
                            Object.keys(currentSpreadsCategorySelections || {})[0]
                          ]?.quantity || category.servingSizes[0]
                        )} 
                        onValueChange={(value) => {
                          const quantity = Number(value);
                          // Update all selected items with the same quantity
                          if (currentSpreadsCategorySelections) {
                            Object.keys(currentSpreadsCategorySelections).forEach(itemId => {
                              handleHorsDoeurvesItemSelection(category.id, itemId, quantity);
                            });
                          }
                        }}
                        className="flex flex-wrap gap-4"
                      >
                        {category.servingSizes.map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(size)} id={`serving-${category.id}-${size}`} />
                            <Label htmlFor={`serving-${category.id}-${size}`}>{size} servings</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            }

            // Matrix-style selection for other hors d'oeuvres categories
            return (
              <div key={category.id} className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>

                {/* Card-Based Item Selection with Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <Card key={item.id} className="mb-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>
                          ${item.price.toFixed(2)} each. {category.description || `Offered in lots of ${category.lotSizes.join(', ')}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`quantity-${category.id}-${item.id}`} className="text-base">Quantity:</Label>
                          <Controller
                            name={`horsDoeurvesSelections.categories.${category.id}.items.${item.id}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                onValueChange={(value) => {
                                  const newQuantity = value === "0" ? null : parseInt(value, 10);
                                  handleHorsDoeurvesItemSelection(category.id, item.id, newQuantity);
                                }}
                                value={getSelectedQuantity(category.id, item.id)?.toString() || "0"}
                              >
                                <SelectTrigger className="w-[150px]" id={`quantity-${category.id}-${item.id}`}>
                                  <SelectValue placeholder="Select quantity" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">None</SelectItem>
                                  {category.lotSizes.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Display item total dynamically */}
                        {getSelectedQuantity(category.id, item.id) && (
                          <div className="mt-3 text-sm font-semibold text-right">
                            Item Total: $
                            {(
                              item.price * getSelectedQuantity(category.id, item.id)
                            ).toFixed(2)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Display total for this category */}
                {horsDoeurvesSelections?.categories?.[category.id]?.items && 
                 Object.keys(horsDoeurvesSelections.categories[category.id].items).length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="font-medium">
                        Category Total: ${calculateCategoryTotal(category.id).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Total for all selections */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Total for Hors d'oeuvres</h3>
              <div className="text-xl font-bold text-primary">
                ${calculateHorsDoeurvesTotal().toFixed(2)}
              </div>
            </div>

            {horsDoeurvesSelections?.serviceStyle === "passed" && (
              <div className="mt-2 text-sm text-gray-600">
                Includes ${(5 * (watch("guestCount") || 0)).toFixed(2)} service charge for passed service
              </div>
            )}
          </div>
        </div>

        {/* Traditional Appetizers Section Header */}
        <div className="mt-12 mb-6 border-t pt-8">
          <h3 className="text-xl font-semibold mb-2">Traditional Appetizers</h3>
          <p className="text-gray-600">You can also select from our traditional appetizer options below:</p>
        </div>

        {/* Traditional Appetizer Categories */}
        <div className="space-y-10">
          {appetizerData.categories.map((category) => {
            // Special handling for spreads
            if (category.id === "spreads") {
              return (
                <div key={category.id} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.note} ({getSelectedSpreadsCount()} of {category.selectLimit} selected)</p>
                    </div>
                    <div className="text-lg font-medium">${category.basePrice.toFixed(2)} <span className="text-sm text-gray-500">per person</span></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="relative">
                        <label className={`
                          flex items-center p-3 border rounded-md cursor-pointer
                          ${isSpreadSelected(item.name) ? 'border-primary bg-primary/5' : 'border-gray-200'}
                          ${(!isSpreadSelected(item.name) && isSpreadsLimitReached()) ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                        `}>
                          <Checkbox
                            checked={isSpreadSelected(item.name)}
                            onCheckedChange={(checked) => {
                              if (checked === "indeterminate") return;
                              handleSpreadSelection(item.id, item.name, !!checked);
                            }}
                            disabled={!isSpreadSelected(item.name) && isSpreadsLimitReached()}
                            className="mr-3"
                          />
                          <div className="font-medium">{item.name}</div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Serving Size Selection - only show if some spreads are selected */}
                  {getSelectedSpreadsCount() > 0 && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="font-medium mb-2">Select serving size:</h4>
                      <RadioGroup 
                        value={String(getSpreadsServingSize())} 
                        onValueChange={(value) => handleSpreadServingSizeChange(Number(value))}
                        className="flex flex-wrap gap-4"
                      >
                        {category.servingSizes.map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(size)} id={`serving-${size}`} />
                            <Label htmlFor={`serving-${size}`}>{size} servings</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            }

            // Regular appetizer categories
            return (
              <div key={category.id} className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.note}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-md">
                      <div className="mb-2 md:mb-0">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">${item.price.toFixed(2)} each</div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Label htmlFor={`qty-${category.id}-${item.id}`} className="text-sm whitespace-nowrap">
                          Quantity:
                        </Label>

                        <Select
                          defaultValue="0"
                          value={String(getItemQuantity(category.id, item.name) || 0)}
                          onValueChange={(value) => handleQuantityChange(category.id, item.id, item.name, Number(value))}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Qty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {category.lotSizes?.map((size) => (
                              <SelectItem key={size} value={String(size)}>
                                {size}
                              </SelectItem>
                            )) || (
                              <SelectItem value="24">24</SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        {getItemQuantity(category.id, item.name) > 0 && (
                          <div className="text-sm font-medium">
                            Total: ${(item.price * getItemQuantity(category.id, item.name)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
export default AppetizersStep;