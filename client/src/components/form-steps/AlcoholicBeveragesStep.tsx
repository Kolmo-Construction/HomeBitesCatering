// client/src/components/form-steps/AlcoholicBeveragesStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; // Removed 'Form' as it's not typically used directly here
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventInquiryFormData } from "@/types/form-types";

export default function AlcoholicBeveragesStep({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { control, setValue, watch } = useFormContext<EventInquiryFormData>();

  // Service Duration options
  const serviceDurationOptions = [
    { value: "2.5 Hours", label: "2.5 Hours" },
    { value: "3 Hours", label: "3 Hours" },
    { value: "3.5 Hours", label: "3.5 Hours" },
    { value: "4 Hours", label: "4 Hours" },
    { value: "5 Hours", label: "5 Hours" },
    { value: "6 Hours", label: "6 Hours" },
    { value: "Other", label: "Other" },
  ];

  // Alcohol type options
  const alcoholTypeOptions = [
    { id: "beer", label: "Beer" },
    { id: "wine_house", label: "Wine - HOUSE" },
    { id: "wine_premium", label: "Wine PREMIUM" },
    { id: "wine_beer_2cocktails", label: "Wine, Beer and 2 Cocktails" },
    { id: "wine_beer_soda_cocktails", label: "Wine, Beer, soda and cocktails" },
    { id: "mocktails", label: "Mocktails" },
    { id: "open_bar", label: "OPEN BAR" },
    { id: "cash_bar", label: "CASH BAR" },
  ];

  // Bar equipment options
  const barEquipmentOptions = [
    {
      id: "mobile_bar_unit",
      label:
        "Mobile Bar unit - $200.00 (Check with your venue to identify if they offer a bar setup)",
    },
    { id: "table_water_service", label: "Table water service" },
    { id: "coffee_service", label: "Coffee Service" },
    { id: "beer_taps", label: "Beer Taps" },
    { id: "ice", label: "Ice" },
  ];

  // Handle the "I changed my mind" option
  const handleChangeMind = () => {
    // Reset relevant fields for alcoholic beverages if needed
    setValue("alcoholicBeverageSelections.bartendingServiceType", undefined);
    setValue("alcoholicBeverageSelections.drinkingAgedGuests", undefined);
    setValue("alcoholicBeverageSelections.bartendingStartTime", undefined);
    setValue("alcoholicBeverageSelections.bartendingServiceDuration", undefined);
    setValue("alcoholicBeverageSelections.alcoholTypes", {}); // Assuming alcoholTypes is an object
    setValue("alcoholicBeverageSelections.otherBarEquipment", {}); // Assuming otherBarEquipment is an object

    // Set beverageServiceChoice to undefined or "none" to reflect skipping
    setValue("beverageServiceChoice", undefined); // Or "none" depending on your logic in the main form
    onPrevious(); // Go back to the BeverageQuestionStep or the step before it
  };

  // Watch service type to enable/disable the "Continue" button
  const bartendingServiceType = watch(
    "alcoholicBeverageSelections.bartendingServiceType"
  );
  const bartendingServiceDuration = watch(
    "alcoholicBeverageSelections.bartendingServiceDuration"
  );


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">
          Bartending Service
        </h2>
        <p className="text-lg text-gray-600">
          Customize your alcoholic beverage and bartending service options.
        </p>
      </div>

      <Card className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-8">
        <CardContent className="p-0 space-y-8">
          {/* Service Type Selection */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              What type of service do you require?
            </h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.bartendingServiceType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value} // Use value for controlled component
                      className="flex flex-col space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:border-primary transition-colors">
                        <FormControl>
                          <RadioGroupItem value="dry_hire" id="dry_hire" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel htmlFor="dry_hire" className="text-base font-medium cursor-pointer">
                            DRY HIRE - YOU provide alcohol
                          </FormLabel>
                          <p className="text-sm text-gray-500">
                            You provide all alcohol, we provide licensed bartenders, garnishes, ice etc.
                          </p>
                        </div>
                      </FormItem>

                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:border-primary transition-colors">
                        <FormControl>
                          <RadioGroupItem value="wet_hire" id="wet_hire" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel htmlFor="wet_hire" className="text-base font-medium cursor-pointer">
                            WET HIRE - WE provide everything
                          </FormLabel>
                          <p className="text-sm text-gray-500">
                            We provide all alcohol, bartenders, mixers, and complete service.
                          </p>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Guest Count */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              How many 'drinking aged' guests will you have?
            </h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.drinkingAgedGuests"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g., 23"
                      {...field}
                      value={field.value || ""} // Ensure controlled component
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || undefined)} // Parse to number or undefined
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Start Time */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              What is the start time of Your Bartending Service?
            </h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.bartendingStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="time" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Service Duration - CORRECTED STRUCTURE */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              How long would you like the service for - Minimum 2.5 hours
            </h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.bartendingServiceDuration"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value} // Use value for controlled component
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    >
                      {serviceDurationOptions.map((option) => (
                        <FormItem
                          key={option.value}
                          className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 hover:border-primary transition-colors"
                        >
                          <FormControl>
                            <RadioGroupItem
                              value={option.value}
                              id={`duration-${option.value.replace(/\s+/g, '-')}`} // Create a unique id
                            />
                          </FormControl>
                          <FormLabel
                            htmlFor={`duration-${option.value.replace(/\s+/g, '-')}`} // Match the id
                            className="font-normal cursor-pointer w-full"
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
          </div>

          {/* Alcohol Types */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              What would you like to provide? Check all that apply
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alcoholTypeOptions.map((option) => (
                <FormField
                  key={option.id}
                  control={control}
                  name={`alcoholicBeverageSelections.alcoholTypes.${option.id}` as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 hover:border-primary transition-colors">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value} // Ensure boolean value
                          onCheckedChange={field.onChange}
                          id={`alcohol-${option.id}`}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={`alcohol-${option.id}`}
                        className="font-normal cursor-pointer w-full"
                      >
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          {/* Other Bar Equipment */}
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Other Bar Equipment/Services
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {barEquipmentOptions.map((option) => (
                <FormField
                  key={option.id}
                  control={control}
                  name={`alcoholicBeverageSelections.otherBarEquipment.${option.id}` as any}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 hover:border-primary transition-colors">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value} // Ensure boolean value
                          onCheckedChange={field.onChange}
                          id={`equip-${option.id}`}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor={`equip-${option.id}`}
                        className="font-normal cursor-pointer w-full"
                      >
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="ghost" // Changed to ghost for a less prominent "change mind" button
              onClick={handleChangeMind}
              className="w-full text-primary hover:bg-primary/10"
            >
              ← I don't need alcoholic beverage service (Changed my mind)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
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
          className="flex items-center bg-primary px-6 py-3 text-lg"
          disabled={!bartendingServiceType || !bartendingServiceDuration} // Example: disable if essential fields aren't filled
        >
          Continue <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}