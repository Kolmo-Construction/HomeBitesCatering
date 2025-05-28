// src/pages/wedding/components/WeddingServiceStyleStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Utensils as UtensilsIcon, // For Catering Buffet, Plated Dinner, and fallback for Sandwich Factory
  Table as TableIcon,       // For Family Style
  GlassWater as GlassWaterIcon, // For Cocktail Party
  Truck as TruckIcon,       // For Food Truck
  Coffee as CoffeeIcon,     // For Breakfast/Brunch
  Info as InfoIcon,
  LucideIcon, // Ensure LucideIcon itself is imported for typing if needed elsewhere, but direct icon imports are preferred for usage
} from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingServiceStyleStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

// Define structure for service type options, ensuring icon is correctly typed
interface ServiceTypeOption {
  value: string;
  label: string;
  description?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>; // Correct type for Lucide icons from lucide-react
}

const WeddingServiceStyleStep: React.FC<WeddingServiceStyleStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const {
    control,
    watch,
    formState: { errors }, 
  } = useFormContext<WeddingInquiryFormData>();

  const currentServiceStyle = watch("serviceStyle");

  const allWeddingServiceTypeOptions: ServiceTypeOption[] = [
    {
      value: "catering_buffet",
      label: "Catering Buffet",
      description: "Guests serve themselves from a variety of dishes.",
      icon: UtensilsIcon,
    },
    {
      value: "family_style",
      label: "Family Style",
      description: "Large platters are brought to each table for sharing.",
      icon: TableIcon,
    },
    {
      value: "plated_dinner",
      label: "Plated Dinner",
      description: "Guests are served individually plated courses.",
      icon: UtensilsIcon,
    },
    {
      value: "cocktail_party",
      label: "Cocktail Reception",
      description: "Focus on passed hors d'oeuvres and appetizer stations.",
      icon: GlassWaterIcon,
    },
    {
      value: "food_truck",
      label: "Food Truck Service",
      description: "A fun, casual option with guests ordering from a food truck.",
      icon: TruckIcon,
    },
    {
      value: "sandwich_factory",
      label: "Sandwich Factory Buffet",
      description: "A gourmet sandwich bar with various breads, fillings, and sides.",
      icon: UtensilsIcon, // Changed from placeholder SandwichIcon to UtensilsIcon
    },
    {
      value: "breakfast_brunch",
      label: "Breakfast/Brunch Buffet",
      description: "Ideal for morning or early afternoon weddings.",
      icon: CoffeeIcon,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">
          Choose Your Wedding Service Style
        </h2>
        <p className="text-lg text-gray-600">
          Select the primary way you'd like your wedding meal to be served.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
        <FormField
          control={control}
          name="serviceStyle"
          rules={{ required: "Please select a service style." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xl font-semibold mb-4 block text-center md:text-left">
                Service Style Options
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {allWeddingServiceTypeOptions.map((option) => {
                  const IconComponent = option.icon; // Assign to a const starting with uppercase
                  return (
                    <Card
                      key={option.value}
                      className={`
                        transition-all duration-200 hover:shadow-xl cursor-pointer flex flex-col
                        ${
                          field.value === option.value
                            ? "border-2 border-pink-500 shadow-lg bg-pink-50/50"
                            : "border border-gray-300 hover:border-pink-400"
                        }
                      `}
                      onClick={() => field.onChange(option.value)}
                    >
                      <CardContent className="p-4 md:p-6 text-center flex flex-col items-center justify-center flex-grow">
                        <IconComponent className="h-10 w-10 text-pink-600 mb-3" /> {/* Use the const */}
                        <div
                          className={`font-semibold text-lg mb-1 ${
                            field.value === option.value
                              ? "text-pink-700"
                              : "text-gray-800"
                          }`}
                        >
                          {option.label}
                        </div>
                        {option.description && (
                          <p className="text-xs text-gray-600">
                            {option.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <FormMessage className="mt-4 text-center" />
            </FormItem>
          )}
        />

        {currentServiceStyle && (
          <div className="mt-8 p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700/30 rounded-md text-sm text-pink-700 dark:text-pink-300">
            <p className="flex items-center">
              <InfoIcon className="h-5 w-5 mr-2 shrink-0" />
              <span>
                You've selected:{" "}
                <strong className="font-semibold">
                  {
                    allWeddingServiceTypeOptions.find(
                      (opt) => opt.value === currentServiceStyle
                    )?.label || currentServiceStyle
                  }
                </strong>
                . Specific menu options and pricing will be available in the
                following steps. A standard service fee (typically 18-22% of the
                food and beverage total) applies to most wedding packages.
                Details will be in your proposal.
              </span>
            </p>
          </div>
        )}
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
          onClick={onNext}
          disabled={!currentServiceStyle}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white disabled:bg-gray-400"
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingServiceStyleStep;