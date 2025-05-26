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

                  // --- Helper Components (Progress Bar, Header) ---
                  const WeddingFormHeader = () => {
                    return (
                      <div className="relative w-full min-h-[400px] overflow-hidden mb-8">
                        {/* Background with gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50"></div>

                        {/* Decorative floating elements */}
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute top-10 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-20 animate-pulse"></div>
                          <div className="absolute top-32 right-20 w-16 h-16 bg-rose-300 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '1s' }}></div>
                          <div className="absolute bottom-20 left-32 w-12 h-12 bg-purple-200 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2s' }}></div>
                          <div className="absolute bottom-40 right-10 w-24 h-24 bg-pink-100 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                        </div>

                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-5" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23db2777' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm10 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}></div>

                        {/* Content */}
                        <div className="relative z-10 container mx-auto px-6 py-16 text-center">
                          <div className="max-w-4xl mx-auto">
                            {/* Main headline with romantic typography */}
                            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-800 leading-tight">
                              <span className="font-serif italic text-rose-600">Your</span>{' '}
                              <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Dream Wedding</span>
                              <br />
                              <span className="text-4xl md:text-5xl font-light text-gray-700">Awaits</span>
                            </h1>

                            {/* Elegant tagline */}
                            <div className="mb-8">
                              <p className="text-2xl md:text-3xl font-serif italic text-rose-500 mb-2">
                                "Creating magical moments, one bite at a time"
                              </p>
                              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto"></div>
                            </div>

                            {/* Description */}
                            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
                              From intimate gatherings to grand celebrations, our expert culinary team crafts
                              unforgettable dining experiences that perfectly complement your love story.
                            </p>

                            {/* Trust indicators */}
                            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <div className="flex text-yellow-400">
                                  {'★'.repeat(5)}
                                </div>
                                <span>500+ Happy Couples</span>
                              </div>
                              <div className="h-4 w-px bg-gray-300"></div>
                              <span>Licensed & Insured</span>
                              <div className="h-4 w-px bg-gray-300"></div>
                              <span>15+ Years Experience</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom decorative wave */}
                        <div className="absolute bottom-0 left-0 w-full">
                          <svg className="w-full h-12 text-white" preserveAspectRatio="none" viewBox="0 0 1200 120" fill="currentColor">
                            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
                            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
                          </svg>
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