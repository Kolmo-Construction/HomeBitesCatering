import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, InfoIcon } from "lucide-react";
import { foodTruckMenuData } from "@/data/foodTruckMenu";
import { EventInquiryFormData } from "@/types/form-types";

// Component props
type FoodTruckMenuProps = {
  onPrevious: () => void;
  onNext: () => void;
  onSkipDessert: () => void;
};

const FoodTruckMenu = ({ onPrevious, onNext, onSkipDessert }: FoodTruckMenuProps) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  
  // Initialize the food truck selections if not already set
  const foodTruckSelections = watch("foodTruckSelections") || {
    smallBites: [],
    bigBites: [],
    vegetarianVegan: [],
    kidsBites: [],
    glutenFreeBuns: 0,
    includeMenuPoster: false,
    includeDesserts: false
  };
  
  // Local state to track selection counts
  const [selectedCounts, setSelectedCounts] = useState({
    smallBites: foodTruckSelections.smallBites.length,
    bigBites: foodTruckSelections.bigBites.length + (foodTruckSelections?.vegetarianVegan?.length || 0),
    kidsBites: foodTruckSelections.kidsBites.length
  });
  
  // Handle checkbox item selection
  const handleItemSelect = (category: "smallBites" | "bigBites" | "vegetarianVegan" | "kidsBites", itemId: string, isChecked: boolean) => {
    // Get current selections
    const currentSelections = [...(foodTruckSelections[category] || [])];
    
    // Update selections based on checked state
    if (isChecked) {
      // Add item if not already selected
      if (!currentSelections.includes(itemId)) {
        currentSelections.push(itemId);
      }
    } else {
      // Remove item if selected
      const index = currentSelections.indexOf(itemId);
      if (index !== -1) {
        currentSelections.splice(index, 1);
      }
    }
    
    // Update form data
    setValue(`foodTruckSelections.${category}`, currentSelections);
    
    // Update selection counts
    if (category === "smallBites") {
      setSelectedCounts(prev => ({ ...prev, smallBites: currentSelections.length }));
    } else if (category === "bigBites" || category === "vegetarianVegan") {
      const totalBigBites = category === "bigBites" 
        ? currentSelections.length + (foodTruckSelections.vegetarianVegan?.length || 0)
        : (foodTruckSelections.bigBites?.length || 0) + currentSelections.length;
      setSelectedCounts(prev => ({ ...prev, bigBites: totalBigBites }));
    } else if (category === "kidsBites") {
      setSelectedCounts(prev => ({ ...prev, kidsBites: currentSelections.length }));
    }
  };
  
  // Handle number input change for gluten-free buns
  const handleGlutenFreeBunsChange = (value: number) => {
    setValue("foodTruckSelections.glutenFreeBuns", value);
  };
  
  // Handle dessert selection toggle
  const handleDessertsToggle = (value: boolean) => {
    setValue("foodTruckSelections.includeDesserts", value);
  };
  
  // Handle menu poster toggle
  const handleMenuPosterToggle = (value: boolean) => {
    setValue("foodTruckSelections.includeMenuPoster", value);
  };
  
  // Handle next button click
  const handleNext = () => {
    if (foodTruckSelections.includeDesserts) {
      onNext(); // Continue to desserts step
    } else {
      onSkipDessert(); // Skip to the step after desserts
    }
  };
  
  // Check if recommendations are exceeded
  const isOverLimit = (category: "smallBites" | "bigBites" | "kidsBites") => {
    const limit = foodTruckMenuData.recommendedLimits[category];
    return selectedCounts[category] > limit;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Food Truck Menu Selection</h2>
        <p className="text-lg text-gray-600 mb-2">
          {foodTruckMenuData.introText}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 mt-4">
          <h3 className="text-amber-800 font-medium mb-2 flex items-center">
            <InfoIcon className="h-5 w-5 mr-2" /> 
            Service Recommendation
          </h3>
          <p className="text-sm text-amber-700">
            {foodTruckMenuData.serviceNote}
          </p>
          <ul className="list-disc list-inside text-sm text-amber-700 mt-2">
            <li>Maximum <strong>{foodTruckMenuData.recommendedLimits.smallBites}</strong> "Small Bites" varieties</li>
            <li>Maximum <strong>{foodTruckMenuData.recommendedLimits.bigBites}</strong> "Big Bites" varieties</li>
            <li>Maximum <strong>{foodTruckMenuData.recommendedLimits.kidsBites}</strong> "Kid's Bites" varieties</li>
          </ul>
        </div>
      </div>

      {/* Small Bites Section */}
      <Card className="mb-6 p-6">
        <h3 className="text-xl font-semibold mb-4 flex justify-between">
          <span>Small Bites</span>
          <span className={isOverLimit("smallBites") ? "text-red-500" : "text-green-600"}>
            {selectedCounts.smallBites}/{foodTruckMenuData.recommendedLimits.smallBites} Selected
          </span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {foodTruckMenuData.categories.smallBites.items.map((item) => (
            <FormField
              key={item.id}
              control={control}
              name={`foodTruckSelections.smallBites.${item.id}`}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={foodTruckSelections.smallBites.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleItemSelect("smallBites", item.id, checked as boolean)
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    {item.name}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
        
        {isOverLimit("smallBites") && (
          <p className="text-sm text-red-500 mt-2">
            Warning: You've selected more than the recommended {foodTruckMenuData.recommendedLimits.smallBites} items.
            This may impact service speed for large groups.
          </p>
        )}
      </Card>

      {/* Big Bites - Standard Section */}
      <Card className="mb-6 p-6">
        <h3 className="text-xl font-semibold mb-2">Big Bites</h3>
        <p className="text-sm text-gray-600 mb-3">{foodTruckMenuData.categories.bigBitesStandard.priceInfo}</p>
        
        <div className="flex justify-between mb-3">
          <span className="text-sm font-medium">
            Total Big Bites (Standard + Premium + Vegetarian/Vegan)
          </span>
          <span className={isOverLimit("bigBites") ? "text-red-500" : "text-green-600"}>
            {selectedCounts.bigBites}/{foodTruckMenuData.recommendedLimits.bigBites} Selected
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {foodTruckMenuData.categories.bigBitesStandard.items.map((item) => (
            <FormField
              key={item.id}
              control={control}
              name={`foodTruckSelections.bigBites.${item.id}`}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={foodTruckSelections.bigBites.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleItemSelect("bigBites", item.id, checked as boolean)
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    {item.name}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      </Card>

      {/* Big Bites - Premium Section */}
      <Card className="mb-6 p-6">
        <h3 className="text-xl font-semibold mb-2">Big Bites - Premium</h3>
        <p className="text-sm text-gray-600 mb-4">{foodTruckMenuData.categories.bigBitesPremium.priceInfo}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {foodTruckMenuData.categories.bigBitesPremium.items.map((item) => (
            <FormField
              key={item.id}
              control={control}
              name={`foodTruckSelections.bigBites.${item.id}`}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={foodTruckSelections.bigBites.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleItemSelect("bigBites", item.id, checked as boolean)
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    {item.name}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      </Card>

      {/* Vegetarian & Vegan Section */}
      <Card className="mb-6 p-6">
        <h3 className="text-xl font-semibold mb-2">Vegetarian & Vegan Selections</h3>
        <p className="text-sm text-gray-600 mb-4">{foodTruckMenuData.categories.vegetarianVegan.priceInfo}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {foodTruckMenuData.categories.vegetarianVegan.items.map((item) => (
            <FormField
              key={item.id}
              control={control}
              name={`foodTruckSelections.vegetarianVegan.${item.id}`}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={foodTruckSelections.vegetarianVegan.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleItemSelect("vegetarianVegan", item.id, checked as boolean)
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    {item.name}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
        
        {isOverLimit("bigBites") && (
          <p className="text-sm text-red-500 mt-2">
            Warning: You've selected more than the recommended {foodTruckMenuData.recommendedLimits.bigBites} items 
            across all Big Bites categories. This may impact service speed for large groups.
          </p>
        )}
      </Card>

      {/* Kid's Bites Section */}
      <Card className="mb-6 p-6">
        <h3 className="text-xl font-semibold mb-2">Kid's Bites</h3>
        <p className="text-sm text-gray-600 mb-3">{foodTruckMenuData.categories.kidsBites.priceInfo}</p>
        
        <div className="flex justify-between mb-3">
          <span className="text-sm font-medium">Kid's Menu Items</span>
          <span className={isOverLimit("kidsBites") ? "text-red-500" : "text-green-600"}>
            {selectedCounts.kidsBites}/{foodTruckMenuData.recommendedLimits.kidsBites} Selected
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {foodTruckMenuData.categories.kidsBites.items.map((item) => (
            <FormField
              key={item.id}
              control={control}
              name={`foodTruckSelections.kidsBites.${item.id}`}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={foodTruckSelections.kidsBites.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleItemSelect("kidsBites", item.id, checked as boolean)
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium cursor-pointer">
                    {item.name}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
        
        {isOverLimit("kidsBites") && (
          <p className="text-sm text-red-500 mt-2">
            Warning: You've selected more than the recommended {foodTruckMenuData.recommendedLimits.kidsBites} items.
            This may impact service speed for large groups.
          </p>
        )}
      </Card>

      {/* Customize Options */}
      <Card className="mb-6 p-6">
        <h3 className="text-xl font-semibold mb-4">Customize Your Order</h3>
        
        {/* Gluten-Free Buns */}
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-2">Gluten-Free Buns</h4>
          <p className="text-sm text-gray-600 mb-3">
            Add Gluten-Free Buns for an additional $0.95 each.
          </p>
          <div className="flex items-center gap-4">
            <Label htmlFor="glutenFreeBuns" className="w-auto">
              Quantity:
            </Label>
            <div className="w-32">
              <Input
                id="glutenFreeBuns"
                type="number"
                min="0"
                value={foodTruckSelections.glutenFreeBuns}
                onChange={(e) => handleGlutenFreeBunsChange(parseInt(e.target.value) || 0)}
                className="text-right"
              />
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* Menu Poster */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium">Menu Poster</h4>
              <p className="text-sm text-gray-600">
                Would you like to add a menu poster to your order?
              </p>
            </div>
            <Switch
              checked={foodTruckSelections.includeMenuPoster}
              onCheckedChange={handleMenuPosterToggle}
            />
          </div>
        </div>
        
        <Separator className="my-6" />
        
        {/* Desserts Option */}
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium">Desserts</h4>
              <p className="text-sm text-gray-600">
                Would you like to include desserts in your quote?
              </p>
            </div>
            <Switch
              checked={foodTruckSelections.includeDesserts}
              onCheckedChange={handleDessertsToggle}
            />
          </div>
        </div>
      </Card>

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
          onClick={handleNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default FoodTruckMenu;