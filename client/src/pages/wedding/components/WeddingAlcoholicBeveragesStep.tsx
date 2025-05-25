// src/pages/wedding/components/WeddingAlcoholicBeveragesStep.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form"; 
// Added FormField
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormField,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Wine } from "lucide-react";
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingAlcoholicBeveragesStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingAlcoholicBeveragesStep: React.FC<WeddingAlcoholicBeveragesStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { control, setValue, watch } = useFormContext<WeddingInquiryFormData>();

  // Preserving original offerings as requested
  const serviceDurationOptions = [
    { value: "2.5 Hours", label: "2.5 Hours" },
    { value: "3 Hours", label: "3 Hours" },
    { value: "3.5 Hours", label: "3.5 Hours" },
    { value: "4 Hours", label: "4 Hours" },
    { value: "5 Hours", label: "5 Hours" },
    { value: "6 Hours", label: "6 Hours" },
    { value: "Other", label: "Other (Please specify in notes)" }, // Added note for "Other"
  ];

  const alcoholTypeOptions = [
    { id: "beer", label: "Beer Selection" },
    { id: "wine_house", label: "House Wine Package (Red & White)" },
    { id: "wine_premium", label: "Premium Wine Package (Upgraded Selection)" },
    { id: "wine_beer_2cocktails", label: "Beer, Wine, and 2 Signature Cocktails" },
    { id: "wine_beer_soda_cocktails", label: "Full Bar: Beer, Wine, Spirits, Mixers & Cocktails" },
    { id: "mocktails", label: "Include Non-Alcoholic Mocktail Options" }, // Often part of a bar package
    { id: "open_bar", label: "Full Open Bar (All Inclusive)" },
    { id: "cash_bar", label: "Cash Bar (Guests Purchase Drinks)" },
  ];

  const barEquipmentOptions = [
    {
      id: "mobile_bar_unit",
      label: "Mobile Bar Unit - $200.00 (Verify if your venue provides a bar setup)",
    },
    { id: "table_water_service", label: "Table Water Service with Wine Pouring" },
    { id: "coffee_service", label: "After-Dinner Coffee & Tea Service" },
    { id: "beer_taps", label: "Draft Beer Taps (Requires specific beer kegs)" },
    { id: "ice", label: "Ice Supply (if not included in package)" },
  ];

  // Initialize alcoholicBeverageSelections if it's undefined
  React.useEffect(() => {
    if (watch("alcoholicBeverageSelections") === undefined) {
      setValue("alcoholicBeverageSelections", {
        bartendingServiceType: undefined,
        drinkingAgedGuests: undefined,
        bartendingStartTime: undefined,
        bartendingServiceDuration: undefined,
        alcoholTypes: {},
        otherBarEquipment: {},
      });
    }
  }, [watch, setValue]);

  const handleChangeMindAndGoBack = () => {
    // Reset alcoholic beverage selections
    setValue("alcoholicBeverageSelections", {
        bartendingServiceType: undefined,
        drinkingAgedGuests: undefined,
        bartendingStartTime: undefined,
        bartendingServiceDuration: undefined,
        alcoholTypes: {},
        otherBarEquipment: {},
      });
    // Set beverageServiceChoice to undefined to allow re-selection on the BeverageQuestionStep
    setValue("beverageServiceChoice", undefined);
    onPrevious(); // Go back to BeverageQuestionStep
  };

  const bartendingServiceType = watch("alcoholicBeverageSelections.bartendingServiceType");
  const bartendingServiceDuration = watch("alcoholicBeverageSelections.bartendingServiceDuration");

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <Wine className="h-8 w-8 mr-3 text-pink-500" />
          Wedding Bar & Alcohol Service
        </h2>
        <p className="text-lg text-gray-600">
          Customize your alcoholic beverage and bartending service options for the wedding reception.
        </p>
      </div>

      <Card className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
        <CardContent className="p-0 space-y-8">
          {/* Service Type Selection */}
          <FormField
            control={control}
            name="alcoholicBeverageSelections.bartendingServiceType"
            rules={{ required: "Please select a service type." }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xl font-semibold text-gray-800">
                  What type of bar service do you require for your wedding?
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-3 pt-2"
                  >
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-pink-50 transition-colors data-[state=checked]:bg-pink-50 data-[state=checked]:border-pink-300">
                      <FormControl>
                        <RadioGroupItem value="dry_hire" id="dry_hire" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="dry_hire" className="text-base font-medium cursor-pointer text-gray-700">
                          DRY HIRE - You Provide Alcohol
                        </FormLabel>
                        <p className="text-sm text-gray-500">
                          You provide all alcoholic beverages. We provide licensed bartenders, essential mixers, garnishes, ice, and bar tools.
                        </p>
                      </div>
                    </FormItem>
                    <FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-pink-50 transition-colors data-[state=checked]:bg-pink-50 data-[state=checked]:border-pink-300">
                      <FormControl>
                        <RadioGroupItem value="wet_hire" id="wet_hire" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="wet_hire" className="text-base font-medium cursor-pointer text-gray-700">
                          WET HIRE - We Provide Everything
                        </FormLabel>
                        <p className="text-sm text-gray-500">
                          We handle it all: alcohol procurement, licensed bartenders, all mixers, garnishes, ice, bar tools, and complete service.
                        </p>
                      </div>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Guest Count */}
          <FormField
            control={control}
            name="alcoholicBeverageSelections.drinkingAgedGuests"
            rules={{ 
                min: { value: 0, message: "Cannot be negative." },
                required: "Number of drinking-aged guests is required if alcohol is served." 
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl font-semibold text-gray-800">
                  Estimated number of 'drinking-aged' guests?*
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 100"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || undefined)}
                    className="mt-1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Time */}
          <FormField
            control={control}
            name="alcoholicBeverageSelections.bartendingStartTime"
            rules={{ required: "Bar service start time is required."}}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl font-semibold text-gray-800">
                  What is the start time for Bar Service?*
                </FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value || ""} className="mt-1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Service Duration */}
          <FormField
            control={control}
            name="alcoholicBeverageSelections.bartendingServiceDuration"
            rules={{ required: "Bar service duration is required."}}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl font-semibold text-gray-800">
                  How long would you like the bar service for?* (Minimum 2.5 hours)
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2"
                  >
                    {serviceDurationOptions.map((option) => (
                      <FormItem
                        key={option.value}
                        className="flex flex-row items-center space-x-2 space-y-0 rounded-lg border p-3 cursor-pointer hover:bg-pink-50 transition-colors data-[state=checked]:bg-pink-50 data-[state=checked]:border-pink-300"
                      >
                        <FormControl>
                          <RadioGroupItem
                            value={option.value}
                            id={`duration-${option.value.replace(/\s+/g, '-')}`}
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor={`duration-${option.value.replace(/\s+/g, '-')}`}
                          className="font-normal cursor-pointer w-full text-sm"
                        >
                          {option.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Alcohol Types */}
          <FormItem>
            <FormLabel className="text-xl font-semibold text-gray-800">
              What types of alcoholic beverages would you like to offer? (Check all that apply)
            </FormLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {alcoholTypeOptions.map((option) => (
                <FormField
                  key={option.id}
                  control={control}
                  name={`alcoholicBeverageSelections.alcoholTypes.${option.id as keyof WeddingInquiryFormData['alcoholicBeverageSelections']['alcoholTypes']}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-pink-50 transition-colors data-[state=checked]:bg-pink-50 data-[state=checked]:border-pink-300">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                          id={`alcohol-${option.id}`}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={`alcohol-${option.id}`}
                        className="font-normal cursor-pointer w-full text-sm"
                      >
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </FormItem>

          {/* Other Bar Equipment */}
          <FormItem>
            <FormLabel className="text-xl font-semibold text-gray-800">
              Additional Bar Equipment or Services (Optional)
            </FormLabel>
            <div className="grid grid-cols-1 gap-4 pt-2">
              {barEquipmentOptions.map((option) => (
                <FormField
                  key={option.id}
                  control={control}
                  name={`alcoholicBeverageSelections.otherBarEquipment.${option.id as keyof WeddingInquiryFormData['alcoholicBeverageSelections']['otherBarEquipment']}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-pink-50 transition-colors data-[state=checked]:bg-pink-50 data-[state=checked]:border-pink-300">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={field.onChange}
                          id={`equip-${option.id}`}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={`equip-${option.id}`}
                        className="font-normal cursor-pointer w-full text-sm"
                      >
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </FormItem>

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
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
          disabled={!bartendingServiceType || !bartendingServiceDuration } // Basic validation: service type and duration must be selected
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingAlcoholicBeveragesStep;