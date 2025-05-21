// client/src/components/formSteps/AppetizersQuestionStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { EventInquiryFormData } from "../../types";

interface AppetizersQuestionStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const AppetizersQuestionStep: React.FC<AppetizersQuestionStepProps> = ({ 
  onPrevious, 
  onNext 
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  const wantsAppetizers = watch("wantsAppetizers");
  
  // Handle appetizer selection
  const handleAppetizerSelection = (value: boolean) => {
    setValue("wantsAppetizers", value);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Appetizers</h2>
        <p className="text-lg text-gray-600">
          Would you like to add any appetizers to your quote?
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsAppetizers ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleAppetizerSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsAppetizers ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Yes, I'd like appetizers</h3>
              <p className="text-gray-600">
                Add a selection of appetizers to elevate your event experience
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsAppetizers === false ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleAppetizerSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsAppetizers === false ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No, I'll skip appetizers</h3>
              <p className="text-gray-600">
                Continue without including appetizers in your quote
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center gap-2"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AppetizersQuestionStep;