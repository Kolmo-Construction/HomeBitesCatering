// client/src/components/formSteps/BasicInformationStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { EventType } from "../../data/eventOptions";
import { EventInquiryFormData } from "../../types";

interface BasicInformationStepProps {
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}

const BasicInformationStep: React.FC<BasicInformationStepProps> = ({ 
  eventType,
  onPrevious,
  onNext 
}) => {
  const { control, watch, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  const hasPromoCode = watch("hasPromoCode");
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Basic Information</h2>
        <p className="text-lg text-gray-600">
          Let's get to know you and your {eventType.toLowerCase()} event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6 flex items-center justify-center bg-gray-100 py-3 rounded-md">
          <div className={`inline-flex items-center px-4 py-2 rounded-md bg-primary/10 border border-primary/20`}>
            <span className="text-primary font-medium">{eventType}</span>
          </div>
        </div>
        
        {/* Company Name - Only show for Corporate events */}
        {eventType === "Corporate" && (
          <div className="mb-6">
            <FormField
              control={control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        {/* Contact Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="contactName.firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="contactName.lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address*</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(123) 456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Billing Address */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Billing Address</h3>
          
          <div className="space-y-4">
            <FormField
              control={control}
              name="billingAddress.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address*</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="billingAddress.street2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address Line 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="billingAddress.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City*</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="billingAddress.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State*</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="billingAddress.zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code*</FormLabel>
                    <FormControl>
                      <Input placeholder="Zip Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Event Date */}
        <div className="mb-6">
          <FormField
            control={control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Date*</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Promo Code */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <FormField
              control={control}
              name="hasPromoCode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange} 
                    />
                  </FormControl>
                  <FormLabel className="font-medium">I have a promo code</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {hasPromoCode && (
            <FormField
              control={control}
              name="promoCode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Enter promo code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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

export default BasicInformationStep;