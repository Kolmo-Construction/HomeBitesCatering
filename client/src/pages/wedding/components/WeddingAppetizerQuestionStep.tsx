// src/pages/wedding/components/WeddingAppetizerQuestionStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingAppetizerQuestionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingAppetizerQuestionStep: React.FC<WeddingAppetizerQuestionStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch, setValue } = useFormContext<WeddingInquiryFormData>();
  const wantsAppetizers = watch("wantsAppetizers");

  const handleAppetizerSelection = (value: boolean) => {
    setValue("wantsAppetizers", value, { shouldValidate: true }); // Added validation trigger
    // If 'No', reset appetizer selections to ensure data consistency
    if (!value) {
        setValue("appetizers", {}); // Assuming appetizers is an object
        setValue("horsDoeurvesSelections", { serviceStyle: "stationary", categories: {} });
        setValue("appetizerService", "stationary"); // Reset service style
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-pink-700">
          Wedding Appetizers & Hors d'oeuvres
        </h2>
        <p className="text-lg text-gray-600">
          Would you like to include appetizers or hors d'oeuvres for your wedding guests?
        </p>
        <p className="text-sm text-gray-500 mt-2">
            (This is highly recommended for cocktail hours or before the main course.)
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg
              ${wantsAppetizers === true ? "ring-4 ring-pink-500 ring-offset-2 scale-105 shadow-pink-200" : "border-gray-200"}
            `}
            onClick={() => handleAppetizerSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsAppetizers === true ? "text-pink-600" : "text-gray-300"}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Yes, Please!</h3>
              <p className="text-gray-600 text-sm">
                We'd love to offer appetizers to our guests.
              </p>
            </CardContent>
          </Card>

          <Card
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg
              ${wantsAppetizers === false ? "ring-4 ring-gray-400 ring-offset-2 scale-105 shadow-gray-200" : "border-gray-200"}
            `}
            onClick={() => handleAppetizerSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <X className={`h-16 w-16 ${wantsAppetizers === false ? "text-gray-700" : "text-gray-300"}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">No, Thank You</h3>
              <p className="text-gray-600 text-sm">
                We'll skip appetizers for this event.
              </p>
            </CardContent>
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
          disabled={wantsAppetizers === undefined} // Button disabled until a choice is made
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingAppetizerQuestionStep;