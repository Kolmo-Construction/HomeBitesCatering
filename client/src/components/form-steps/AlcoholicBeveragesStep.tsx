// client/src/components/form-steps/AlcoholicBeveragesStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventInquiryFormData } from "@/types/form-types";

export default function AlcoholicBeveragesStep({ 
  onPrevious, 
  onNext 
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
    { value: "Other", label: "Other" }
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
    { id: "cash_bar", label: "CASH BAR" }
  ];
  
  // Bar equipment options
  const barEquipmentOptions = [
    { id: "mobile_bar_unit", label: "Mobile Bar unit - $200.00 (Check with your venue to identify if they offer a bar setup)" },
    { id: "table_water_service", label: "Table water service" },
    { id: "coffee_service", label: "Coffee Service" },
    { id: "beer_taps", label: "Beer Taps" },
    { id: "ice", label: "Ice" }
  ];
  
  // Handle the "I changed my mind" option
  const handleChangeMind = () => {
    setValue("beverageServiceChoice", undefined);
    onPrevious();
  };
  
  // Watch service type
  const bartendingServiceType = watch("alcoholicBeverageSelections.bartendingServiceType");
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Bartending Service</h2>
        <p className="text-lg text-gray-600">
          Customize your alcoholic beverage and bartending service options.
        </p>
      </div>
      
      <Card className="bg-white rounded-lg shadow-md p-8 mb-8">
        <CardContent className="p-0 space-y-8">
          {/* Service Type Selection */}
          <div>
            <h3 className="text-xl font-semibold mb-4">What type of service do you require?</h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.bartendingServiceType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <RadioGroupItem value="dry_hire" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-base font-medium">
                            DRY HIRE - YOU provide alcohol
                          </FormLabel>
                          <p className="text-sm text-gray-500">
                            You provide all alcohol, we provide bartenders, mixers, and service.
                          </p>
                        </div>
                      </FormItem>
                      
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <RadioGroupItem value="wet_hire" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-base font-medium">
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
            <h3 className="text-xl font-semibold mb-4">How many 'drinking aged' guests will you have?</h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.drinkingAgedGuests"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Enter number of guests"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Start Time */}
          <div>
            <h3 className="text-xl font-semibold mb-4">What is the start time of Your Bartending Service?</h3>
            <FormField
              control={control}
              name="alcoholicBeverageSelections.bartendingStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="time"
                      placeholder="Select start time"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Service Duration */}
          <div>
            <h3 className="text-xl font-semibold mb-4">How long would you like the service for - Minimum 2.5 hours</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {serviceDurationOptions.map((option) => (
                <FormField
                  key={option.value}
                  control={control}
                  name="alcoholicBeverageSelections.bartendingServiceDuration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <RadioGroupItem
                          value={option.value}
                          checked={field.value === option.value}
                          onCheckedChange={() => field.onChange(option.value)}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Alcohol Types */}
          <div>
            <h3 className="text-xl font-semibold mb-4">What would you like to provide? Check all that apply</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alcoholTypeOptions.map((option) => (
                <FormField
                  key={option.id}
                  control={control}
                  name={`alcoholicBeverageSelections.alcoholTypes.${option.id}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
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
            <h3 className="text-xl font-semibold mb-4">Other Bar Equipment/Services</h3>
            <div className="grid grid-cols-1 gap-3">
              {barEquipmentOptions.map((option) => (
                <FormField
                  key={option.id}
                  control={control}
                  name={`alcoholicBeverageSelections.otherBarEquipment.${option.id}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
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
          disabled={!bartendingServiceType}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}