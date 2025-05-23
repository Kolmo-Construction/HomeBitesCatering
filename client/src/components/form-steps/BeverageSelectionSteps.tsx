// client/src/components/form-steps/BeverageSelectionSteps.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EventInquiryFormData } from "@/types/form-types";

// Beverage Question Step Component
export function BeverageQuestionStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { setValue, watch } = useFormContext<EventInquiryFormData>();
  const beverageServiceChoice = watch("beverageServiceChoice");
  
  // Handle beverage service selection
  const handleBeverageSelection = (value: "non-alcoholic" | "alcoholic" | "none") => {
    setValue("beverageServiceChoice", value);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Beverage/Bartending Service</h2>
        <p className="text-lg text-gray-600">
          Will you require Beverage Services?
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${beverageServiceChoice === "non-alcoholic" ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleBeverageSelection("non-alcoholic")}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 ${
                  beverageServiceChoice === "non-alcoholic" ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {beverageServiceChoice === "non-alcoholic" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">YES - NON-Alcoholic</h3>
                  <p className="text-gray-600 mt-1">I would like non-alcoholic beverage service only.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${beverageServiceChoice === "alcoholic" ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleBeverageSelection("alcoholic")}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 ${
                  beverageServiceChoice === "alcoholic" ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {beverageServiceChoice === "alcoholic" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">YES - Alcoholic</h3>
                  <p className="text-gray-600 mt-1">I would like alcoholic beverage and bartending service.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${beverageServiceChoice === "none" ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleBeverageSelection("none")}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 ${
                  beverageServiceChoice === "none" ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {beverageServiceChoice === "none" && (
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">NO Beverage Service</h3>
                  <p className="text-gray-600 mt-1">I don't need any beverage service for this event.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
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
          disabled={beverageServiceChoice === undefined}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Non-Alcoholic Beverages Step Component
export function NonAlcoholicBeveragesStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { setValue, watch } = useFormContext<EventInquiryFormData>();
  
  // Initialize the beverages object if it doesn't exist
  React.useEffect(() => {
    if (!watch("nonAlcoholicBeverageSelections")) {
      setValue("nonAlcoholicBeverageSelections", {});
    }
  }, [setValue, watch]);
  
  // Get the current selections
  const selections = watch("nonAlcoholicBeverageSelections") || {};
  
  // Define available non-alcoholic beverage options
  const beverageOptions = [
    { id: "bottled_water_1pp", label: "Bottled Water (1 pp)" },
    { id: "bottled_water_unlimited", label: "Bottled Water (unlimited)" },
    { id: "assorted_soft_drinks_1pp", label: "Assorted Soft Drinks (1 pp)" },
    { id: "assorted_soft_drinks_unlimited", label: "Assorted Soft Drinks (unlimited)" },
    { id: "pellegrino_sodas_1pp", label: "Pellegrino Flavored Sodas (1 pp)" },
    { id: "pellegrino_sodas_unlimited", label: "Pellegrino Flavored Sodas (unlimited)" },
    { id: "assorted_snapple_1pp", label: "Assorted Snapple (1 pp)" },
    { id: "assorted_snapple_unlimited", label: "Assorted Snapple (unlimited)" },
    { id: "assorted_gatorade_1pp", label: "Assorted Gatorade (1 pp)" },
    { id: "assorted_gatorade_unlimited", label: "Assorted Gatorade (unlimited)" },
    { id: "free_pour_lemonade", label: "Free pour Lemonade" },
    { id: "free_pour_iced_tea", label: "Free pour Iced Tea" },
    { id: "non_alcoholic_mocktails", label: "Non-alcoholic Mocktails (Free-Pour) $2.75pp" }
  ];
  
  // Handle the "I changed my mind" option
  const handleChangeMind = () => {
    setValue("beverageServiceChoice", undefined);
    onPrevious();
  };
  
  // Toggle a beverage option
  const toggleOption = (optionId: string, isChecked: boolean) => {
    setValue("nonAlcoholicBeverageSelections", {
      ...selections,
      [optionId]: isChecked
    });
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
                  checked={!!selections[option.id as keyof typeof selections]}
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

// Alcoholic Beverages Step Component
export function AlcoholicBeveragesStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { setValue, watch } = useFormContext<EventInquiryFormData>();
  
  // Initialize alcoholic beverages object if it doesn't exist
  React.useEffect(() => {
    if (!watch("alcoholicBeverageSelections")) {
      setValue("alcoholicBeverageSelections", {
        alcoholTypes: {},
        otherBarEquipment: {}
      });
    }
  }, [setValue, watch]);
  
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
  
  // Get selections
  const selections = watch("alcoholicBeverageSelections") || {};
  const alcoholTypes = selections.alcoholTypes || {};
  const barEquipment = selections.otherBarEquipment || {};
  
  // Handle the "I changed my mind" option
  const handleChangeMind = () => {
    setValue("beverageServiceChoice", undefined);
    onPrevious();
  };
  
  // Set bartending service type
  const setBartendingServiceType = (value: "dry_hire" | "wet_hire") => {
    setValue("alcoholicBeverageSelections", {
      ...selections,
      bartendingServiceType: value
    });
  };
  
  // Set drinking aged guests count
  const setDrinkingAgedGuests = (value: number) => {
    setValue("alcoholicBeverageSelections", {
      ...selections,
      drinkingAgedGuests: value
    });
  };
  
  // Set bartending start time
  const setBartendingStartTime = (value: string) => {
    setValue("alcoholicBeverageSelections", {
      ...selections,
      bartendingStartTime: value
    });
  };
  
  // Set service duration
  const setServiceDuration = (value: string) => {
    setValue("alcoholicBeverageSelections", {
      ...selections,
      bartendingServiceDuration: value
    });
  };
  
  // Toggle alcohol type
  const toggleAlcoholType = (typeId: string, isChecked: boolean) => {
    setValue("alcoholicBeverageSelections", {
      ...selections,
      alcoholTypes: {
        ...alcoholTypes,
        [typeId]: isChecked
      }
    });
  };
  
  // Toggle bar equipment
  const toggleBarEquipment = (equipmentId: string, isChecked: boolean) => {
    setValue("alcoholicBeverageSelections", {
      ...selections,
      otherBarEquipment: {
        ...barEquipment,
        [equipmentId]: isChecked
      }
    });
  };
  
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
            <RadioGroup 
              value={selections.bartendingServiceType} 
              onValueChange={(value) => setBartendingServiceType(value as "dry_hire" | "wet_hire")}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="dry_hire" id="dry_hire" />
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="dry_hire" className="text-base font-medium">
                    DRY HIRE - YOU provide alcohol
                  </FormLabel>
                  <p className="text-sm text-gray-500">
                    You provide all alcohol, we provide bartenders, mixers, and service.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                <RadioGroupItem value="wet_hire" id="wet_hire" />
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="wet_hire" className="text-base font-medium">
                    WET HIRE - WE provide everything
                  </FormLabel>
                  <p className="text-sm text-gray-500">
                    We provide all alcohol, bartenders, mixers, and complete service.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          {/* Guest Count */}
          <div>
            <h3 className="text-xl font-semibold mb-4">How many 'drinking aged' guests will you have?</h3>
            <Input
              type="number"
              min="0"
              placeholder="Enter number of guests"
              value={selections.drinkingAgedGuests || ""}
              onChange={(e) => setDrinkingAgedGuests(Number(e.target.value) || 0)}
            />
          </div>
          
          {/* Start Time */}
          <div>
            <h3 className="text-xl font-semibold mb-4">What is the start time of Your Bartending Service?</h3>
            <Input
              type="time"
              placeholder="Select start time"
              value={selections.bartendingStartTime || ""}
              onChange={(e) => setBartendingStartTime(e.target.value)}
            />
          </div>
          
          {/* Service Duration */}
          <div>
            <h3 className="text-xl font-semibold mb-4">How long would you like the service for - Minimum 2.5 hours</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {serviceDurationOptions.map((option) => (
                <div key={option.value} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                  <RadioGroupItem 
                    id={option.value} 
                    value={option.value}
                    checked={selections.bartendingServiceDuration === option.value}
                    onClick={() => setServiceDuration(option.value)}
                  />
                  <FormLabel htmlFor={option.value} className="font-normal cursor-pointer">
                    {option.label}
                  </FormLabel>
                </div>
              ))}
            </div>
          </div>
          
          {/* Alcohol Types */}
          <div>
            <h3 className="text-xl font-semibold mb-4">What would you like to provide? Check all that apply</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alcoholTypeOptions.map((option) => (
                <div key={option.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id={`alcohol-${option.id}`}
                    checked={!!alcoholTypes[option.id]}
                    onCheckedChange={(checked) => toggleAlcoholType(option.id, !!checked)}
                  />
                  <FormLabel htmlFor={`alcohol-${option.id}`} className="font-normal cursor-pointer">
                    {option.label}
                  </FormLabel>
                </div>
              ))}
            </div>
          </div>
          
          {/* Other Bar Equipment */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Other Bar Equipment/Services</h3>
            <div className="grid grid-cols-1 gap-3">
              {barEquipmentOptions.map((option) => (
                <div key={option.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id={`equipment-${option.id}`}
                    checked={!!barEquipment[option.id]}
                    onCheckedChange={(checked) => toggleBarEquipment(option.id, !!checked)}
                  />
                  <FormLabel htmlFor={`equipment-${option.id}`} className="font-normal cursor-pointer">
                    {option.label}
                  </FormLabel>
                </div>
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
          disabled={!selections.bartendingServiceType}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}