import React, { useState, useEffect, useMemo } from "react";
import BasicInformationStep from "@/components/form-steps/BasicInformationStep";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import EventTypeSelectionStep from "@/components/form-steps/EventTypeSelectionStep";
import EventDetailsStep from "@/components/form-steps/EventDetailsStep";
import MenuSelectionStep from "@/components/form-steps/MenuSelectionStep";
import BreakfastMenuStep from "@/components/form-steps/BreakfastMenuStep";
import DessertsStep from "@/components/form-steps/DessertsStep";
import AppetizersStep from "@/components/form-steps/AppetizersStep";
import { BeverageQuestionStep, NonAlcoholicBeveragesStep, AlcoholicBeveragesStep } from "@/components/form-steps/BeverageSelectionSteps";
import EquipmentQuestionStep from "@/components/form-steps/EquipmentQuestionStep";
import EquipmentStep from "@/components/form-steps/EquipmentStep";

import SandwichFactoryMenuStep from "@/components/form-steps/SandwichFactoryMenuStep";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, ChevronLeft, Check, Building, Phone,
  MapPin, Clock, Send, Users2, LayoutGrid, Radio, CircleOff, X,
  Info as InfoIcon, Truck as TruckIcon, Package as PackageIcon,
  Utensils as UtensilsIcon, Table as TableIcon,
  UtensilsCrossed as UtensilsCrossedIcon, GlassWater as GlassWaterIcon
} from "lucide-react";
import FoodTruckMenu from "@/components/FoodTruckMenu";
import { Helmet } from "react-helmet";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

// Import externalized types
import { 
  EventType, 
  FormStep, 
  DessertLotSize, 
  DessertItem, 
  EventInquiryFormData 
} from "@/types/form-types";

// Import externalized data
import { dessertItems, dessertLotSizes } from "@/data/dessertData";
import { eventTypes, mapUrlToEventType, validateEventType } from "@/data/event-types";
import { appetizerData } from "@/data/appetizerData";
import { horsDoeurvesData } from "@/data/horsDoeurvesInfo";
import { themeMenuData } from "@/data/themeMenuInfo";
import { breakfastMenuData } from "@/data/breakfastMenuData";
import { sandwichFactoryData } from "@/data/sandwichFactoryData";
// Using EventInquiryFormData imported from form-types.ts

// Sandwich Factory menu data (static)


// BreakfastMenuStep component
// DessertQuestionStep component
const DessertQuestionStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  const wantsDesserts = watch("wantsDesserts");
  
  // Handle dessert selection
  const handleDessertSelection = (value: boolean) => {
    setValue("wantsDesserts", value);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Desserts</h2>
        <p className="text-lg text-gray-600">
          Would you like to add any desserts to your event menu?
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsDesserts ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleDessertSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsDesserts ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Yes</h3>
              <p className="text-gray-600">I would like to add desserts to my event menu.</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsDesserts === false ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleDessertSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <X className={`h-16 w-16 ${wantsDesserts === false ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No</h3>
              <p className="text-gray-600">I don't need desserts for this event.</p>
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
          disabled={wantsDesserts === undefined}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// SandwichFactoryMenuStep component


// Experimental Form Header component
const PublicFormHeader = () => {
  return (
    <div className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-6 mb-8">
      <div className="container mx-auto">
        <h1 className="text-5xl font-extrabold mb-4 text-center">Home Bites Catering Services</h1>
        <p className="text-xl text-center max-w-2xl mx-auto">
          <span className="bg-white/20 px-2 py-1 rounded">EXPERIMENTAL VERSION</span> - Exceptional cuisine for extraordinary moments
        </p>
      </div>
    </div>
  );
};

// Progress bar component
const FormProgressBar = ({ 
  currentStep, 
  totalSteps,
  completedSteps = []
}: { 
  currentStep: number;
  totalSteps: number;
  completedSteps?: string[];
}) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {Math.floor((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

// Dessert Matrix component for selecting quantities

// Desserts step component
const DietaryRestrictionsStep = ({ 
  onPrevious,
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  
  // Common allergies and dietary restrictions
  const commonDietaryRestrictions = [
    { id: "vegetarian", label: "Vegetarian" },
    { id: "vegan", label: "Vegan" },
    { id: "gluten_free", label: "Gluten Free" },
    { id: "dairy_free", label: "Dairy Free" },
    { id: "nut_free", label: "Nut Free" },
    { id: "shellfish_allergy", label: "Shellfish Allergy" },
    { id: "kosher", label: "Kosher" },
    { id: "halal", label: "Halal" }
  ];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dietary Restrictions</h2>
        <p className="text-lg text-gray-600">
          Let us know about any dietary requirements or food allergies
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Common Dietary Restrictions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select any dietary restrictions that apply to your guests. This helps us prepare appropriate menu options.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {commonDietaryRestrictions.map((restriction) => (
              <FormField
                key={restriction.id}
                control={control}
                name={`dietaryRestrictions.${restriction.id}`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        {restriction.label}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
          
          <div className="mt-6">
            <h4 className="text-lg font-medium mb-2">Guest Count for Dietary Restrictions</h4>
            <p className="text-sm text-gray-600 mb-4">
              For each selected restriction, please specify how many guests require this option.
            </p>
            
            <div className="space-y-4">
              {commonDietaryRestrictions.map((restriction) => {
                // Only show count field if restriction is selected
                const isSelected = watch(`dietaryRestrictions.${restriction.id}`);
                
                if (!isSelected) return null;
                
                return (
                  <FormField
                    key={`${restriction.id}-count`}
                    control={control}
                    name={`dietaryCount.${restriction.id}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="font-medium">
                            {restriction.label} Count:
                          </FormLabel>
                          <div className="w-24">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                className="text-right"
                              />
                            </FormControl>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Food Allergies</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please specify any food allergies or intolerances that we should be aware of.
          </p>
          
          <FormField
            control={control}
            name="dietaryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dietary Notes & Food Allergies</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Please provide details about any dietary restrictions, food allergies, or special requirements (e.g., number of vegetarian meals needed, severe allergies, etc.)"
                    className="min-h-[150px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
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
            className="flex items-center"
          >
            Review Your Inquiry <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
// Using appetizer data externalized to appetizerData.ts file

// Step 3: Event Details & Venue Form Component

// Menu data imported from themeMenuInfo.ts

// Defining Hors d'oeuvres component properties for each step

// Step 5: Appetizers Question Step
const AppetizersQuestionStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
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
              <h3 className="text-xl font-semibold mb-2">Yes</h3>
              <p className="text-gray-600">I would like to add appetizers to my event.</p>
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
                <X className={`h-16 w-16 ${wantsAppetizers === false ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No</h3>
              <p className="text-gray-600">I don't need appetizers for this event.</p>
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
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Step 6: Appetizers & Hors d'oeuvres Selection Component


// Step 4: Menu Selection Component


// Main component
// Using validateEventType imported from event-types.tsx

// Using imported mapUrlToEventType from event-types.tsx

export default function ExperimentalInquiryForm({ initialEventType = "" }: { initialEventType?: string }) {
  // For navigation after event type selection
  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Map the URL parameter to a valid event type
  const mappedEventType = initialEventType ? mapUrlToEventType(initialEventType) : null;
  
  // If we're at the landing page without an event type, only show event type selection
  if (!initialEventType && !mappedEventType) {
    return (
      <>
        <Helmet>
          <title>EXPERIMENTAL - Event Inquiry | Home Bites Catering Services</title>
          <meta name="description" content="Experimental version - Select your event type and get a personalized catering quote. We offer services for weddings, corporate events, birthdays, and more special occasions." />
        </Helmet>
        
        <div className="min-h-screen bg-gray-50 pb-12">
          <div className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-6 mb-8">
            <div className="container mx-auto">
              <h1 className="text-5xl font-extrabold mb-4 text-center">Home Bites Catering Services</h1>
              <p className="text-xl text-center max-w-2xl mx-auto">
                <span className="bg-white/20 px-2 py-1 rounded">EXPERIMENTAL VERSION</span> - Exceptional cuisine for extraordinary moments
              </p>
            </div>
          </div>
          
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-3 text-gray-900">
                Let's Plan Your Perfect Event
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Select the type of event you're planning, and we'll customize our services to match your vision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {eventTypes.map((event) => (
                <Card 
                  key={event.type}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                  onClick={() => navigate(`/experimental-inquiry/${event.type.toLowerCase().replace(/ /g, '-')}`)}
                >
                  <div className={`bg-gradient-to-r ${event.gradient} p-8 text-white text-center`}>
                    {event.icon}
                    <h3 className="text-2xl font-bold mb-1">{event.type}</h3>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-lg mb-4">{event.description}</p>
                    <Button 
                      className="w-full mt-2 py-6 text-lg transition-all duration-300"
                      variant="outline"
                      size="lg"
                    >
                      Select This Event
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // If we have an event type, continue with the full form
  const methods = useForm<EventInquiryFormData>({
    defaultValues: {
      eventType: mappedEventType,
      billingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
      },
      contactName: {
        firstName: "",
        lastName: "",
      },
      email: "",
      phone: "",
      eventDate: "",
      hasPromoCode: false,
      venueSecured: false,
      hasCocktailHour: false,
      hasMainCourse: true,
      guestCount: 50,
      serviceStyle: "",
      requestedTheme: "",
      selectedPackages: {}, // Theme-specific package selections
      menuSelections: {
        proteins: [],
        sides: [],
        salads: [],
        salsas: [],
        desserts: [],
        addons: []
      },
      wantsAppetizers: true,
      // Initialize with empty arrays for each category
      appetizers: {
        tea_sandwiches: [],
        shooters: [],
        canapes: [],
        spreads: []
      },
      appetizerService: "stationary", // Default service style
      // Initialize horsDoeurvesSelections with empty structure
      horsDoeurvesSelections: {
        serviceStyle: "stationary",
        categories: {}
      },
      dietaryRestrictions: {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        dairy_free: false,
        nut_free: false,
        shellfish_allergy: false,
        kosher: false,
        halal: false
      },
      dietaryCount: {
        vegetarian: 0,
        vegan: 0,
        gluten_free: 0,
        dairy_free: 0,
        nut_free: 0,
        shellfish_allergy: 0,
        kosher: 0,
        halal: 0
      },
      dietaryNotes: "",
      dessertSelections: {},
      beverageServiceChoice: undefined,
      nonAlcoholicBeverageSelections: {},
      alcoholicBeverageSelections: {
        alcoholTypes: {},
        otherBarEquipment: {}
      },
      wantsEquipmentRental: undefined,
      equipment: {
        furniture: {},
        linens: {},
        servingWare: {}
      }
    }
  });
  
  // Get form state
  const { watch, setValue } = methods;
  const eventType = watch("eventType");
  const requestedTheme = watch("requestedTheme");
  const guestCount = watch("guestCount");
  
  // State for tracking the current step
  // If a valid event type was mapped from the URL, start at the basicInfo step
  const [currentStep, setCurrentStep] = useState<FormStep>(
    mappedEventType ? "basicInfo" : "eventType"
  );
  
  // Calculate step number and total steps
  const steps: FormStep[] = [
    "eventType", 
    "basicInfo", 
    "eventDetails", 
    "menuSelection", // Keep menuSelection as step 4 (for regular themes)
    "appetizerQuestion", // New step to ask if user wants appetizers
    "appetizers",    // Only show if user wants appetizers
    "foodTruckMenu", // Food Truck menu step (will be conditionally shown)
    "sandwichFactoryMenu", // Sandwich Factory menu step (will be conditionally shown)
    "breakfastMenu", // Breakfast/Brunch menu step (will be conditionally shown)
    "dessertQuestion", // Ask if user wants desserts
    "desserts",      // Only show if user wants desserts
    "beverageQuestion", // Initial question about beverage services
    "nonAlcoholicBeverages", // Step for non-alcoholic beverage selection
    "alcoholicBeverages", // Step for alcoholic beverage selection
    "equipment",
    "dietaryRestrictions", // Added new step for dietary restrictions
    "review"
  ];
  
  const currentStepNumber = steps.indexOf(currentStep) + 1;
  const totalSteps = steps.length;
  
  // Define friendly step names for the progress indicator
  const stepLabels = useMemo(() => ({
    "eventType": "Event Type",
    "basicInfo": "Basic Info",
    "eventDetails": "Event Details",
    "menuSelection": "Menu",
    "appetizerQuestion": "Appetizers",
    "appetizers": "Select Appetizers",
    "dessertQuestion": "Desserts",
    "desserts": "Select Desserts",
    "beverageQuestion": "Beverages",
    "nonAlcoholicBeverages": "Drinks",
    "alcoholicBeverages": "Bar Service",
    "equipmentQuestion": "Equipment",
    "equipment": "Rental Items",
    "dietaryRestrictions": "Dietary Needs",
    "review": "Review"
  }), []);
  
  // Handler for event type selection
  const handleEventTypeSelect = (type: EventType) => {
    setValue("eventType", type);
    setCurrentStep("basicInfo");
  };
  
  // Navigation handlers
  const handlePrevious = () => {
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      let targetPreviousStep = steps[currentIndex - 1]; // Default previous step by index

      // Get current form values that might influence back navigation
      const serviceStyle = watch("serviceStyle");
      const requestedTheme = watch("requestedTheme");

      // Case 1: Coming back from specialized menus selected in eventDetails
      if (
        currentStep === "breakfastMenu" ||
        currentStep === "sandwichFactoryMenu" ||
        currentStep === "foodTruckMenu"
      ) {
        targetPreviousStep = "eventDetails";
        // Optional: Consider what form values to reset here. For example:
        // if (currentStep === "breakfastMenu") {
        //   setValue("breakfastMenuSelections", { /* initial breakfast selections */ });
        // }
        // You might also choose to clear 'requestedTheme' if it was set by one of these.
      }
      // Case 2: Coming back from the main appetizers selection step
      else if (currentStep === "appetizers") {
        if (serviceStyle === "cocktail_party") {
          // If service was "cocktail_party", the user jumped from eventDetails to appetizers
          targetPreviousStep = "eventDetails";
          // setValue("wantsAppetizers", true); // It was set to true to get here, decide if it should be reset
        } else if (requestedTheme === "hors_doeuvres") {
          // If theme was "hors_doeuvres", the user jumped from menuSelection to appetizers
          targetPreviousStep = "menuSelection";
          // setValue("wantsAppetizers", true); // Similar consideration for reset
        }
        // If neither of the above, they came from "appetizerQuestion",
        // so the default targetPreviousStep (which would be "appetizerQuestion") is correct.
      }
      // Case 3: Coming back from the menuSelection step
      else if (currentStep === "menuSelection") {
        // If the step before menuSelection is eventDetails, clear theme choices.
        if (targetPreviousStep === "eventDetails") {
          setValue("requestedTheme", "");
          setValue("selectedPackages", {});
          setValue("menuSelections", {
            proteins: [], sides: [], salads: [], salsas: [], desserts: [], addons: []
          });
        }
        // Otherwise, targetPreviousStep (which would be eventDetails if that's the one before it) is fine.
      }
      // Case 4: Coming back from appetizerQuestion
      // (No special logic needed here if the default previous step is menuSelection or eventDetails as appropriate,
      // unless a specific jump led to appetizerQuestion that needs a special jump back).

      setCurrentStep(targetPreviousStep);
    }
  };
  
  const handleNext = () => {
    const currentIndex = steps.indexOf(currentStep);
    const currentFormTheme = watch("requestedTheme");
    // We will set wantsAppetizers explicitly for cocktail_party
    const serviceStyle = watch("serviceStyle");

    if (currentIndex < steps.length - 1) {
      let nextStep = steps[currentIndex + 1];

      if (currentStep === "eventDetails") {
        console.log("Service style selected:", serviceStyle);
        if (serviceStyle === "food_truck") {
          const foodTruckIndex = steps.indexOf("foodTruckMenu");
          nextStep = (foodTruckIndex > -1) ? "foodTruckMenu" : "menuSelection";
        } else if (serviceStyle === "sandwich_factory") {
          setValue("requestedTheme", "sandwich_factory");
          const sandwichFactoryIndex = steps.indexOf("sandwichFactoryMenu");
          nextStep = (sandwichFactoryIndex > -1) ? "sandwichFactoryMenu" : "menuSelection";
        } else if (serviceStyle === "breakfast_brunch") {
          setValue("requestedTheme", "breakfast_brunch");
          const breakfastMenuIndex = steps.indexOf("breakfastMenu");
          nextStep = (breakfastMenuIndex > -1) ? "breakfastMenu" : "menuSelection";
        } else if (serviceStyle === "cocktail_party") { // <<< --- MODIFIED LOGIC HERE
          setValue("wantsAppetizers", true); // Explicitly set wantsAppetizers to true
          const appetizersIndex = steps.indexOf("appetizers");
          if (appetizersIndex > -1) {
            nextStep = "appetizers"; // Go directly to the appetizers selection step
          } else {
            // Fallback if appetizers step somehow doesn't exist
            nextStep = "menuSelection"; // Should not happen if steps array is correct
          }
        } else {
          // For other service styles (catering_buffet, family_style, plated_dinner), go to menuSelection
          nextStep = "menuSelection";
        }
      } else if (currentStep === "menuSelection") {
        if (currentFormTheme === "hors_doeuvres") {
          // If theme is hors_doeuvres, it implies appetizers are the main course.
          setValue("wantsAppetizers", true); // Ensure this is set
          const appetizersIndex = steps.indexOf("appetizers");
          if (appetizersIndex > -1) {
            nextStep = "appetizers";
          }
          // Otherwise, it will default to appetizerQuestion by falling through
        }
        // For all other themes, it will proceed to steps[currentIndex + 1] which is "appetizerQuestion" by default.
      } else if (currentStep === "appetizerQuestion") {
        const wantsAppetizers = watch("wantsAppetizers"); // Re-check here as it's user-configurable on this step
        if (!wantsAppetizers) { // Only skip if they explicitly say no AND it's not a cocktail party (which bypasses this question now)
          if (serviceStyle === "food_truck") {
            const foodTruckIndex = steps.indexOf("foodTruckMenu");
            nextStep = (foodTruckIndex > -1) ? "foodTruckMenu" : "dessertQuestion";
          } else {
            const dessertQuestionIndex = steps.indexOf("dessertQuestion");
            nextStep = (dessertQuestionIndex > -1) ? "dessertQuestion" : "review";
          }
        }
        // If wantsAppetizers is true, it defaults to steps[currentIndex + 1] which is "appetizers"
        // The serviceStyle === "cocktail_party" case will no longer reach this step if "eventDetails" routes it directly.
      } else if (currentStep === "appetizers") {
        // After appetizer selection, decide where to go
        if (serviceStyle === "food_truck") {
          const foodTruckIndex = steps.indexOf("foodTruckMenu");
          nextStep = (foodTruckIndex > -1) ? "foodTruckMenu" : "dessertQuestion";
        } else {
          const dessertQuestionIndex = steps.indexOf("dessertQuestion");
          nextStep = (dessertQuestionIndex > -1) ? "dessertQuestion" : "review";
        }
      } else if (currentStep === "sandwichFactoryMenu" || currentStep === "foodTruckMenu" || currentStep === "breakfastMenu") {
        const dessertQuestionIndex = steps.indexOf("dessertQuestion");
        nextStep = (dessertQuestionIndex > -1) ? "dessertQuestion" : "beverageQuestion";
      } else if (currentStep === "dessertQuestion") {
        const wantsDesserts = watch("wantsDesserts");
        if (wantsDesserts) {
          const dessertsIndex = steps.indexOf("desserts");
          nextStep = (dessertsIndex > -1) ? "desserts" : "beverageQuestion";
        } else {
          const beverageQuestionIndex = steps.indexOf("beverageQuestion");
          nextStep = (beverageQuestionIndex > -1) ? "beverageQuestion" : "equipment";
        }
      } else if (currentStep === "beverageQuestion") {
        // Handle the beverage question selection to determine next step
        const beverageChoice = watch("beverageServiceChoice");
        if (beverageChoice === "non-alcoholic") {
          // Go to non-alcoholic beverages page
          nextStep = "nonAlcoholicBeverages";
        } else if (beverageChoice === "alcoholic") {
          // Go to alcoholic beverages page
          nextStep = "alcoholicBeverages";
        } else if (beverageChoice === "none") {
          // Skip beverage pages and go to equipment question
          nextStep = "equipmentQuestion";
        }
      } else if (currentStep === "nonAlcoholicBeverages" || currentStep === "alcoholicBeverages") {
        // After completing beverage selection, go to equipment question
        nextStep = "equipmentQuestion";
      } else if (currentStep === "equipmentQuestion") {
        // Handle equipment question choice
        const wantsEquipmentRental = watch("wantsEquipmentRental");
        if (wantsEquipmentRental) {
          // If user wants equipment, go to detailed equipment selection
          nextStep = "equipment";
        } else {
          // If user doesn't want equipment, skip to dietary restrictions
          nextStep = "dietaryRestrictions";
        }
      }
      setCurrentStep(nextStep);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>EXPERIMENTAL - Event Inquiry | Home Bites Catering Services</title>
        <meta name="description" content="Experimental version - Tell us about your event and get a personalized catering quote. We offer services for weddings, corporate events, birthdays, and more special occasions." />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 pb-12">
        <PublicFormHeader />
        
        <FormProvider {...methods}>
          <Form {...methods}>
            <form noValidate className="space-y-8">
              {/* Animated Progress Indicator - only show after event type selection */}
              {currentStep !== "eventType" && (
                <div className="container mx-auto px-4 max-w-4xl">
                  <ProgressIndicator 
                    currentStep={currentStep}
                    steps={steps.filter(step => 
                      !["foodTruckMenu", "sandwichFactoryMenu", "breakfastMenu"].includes(step)
                    )} 
                    stepLabels={stepLabels}
                  />
                </div>
              )}
              
              {/* Step content */}
              {currentStep === "eventType" && (
                <EventTypeSelectionStep
                  onSelectEventType={handleEventTypeSelect}
                  selectedEventType={eventType}
                />
              )}
              
              {currentStep === "basicInfo" && eventType && (
                <BasicInformationStep
                  eventType={eventType}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "eventDetails" && eventType && (
                <EventDetailsStep
                  eventType={eventType}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "menuSelection" && eventType && (
                <MenuSelectionStep
                  selectedTheme={requestedTheme}
                  guestCount={guestCount}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "appetizerQuestion" && eventType && (
                <AppetizersQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "appetizers" && eventType && (
                <AppetizersStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "foodTruckMenu" && eventType && (
                <FoodTruckMenu
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onSkipDessert={() => {
                    // If user doesn't want desserts, skip to beverage question step
                    const nextStepIndex = steps.indexOf("beverageQuestion");
                    setCurrentStep(steps[nextStepIndex]);
                  }}
                />
              )}
              
              {currentStep === "sandwichFactoryMenu" && eventType && (
                <SandwichFactoryMenuStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  guestCount={watch("guestCount") || 0}
                />
              )}
              
              {currentStep === "breakfastMenu" && eventType && (
                <BreakfastMenuStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  guestCount={watch("guestCount") || 0}
                />
              )}
              
              {currentStep === "dessertQuestion" && eventType && (
                <DessertQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "desserts" && eventType && (
                <DessertsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "beverageQuestion" && eventType && (
                <BeverageQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "nonAlcoholicBeverages" && eventType && (
                <NonAlcoholicBeveragesStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "alcoholicBeverages" && eventType && (
                <AlcoholicBeveragesStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "equipmentQuestion" && eventType && (
                <EquipmentQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "equipment" && eventType && (
                <EquipmentStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "dietaryRestrictions" && eventType && (
                <DietaryRestrictionsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {/* Additional steps will be rendered here */}
              {/* We've implemented multiple steps of the form */}
              
              {currentStep !== "eventType" && 
               currentStep !== "basicInfo" && 
               currentStep !== "eventDetails" &&
               currentStep !== "menuSelection" &&
               currentStep !== "appetizerQuestion" &&
               currentStep !== "appetizers" &&
               currentStep !== "desserts" &&
               currentStep !== "dietaryRestrictions" && (
                <div className="container mx-auto px-4 max-w-3xl text-center py-12">
                  <h2 className="text-2xl font-bold">Step {currentStepNumber} - {currentStep}</h2>
                  <p className="text-gray-600 mt-4">This step is under construction...</p>
                  
                  <div className="flex justify-between mt-8">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handlePrevious}
                      className="flex items-center"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      className="flex items-center"
                    >
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </FormProvider>
      </div>
    </>
  );
}