// src/pages/wedding/components/WeddingFoodTruckMenuStep.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { WeddingInquiryFormData } from "../types/weddingFormTypes"; // Wedding specific form data
import { foodTruckMenuData } from "@/data/foodTruckMenu"; // Using the master data file

// Import UI components (ensure these paths are correct for your project)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface WeddingFoodTruckMenuStepProps {
  onPrevious: () => void;
  onNext: () => void;
  onSkipDessert: () => void; // To handle skipping the main dessert steps
}

const WeddingFoodTruckMenuStep: React.FC<WeddingFoodTruckMenuStepProps> = ({
  onPrevious,
  onNext,
  onSkipDessert,
}) => {
  const { control, watch, setValue } = useFormContext<WeddingInquiryFormData>();

  const includeDesserts = watch("foodTruckSelections.includeDesserts");

  const handleNextNavigation = () => {
    if (includeDesserts === false) { // If explicitly set to false
      onSkipDessert(); // Call this to trigger custom navigation in orchestrator
    } else {
      onNext(); // Proceed to the next step defined in orchestrator (likely dessertQuestion)
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-pink-600">
          Food Truck Menu Selections
        </CardTitle>
        <CardDescription className="text-center">
          Customize your food truck experience for the wedding!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {foodTruckMenuData.categories.map((category) => (
          <div key={category.id} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
            <FormField
              control={control}
              name={`foodTruckSelections.${category.id as keyof WeddingInquiryFormData['foodTruckSelections']}`}
              render={() => (
                <FormItem className="space-y-2">
                  {category.items.map((item: string) => ( // Assuming items are strings
                    <FormField
                      key={item}
                      control={control}
                      // Cast is necessary here because category.id is dynamic
                      name={`foodTruckSelections.${category.id as 'smallBites' | 'bigBites' | 'vegetarianVegan' | 'kidsBites'}`}
                      render={({ field }) => {
                        const currentSelections = field.value as string[] || [];
                        return (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={currentSelections.includes(item)}
                                onCheckedChange={(checked) => {
                                  const newSelections = checked
                                    ? [...currentSelections, item]
                                    : currentSelections.filter((value) => value !== item);
                                  setValue(
                                    `foodTruckSelections.${category.id as 'smallBites' | 'bigBites' | 'vegetarianVegan' | 'kidsBites'}`,
                                    newSelections,
                                    { shouldValidate: true }
                                  );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-gray-700">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ))}

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-gray-800">Additional Options</h3>
          {foodTruckMenuData.options.map((option) => (
            <FormField
              key={option.id}
              control={control}
              name={`foodTruckSelections.${option.field as keyof WeddingInquiryFormData['foodTruckSelections']}`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-gray-700">{option.name}</FormLabel>
                    {option.id === "glutenFreeBuns" && (
                       <FormDescription>
                         Enter quantity for gluten-free buns.
                       </FormDescription>
                    )}
                  </div>
                  <FormControl>
                    {option.type === "boolean" ? (
                      <Switch
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                      />
                    ) : option.type === "number" ? (
                      <Input
                        type="number"
                        className="w-20 text-right"
                        placeholder="0"
                        {...field}
                        value={field.value || 0} // Ensure value is not undefined for input
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      />
                    ) : null}
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <Button type="button" variant="outline" onClick={onPrevious}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button type="button" onClick={handleNextNavigation} className="bg-pink-500 hover:bg-pink-600">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeddingFoodTruckMenuStep;