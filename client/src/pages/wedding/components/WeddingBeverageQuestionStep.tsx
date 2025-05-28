// src/pages/wedding/components/WeddingBeverageQuestionStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Wine, GlassWater, XCircle } from "lucide-react"; // Added icons
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingBeverageQuestionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingBeverageQuestionStep: React.FC<WeddingBeverageQuestionStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch, setValue } = useFormContext<WeddingInquiryFormData>();
  const beverageServiceChoice = watch("beverageServiceChoice");

  type BeverageChoice = "non-alcoholic" | "alcoholic" | "none";

  const handleBeverageSelection = (value: BeverageChoice) => {
    setValue("beverageServiceChoice", value, { shouldValidate: true });
    // If 'none', reset specific beverage selections
    if (value === "none") {
      setValue("nonAlcoholicBeverageSelections", {});
      setValue("alcoholicBeverageSelections", {
        alcoholTypes: {},
        otherBarEquipment: {},
        // Ensure all fields within alcoholicBeverageSelections are reset if necessary
        bartendingServiceType: undefined,
        drinkingAgedGuests: undefined,
        bartendingStartTime: undefined,
        bartendingServiceDuration: undefined,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <Wine className="h-8 w-8 mr-3 text-pink-500" />
          Wedding Beverage & Bar Services
        </h2>
        <p className="text-lg text-gray-600">
          Will you require beverage services for your wedding reception?
        </p>
        <p className="text-sm text-gray-500 mt-2">
            This includes options for non-alcoholic refreshments, full bar services, or a combination.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Non-Alcoholic Option Card */}
          <Card
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg flex flex-col items-center justify-center text-center p-6
                        ${beverageServiceChoice === "non-alcoholic" ? "ring-4 ring-pink-500 ring-offset-2 scale-105 shadow-pink-200" : "border-gray-200"}`}
            onClick={() => handleBeverageSelection("non-alcoholic")}
          >
            <GlassWater className={`h-12 w-12 mb-3 ${beverageServiceChoice === "non-alcoholic" ? "text-pink-600" : "text-gray-400"}`} />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Non-Alcoholic Only</h3>
            <p className="text-xs text-gray-500">
              E.g., sodas, juices, water, mocktails.
            </p>
          </Card>

          {/* Alcoholic Option Card */}
          <Card
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg flex flex-col items-center justify-center text-center p-6
                        ${beverageServiceChoice === "alcoholic" ? "ring-4 ring-pink-500 ring-offset-2 scale-105 shadow-pink-200" : "border-gray-200"}`}
            onClick={() => handleBeverageSelection("alcoholic")}
          >
            <Wine className={`h-12 w-12 mb-3 ${beverageServiceChoice === "alcoholic" ? "text-pink-600" : "text-gray-400"}`} />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Alcoholic & Bar Service</h3>
            <p className="text-xs text-gray-500">
              Includes bar setup, bartenders, and alcoholic beverages (beer, wine, spirits). Non-alcoholic options typically included.
            </p>
          </Card>

          {/* No Beverage Service Option Card */}
          <Card
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg flex flex-col items-center justify-center text-center p-6
                        ${beverageServiceChoice === "none" ? "ring-4 ring-gray-400 ring-offset-2 scale-105 shadow-gray-200" : "border-gray-200"}`}
            onClick={() => handleBeverageSelection("none")}
          >
            <XCircle className={`h-12 w-12 mb-3 ${beverageServiceChoice === "none" ? "text-gray-700" : "text-gray-400"}`} />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No Beverage Service</h3>
            <p className="text-xs text-gray-500">
              We will handle beverages ourselves or through another vendor.
            </p>
          </Card>
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
          onClick={onNext}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
          disabled={beverageServiceChoice === undefined}
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingBeverageQuestionStep;