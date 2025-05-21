// client/src/components/formSteps/AppetizersStep.tsx
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Plus, Minus } from "lucide-react";
import { EventInquiryFormData } from "../../types";
import { appetizerData, horsDoeurvesData } from "../../data/menuAndAppetizerData";

interface AppetizersStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const AppetizersStep: React.FC<AppetizersStepProps> = ({ 
  onPrevious,
  onNext 
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
  }, []);
  
  // Initialize appetizers structure if needed
  const initializeCategory = (categoryId: string) => {
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }
  };
  
  // Add an appetizer item to the selected category
  const addAppetizer = (categoryId: string, item: { id: string, name: string, price: number }) => {
    initializeCategory(categoryId);
    
    const currentItems = [...(appetizers[categoryId] || [])];
    
    // Check if item is already in the list
    const existingItemIndex = currentItems.findIndex(
      existing => existing.name === item.name
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if it exists
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + 1
      };
      setValue(`appetizers.${categoryId}`, updatedItems);
    } else {
      // Add new item with quantity 1
      setValue(`appetizers.${categoryId}`, [
        ...currentItems, 
        { name: item.name, quantity: 1, price: item.price }
      ]);
    }
  };
  
  // Remove an appetizer from the selected category
  const removeAppetizer = (categoryId: string, itemName: string) => {
    if (!appetizers[categoryId]) return;
    
    const currentItems = [...appetizers[categoryId]];
    const itemIndex = currentItems.findIndex(item => item.name === itemName);
    
    if (itemIndex >= 0) {
      const item = currentItems[itemIndex];
      
      if (item.quantity > 1) {
        // Decrease quantity
        const updatedItems = [...currentItems];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          quantity: updatedItems[itemIndex].quantity - 1
        };
        setValue(`appetizers.${categoryId}`, updatedItems);
      } else {
        // Remove item completely
        setValue(
          `appetizers.${categoryId}`, 
          currentItems.filter(item => item.name !== itemName)
        );
      }
    }
  };
  
  // Initialize horsDoeurvesSelections categories and items
  const initializeHorsDoeurvesCategory = (categoryId: string) => {
    if (!horsDoeurvesSelections.categories[categoryId]) {
      setValue(`horsDoeurvesSelections.categories.${categoryId}`, { items: {} });
    }
  };
  
  // Update horse d'oeuvres selection
  const updateHorsDoeurvesSelection = (
    categoryId: string, 
    itemId: string, 
    itemName: string, 
    itemPrice: number, 
    quantity: number | null
  ) => {
    initializeHorsDoeurvesCategory(categoryId);
    
    setValue(
      `horsDoeurvesSelections.categories.${categoryId}.items.${itemId}`, 
      {
        name: itemName,
        price: itemPrice,
        quantity: quantity
      }
    );
  };
  
  // Calculate the total for a category
  const calculateCategoryTotal = (categoryId: string) => {
    if (!appetizers[categoryId]) return 0;
    
    return appetizers[categoryId].reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    );
  };
  
  // Calculate the total for hors d'oeuvres
  const calculateHorsDoeurvesTotal = (selections: any, guestCount: number) => {
    if (!selections?.categories) return 0;
    
    let total = 0;
    
    // Loop through all categories
    Object.keys(selections.categories).forEach(categoryId => {
      const category = selections.categories[categoryId];
      if (!category?.items) return;
      
      // Loop through all items in the category
      Object.keys(category.items).forEach(itemId => {
        const item = category.items[itemId];
        if (item?.quantity && item.price) {
          total += item.price * item.quantity;
        }
      });
    });
    
    return total;
  };
  
  // Render appetizer category selection UI
  const renderAppetizerCategory = (category: any) => {
    initializeCategory(category.id);
    const selectedItems = appetizers[category.id] || [];
    
    return (
      <div className="mb-8" key={category.id}>
        <h3 className="text-lg font-medium mb-2">{category.name}</h3>
        {category.note && <p className="text-sm text-gray-500 mb-4">{category.note}</p>}
        
        <div className="space-y-4">
          {category.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">${item.price.toFixed(2)} per piece</p>
              </div>
              
              <div className="flex items-center">
                {/* Show quantity selector */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => removeAppetizer(category.id, item.name)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <span className="px-3">
                  {selectedItems.find(i => i.name === item.name)?.quantity || 0}
                </span>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => addAppetizer(category.id, item)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {selectedItems.length > 0 && (
          <div className="mt-4 text-right">
            <p className="text-sm font-medium">
              Category Total: ${calculateCategoryTotal(category.id).toFixed(2)}
            </p>
          </div>
        )}
      </div>
    );
  };
  
  // Matrix selection for horse d'oeuvres
  const renderHorsDoeurvesMatrix = () => {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Hors d'oeuvres Selection</h3>
        
        <div className="mb-4">
          <p className="text-sm mb-2">Service Style</p>
          <RadioGroup
            value={horsDoeurvesSelections?.serviceStyle || "stationary"}
            onValueChange={(value: "stationary" | "passed") => 
              setValue("horsDoeurvesSelections.serviceStyle", value)
            }
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stationary" id="stationary" />
              <Label htmlFor="stationary">Stationary</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passed" id="passed" />
              <Label htmlFor="passed">Passed</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-4 text-left font-medium text-gray-700">Item</th>
                <th className="py-3 px-4 text-center font-medium text-gray-700">Price</th>
                <th className="py-3 px-4 text-center font-medium text-gray-700">None</th>
                {horsDoeurvesData.categories[0].lotSizes?.map(size => (
                  <th key={size} className="py-3 px-4 text-center font-medium text-gray-700">
                    {size} pcs
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horsDoeurvesData.categories.map(category => (
                <React.Fragment key={category.id}>
                  <tr className="bg-gray-100">
                    <td colSpan={7} className="py-2 px-4 font-medium">
                      {category.name}
                    </td>
                  </tr>
                  
                  {category.items.map(item => {
                    const selectedQuantity = 
                      horsDoeurvesSelections?.categories?.[category.id]?.
                      items?.[item.id]?.quantity || null;
                    
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="py-2 px-4">{item.name}</td>
                        <td className="py-2 px-4 text-center">${item.price.toFixed(2)}</td>
                        <td className="py-2 px-4 text-center">
                          <input
                            type="radio"
                            checked={selectedQuantity === null}
                            onChange={() => updateHorsDoeurvesSelection(
                              category.id, 
                              item.id, 
                              item.name, 
                              item.price, 
                              null
                            )}
                            className="h-4 w-4"
                          />
                        </td>
                        
                        {category.lotSizes?.map(size => (
                          <td key={size} className="py-2 px-4 text-center">
                            <input
                              type="radio"
                              checked={selectedQuantity === size}
                              onChange={() => updateHorsDoeurvesSelection(
                                category.id, 
                                item.id, 
                                item.name, 
                                item.price, 
                                size
                              )}
                              className="h-4 w-4"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-right">
          <p className="text-sm font-medium">
            Hors d'oeuvres Total: ${calculateHorsDoeurvesTotal(horsDoeurvesSelections, 50).toFixed(2)}
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Appetizer Selection</h2>
        <p className="text-lg text-gray-600">
          Select from our signature appetizers to enhance your event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Service Style</h3>
          <RadioGroup
            value={appetizerService || "stationary"}
            onValueChange={(value: "stationary" | "passed") => 
              setValue("appetizerService", value)
            }
            className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stationary" id="service-stationary" />
              <Label htmlFor="service-stationary">Stationary (Self-Service)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passed" id="service-passed" />
              <Label htmlFor="service-passed">Passed (Butler Service)</Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Choose Your Appetizers</h3>
          
          {appetizerData.categories.map(category => (
            renderAppetizerCategory(category)
          ))}
        </div>
        
        {renderHorsDoeurvesMatrix()}
      </div>
      
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
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AppetizersStep;