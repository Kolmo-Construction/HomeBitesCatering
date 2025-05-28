// client/src/components/form-steps/EquipmentQuestionStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { EventInquiryFormData } from "@/types/form-types";

export default function EquipmentQuestionStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { watch, setValue } = useFormContext<EventInquiryFormData>();
  const wantsEquipmentRental = watch("wantsEquipmentRental");
  
  // Handle equipment rental selection
  const handleEquipmentSelection = (value: boolean) => {
    setValue("wantsEquipmentRental", value);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Equipment Rental</h2>
        <p className="text-lg text-gray-600">
          Would you like to include equipment rental for your event?
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsEquipmentRental === true ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleEquipmentSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsEquipmentRental === true ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Yes</h3>
              <p className="text-gray-600">I would like to rent equipment for my event.</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsEquipmentRental === false ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleEquipmentSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <X className={`h-16 w-16 ${wantsEquipmentRental === false ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No</h3>
              <p className="text-gray-600">I don't need equipment rental for this event.</p>
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
          disabled={wantsEquipmentRental === undefined}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}