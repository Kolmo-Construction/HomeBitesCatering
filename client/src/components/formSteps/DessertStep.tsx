// client/src/components/formSteps/DessertStep.tsx
import React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { dessertOptions } from "../../data/dessertOptions";
import { EventInquiryFormData } from "../../types";

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
  const dessertSelections = watch("dessertSelections") || [];
  
  // Toggle a dessert selection
  const toggleDessertSelection = (id: string, isChecked: boolean) => {
    // Check if the dessert is already selected
    const currentSelections = [...(dessertSelections || [])];
    
    if (isChecked) {
      // Add to selections if not already included
      if (!currentSelections.includes(id)) {
        setValue("dessertSelections", [...currentSelections, id]);
      }
    } else {
      // Remove from selections
      setValue(
        "dessertSelections", 
        currentSelections.filter(dessertId => dessertId !== id)
      );
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
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
            <h3 className="text-lg font-medium mb-4">Select Your Desserts</h3>
            <p className="text-sm text-gray-500 mb-6">
              Choose from our signature dessert options below. All desserts are priced per person.
            </p>
            
            <div className="space-y-4">
              {dessertOptions.map((dessert) => (
                <div key={dessert.id} className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-50">
                  <Checkbox
                    id={dessert.id}
                    checked={dessertSelections.includes(dessert.id)}
                    onCheckedChange={(checked) => 
                      toggleDessertSelection(dessert.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={dessert.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                    >
                      <div>
                        <span className="text-base font-medium">{dessert.name}</span>
                        <p className="text-sm text-gray-500">{dessert.description}</p>
                      </div>
                      <span className="mt-2 sm:mt-0 text-sm font-semibold">${dessert.price.toFixed(2)} per person</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            
            {dessertSelections.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">Selected Desserts</h4>
                <ul className="space-y-1">
                  {dessertSelections.map(id => {
                    const dessert = dessertOptions.find(d => d.id === id);
                    return dessert ? (
                      <li key={id} className="text-sm">
                        {dessert.name} (${dessert.price.toFixed(2)} per person)
                      </li>
                    ) : null;
                  })}
                </ul>
                <div className="mt-3 text-right">
                  <p className="text-sm font-medium">
                    {dessertSelections.length} dessert(s) selected
                  </p>
                </div>
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