// src/pages/wedding/components/WeddingReviewStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, Send, CheckCircle2 } from "lucide-react";
import { WeddingInquiryFormData } from "../types/weddingFormTypes";

// Import data files to map IDs to names for display if needed
import { weddingThemeMenuData } from "../data/weddingThemeMenuData";
import { weddingAppetizerData } from "../data/weddingAppetizerData";
import { weddingHorsDoeurvesData } from "../data/weddingHorsDoeurvesData";
import { weddingDessertItems } from "../data/weddingDessertData";
import { weddingEquipmentCategories } from "../data/weddingEquipmentData";
// (Assuming commonWeddingDietaryRestrictions is defined in WeddingDietaryRestrictionsStep or a shared file if needed here)
// For simplicity, we'll just display the keys for dietary restrictions.

interface WeddingReviewStepProps {
  onPrevious: () => void;
  onSubmit: () => void; // This will be triggered by the main form's onSubmit
}

// Helper component to display a section of the review
const ReviewSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-xl font-semibold text-pink-700 mb-3 pb-2 border-b border-pink-200">{title}</h3>
    <div className="space-y-2 text-sm text-gray-700">{children}</div>
  </div>
);

// Helper to display a key-value pair
const InfoItem: React.FC<{ label: string; value?: string | number | boolean | null | React.ReactNode,  className?: string }> = ({ label, value, className }) => {
  if (value === undefined || value === null || value === "" || (typeof value === 'object' && !React.isValidElement(value) && Object.keys(value).length === 0) ) {
    return null; // Don't render if value is not meaningful
  }
  return (
    <div className={`flex justify-between py-1.5 ${className}`}>
      <span className="font-medium text-gray-600">{label}:</span>
      <span className="text-right">
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </span>
    </div>
  );
};

const WeddingReviewStep: React.FC<WeddingReviewStepProps> = ({
  onPrevious,
  onSubmit, // onSubmit prop will be called by the form's submit handler
}) => {
  const { getValues } = useFormContext<WeddingInquiryFormData>();
  const formData = getValues();

  const renderMenuSelections = () => {
    const themeDetails = formData.requestedTheme ? weddingThemeMenuData[formData.requestedTheme] : null;
    const packageId = formData.selectedPackages?.[formData.requestedTheme];
    const packageDetails = themeDetails?.packages.find(p => p.id === packageId);

    return (
      <>
        <InfoItem label="Menu Theme" value={themeDetails?.title || formData.requestedTheme || "Not selected"} />
        {packageDetails && <InfoItem label="Selected Package" value={packageDetails.name} />}
        {Object.entries(formData.menuSelections || {}).map(([categoryKey, items]) => {
          if (Array.isArray(items) && items.length > 0) {
            const categoryTitle = themeDetails?.categories[categoryKey]?.title || categoryKey.replace(/([A-Z])/g, ' $1').trim();
            return (
              <div key={categoryKey} className="mt-2 pl-4">
                <p className="font-semibold text-gray-600">{categoryTitle}:</p>
                <ul className="list-disc list-inside ml-4">
                  {items.map((item: any) => {
                     const itemName = themeDetails?.categories[categoryKey]?.items.find(i => i.id === item.id)?.name || item.id;
                     return <li key={item.id}>{itemName} {item.quantity > 1 ? `(Qty: ${item.quantity})` : ''}</li>;
                  })}
                </ul>
              </div>
            );
          }
          return null;
        })}
      </>
    );
  };

  const renderAppetizers = () => {
    const { appetizers, horsDoeurvesSelections } = formData;
    let hasAppetizers = false;

    const traditionalAppetizerElements = Object.entries(appetizers || {}).map(([catId, items]) => {
        if (items && items.length > 0) {
            hasAppetizers = true;
            const category = weddingAppetizerData.categories.find(c => c.id === catId);
            return (
                <div key={catId} className="mt-1 pl-4">
                    <p className="font-semibold text-gray-600">{category?.name || catId}:</p>
                    <ul className="list-disc list-inside ml-4">
                        {items.map(item => <li key={item.name}>{item.name} (Qty: {item.quantity})</li>)}
                    </ul>
                </div>
            );
        }
        return null;
    });

    const horsDoeurvesElements = horsDoeurvesSelections?.categories && Object.entries(horsDoeurvesSelections.categories).map(([catId, categoryData]) => {
        if (categoryData.items && Object.keys(categoryData.items).length > 0) {
            hasAppetizers = true;
            const categoryInfo = weddingHorsDoeurvesData.categories.find(c => c.id === catId);
            return (
                <div key={catId} className="mt-1 pl-4">
                    <p className="font-semibold text-gray-600">{categoryInfo?.name || catId}:</p>
                    <ul className="list-disc list-inside ml-4">
                        {Object.entries(categoryData.items).map(([itemId, itemData]) => (
                            <li key={itemId}>{itemData.name} (Qty: {itemData.quantity})</li>
                        ))}
                    </ul>
                </div>
            );
        }
        return null;
    });

    if (!hasAppetizers && !formData.wantsAppetizers) return <InfoItem label="Appetizers/Hors d'oeuvres" value="No" />;
    if (!hasAppetizers && formData.wantsAppetizers) return <InfoItem label="Appetizers/Hors d'oeuvres" value="Selected, but no items chosen." />;


    return (
      <>
        <InfoItem label="Appetizers Requested" value={formData.wantsAppetizers} />
        {horsDoeurvesSelections?.serviceStyle && <InfoItem label="Hors d'oeuvres Service" value={horsDoeurvesSelections.serviceStyle.charAt(0).toUpperCase() + horsDoeurvesSelections.serviceStyle.slice(1)} />}
        {traditionalAppetizerElements}
        {horsDoeurvesElements}
      </>
    );
  };

  const renderDesserts = () => {
    if (!formData.wantsDesserts) return <InfoItem label="Desserts Requested" value="No" />;
    if (Object.keys(formData.dessertSelections || {}).length === 0) return <InfoItem label="Desserts Requested" value="Yes, but no items chosen." />;

    return (
      <>
        <InfoItem label="Desserts Requested" value="Yes" />
        <div className="mt-1 pl-4">
            <p className="font-semibold text-gray-600">Selected Desserts:</p>
            <ul className="list-disc list-inside ml-4">
            {Object.entries(formData.dessertSelections || {}).map(([itemId, quantity]) => {
                const dessert = weddingDessertItems.find(d => d.id === itemId);
                return <li key={itemId}>{dessert?.name || itemId} (Qty: {quantity})</li>;
            })}
            </ul>
        </div>
      </>
    );
  };

  const renderBeverages = () => {
    if (formData.beverageServiceChoice === 'none') return <InfoItem label="Beverage Service" value="None Requested" />;
    return (
      <>
        <InfoItem label="Beverage Service Choice" value={formData.beverageServiceChoice?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} />
        {formData.beverageServiceChoice === 'non-alcoholic' && formData.nonAlcoholicBeverageSelections && Object.keys(formData.nonAlcoholicBeverageSelections).length > 0 && (
          <div className="mt-1 pl-4">
            <p className="font-semibold text-gray-600">Non-Alcoholic:</p>
            <ul className="list-disc list-inside ml-4">
              {Object.entries(formData.nonAlcoholicBeverageSelections).filter(([, selected]) => selected).map(([key]) => (
                <li key={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
              ))}
            </ul>
          </div>
        )}
        {formData.beverageServiceChoice === 'alcoholic' && formData.alcoholicBeverageSelections && (
          <div className="mt-1 pl-4">
            <InfoItem label="Bar Service Type" value={formData.alcoholicBeverageSelections.bartendingServiceType?.replace('_', ' ').toUpperCase()} />
            <InfoItem label="Drinking-Aged Guests" value={formData.alcoholicBeverageSelections.drinkingAgedGuests} />
            <InfoItem label="Bar Start Time" value={formData.alcoholicBeverageSelections.bartendingStartTime} />
            <InfoItem label="Bar Service Duration" value={formData.alcoholicBeverageSelections.bartendingServiceDuration} />
            {formData.alcoholicBeverageSelections.alcoholTypes && Object.values(formData.alcoholicBeverageSelections.alcoholTypes).some(v => v) && (
                 <div className="mt-1 pl-2">
                    <p className="font-semibold text-gray-500">Alcohol Types:</p>
                    <ul className="list-disc list-inside ml-4 text-xs">
                        {Object.entries(formData.alcoholicBeverageSelections.alcoholTypes).filter(([, v]) => v).map(([k]) => <li key={k}>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>)}
                    </ul>
                 </div>
            )}
            {formData.alcoholicBeverageSelections.otherBarEquipment && Object.values(formData.alcoholicBeverageSelections.otherBarEquipment).some(v => v) && (
                 <div className="mt-1 pl-2">
                    <p className="font-semibold text-gray-500">Other Bar Equipment:</p>
                    <ul className="list-disc list-inside ml-4 text-xs">
                        {Object.entries(formData.alcoholicBeverageSelections.otherBarEquipment).filter(([, v]) => v).map(([k]) => <li key={k}>{k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>)}
                    </ul>
                 </div>
            )}
          </div>
        )}
      </>
    );
  };

  const renderEquipment = () => {
    if (!formData.wantsEquipmentRental) return <InfoItem label="Equipment Rental" value="No" />;

    let hasEquipment = false;
    const equipmentDetails = Object.entries(formData.equipment || {}).map(([categoryKey, items]) => {
        if (items && Object.keys(items).length > 0) {
            const category = weddingEquipmentCategories.find(c => c.id === categoryKey || (categoryKey === 'furniture' && (c.id === 'tables' || c.id === 'chairs'))); // Adjust mapping if needed
            const displayItems = Object.entries(items).filter(([,qty]) => qty > 0);
            if (displayItems.length > 0) {
                hasEquipment = true;
                return (
                    <div key={categoryKey} className="mt-1 pl-4">
                        <p className="font-semibold text-gray-600">{category?.name || categoryKey.replace(/\b\w/g, l => l.toUpperCase())}:</p>
                        <ul className="list-disc list-inside ml-4">
                        {displayItems.map(([itemId, quantity]) => {
                            const itemDetail = category?.items.find(i => i.id === itemId);
                            return <li key={itemId}>{itemDetail?.name || itemId} (Qty: {quantity})</li>;
                        })}
                        </ul>
                    </div>
                );
            }
        }
        return null;
    });

    if (!hasEquipment) return <InfoItem label="Equipment Rental" value="Yes, but no items chosen." />;

    return (
      <>
        <InfoItem label="Equipment Rental Requested" value="Yes" />
        {equipmentDetails}
      </>
    );
  };

  const renderDietary = () => {
    const restrictions = Object.entries(formData.dietaryRestrictions || {}).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    if (restrictions.length === 0 && !formData.dietaryNotes) return <InfoItem label="Dietary Needs" value="None specified" />;
    return (
      <>
        {restrictions.length > 0 && (
          <div className="mt-1 pl-4">
            <p className="font-semibold text-gray-600">Specified Restrictions:</p>
            <ul className="list-disc list-inside ml-4">
              {restrictions.map(r => {
                const count = formData.dietaryCount?.[r.toLowerCase().replace(/ /g, '_') as keyof typeof formData.dietaryCount];
                return <li key={r}>{r}{count ? ` (Guests: ${count})` : ''}</li>;
                })}
            </ul>
          </div>
        )}
        <InfoItem label="Additional Dietary Notes" value={formData.dietaryNotes || "None"} />
      </>
    );
  };


  return (
    <div className="container mx-auto px-2 py-8 max-w-4xl"> {/* Wider for review */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 mr-3 text-pink-500" />
          Review Your Wedding Inquiry
        </h2>
        <p className="text-lg text-gray-600">
          Please carefully review all the details below. If everything looks correct, submit your inquiry.
        </p>
      </div>

      <Card className="bg-white rounded-xl shadow-xl p-6 md:p-8 mb-8">
        <CardContent className="divide-y divide-gray-200">
          <ReviewSection title="Contact & Wedding Basics">
            <InfoItem label="Primary Contact Name" value={`${formData.contactName?.firstName || ''} ${formData.contactName?.lastName || ''}`} />
            <InfoItem label="Email" value={formData.email} />
            <InfoItem label="Phone" value={formData.phone} />
            <InfoItem label="Wedding Date" value={formData.eventDate ? new Date(formData.eventDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Not set"} />
            <InfoItem label="Billing Address" value={`${formData.billingAddress?.street}, ${formData.billingAddress?.street2 ? formData.billingAddress.street2 + ', ' : ''}${formData.billingAddress?.city}, ${formData.billingAddress?.state} ${formData.billingAddress?.zipCode}`} />
          </ReviewSection>

          <ReviewSection title="Wedding Schedule & Venue">
            <InfoItem label="Venue Secured" value={formData.venueSecured} />
            {formData.venueSecured && <InfoItem label="Venue Name" value={formData.venueName} />}
            {formData.venueSecured && formData.venueLocation && <InfoItem label="Venue Location" value={`${formData.venueLocation.street}, ${formData.venueLocation.city}`} />}
            <InfoItem label="Reception Start Time" value={formData.eventStartTime} />
            <InfoItem label="Reception End Time" value={formData.eventEndTime} />
            <InfoItem label="Ceremony Start Time" value={formData.ceremonyStartTime} />
            <InfoItem label="Ceremony End Time" value={formData.ceremonyEndTime} />
            <InfoItem label="Setup Before Ceremony" value={formData.setupBeforeCeremony} />
            <InfoItem label="Cocktail Hour" value={formData.hasCocktailHour} />
            {formData.hasCocktailHour && <InfoItem label="Cocktail Start" value={formData.cocktailStartTime} />}
            {formData.hasCocktailHour && <InfoItem label="Cocktail End" value={formData.cocktailEndTime} />}
            <InfoItem label="Main Course Service" value={formData.hasMainCourse} />
            {formData.hasMainCourse && <InfoItem label="Food Service Start" value={formData.foodServiceStartTime} />}
            {formData.hasMainCourse && <InfoItem label="Food Service End" value={formData.foodServiceEndTime} />}
            <InfoItem label="Estimated Guest Count" value={formData.guestCount} />
            <InfoItem label="Reception Service Style" value={formData.serviceStyle?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} />
          </ReviewSection>

          <ReviewSection title="Menu Selections">
            {renderMenuSelections()}
          </ReviewSection>

          {formData.wantsAppetizers && (
            <ReviewSection title="Appetizers & Hors d'oeuvres">
              {renderAppetizers()}
            </ReviewSection>
          )}

          {formData.wantsDesserts && (
            <ReviewSection title="Dessert Selections">
              {renderDesserts()}
            </ReviewSection>
          )}

          {formData.beverageServiceChoice !== 'none' && (
            <ReviewSection title="Beverage Services">
              {renderBeverages()}
            </ReviewSection>
          )}
          {formData.beverageServiceChoice === 'none' && (
            <ReviewSection title="Beverage Services">
              <InfoItem label="Beverage Service" value="None Requested" />
            </ReviewSection>
          )}

          {formData.wantsEquipmentRental && (
            <ReviewSection title="Equipment Rentals">
              {renderEquipment()}
            </ReviewSection>
          )}
           {!formData.wantsEquipmentRental && (
            <ReviewSection title="Equipment Rentals">
              <InfoItem label="Equipment Rental" value="No" />
            </ReviewSection>
          )}

          <ReviewSection title="Dietary Needs & Allergies">
            {renderDietary()}
          </ReviewSection>

          <ReviewSection title="Additional Notes">
            <InfoItem label="Special Requests" value={formData.specialRequests || "None"} />
            <InfoItem label="General Notes" value={formData.generalNotes || "None"} />
          </ReviewSection>

        </CardContent>
      </Card>

      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Edit My Inquiry
        </Button>
        <Button
          type="button" // Changed to button, actual submission is handled by form's onSubmit
          onClick={onSubmit} // This will now call the onSubmit passed from WeddingInquiryForm
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Submit Wedding Inquiry <Send className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingReviewStep;