// client/src/components/formSteps/SpecialRequestsStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { EventInquiryFormData } from "../../types";

interface SpecialRequestsStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const SpecialRequestsStep: React.FC<SpecialRequestsStepProps> = ({ 
  onPrevious,
  onNext 
}) => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  
  // Watch values for conditional fields
  const hasAllergies = watch("hasAllergies");
  const hasDietaryRestrictions = watch("hasDietaryRestrictions");
  const hasSpecialRequests = watch("hasSpecialRequests");
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Special Requests</h2>
        <p className="text-lg text-gray-600">
          Let us know about any special considerations for your event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Allergies Section */}
        <div className="mb-6">
          <FormField
            control={control}
            name="hasAllergies"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 rounded-md border mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Allergies</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Let us know if any guests have food allergies
                  </div>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {hasAllergies && (
            <FormField
              control={control}
              name="allergiesDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Please describe the allergies</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please list all allergies and approximately how many guests have them" 
                      className="min-h-24" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        {/* Dietary Restrictions Section */}
        <div className="mb-6">
          <FormField
            control={control}
            name="hasDietaryRestrictions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 rounded-md border mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Dietary Restrictions</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Let us know if any guests have dietary restrictions
                  </div>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {hasDietaryRestrictions && (
            <FormField
              control={control}
              name="dietaryRestrictionsDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Please describe the dietary restrictions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please list all dietary restrictions (vegetarian, vegan, etc.) and approximately how many guests have them" 
                      className="min-h-24" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        {/* Special Requests Section */}
        <div className="mb-6">
          <FormField
            control={control}
            name="hasSpecialRequests"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between p-4 rounded-md border mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Special Requests</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Any other special requests or considerations
                  </div>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {hasSpecialRequests && (
            <FormField
              control={control}
              name="specialRequestsDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Please describe your special requests</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please provide details of any other special requests you have for your event" 
                      className="min-h-24" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        {/* Additional Comments Section */}
        <div>
          <FormField
            control={control}
            name="additionalComments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Comments (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any other information you would like to share about your event" 
                    className="min-h-32" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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

export default SpecialRequestsStep;