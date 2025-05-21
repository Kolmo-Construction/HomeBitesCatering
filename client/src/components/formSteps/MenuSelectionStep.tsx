// client/src/components/formSteps/MenuSelectionStep.tsx
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { EventInquiryFormData } from "../../types";
import { menuThemesData } from "../../data/menuAndAppetizerData";

interface MenuSelectionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const MenuSelectionStep: React.FC<MenuSelectionStepProps> = ({ 
  onPrevious,
  onNext 
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Get form values
  const selectedMenuTheme = watch("selectedMenuTheme");
  const menuSelections = watch("menuSelections") || {};
  const selectedPackage = watch("selectedPackage") || null;
  
  // Initialize state if needed
  React.useEffect(() => {
    if (!activeTheme && menuThemesData && Object.keys(menuThemesData.categories).length > 0) {
      setActiveTheme(Object.keys(menuThemesData.categories)[0]);
    }
  }, []);
  
  // Handle theme selection
  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    setValue("selectedMenuTheme", themeId);
    
    // Initialize menu selections structure if needed
    if (!menuSelections[themeId]) {
      setValue(`menuSelections.${themeId}`, {});
    }
    
    // Set first category as active
    const theme = menuThemesData.categories[themeId];
    if (theme && theme.subcategories && Object.keys(theme.subcategories).length > 0) {
      setActiveCategory(Object.keys(theme.subcategories)[0]);
    }
  };
  
  // Handle package selection
  const handlePackageSelection = (packageId: string) => {
    setValue("selectedPackage", packageId);
  };
  
  // Handle item selection
  const handleItemSelection = (categoryId: string, itemId: string, isSelected: boolean) => {
    if (!activeTheme) return;
    
    // Make sure themeId and categoryId structures exist
    if (!menuSelections[activeTheme]) {
      setValue(`menuSelections.${activeTheme}`, {});
    }
    
    if (!menuSelections[activeTheme][categoryId]) {
      setValue(`menuSelections.${activeTheme}.${categoryId}`, []);
    }
    
    // Current selections
    const currentSelections = [...(menuSelections[activeTheme][categoryId] || [])];
    
    if (isSelected) {
      // Add item to selections if not already included
      if (!currentSelections.includes(itemId)) {
        setValue(`menuSelections.${activeTheme}.${categoryId}`, [...currentSelections, itemId]);
      }
    } else {
      // Remove item from selections
      setValue(
        `menuSelections.${activeTheme}.${categoryId}`, 
        currentSelections.filter(id => id !== itemId)
      );
    }
  };
  
  // Calculate if selection limits have been reached
  const isSelectionLimited = (categoryId: string): boolean => {
    if (!activeTheme || !selectedPackage) return false;
    
    const theme = menuThemesData.categories[activeTheme];
    const category = theme?.subcategories?.[categoryId];
    
    if (!category || !category.description) return false;
    
    // Parse the description to get the limit
    const limits = category.description.match(/Choose up to (\d+)/);
    if (!limits || !limits[1]) return false;
    
    const limit = parseInt(limits[1], 10);
    const currentSelections = menuSelections[activeTheme]?.[categoryId] || [];
    
    return currentSelections.length >= limit;
  };
  
  // Check if an item is selected
  const isItemSelected = (categoryId: string, itemId: string): boolean => {
    if (!activeTheme) return false;
    
    const selections = menuSelections[activeTheme]?.[categoryId] || [];
    return selections.includes(itemId);
  };
  
  // Calculate total price with upcharges
  const calculateTotal = (): number => {
    if (!selectedMenuTheme || !selectedPackage) return 0;
    
    const theme = menuThemesData.categories[selectedMenuTheme];
    if (!theme) return 0;
    
    // Find package base price if theme has packages
    let basePrice = 0;
    if (theme.packages) {
      const pkg = theme.packages.find(p => p.id === selectedPackage);
      if (pkg) {
        basePrice = pkg.price || 0;
      }
    }
    
    // Add upcharges from selected items
    let totalUpcharge = 0;
    
    if (menuSelections[selectedMenuTheme]) {
      Object.keys(menuSelections[selectedMenuTheme]).forEach(categoryId => {
        const selections = menuSelections[selectedMenuTheme][categoryId] || [];
        
        selections.forEach(itemId => {
          const category = theme.subcategories?.[categoryId];
          if (!category) return;
          
          const item = category.items.find(i => i.id === itemId);
          if (item && item.upcharge) {
            totalUpcharge += item.upcharge;
          }
        });
      });
    }
    
    return basePrice + totalUpcharge;
  };
  
  // Get the estimated guest count - either from form or default to 50
  const guestCount = watch("guestCount") || 50;
  
  // Calculate total with guest count
  const calculateTotalWithGuests = (): number => {
    return calculateTotal() * guestCount;
  };
  
  // Get selected theme data
  const selectedTheme = selectedMenuTheme ? menuThemesData.categories[selectedMenuTheme] : null;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Menu Selection</h2>
        <p className="text-lg text-gray-600">
          Choose a menu theme for your event
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select a Menu Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(menuThemesData.categories).map(([themeId, theme]) => (
              <Card 
                key={themeId} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selectedMenuTheme === themeId ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleThemeChange(themeId)}
              >
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium">{theme.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{theme.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {selectedTheme && (
        <>
          {/* Package Selection - if the theme has packages */}
          {selectedTheme.packages && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Package</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedPackage || ''}
                  onValueChange={handlePackageSelection}
                  className="space-y-4"
                >
                  {selectedTheme.packages.map(pkg => (
                    <div key={pkg.id} className="flex items-start space-x-3">
                      <RadioGroupItem id={pkg.id} value={pkg.id} />
                      <div className="flex-1">
                        <Label htmlFor={pkg.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer">
                          <div>
                            <span className="text-base font-medium">{pkg.name}</span>
                            <p className="text-sm text-gray-500">{pkg.description}</p>
                          </div>
                          <span className="mt-2 sm:mt-0 text-sm font-semibold">
                            ${pkg.price?.toFixed(2) || '0.00'} per person
                          </span>
                        </Label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}
          
          {/* Item Selection */}
          {selectedPackage && selectedTheme.subcategories && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Customize Your Menu</CardTitle>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      ${calculateTotal().toFixed(2)} per person
                    </p>
                    <p className="text-xs text-gray-500">
                      Total: ${calculateTotalWithGuests().toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs 
                  defaultValue={Object.keys(selectedTheme.subcategories)[0]}
                  value={activeCategory || Object.keys(selectedTheme.subcategories)[0]}
                  onValueChange={setActiveCategory}
                >
                  <TabsList className="mb-4 overflow-x-auto flex w-full">
                    {Object.entries(selectedTheme.subcategories).map(([categoryId, category]) => (
                      <TabsTrigger key={categoryId} value={categoryId}>
                        {category.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {Object.entries(selectedTheme.subcategories).map(([categoryId, category]) => (
                    <TabsContent key={categoryId} value={categoryId}>
                      <div className="mb-2">
                        <h3 className="text-lg font-medium">{category.title}</h3>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                      
                      <div className="space-y-3 mt-4">
                        {category.items.map(item => (
                          <div key={item.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-50">
                            <Checkbox
                              id={`${categoryId}-${item.id}`}
                              checked={isItemSelected(categoryId, item.id)}
                              onCheckedChange={(checked) => 
                                handleItemSelection(categoryId, item.id, checked as boolean)
                              }
                              disabled={!isItemSelected(categoryId, item.id) && isSelectionLimited(categoryId)}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`${categoryId}-${item.id}`}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                              >
                                <div>
                                  <span className="text-base font-medium">{item.name}</span>
                                </div>
                                {item.upcharge !== undefined && item.upcharge > 0 && (
                                  <span className="mt-1 sm:mt-0 text-sm text-amber-600">
                                    +${item.upcharge.toFixed(2)} per person
                                  </span>
                                )}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
          
          {/* Summary */}
          {selectedPackage && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Selection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Selected Theme</h4>
                    <p>{selectedTheme.title}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">Selected Package</h4>
                    <p>
                      {selectedTheme.packages?.find(p => p.id === selectedPackage)?.name || 'None'} 
                      {selectedTheme.packages?.find(p => p.id === selectedPackage)?.price ? 
                        ` - $${selectedTheme.packages?.find(p => p.id === selectedPackage)?.price?.toFixed(2)} per person` : ''}
                    </p>
                  </div>
                  
                  {Object.entries(selectedTheme.subcategories || {}).map(([categoryId, category]) => {
                    const selections = menuSelections[selectedMenuTheme]?.[categoryId] || [];
                    if (selections.length === 0) return null;
                    
                    return (
                      <div key={categoryId}>
                        <h4 className="font-medium">{category.title}</h4>
                        <ul className="list-disc list-inside pl-2 space-y-1">
                          {selections.map(itemId => {
                            const item = category.items.find(i => i.id === itemId);
                            return item ? (
                              <li key={itemId} className="text-sm">
                                {item.name}
                                {item.upcharge ? ` (+$${item.upcharge.toFixed(2)})` : ''}
                              </li>
                            ) : null;
                          })}
                        </ul>
                      </div>
                    );
                  })}
                  
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Price per person:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-medium">Estimated total ({guestCount} guests):</span>
                      <span className="font-bold">${calculateTotalWithGuests().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center gap-2"
          disabled={!selectedMenuTheme || !selectedPackage}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MenuSelectionStep;