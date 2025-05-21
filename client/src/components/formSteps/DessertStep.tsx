// client/src/components/formSteps/DessertStep.tsx
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, Plus, Minus } from "lucide-react";
import { dessertOptions, dessertLotSizes, DessertLotSize } from "../../data/dessertOptions";
import { EventInquiryFormData } from "../../types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DessertStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const DessertStep: React.FC<DessertStepProps> = ({ 
  onPrevious,
  onNext 
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  
  // Get form values
  const wantsDesserts = watch("wantsDesserts");
  const dessertSelections = watch("dessertSelections") || {};
  const guestCount = watch("guestCount") || 50;
  
  // Local state for category
  const [activeCategory, setActiveCategory] = useState<string>("all");
  
  // Calculate price per person
  const calculateTotal = () => {
    if (!dessertSelections) return 0;
    
    let total = 0;
    Object.keys(dessertSelections).forEach(id => {
      const dessert = dessertOptions.find(d => d.id === id);
      const quantity = dessertSelections[id] as DessertLotSize | null;
      
      if (dessert && quantity) {
        total += dessert.price * quantity;
      }
    });
    
    return total;
  };
  
  // Calculate per person cost
  const calculatePerPersonCost = () => {
    if (guestCount <= 0) return 0;
    return calculateTotal() / guestCount;
  };
  
  // Update dessert selection
  const updateDessertSelection = (dessertId: string, lotSize: DessertLotSize | null) => {
    const updatedSelections = { ...dessertSelections };
    
    if (lotSize === null) {
      // If null, remove the selection
      delete updatedSelections[dessertId];
    } else {
      // Otherwise update/add the selection
      updatedSelections[dessertId] = lotSize;
    }
    
    setValue('dessertSelections', updatedSelections);
  };
  
  // Filter desserts by category (if needed)
  const filteredDesserts = activeCategory === 'all' 
    ? dessertOptions 
    : dessertOptions.filter(d => d.id.includes(activeCategory));
  
  // Get selected lot size for a dessert
  const getSelectedLotSize = (dessertId: string): DessertLotSize | null => {
    return (dessertSelections[dessertId] as DessertLotSize) || null;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dessert Options</h2>
        <p className="text-lg text-gray-600">
          Complete your event with something sweet
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <FormField
            control={control}
            name="wantsDesserts"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 rounded-md border">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Include Desserts</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Add a sweet ending to your event
                  </div>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {wantsDesserts && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Your Desserts</h3>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">
                  Total: ${calculateTotal().toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Approx. ${calculatePerPersonCost().toFixed(2)} per person
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Select quantity for each dessert option. Prices shown are per piece.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md overflow-x-auto mb-6">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium text-gray-700">Dessert</th>
                    <th className="py-3 px-4 text-center font-medium text-gray-700">Price</th>
                    <th className="py-3 px-4 text-center font-medium text-gray-700">None</th>
                    {dessertLotSizes.map(size => (
                      <th key={size} className="py-3 px-4 text-center font-medium text-gray-700">
                        {size} pcs
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDesserts.map(dessert => {
                    const selectedLotSize = getSelectedLotSize(dessert.id);
                    
                    return (
                      <tr key={dessert.id} className="border-b">
                        <td className="py-3 px-4">{dessert.name}</td>
                        <td className="py-3 px-4 text-center">${dessert.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="radio"
                            checked={selectedLotSize === null}
                            onChange={() => updateDessertSelection(dessert.id, null)}
                            className="h-4 w-4"
                          />
                        </td>
                        
                        {dessertLotSizes.map(size => (
                          <td key={size} className="py-3 px-4 text-center">
                            <input
                              type="radio"
                              checked={selectedLotSize === size}
                              onChange={() => updateDessertSelection(dessert.id, size)}
                              className="h-4 w-4"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {Object.keys(dessertSelections).length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">Selected Desserts</h4>
                <ScrollArea className="h-[200px] pr-4">
                  <ul className="space-y-2">
                    {Object.entries(dessertSelections).map(([id, quantity]) => {
                      const dessert = dessertOptions.find(d => d.id === id);
                      if (!dessert || !quantity) return null;
                      
                      return (
                        <li key={id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <span className="font-medium">{dessert.name}</span>
                            <p className="text-sm text-gray-500">
                              {quantity} pieces × ${dessert.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">
                              ${(dessert.price * (quantity as number)).toFixed(2)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
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

export default DessertStep;