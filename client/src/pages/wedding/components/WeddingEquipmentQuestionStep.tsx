// src/pages/wedding/components/WeddingEquipmentQuestionStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X, Sparkles } from "lucide-react"; // Added Sparkles icon
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

interface WeddingEquipmentQuestionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingEquipmentQuestionStep: React.FC<WeddingEquipmentQuestionStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch, setValue } = useFormContext<WeddingInquiryFormData>();
  const wantsEquipmentRental = watch("wantsEquipmentRental");

  const handleEquipmentSelection = (value: boolean) => {
    setValue("wantsEquipmentRental", value, { shouldValidate: true });
    // If 'No', reset equipment selections to ensure data consistency
    if (!value) {
      setValue("equipment", {
        furniture: {},
        linens: {},
        servingWare: {},
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <Sparkles className="h-8 w-8 mr-3 text-pink-500" />
          Wedding Equipment Rentals
        </h2>
        <p className="text-lg text-gray-600">
          Do you require any rental equipment for your wedding day?
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This can include tables, chairs, linens, serving ware, and decorative items.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg
              ${wantsEquipmentRental === true ? "ring-4 ring-pink-500 ring-offset-2 scale-105 shadow-pink-200" : "border-gray-200"}
            `}
            onClick={() => handleEquipmentSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsEquipmentRental === true ? "text-pink-600" : "text-gray-300"}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Yes, We Need Rentals</h3>
              <p className="text-gray-600 text-sm">
                Please show us the available equipment options.
              </p>
            </CardContent>
          </Card>

          <Card
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg transform hover:scale-105 rounded-lg
              ${wantsEquipmentRental === false ? "ring-4 ring-gray-400 ring-offset-2 scale-105 shadow-gray-200" : "border-gray-200"}
            `}
            onClick={() => handleEquipmentSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <X className={`h-16 w-16 ${wantsEquipmentRental === false ? "text-gray-700" : "text-gray-300"}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">No, We're Covered</h3>
              <p className="text-gray-600 text-sm">
                We have our own equipment or are sourcing it elsewhere.
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
          disabled={wantsEquipmentRental === undefined} // Button disabled until a choice is made
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingEquipmentQuestionStep;