// client/src/components/form-steps/NonAlcoholicBeveragesStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventInquiryFormData } from "@/types/form-types";

export default function NonAlcoholicBeveragesStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { setValue, watch } = useFormContext<EventInquiryFormData>();
  
  // Get the current selections or initialize if not present
  const selections = watch("nonAlcoholicBeverageSelections") || {};
  
  // Define available non-alcoholic beverage options with type safety
  const beverageOptions = [
    { id: "bottled_water_1pp" as const, label: "Bottled Water (1 pp)" },
    { id: "bottled_water_unlimited" as const, label: "Bottled Water (unlimited)" },
    { id: "assorted_soft_drinks_1pp" as const, label: "Assorted Soft Drinks (1 pp)" },
    { id: "assorted_soft_drinks_unlimited" as const, label: "Assorted Soft Drinks (unlimited)" },
    { id: "pellegrino_sodas_1pp" as const, label: "Pellegrino Flavored Sodas (1 pp)" },
    { id: "pellegrino_sodas_unlimited" as const, label: "Pellegrino Flavored Sodas (unlimited)" },
    { id: "assorted_snapple_1pp" as const, label: "Assorted Snapple (1 pp)" },
    { id: "assorted_snapple_unlimited" as const, label: "Assorted Snapple (unlimited)" },
    { id: "assorted_gatorade_1pp" as const, label: "Assorted Gatorade (1 pp)" },
    { id: "assorted_gatorade_unlimited" as const, label: "Assorted Gatorade (unlimited)" },
    { id: "free_pour_lemonade" as const, label: "Free pour Lemonade" },
    { id: "free_pour_iced_tea" as const, label: "Free pour Iced Tea" },
    { id: "non_alcoholic_mocktails" as const, label: "Non-alcoholic Mocktails (Free-Pour) $2.75pp" }
  ];
  
  // Toggle an option selection
  const toggleOption = (optionId: keyof typeof selections, checked: boolean) => {
    setValue("nonAlcoholicBeverageSelections", {
      ...selections,
      [optionId]: checked
    });
  };
  
  // Handle the "I changed my mind" option
  const handleChangeMind = () => {
    setValue("beverageServiceChoice", undefined);
    onPrevious();
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Choose Non-Alcoholic Beverages</h2>
        <p className="text-lg text-gray-600">
          Select the non-alcoholic beverage options you'd like for your event.
        </p>
      </div>
      
      <Card className="bg-white rounded-lg shadow-md p-8 mb-8">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-4">
            {beverageOptions.map((option) => (
              <div key={option.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id={option.id}
                  checked={!!selections[option.id]}
                  onCheckedChange={(checked) => toggleOption(option.id, !!checked)}
                />
                <FormLabel htmlFor={option.id} className="font-normal cursor-pointer">
                  {option.label}
                </FormLabel>
              </div>
            ))}
          </div>
          
          <div className="mt-8">
            <Button 
              type="button" 
              variant="outline"
              onClick={handleChangeMind}
              className="w-full"
            >
              ← Skip This (I changed my mind)
            </Button>
          </div>
        </CardContent>
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
          onClick={onNext}
          className="flex items-center bg-primary"
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}