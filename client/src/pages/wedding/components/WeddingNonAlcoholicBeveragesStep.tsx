// src/pages/wedding/components/WeddingNonAlcoholicBeveragesStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form"; // Re-added FormLabel as it's used
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, GlassWater } from "lucide-react"; // Added GlassWater icon
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

// Define the structure for beverage options
interface BeverageOption {
  id: keyof WeddingInquiryFormData["nonAlcoholicBeverageSelections"]; // Ensures type safety
  label: string;
  description?: string; // Optional description for more details
}

// Wedding-specific non-alcoholic beverage options
// This could be moved to a data file: src/pages/wedding/data/weddingBeverageOptions.ts
const weddingNonAlcoholicBeverageOptions: BeverageOption[] = [
  { id: "bottled_water_unlimited", label: "Unlimited Bottled Water (Still & Sparkling)", description: "Essential refreshment for all guests." },
  { id: "assorted_soft_drinks_unlimited", label: "Assorted Soft Drinks (Unlimited)", description: "Coke, Diet Coke, Sprite, Ginger Ale." },
  { id: "free_pour_lemonade", label: "Freshly Squeezed Lemonade (Free-Pour)", description: "A refreshing classic, perfect for all ages." },
  { id: "free_pour_iced_tea", label: "Artisan Iced Tea (Free-Pour, e.g., Peach, Raspberry)", description: "Brewed iced tea with a hint of flavor." },
  { id: "pellegrino_sodas_unlimited", label: "Assorted Pellegrino Flavored Sodas (Unlimited)", description: "Elegant sparkling fruit beverages." },
  { id: "non_alcoholic_mocktails", label: "Signature Non-Alcoholic Mocktails (Free-Pour)", description: "Beautifully crafted mocktails, e.g., 'Wedding Bliss Sparkler'. $2.75pp surcharge may apply." },
  // Removed per-person (1pp) options as "unlimited" or "free-pour" are more common for weddings.
  // Removed Gatorade and Snapple unless specifically requested for a very casual wedding.
];


interface WeddingNonAlcoholicBeveragesStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingNonAlcoholicBeveragesStep: React.FC<WeddingNonAlcoholicBeveragesStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch, setValue } = useFormContext<WeddingInquiryFormData>();
  const selections = watch("nonAlcoholicBeverageSelections") || {};

  // Initialize nonAlcoholicBeverageSelections if it's undefined
  React.useEffect(() => {
    if (watch("nonAlcoholicBeverageSelections") === undefined) {
      setValue("nonAlcoholicBeverageSelections", {});
    }
  }, [watch, setValue]);


  const toggleOption = (
    optionId: keyof WeddingInquiryFormData["nonAlcoholicBeverageSelections"],
    checked: boolean
  ) => {
    setValue(
      "nonAlcoholicBeverageSelections",
      {
        ...selections,
        [optionId]: checked,
      },
      { shouldValidate: true }
    );
  };

  const handleChangeMindAndGoBack = () => {
    // Reset non-alcoholic selections as we are going back to the question step
    setValue("nonAlcoholicBeverageSelections", {});
    // Set beverageServiceChoice to undefined to allow re-selection on the BeverageQuestionStep
    setValue("beverageServiceChoice", undefined);
    onPrevious(); // Go back to BeverageQuestionStep
  };


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <GlassWater className="h-8 w-8 mr-3 text-pink-500" />
          Non-Alcoholic Beverage Selections
        </h2>
        <p className="text-lg text-gray-600">
          Choose the non-alcoholic beverages you'd like to offer at your wedding.
        </p>
      </div>

      <Card className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-5">
            {weddingNonAlcoholicBeverageOptions.map((option) => (
              <div
                key={option.id}
                className={`flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md
                            ${selections[option.id] ? "bg-pink-50 border-pink-300 ring-1 ring-pink-300" : "border-gray-200 hover:border-gray-300"}`}
                onClick={() => toggleOption(option.id, !selections[option.id])}
              >
                <Checkbox
                  id={option.id}
                  checked={!!selections[option.id]}
                  onCheckedChange={(checked) => toggleOption(option.id, !!checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <FormLabel htmlFor={option.id} className="font-medium text-gray-800 cursor-pointer">
                    {option.label}
                  </FormLabel>
                  {option.description && (
                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={handleChangeMindAndGoBack}
              className="w-full text-pink-600 hover:bg-pink-50"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> I've Changed My Mind / Go Back
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious} // This will go back to BeverageQuestionStep
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Continue <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingNonAlcoholicBeveragesStep;