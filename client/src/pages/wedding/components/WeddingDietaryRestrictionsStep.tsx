// src/pages/wedding/components/WeddingDietaryRestrictionsStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, UtensilsCrossed } from "lucide-react"; // Added UtensilsCrossed icon
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingDietaryRestrictionsStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

// This list can be kept here or moved to a wedding-specific data file if it varies significantly.
const commonWeddingDietaryRestrictions = [
  { id: "vegetarian", label: "Vegetarian" , description: "Does not eat meat, poultry, or fish."},
  { id: "vegan", label: "Vegan", description: "Does not eat any animal products, including dairy, eggs, and honey." },
  { id: "gluten_free", label: "Gluten-Free", description: "Avoids wheat, barley, rye, and oats (unless certified GF)." },
  { id: "dairy_free", label: "Dairy-Free", description: "Avoids milk and milk-derived products." },
  { id: "nut_free", label: "Nut-Free (Tree Nuts/Peanuts)", description: "Allergic to tree nuts (e.g., almonds, walnuts) and/or peanuts." },
  { id: "shellfish_allergy", label: "Shellfish Allergy", description: "Allergic to shellfish (e.g., shrimp, crab, lobster)." },
  { id: "kosher", label: "Kosher Style", description: "Prepared according to kosher dietary guidelines (style may vary)." },
  { id: "halal", label: "Halal", description: "Prepared according to Halal dietary guidelines." },
  // You can add other common ones like "Soy-Free", "Fish Allergy", etc.
];

const WeddingDietaryRestrictionsStep: React.FC<WeddingDietaryRestrictionsStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { control, watch, setValue } = useFormContext<WeddingInquiryFormData>();

  // Ensure dietaryRestrictions and dietaryCount are initialized
  React.useEffect(() => {
    if (!watch("dietaryRestrictions")) {
      setValue("dietaryRestrictions", {});
    }
    if (!watch("dietaryCount")) {
      setValue("dietaryCount", {});
    }
  }, [watch, setValue]);


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <UtensilsCrossed className="h-8 w-8 mr-3 text-pink-500" />
          Guest Dietary Needs & Allergies
        </h2>
        <p className="text-lg text-gray-600">
          Please inform us of any dietary restrictions or food allergies among your wedding guests.
        </p>
        <p className="text-sm text-gray-500 mt-2">
            This helps us ensure everyone enjoys a safe and delicious meal.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
        {/* Common Dietary Restrictions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Common Dietary Preferences</h3>
          <p className="text-sm text-gray-500 mb-5">
            Select any common dietary preferences that apply. For each selected, please specify the number of guests.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {commonWeddingDietaryRestrictions.map((restriction) => (
              <FormField
                key={restriction.id}
                control={control}
                name={`dietaryRestrictions.${restriction.id as keyof WeddingInquiryFormData['dietaryRestrictions']}`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 hover:bg-pink-50/50 transition-colors data-[state=checked]:bg-pink-50 data-[state=checked]:border-pink-300">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // If unchecking, also clear the count for that restriction
                            if(!checked) {
                                setValue(`dietaryCount.${restriction.id as keyof WeddingInquiryFormData['dietaryCount']}`, 0);
                            }
                        }}
                        id={`diet-${restriction.id}`}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor={`diet-${restriction.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                        {restriction.label}
                      </FormLabel>
                      {restriction.description && (
                        <p className="text-xs text-gray-500">{restriction.description}</p>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        {/* Guest Count for Selected Restrictions */}
        <div className="mb-8 pt-6 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Guest Counts for Restrictions</h3>
          <p className="text-sm text-gray-500 mb-5">
            For each dietary preference you selected above, please specify the number of guests.
          </p>
          <div className="space-y-4">
            {commonWeddingDietaryRestrictions.map((restriction) => {
              const isSelected = watch(`dietaryRestrictions.${restriction.id as keyof WeddingInquiryFormData['dietaryRestrictions']}`);
              if (!isSelected) return null;

              return (
                <FormField
                  key={`${restriction.id}-count`}
                  control={control}
                  name={`dietaryCount.${restriction.id as keyof WeddingInquiryFormData['dietaryCount']}`}
                  rules={{ min: {value: 0, message: "Count cannot be negative."}}}
                  render={({ field }) => (
                    <FormItem className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <FormLabel htmlFor={`count-${restriction.id}`} className="font-medium text-gray-700">
                          Number of Guests: {restriction.label}
                        </FormLabel>
                        <FormControl>
                          <Input
                            id={`count-${restriction.id}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                            value={field.value || ""} // Handle undefined by showing empty string
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                            className="w-24 text-right h-9"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            })}
             {Object.values(watch("dietaryRestrictions") || {}).every(val => !val) && (
                <p className="text-sm text-gray-500 italic">Select a dietary preference above to specify guest counts.</p>
            )}
          </div>
        </div>

        {/* Detailed Notes for Allergies and Other Restrictions */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Detailed Allergy Information & Other Notes
          </h3>
          <FormField
            control={control}
            name="dietaryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="dietaryNotesText" className="text-gray-700">
                  Please provide specific details about any severe allergies (e.g., celiac disease, specific nut allergies not listed), cross-contamination concerns, or any other dietary information crucial for us to know.
                </FormLabel>
                <FormControl>
                  <Textarea
                    id="dietaryNotesText"
                    placeholder="Example: '1 guest with severe Celiac disease (requires dedicated prep area), 2 guests with peanut allergy (no peanuts in any dish served).'"
                    className="min-h-[120px] mt-1"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-500 mt-1">
                  The more detail you provide, the better we can accommodate your guests.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext} // Next would typically be the review step
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Review Your Inquiry <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingDietaryRestrictionsStep;