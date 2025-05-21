// client/src/components/formSteps/ReviewStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check } from "lucide-react";
import { EventInquiryFormData } from "../../types";
import { format } from "date-fns";

interface ReviewStepProps {
  onPrevious: () => void;
  onSubmit: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ 
  onPrevious,
  onSubmit 
}) => {
  const { getValues } = useFormContext<EventInquiryFormData>();
  const formData = getValues();
  
  // Helper function to format date strings
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };
  
  // Helper function to format time strings
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return timeString;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Review Your Information</h2>
        <p className="text-lg text-gray-600">
          Please review your event details before submitting
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Basic Information</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Event Type</p>
              <p className="font-medium">{formData.eventType}</p>
            </div>
            
            {formData.companyName && (
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium">{formData.companyName}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">Contact Name</p>
              <p className="font-medium">
                {formData.contactName?.firstName} {formData.contactName?.lastName}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Contact Email</p>
              <p className="font-medium">{formData.email}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Contact Phone</p>
              <p className="font-medium">{formData.phone}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Event Date</p>
              <p className="font-medium">{formData.eventDate ? formatDate(formData.eventDate) : ""}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500">Billing Address</p>
            <p className="font-medium">
              {formData.billingAddress?.street}{formData.billingAddress?.street2 ? `, ${formData.billingAddress.street2}` : ""}
            </p>
            <p className="font-medium">
              {formData.billingAddress?.city}, {formData.billingAddress?.state} {formData.billingAddress?.zipCode}
            </p>
          </div>
          
          {formData.promoCode && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Promo Code</p>
              <p className="font-medium">{formData.promoCode}</p>
            </div>
          )}
        </div>
        
        {/* Event Details Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Event Details</h3>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Guest Count</p>
              <p className="font-medium">{formData.guestCount}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Service Style</p>
              <p className="font-medium">{formData.serviceStyle?.replace(/_/g, " ")}</p>
            </div>
            
            {formData.venueSecured && formData.venueName && (
              <div>
                <p className="text-sm text-gray-500">Venue</p>
                <p className="font-medium">{formData.venueName}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">Event Time</p>
              <p className="font-medium">
                {formatTime(formData.eventStartTime)} - {formatTime(formData.eventEndTime)}
              </p>
            </div>
            
            {formData.requestedTheme && (
              <div>
                <p className="text-sm text-gray-500">Menu Theme</p>
                <p className="font-medium">{formData.requestedTheme?.replace(/_/g, " ")}</p>
              </div>
            )}
          </div>
          
          {formData.hasCocktailHour && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Cocktail Hour</p>
              <p className="font-medium">
                {formatTime(formData.cocktailStartTime)} - {formatTime(formData.cocktailEndTime)}
              </p>
            </div>
          )}
          
          {formData.hasMainCourse && (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Main Course Service</p>
              <p className="font-medium">
                {formatTime(formData.foodServiceStartTime)} - {formatTime(formData.foodServiceEndTime)}
              </p>
            </div>
          )}
        </div>
        
        {/* Menu Selections Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">Menu Selections</h3>
          
          {formData.wantsAppetizers && (
            <div className="mb-4">
              <h4 className="text-lg font-medium mb-2">Appetizers</h4>
              <p className="text-sm text-gray-500">Service Style: {formData.appetizerService || "Stationary"}</p>
              
              {formData.appetizers && Object.keys(formData.appetizers).length > 0 && (
                <div className="mt-2">
                  {Object.keys(formData.appetizers).map(categoryKey => (
                    <div key={categoryKey} className="mb-3">
                      <h5 className="text-sm font-medium">{categoryKey.replace(/_/g, " ")}</h5>
                      <ul className="list-disc list-inside ml-2">
                        {formData.appetizers[categoryKey]?.map((item: any, index: number) => (
                          <li key={index} className="text-sm">
                            {item.name} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {formData.wantsDesserts && formData.dessertSelections && formData.dessertSelections.length > 0 && (
            <div>
              <h4 className="text-lg font-medium mb-2">Desserts</h4>
              <ul className="list-disc list-inside ml-2">
                {formData.dessertSelections.map((dessertId: string, index: number) => (
                  <li key={index} className="text-sm">{dessertId}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Special Requests Section */}
        {(formData.hasAllergies || formData.hasDietaryRestrictions || formData.hasSpecialRequests || formData.additionalComments) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Special Requests</h3>
            
            {formData.hasAllergies && formData.allergiesDescription && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Allergies</h4>
                <p className="text-sm">{formData.allergiesDescription}</p>
              </div>
            )}
            
            {formData.hasDietaryRestrictions && formData.dietaryRestrictionsDescription && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Dietary Restrictions</h4>
                <p className="text-sm">{formData.dietaryRestrictionsDescription}</p>
              </div>
            )}
            
            {formData.hasSpecialRequests && formData.specialRequestsDescription && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Special Requests</h4>
                <p className="text-sm">{formData.specialRequestsDescription}</p>
              </div>
            )}
            
            {formData.additionalComments && (
              <div>
                <h4 className="text-lg font-medium mb-2">Additional Comments</h4>
                <p className="text-sm">{formData.additionalComments}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Submit Section */}
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Ready to Submit?</h3>
          <p className="text-gray-600">
            By submitting this form, you'll receive a detailed quote for your event based on the information provided.
            Our team will review your request and contact you within 1-2 business days.
          </p>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Edit
          </Button>
          
          <Button 
            type="button" 
            onClick={onSubmit}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            Submit Request <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;