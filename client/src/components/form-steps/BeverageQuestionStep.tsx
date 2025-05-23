// client/src/components/form-steps/BeverageQuestionStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventInquiryFormData } from "@/types/form-types";

export default function BeverageQuestionStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { watch, setValue } = useFormContext<EventInquiryFormData>();
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