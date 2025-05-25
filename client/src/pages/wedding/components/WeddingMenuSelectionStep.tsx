// src/pages/wedding/components/WeddingMenuSelectionStep.tsx
import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label"; // If used for quantity inputs
import { ChevronLeft, ChevronRight, Check as CheckIcon, Info as InfoIcon } from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { weddingThemeMenuData } from "../data/weddingThemeMenuData";

interface WeddingMenuSelectionStepProps {
  selectedTheme: string;
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingMenuSelectionStep: React.FC<WeddingMenuSelectionStepProps> = ({
  selectedTheme,
  guestCount,
  onPrevious,
  onNext,
}) => {
  const {
    watch,
    setValue,
  } = useFormContext<WeddingInquiryFormData>();

  const [selectedActualCategoryKey, setSelectedActualCategoryKey] = useState<string | null>(null);

  const formSelectedPackages = watch("selectedPackages") || {};
  const currentThemePackageId = formSelectedPackages[selectedTheme];
  const formMenuSelections = watch("menuSelections");

  useEffect(() => {
    if (!formSelectedPackages) {
      setValue("selectedPackages", {});
    }
  }, [formSelectedPackages, setValue]);

  const handleThemeSelection = (themeKey: string) => {
    setValue("requestedTheme", themeKey);
    setValue("selectedPackages", { ...formSelectedPackages, [themeKey]: undefined });
    setValue("menuSelections", { proteins: [], sides: [], salads: [], salsas: [], desserts: [], addons: [] });
    setSelectedActualCategoryKey(null);
  };

  const currentWeddingThemeDetails = selectedTheme
    ? weddingThemeMenuData[selectedTheme as keyof typeof weddingThemeMenuData]
    : null;

  // Create a constant for the wedding theme data to avoid circular references
  const themeData = weddingThemeMenuData || {};

  if (!currentWeddingThemeDetails) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Wedding Menu Selection</h2>
          <p className="text-2xl font-semibold text-pink-600 mb-4">
            Choose Your Wedding Menu Theme
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select one of our curated wedding themes, or opt for a 'Custom Wedding Menu' to tailor every detail. Each theme offers distinct packages to suit your preferences.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Object.keys(themeData).map((themeKey) => {
            const theme = themeData[themeKey as keyof typeof themeData];
            return (
              <Card
                key={themeKey}
                className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 rounded-lg ${
                  selectedTheme === themeKey ? "ring-4 ring-pink-500 ring-offset-2 scale-105" : "border-gray-200"
                }`}
                onClick={() => handleThemeSelection(themeKey)}
              >
                <CardHeader className="bg-gray-50 p-4">
                    <CardTitle className="text-xl font-semibold text-gray-800">{theme.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-gray-600 mb-4 text-sm">{theme.description}</p>
                  <Button
                    variant={selectedTheme === themeKey ? "default" : "outline"}
                    size="sm"
                    className={`w-full ${selectedTheme === themeKey ? 'bg-pink-600 hover:bg-pink-700' : 'text-pink-600 border-pink-600 hover:bg-pink-50'}`}
                  >
                    {selectedTheme === themeKey ? "Selected Theme" : "Select This Theme"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex justify-between mt-10">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex items-center px-6 py-3 text-lg">
            <ChevronLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          {/* Next button is typically enabled by the orchestrator or if a theme is chosen */}
        </div>
      </div>
    );
  }

  const getCategorySelectionLimit = (categoryKey: string): number => {
    if (!currentThemePackageId || !currentWeddingThemeDetails?.categories?.[categoryKey]) {
      return 0;
    }
    const selectedPkgDetails = currentWeddingThemeDetails.packages.find(p => p.id === currentThemePackageId);
    return selectedPkgDetails?.limits?.[categoryKey as keyof typeof selectedPkgDetails.limits] ?? 0;
  };

  const getSelectedItemCountForCategory = (categoryKey: string): number => {
    const items = formMenuSelections?.[categoryKey];
    return Array.isArray(items) ? items.length : 0;
  };

  const isSelectionLimitReachedForCategory = (categoryKey: string): boolean => {
    const limit = getCategorySelectionLimit(categoryKey);
    if (limit === 0) return false; // 0 implies unlimited or not applicable for limit counting here
    return getSelectedItemCountForCategory(categoryKey) >= limit;
  };

  const handleItemSelection = (categoryKey: string, itemId: string, isChecked: boolean, quantity: number = 1) => {
    const currentCategorySelections = Array.isArray(formMenuSelections?.[categoryKey])
      ? [...(formMenuSelections[categoryKey] as Array<{ id: string; quantity: number }>)]
      : [];
    const itemIndex = currentCategorySelections.findIndex(item => item.id === itemId);

    if (isChecked) {
      if (itemIndex > -1) {
        currentCategorySelections[itemIndex] = { ...currentCategorySelections[itemIndex], quantity };
      } else {
        if (!isSelectionLimitReachedForCategory(categoryKey) || getCategorySelectionLimit(categoryKey) === 0) {
          currentCategorySelections.push({ id: itemId, quantity });
        }
      }
    } else {
      if (itemIndex > -1) {
        currentCategorySelections.splice(itemIndex, 1);
      }
    }
    setValue(`menuSelections.${categoryKey}`, currentCategorySelections);
  };

  const isItemSelectedInCategory = (categoryKey: string, itemId: string): boolean => {
    const items = formMenuSelections?.[categoryKey];
    return Array.isArray(items) && items.some((item: any) => item.id === itemId);
  };

  const getItemQuantityFromSelection = (categoryKey: string, itemId: string): number => {
    const items = formMenuSelections?.[categoryKey];
    if (Array.isArray(items)) {
        const item = items.find((i: any) => i.id === itemId);
        return item?.quantity || 0;
    }
    return 0;
  };


  // Custom Menu Logic
  if (selectedTheme === "custom_menu" && currentWeddingThemeDetails?.customizable) {
    const customMenuDetails = currentWeddingThemeDetails;

    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">{customMenuDetails.title}</h2>
          <p className="text-lg text-gray-600">{customMenuDetails.description}</p>
          <Button variant="link" onClick={() => handleThemeSelection("")} className="mt-2 text-pink-600">
            Change Wedding Theme
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {!selectedActualCategoryKey ? (
            <>
              <h3 className="text-xl font-semibold mb-4">Select a Cuisine Style or Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {Object.keys(customMenuDetails.categories).map((catKey) => {
                  const category = customMenuDetails.categories[catKey];
                  return (
                    <Card key={catKey} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedActualCategoryKey(catKey)}>
                      <CardHeader>
                        <CardTitle>{category.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center mb-6">
                <Button variant="outline" size="sm" onClick={() => setSelectedActualCategoryKey(null)} className="mr-2">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to Categories
                </Button>
                <span className="text-gray-500">→</span>
                <span className="ml-2 font-medium text-lg text-pink-600">
                  {customMenuDetails.categories[selectedActualCategoryKey]?.title}
                </span>
              </div>
              <div className="space-y-3">
                {customMenuDetails.categories[selectedActualCategoryKey]?.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover:border-pink-300
                                ${isItemSelectedInCategory(selectedActualCategoryKey, item.id) ? 'bg-pink-50 border-pink-500' : 'border-gray-200'}`}
                    onClick={() => handleItemSelection(selectedActualCategoryKey, item.id, !isItemSelectedInCategory(selectedActualCategoryKey, item.id))}
                  >
                    <div>
                      <span className="font-medium">{item.name}</span>
                      {item.upcharge && item.upcharge > 0 && (
                        <span className="text-xs text-amber-600 ml-2">(+${item.upcharge.toFixed(2)}/person)</span>
                      )}
                    </div>
                    {isItemSelectedInCategory(selectedActualCategoryKey, item.id) && <CheckIcon className="h-5 w-5 text-pink-600" />}
                  </div>
                ))}
              </div>
            </>
          )}
           <div className="mt-8 p-4 bg-gray-50 rounded-md">
                <h4 className="text-md font-semibold mb-2">Your Custom Wedding Selections:</h4>
                {Object.keys(formMenuSelections || {}).length === 0 || Object.values(formMenuSelections).every(val => Array.isArray(val) && val.length === 0) ? (
                    <p className="text-sm text-gray-500 italic">No items selected yet.</p>
                ) : (
                    Object.keys(formMenuSelections || {}).map(catKey => {
                        const items = formMenuSelections[catKey];
                        if (!Array.isArray(items) || items.length === 0) return null;
                        const categoryTitle = customMenuDetails.categories[catKey]?.title || catKey;
                        return (
                            <div key={catKey} className="mb-2">
                                <h5 className="font-medium text-sm text-pink-700">{categoryTitle}:</h5>
                                <ul className="list-disc list-inside ml-4 text-sm text-gray-600">
                                    {items.map((item: any) => {
                                        const itemDetails = customMenuDetails.categories[catKey]?.items.find(i => i.id === item.id);
                                        return <li key={item.id}>{itemDetails?.name || item.id}</li>;
                                    })}
                                </ul>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
        <div className="flex justify-between mt-10">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex items-center px-6 py-3 text-lg">
            <ChevronLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Button type="button" onClick={onNext} className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white">
            Next <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Standard Package-Based Menu Selection
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">{currentWeddingThemeDetails.title}</h2>
        <p className="text-lg text-gray-600">
          Select your preferred wedding package and customize your menu items.
        </p>
        <Button variant="link" onClick={() => handleThemeSelection("")} className="mt-2 text-pink-600">
          Change Wedding Theme
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Select a Wedding Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentWeddingThemeDetails.packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl ${
                  currentThemePackageId === pkg.id ? 'ring-2 ring-pink-500 shadow-2xl' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setValue(`selectedPackages.${selectedTheme}`, pkg.id)}
              >
                <CardHeader className={`p-4 ${currentThemePackageId === pkg.id ? 'bg-pink-50' : 'bg-gray-50'}`}>
                  <CardTitle className="text-lg font-semibold text-gray-800">{pkg.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-2"><strong>Price:</strong> ${pkg.price.toFixed(2)} / person</p>
                  <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                  {pkg.minGuestCount && guestCount < pkg.minGuestCount && (
                    <p className="text-xs text-red-600 flex items-center"><InfoIcon className="h-4 w-4 mr-1" /> Minimum {pkg.minGuestCount} guests required.</p>
                  )}
                  <div className="flex justify-end mt-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      currentThemePackageId === pkg.id ? 'bg-pink-600 border-pink-600' : 'border-gray-300'
                    }`}>
                      {currentThemePackageId === pkg.id && <CheckIcon className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {currentThemePackageId && (
          <div className="space-y-6 mt-6 pt-6 border-t">
            {Object.keys(currentWeddingThemeDetails.categories).map((categoryKey) => {
              const category = currentWeddingThemeDetails.categories[categoryKey];
              const selectionLimit = getCategorySelectionLimit(categoryKey);
              const selectedCount = getSelectedItemCountForCategory(categoryKey);

              if (selectionLimit === 0 && !category.items.some(item => item.upcharge)) return null; // Hide if no limit and no upcharge items, unless it's a category like "addons"

              return (
                <div key={categoryKey} className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-semibold text-gray-700">{category.title}</h4>
                    {selectionLimit > 0 && (
                      <span className={`text-xs px-2 py-1 rounded-full ${selectedCount >= selectionLimit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedCount} / {selectionLimit} selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {category.items.map((item) => {
                      const isChecked = isItemSelectedInCategory(categoryKey, item.id);
                      const isDisabled = !isChecked && selectionLimit > 0 && selectedCount >= selectionLimit;
                      // Logic for quantity input (e.g., for add-ons)
                      if (categoryKey === 'addons' && item.price) { // Example condition for quantity input
                        return (
                            <div key={item.id} className="p-3 border rounded-md">
                                <Label htmlFor={`${categoryKey}-${item.id}`} className="font-medium">{item.name}</Label>
                                {item.upcharge && <span className="text-xs text-amber-600 ml-1">(+${item.upcharge.toFixed(2)})</span>}
                                <p className="text-xs text-gray-500 mb-1">{item.description || ""}</p>
                                <Input
                                    id={`${categoryKey}-${item.id}`}
                                    type="number"
                                    min="0"
                                    className="w-20 h-8 mt-1 text-sm"
                                    value={getItemQuantityFromSelection(categoryKey, item.id)}
                                    onChange={(e) => handleItemSelection(categoryKey, item.id, parseInt(e.target.value) > 0, parseInt(e.target.value) || 0)}
                                />
                            </div>
                        );
                      }
                      // Checkbox for other items
                      return (
                        <div key={item.id}
                          className={`flex items-center p-3 border rounded-md transition-all
                                      ${isChecked ? 'bg-pink-50 border-pink-400' : 'border-gray-200'}
                                      ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-pink-300'}`}
                          onClick={() => !isDisabled && handleItemSelection(categoryKey, item.id, !isChecked)}
                        >
                          <Checkbox id={`${categoryKey}-${item.id}-${currentThemePackageId}`} checked={isChecked} disabled={isDisabled} className="mr-3"/>
                            <Label htmlFor={`${categoryKey}-${item.id}-${currentThemePackageId}`} className={`flex-grow ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                            {item.name}
                            {item.upcharge && item.upcharge > 0 && (
                              <span className="text-xs text-amber-600 ml-1">(+${item.upcharge.toFixed(2)}/person)</span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!currentThemePackageId && selectedTheme && (
          <div className="text-center p-6 bg-gray-50 rounded-md mt-6">
            <p className="text-gray-600">Please select a wedding package above to customize your menu items.</p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-10">
        <Button type="button" variant="outline" onClick={onPrevious} className="flex items-center px-6 py-3 text-lg">
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button type="button" onClick={onNext} disabled={!currentThemePackageId && selectedTheme !== "custom_menu"} className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white">
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingMenuSelectionStep;