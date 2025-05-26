// src/pages/wedding/WeddingInquiryForm.tsx
import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Helmet } from "react-helmet";

// Import UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Import ALL step components
import WeddingBasicInformationStep from "./components/WeddingBasicInformationStep";
import WeddingEventDetailsStep from "./components/WeddingEventDetailsStep";
import WeddingServiceStyleStep from "./components/WeddingServiceStyleStep"; // <-- IMPORT NEW STEP
import WeddingMenuSelectionStep from "./components/WeddingMenuSelectionStep";
import WeddingAppetizerQuestionStep from "./components/WeddingAppetizerQuestionStep";
import WeddingAppetizersStep from "./components/WeddingAppetizersStep";
import WeddingFoodTruckMenuStep from "./components/WeddingFoodTruckMenuStep";
import WeddingSandwichFactoryMenuStep from "./components/WeddingSandwichFactoryMenuStep";
import WeddingBreakfastMenuStep from "./components/WeddingBreakfastMenuStep";
import WeddingDessertQuestionStep from "./components/WeddingDessertQuestionStep";
import WeddingDessertsStep from "./components/WeddingDessertsStep";
import WeddingBeverageQuestionStep from "./components/WeddingBeverageQuestionStep";
import WeddingNonAlcoholicBeveragesStep from "./components/WeddingNonAlcoholicBeveragesStep";
import WeddingAlcoholicBeveragesStep from "./components/WeddingAlcoholicBeveragesStep";
import WeddingEquipmentQuestionStep from "./components/WeddingEquipmentQuestionStep";
import WeddingEquipmentStep from "./components/WeddingEquipmentStep";
import WeddingDietaryRestrictionsStep from "./components/WeddingDietaryRestrictionsStep";
// WeddingReviewStep would be the component for the "review" step
// import WeddingReviewStep from "./components/WeddingReviewStep";


// Import Wedding-Specific Types
import {
  WeddingInquiryFormData,
  WeddingFormStep,
  EventType as LocalEventType, 
} from "./types/weddingFormTypes";

// Import Progress Sidebar
import WeddingProgressSidebar from "./components/WeddingProgressSidebar";

// --- Helper Components (Progress Bar, Header) ---
const WeddingFormHeader = () => {
  return (
    <div className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 mb-8">
      <div className="container mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-center">
          Plan Your Dream Wedding
        </h1>
        <p className="text-lg md:text-xl text-center max-w-2xl mx-auto">
          Tell us about your special day, and we'll help create an unforgettable culinary experience.
        </p>
      </div>
    </div>
  );
};

const FormProgressBar = ({
  currentStepNumber,
  totalSteps,
  currentStepKey,
}: {
  currentStepNumber: number;
  totalSteps: number;
  currentStepKey: string;
}) => {
  const progressPercentage = totalSteps > 0 ? (currentStepNumber / totalSteps) * 100 : 0;
  const formatStepName = (key: string) => {
    // Simple formatter, can be expanded
    if (key === "serviceStyleSelection") return "Service Style";
    return key
      .replace(/([A-Z])/g, ' $1') 
      .replace(/^./, (str) => str.toUpperCase()); 
  };
  const stepName = formatStepName(currentStepKey);

  return (
    <div className="w-full mb-8 px-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStepNumber} of {totalSteps}: <span className="font-semibold text-pink-600">{stepName}</span>
        </span>
        <span className="text-sm font-medium text-gray-700">
          {Math.floor(progressPercentage)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-pink-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- Main Wedding Inquiry Form Orchestrator ---
export default function WeddingInquiryForm() {
  const weddingSteps: WeddingFormStep[] = [
    "basicInfo",
    "eventDetails",
    "serviceStyleSelection", // <-- ADDED NEW STEP IN SEQUENCE
    "menuSelection",
    "appetizerQuestion",
    "appetizers",
    "foodTruckMenu",
    "sandwichFactoryMenu",
    "breakfastMenu",
    "dessertQuestion",
    "desserts",
    "beverageQuestion",
    "nonAlcoholicBeverages",
    "alcoholicBeverages",
    "equipmentQuestion",
    "equipment",
    "dietaryRestrictions",
    "review",
  ];

  const methods = useForm<WeddingInquiryFormData>({
    defaultValues: {
      eventType: "Wedding",
      companyName: "",
      billingAddress: { street: "", street2: "", city: "", state: "", zipCode: "" },
      contactName: { firstName: "", lastName: "" },
      email: "",
      phone: "",
      eventDate: "",
      hasPromoCode: false,
      promoCode: "",
      venueSecured: false,
      venueName: "",
      venueLocation: { street: "", street2: "", city: "", state: "", zipCode: "" },
      eventStartTime: "",
      eventEndTime: "",
      ceremonyStartTime: "",
      ceremonyEndTime: "",
      setupBeforeCeremony: false,
      hasCocktailHour: true, // Defaulting to true, can be changed in eventDetails
      cocktailStartTime: "",
      cocktailEndTime: "",
      hasMainCourse: true, // Defaulting to true
      foodServiceStartTime: "",
      foodServiceEndTime: "",
      guestCount: 100,
      serviceStyle: "", // Initialize as empty, user will select in the new step
      serviceDuration: 0,
      laborHours: 0,
      requestedTheme: "",
      selectedPackages: {},
      menuSelections: { proteins: [], sides: [], salads: [], salsas: [], desserts: [], addons: [] },
      foodTruckSelections: {
        smallBites: [], bigBites: [], vegetarianVegan: [], kidsBites: [],
        glutenFreeBuns: 0, includeMenuPoster: false, includeDesserts: true,
      },
      sandwichFactorySelections: {
        package: "", meats: [], cheeses: [], vegetables: [],
        breads: [], spreads: [], salads: [],
        wantsGlutenFreeBread: false, glutenFreeBreadCount: 0, notes: "",
      },
      breakfastMenuSelections: {
        menuType: "", serviceStyle: "", grab_and_go_bites: [], grab_and_go_snacks: [],
        grab_and_go_beverages: [], continental_staples: [], continental_beverages: [],
        eggs: "", meats: [], potatoes: "", breads: "", sweet_selections: [],
        savory_selections: [], sides_selections: [], beverages: [], notes: "",
      },
      wantsAppetizers: true, // Default, can be changed
      appetizerService: "stationary",
      appetizers: {},
      horsDoeurvesSelections: { serviceStyle: "stationary", categories: {} },
      wantsDesserts: true, 
      dessertSelections: {},
      beverageServiceChoice: undefined,
      nonAlcoholicBeverageSelections: {},
      alcoholicBeverageSelections: { alcoholTypes: {}, otherBarEquipment: {} },
      wantsEquipmentRental: undefined,
      equipment: { furniture: {}, linens: {}, servingWare: {}, decor: {} },
      dietaryRestrictions: {
        vegetarian: false, vegan: false, gluten_free: false, dairy_free: false,
        nut_free: false, shellfish_allergy: false, kosher: false, halal: false,
      },
      dietaryCount: {
        vegetarian: 0, vegan: 0, gluten_free: 0, dairy_free: 0,
        nut_free: 0, shellfish_allergy: 0, kosher: 0, halal: 0,
      },
      dietaryNotes: "",
      adminFee: 0,
      otherFeesDescription: "",
      otherFeesAmount: 0,
      beverageNotes: "",
      specialRequests: "",
      generalNotes: "",
    },
  });

  const { watch, setValue, getValues } = methods;
  const [currentStepKey, setCurrentStepKey] = useState<WeddingFormStep>(weddingSteps[0]);

  const currentStepIndex = weddingSteps.indexOf(currentStepKey);
  const currentStepNumber = currentStepIndex + 1;
  const totalSteps = weddingSteps.length;

  const handleNext = () => {
    const currentIndex = weddingSteps.indexOf(currentStepKey);
    if (currentIndex === -1 || currentIndex >= weddingSteps.length - 1) {
       if (currentStepKey === "review") {
        console.log("Submitting Wedding Inquiry:", getValues());
        alert("Wedding Inquiry Submitted (see console for data)!");
       }
      return; 
    }

    let nextStepKey: WeddingFormStep = weddingSteps[currentIndex + 1]; // Default next step

    const currentServiceStyle = watch("serviceStyle");
    const currentRequestedTheme = watch("requestedTheme");

    if (currentStepKey === "eventDetails") {
      nextStepKey = "serviceStyleSelection"; // Always go to service style selection after event details
    } else if (currentStepKey === "serviceStyleSelection") {
        // Logic based on the selected serviceStyle
        switch (currentServiceStyle) {
            case "food_truck":
                nextStepKey = "foodTruckMenu";
                break;
            case "sandwich_factory":
                setValue("requestedTheme", "sandwich_factory"); // Set theme for this style
                nextStepKey = "sandwichFactoryMenu";
                break;
            case "breakfast_brunch":
                setValue("requestedTheme", "breakfast_brunch"); // Set theme for this style
                nextStepKey = "breakfastMenu";
                break;
            case "cocktail_party":
                setValue("wantsAppetizers", true); // Appetizers are key for cocktail party
                nextStepKey = "appetizers"; // Go directly to appetizer selection
                break;
            default: // "catering_buffet", "family_style", "plated_dinner"
                nextStepKey = "menuSelection"; // Go to general menu selection
                break;
        }
    } else if (currentStepKey === "menuSelection") {
      if (currentRequestedTheme === "hors_doeuvres") { // This theme implies appetizers are central
        setValue("wantsAppetizers", true);
        nextStepKey = "appetizers";
      } else {
        nextStepKey = "appetizerQuestion";
      }
    } else if (currentStepKey === "appetizerQuestion") {
      nextStepKey = watch("wantsAppetizers") ? "appetizers" : "dessertQuestion";
    } else if (currentStepKey === "appetizers") {
      // After appetizers, always go to dessert question, regardless of initial service style
      nextStepKey = "dessertQuestion";
    } else if (["foodTruckMenu", "sandwichFactoryMenu", "breakfastMenu"].includes(currentStepKey)) {
      // After specialized menus, proceed to dessert question
      nextStepKey = "dessertQuestion";
    } else if (currentStepKey === "dessertQuestion") {
      nextStepKey = watch("wantsDesserts") ? "desserts" : "beverageQuestion";
    } else if (currentStepKey === "desserts") {
      nextStepKey = "beverageQuestion";
    } else if (currentStepKey === "beverageQuestion") {
      const beverageChoice = watch("beverageServiceChoice");
      if (beverageChoice === "non-alcoholic") nextStepKey = "nonAlcoholicBeverages";
      else if (beverageChoice === "alcoholic") nextStepKey = "alcoholicBeverages";
      else nextStepKey = "equipmentQuestion"; 
    } else if (currentStepKey === "nonAlcoholicBeverages" || currentStepKey === "alcoholicBeverages") {
      nextStepKey = "equipmentQuestion";
    } else if (currentStepKey === "equipmentQuestion") {
      nextStepKey = watch("wantsEquipmentRental") ? "equipment" : "dietaryRestrictions";
    } else if (currentStepKey === "equipment") {
      nextStepKey = "dietaryRestrictions";
    } else if (currentStepKey === "dietaryRestrictions") {
      nextStepKey = "review";
    }
    // Ensure nextStepKey is valid, otherwise fallback to default progression
    if (weddingSteps.includes(nextStepKey)) {
        setCurrentStepKey(nextStepKey);
    } else if (currentIndex < weddingSteps.length -1 ) {
        setCurrentStepKey(weddingSteps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const currentIndex = weddingSteps.indexOf(currentStepKey);
    if (currentIndex <= 0) return;

    let prevStepKey: WeddingFormStep = weddingSteps[currentIndex - 1]; // Default previous step
    const currentServiceStyle = watch("serviceStyle");
    const currentRequestedTheme = watch("requestedTheme");

    // Specific backward navigation logic:
    if (currentStepKey === "menuSelection" || 
        currentStepKey === "appetizers" || // If coming back from appetizers (and not a cocktail party)
        currentStepKey === "foodTruckMenu" || 
        currentStepKey === "sandwichFactoryMenu" || 
        currentStepKey === "breakfastMenu") {

        // If cocktail_party was selected, appetizers is the main "menu"
        if (currentStepKey === "appetizers" && currentServiceStyle === "cocktail_party") {
             prevStepKey = "serviceStyleSelection";
        } 
        // For other menu types or appetizers (when not cocktail_party), go back to serviceStyleSelection
        else if (currentStepKey !== "appetizers" || watch("wantsAppetizers")) { // Added condition for appetizers
            prevStepKey = "serviceStyleSelection";
        }
        // If wantsAppetizers was false, then appetizerQuestion was skipped, so from dessertQuestion back to appetizerQuestion
         else if (currentStepKey === "dessertQuestion" && !watch("wantsAppetizers")) {
            prevStepKey = "appetizerQuestion";
        }


    } else if (currentStepKey === "serviceStyleSelection") {
        prevStepKey = "eventDetails";
    } else if (currentStepKey === "appetizerQuestion") {
        // If coming back to appetizerQuestion, the previous step was menuSelection (unless it was a theme like hors_doeuvres)
        // or one of the specialized menus that might not have a general menuSelection.
        // The serviceStyleSelection step is now more central.
        if (currentRequestedTheme === "hors_doeuvres" && currentServiceStyle !== "cocktail_party") {
             prevStepKey = "menuSelection"; // hors_doeuvres theme selected in menuSelection
        } else {
             prevStepKey = "menuSelection"; // Default from appetizerQuestion
        }

    } else if (currentStepKey === "dessertQuestion") {
        // If coming back to dessertQuestion, check what preceded it
        const cameFromSpecialMenu = ["food_truck", "sandwich_factory", "breakfast_brunch"].includes(currentServiceStyle);
        const wasAppetizersSelected = watch("wantsAppetizers");

        if (cameFromSpecialMenu) {
            // Find the correct special menu step
            if (currentServiceStyle === "food_truck") prevStepKey = "foodTruckMenu";
            else if (currentServiceStyle === "sandwich_factory") prevStepKey = "sandwichFactoryMenu";
            else if (currentServiceStyle === "breakfast_brunch") prevStepKey = "breakfastMenu";
        } else if (wasAppetizersSelected) {
            prevStepKey = "appetizers";
        } else { // Skipped appetizers
            prevStepKey = "appetizerQuestion";
        }
    } else if (currentStepKey === "beverageQuestion") {
      prevStepKey = watch("wantsDesserts") ? "desserts" : "dessertQuestion";
    } else if (currentStepKey === "equipmentQuestion") {
      const beverageChoice = watch("beverageServiceChoice");
      if (beverageChoice === "non-alcoholic") prevStepKey = "nonAlcoholicBeverages";
      else if (beverageChoice === "alcoholic") prevStepKey = "alcoholicBeverages";
      else prevStepKey = "beverageQuestion";
    } else if (currentStepKey === "dietaryRestrictions") {
      prevStepKey = watch("wantsEquipmentRental") ? "equipment" : "equipmentQuestion";
    }

    setCurrentStepKey(prevStepKey);
  };

  const guestCount = watch("guestCount");
  const selectedTheme = watch("requestedTheme");
  const fixedWeddingEventType: LocalEventType = "Wedding";

  return (
    <>
      <Helmet>
        <title>Wedding Inquiry | Home Bites Catering Services</title>
        <meta name="description" content="Plan your dream wedding with Home Bites Catering. Fill out our inquiry form to get started." />
      </Helmet>
      <div className="min-h-screen bg-gray-100 pb-12">
        <WeddingFormHeader />
        <FormProvider {...methods}>
          <form noValidate onSubmit={methods.handleSubmit(handleNext)} className="space-y-8">
            {currentStepKey !== "basicInfo" && ( // Optionally hide progress bar on first step
                 <FormProgressBar
                    currentStepNumber={currentStepNumber}
                    totalSteps={totalSteps}
                    currentStepKey={currentStepKey}
                />
            )}
            <div className="container mx-auto px-4"> {/* Added container for consistent padding */}
              {currentStepKey === "basicInfo" && (
                <WeddingBasicInformationStep
                  // eventType={fixedWeddingEventType} // Not needed if fixed in component
                  onPrevious={handlePrevious} // Should be disabled by logic if currentStepIndex <= 0
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "eventDetails" && (
                <WeddingEventDetailsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "serviceStyleSelection" && ( // <-- RENDER NEW STEP
                <WeddingServiceStyleStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "menuSelection" && (
                <WeddingMenuSelectionStep
                  selectedTheme={selectedTheme}
                  guestCount={guestCount}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "appetizerQuestion" && (
                <WeddingAppetizerQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "appetizers" && watch("wantsAppetizers") && (
                <WeddingAppetizersStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "foodTruckMenu" && (
                <WeddingFoodTruckMenuStep
                  onPrevious={handlePrevious}
                  onNext={handleNext} 
                  onSkipDessert={() => { // Example skip logic
                    setValue("foodTruckSelections.includeDesserts", false, { shouldValidate: true });
                    setValue("wantsDesserts", false); 
                    setCurrentStepKey("beverageQuestion"); 
                  }}
                />
              )}
              {currentStepKey === "sandwichFactoryMenu" && (
                <WeddingSandwichFactoryMenuStep
                  guestCount={guestCount}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "breakfastMenu" && (
                <WeddingBreakfastMenuStep
                  guestCount={guestCount}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "dessertQuestion" && (
                 <WeddingDessertQuestionStep
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                />
              )}
              {currentStepKey === "desserts" && watch("wantsDesserts") && (
                <WeddingDessertsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "beverageQuestion" && (
                <WeddingBeverageQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "nonAlcoholicBeverages" && watch("beverageServiceChoice") === "non-alcoholic" && (
                <WeddingNonAlcoholicBeveragesStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "alcoholicBeverages" && watch("beverageServiceChoice") === "alcoholic" && (
                <WeddingAlcoholicBeveragesStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "equipmentQuestion" && (
                 <WeddingEquipmentQuestionStep
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                />
              )}
              {currentStepKey === "equipment" && watch("wantsEquipmentRental") && (
                <WeddingEquipmentStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "dietaryRestrictions" && (
                <WeddingDietaryRestrictionsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              {currentStepKey === "review" && (
                // Assuming you have a WeddingReviewStep component
                // <WeddingReviewStep onPrevious={handlePrevious} onSubmit={handleNext} />
                // For now, a simple review placeholder:
                <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-3xl font-bold mb-4 text-pink-600">Review Your Wedding Inquiry</h2>
                            <p className="text-gray-700 mb-6">
                                Please review all the details you've provided. Once you're satisfied, you can submit your inquiry.
                            </p>
                            <pre className="text-left bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                                {JSON.stringify(getValues(), null, 2)}
                            </pre>
                             <div className="flex justify-between mt-8">
                                <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStepIndex <= 0}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                                <Button type="submit" className="bg-pink-500 hover:bg-pink-600">
                                    Submit Wedding Inquiry <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </>
  );
}