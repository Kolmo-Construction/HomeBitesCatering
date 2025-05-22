import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, ChevronLeft, Check, Building, Phone,
  MapPin, Clock, Send, Users2, LayoutGrid, Radio, CircleOff, X
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

// Import custom components
import MenuSelectionStep from "@/components/MenuSelectionStep";
import FoodTruckMenu from "@/components/FoodTruckMenu";

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
import { appetizerData, horsDoeurvesData } from "@/data/appetizerInfo";
import { themeMenuData } from "@/data/themeMenuInfo";

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

// Step 1: Contact Information Component
const ContactInformationStep = ({ onNext }: { onNext: () => void }) => {
  const { control } = useFormContext<EventInquiryFormData>();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Contact Information</h2>
        <p className="text-gray-600">Please provide your contact details below</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                <Input type="tel" placeholder="(123) 456-7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company/Organization Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Company Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="howDidYouHearAboutUs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How did you hear about us?</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="google">Google Search</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="friend">Friend/Family</SelectItem>
                  <SelectItem value="event">Previous Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="pt-4">
          <Button 
            type="button" 
            onClick={onNext}
            className="w-full md:w-auto float-right flex items-center"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step 2: Event Details Component
const EventDetailsStep = ({ 
  onPrevious, 
  onNext,
  onSelectEventType 
}: { 
  onPrevious: () => void; 
  onNext: () => void;
  onSelectEventType: (type: EventType) => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  
  // Watch values to dynamically update the form
  const eventDate = watch("eventDate");
  const eventType = watch("eventType");
  const guestCount = watch("guestCount");
  
  const handleEventTypeSelect = (type: EventType) => {
    setValue("eventType", type);
    onSelectEventType(type);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Event Details</h2>
        <p className="text-gray-600">Tell us about your upcoming event</p>
      </div>
      
      <div className="space-y-6">
        <FormField
          control={control}
          name="eventDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {eventTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`
                      flex flex-col items-center justify-between p-4 border rounded-lg cursor-pointer transition-all
                      ${field.value === type.value 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                        : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'}
                    `}
                    onClick={() => handleEventTypeSelect(type.value as EventType)}
                  >
                    {type.icon}
                    <span className="mt-2 text-center font-medium">{type.label}</span>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="guestCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Guest Count</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1}
                  placeholder="50" 
                  {...field} 
                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="venueName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Name/Location</FormLabel>
              <FormControl>
                <Input placeholder="Venue Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="venueAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue Address</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Full venue address including city, state, and zip code" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="bg-blue-50 p-4 rounded-lg mt-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">What happens next?</h3>
          <p className="text-blue-600">
            After providing your event details, you'll be able to select your preferred menu options
            in the next step. This will help us create a customized quote for your event.
          </p>
        </div>
        
        <div className="flex justify-between pt-4">
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
            disabled={!eventDate || !eventType || !guestCount}
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step 3: Service Type Selection Component
const ServiceTypeStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void; 
  onNext: () => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  
  // Watch the selected service type
  const serviceType = watch("serviceType");
  
  // Predefined service types with icons
  const serviceTypes = [
    { 
      value: "catering_buffet", 
      label: "Catering Buffet", 
      description: "Full-service buffet with staff for setup, service, and cleanup",
      icon: <LayoutGrid className="h-12 w-12 text-primary" />
    },
    { 
      value: "food_truck", 
      label: "Food Truck Service", 
      description: "Our food truck brings fresh, made-to-order food to your event",
      icon: <Building className="h-12 w-12 text-primary" />
    },
    { 
      value: "cocktail_appetizers", 
      label: "Cocktail - Appetizers Only", 
      description: "Selection of appetizers and hors d'oeuvres for standing reception",
      icon: <Radio className="h-12 w-12 text-primary" />
    },
    { 
      value: "breakfast_brunch", 
      label: "Breakfast/Brunch Buffet", 
      description: "Morning and midday options for breakfast and brunch events",
      icon: <Clock className="h-12 w-12 text-primary" />
    },
    { 
      value: "sandwich_factory", 
      label: "Sandwich Factory Buffet", 
      description: "Variety of sandwiches with sides for casual dining",
      icon: <Users2 className="h-12 w-12 text-primary" />
    }
  ];
  
  // Handle service type selection
  const handleServiceTypeSelect = (type: string) => {
    setValue("serviceType", type);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Service Type</h2>
        <p className="text-gray-600">Select the service style for your event</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-8">
        {serviceTypes.map((type) => (
          <Card
            key={type.value}
            className={`
              cursor-pointer transition-all hover:shadow-md
              ${serviceType === type.value ? 'ring-2 ring-primary border-primary' : ''}
            `}
            onClick={() => handleServiceTypeSelect(type.value)}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="mr-4">
                  {type.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{type.label}</h3>
                  <p className="text-gray-500 text-sm">{type.description}</p>
                </div>
                <div className="ml-4">
                  {serviceType === type.value ? (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-between">
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
          disabled={!serviceType}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Step 5: Food Truck Menu Component (Conditionally rendered)
const FoodTruckMenuStep = ({ 
  guestCount,
  onPrevious, 
  onNext 
}: { 
  guestCount: number;
  onPrevious: () => void; 
  onNext: () => void;
}) => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Food Truck Menu</h2>
        <p className="text-gray-600">Customize your food truck menu options</p>
      </div>
      
      <FoodTruckMenu 
        guestCount={guestCount} 
        onGoBack={onPrevious}
        onContinue={onNext}
      />
    </div>
  );
};

// Step 5: Hors D'oeuvres Selection Component (Conditionally rendered)
const HorsDoeurvesStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void; 
  onNext: () => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  
  // Local state for managing selections
  const [selectedHorsDoeuvres, setSelectedHorsDoeuvres] = useState<string[]>([]);
  
  // Watch the number of guests
  const guestCount = watch("guestCount") || 0;
  
  // Handle hors d'oeuvres selection/deselection
  const toggleHorsDoeuvre = (id: string) => {
    setSelectedHorsDoeuvres(prev => {
      const newSelection = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id];
      
      // Update form values
      setValue("horsDoeurvesSelections", newSelection);
      
      return newSelection;
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Hors D'oeuvres Selection</h2>
        <p className="text-gray-600">
          Choose your appetizers. We recommend selecting 3-5 options.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {horsDoeurvesData.map((item) => (
            <div 
              key={item.id}
              className={`
                border rounded-lg p-4 cursor-pointer transition-all
                ${selectedHorsDoeuvres.includes(item.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'}
              `}
              onClick={() => toggleHorsDoeuvre(item.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <div>
                  {selectedHorsDoeuvres.includes(item.id) ? (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
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
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step 6: Dessert Selection Component
const DessertSelectionStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void; 
  onNext: () => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  
  // Watch the current guest count
  const guestCount = watch("guestCount") || 0;
  
  // Watch currently selected desserts
  const selectedDesserts = watch("dessertSelections") || [];
  
  // Function to handle lot size selection for a dessert item
  const handleLotSelect = (lotSize: DessertLotSize, item: DessertItem) => {
    // Check if this dessert is already selected
    const existingIndex = selectedDesserts.findIndex(
      (d) => d.id === item.id
    );

    // Create a new selection array
    const newSelections = [...selectedDesserts];
    
    if (existingIndex >= 0) {
      // Update existing selection
      newSelections[existingIndex] = {
        ...newSelections[existingIndex],
        lotSize: lotSize
      };
    } else {
      // Add new selection
      newSelections.push({
        id: item.id,
        name: item.name,
        lotSize: lotSize
      });
    }
    
    // Update form state
    setValue("dessertSelections", newSelections);
  };
  
  // Function to remove a dessert from selection
  const removeDessert = (itemId: string) => {
    const newSelections = selectedDesserts.filter(d => d.id !== itemId);
    setValue("dessertSelections", newSelections);
  };
  
  // Check if a specific dessert is selected and what lot size
  const getDessertLotSize = (itemId: string): DessertLotSize | null => {
    const dessert = selectedDesserts.find(d => d.id === itemId);
    return dessert ? dessert.lotSize : null;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dessert Selection</h2>
        <p className="text-gray-600">Choose desserts for your event (optional)</p>
      </div>
      
      <div className="space-y-8">
        {dessertItems.map((item) => (
          <div key={item.id} className="border rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
              
              {getDessertLotSize(item.id) && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-700 mt-2 md:mt-0"
                  onClick={() => removeDessert(item.id)}
                >
                  <X className="h-4 w-4 mr-1" /> Remove
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {dessertLotSizes.map((lotSize) => (
                <div
                  key={`${item.id}-${lotSize}`}
                  className={`
                    border rounded-md p-3 text-center cursor-pointer transition-all
                    ${getDessertLotSize(item.id) === lotSize 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => handleLotSelect(lotSize, item)}
                >
                  <div className="font-medium">{lotSize} pieces</div>
                  <div className="text-sm text-gray-500">
                    Serves {Math.ceil(parseInt(lotSize) / 2)} - {parseInt(lotSize)} people
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
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
    </div>
  );
};

// Step 7: Dietary Restrictions Component
const DietaryRestrictionsStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void; 
  onNext: () => void;
}) => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  
  // Watch for the "needDietaryAccommodations" field
  const needDietaryAccommodations = watch("needDietaryAccommodations");
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dietary Restrictions</h2>
        <p className="text-gray-600">Help us accommodate your guests' dietary needs</p>
      </div>
      
      <div className="space-y-6">
        <FormField
          control={control}
          name="needDietaryAccommodations"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Do any of your guests have dietary restrictions?
                </FormLabel>
                <FormDescription>
                  We can accommodate various dietary needs
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {needDietaryAccommodations && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="vegetarianCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vegetarian Guests</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        placeholder="0" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="veganCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vegan Guests</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        placeholder="0" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="glutenFreeCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gluten-Free Guests</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        placeholder="0" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="dairyFreeCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dairy-Free Guests</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        placeholder="0" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={control}
              name="otherDietaryRestrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Dietary Restrictions or Allergies</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please specify any other dietary restrictions or allergies we should be aware of" 
                      className="resize-none" 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
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
    </div>
  );
};

// Step 8: Additional Information Component
const AdditionalInformationStep = ({ 
  onPrevious, 
  onSubmit 
}: { 
  onPrevious: () => void; 
  onSubmit: () => void;
}) => {
  const { control } = useFormContext<EventInquiryFormData>();
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Additional Information</h2>
        <p className="text-gray-600">Any other details you'd like us to know about your event</p>
      </div>
      
      <div className="space-y-6">
        <FormField
          control={control}
          name="additionalInformation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Share any other information that might help us prepare the perfect menu for your event" 
                  className="resize-none" 
                  rows={6}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="budgetRange"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget Range (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a budget range" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="under_2000">Under $2,000</SelectItem>
                  <SelectItem value="2000_5000">$2,000 - $5,000</SelectItem>
                  <SelectItem value="5000_10000">$5,000 - $10,000</SelectItem>
                  <SelectItem value="10000_20000">$10,000 - $20,000</SelectItem>
                  <SelectItem value="over_20000">Over $20,000</SelectItem>
                  <SelectItem value="not_sure">Not sure yet</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="hearBackPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How would you prefer we contact you?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="email" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Email
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="phone" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Phone Call
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="text" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Text Message
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
            onClick={onSubmit}
            className="flex items-center bg-primary"
          >
            Submit Inquiry <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Form Component
const ExperimentalInquiryForm = ({ initialEventType = "" }: { initialEventType?: string }) => {
  // Validate the incoming event type
  const validatedEventType = validateEventType(initialEventType);
  
  // Form states
  const [currentStep, setCurrentStep] = useState<FormStep>("contact_info");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Set up form with default values
  const form = useForm<EventInquiryFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
      howDidYouHearAboutUs: "",
      eventDate: "",
      startTime: "",
      endTime: "",
      eventType: validatedEventType,
      guestCount: 0,
      venueName: "",
      venueAddress: "",
      serviceType: "",
      requestedTheme: "taste_of_italy",
      horsDoeurvesSelections: [],
      dessertSelections: [],
      needDietaryAccommodations: false,
      vegetarianCount: 0,
      veganCount: 0,
      glutenFreeCount: 0,
      dairyFreeCount: 0,
      otherDietaryRestrictions: "",
      additionalInformation: "",
      budgetRange: "",
      hearBackPreference: "email"
    }
  });
  
  // Watch relevant form values for conditional rendering
  const eventType = form.watch("eventType");
  const serviceType = form.watch("serviceType");
  const guestCount = form.watch("guestCount");
  const requestedTheme = form.watch("requestedTheme");
  
  // Update step sequence based on service type
  const getSteps = (): FormStep[] => {
    const baseSteps: FormStep[] = [
      "contact_info",
      "event_details",
      "service_type"
    ];
    
    // If service type is food truck, show the food truck menu
    if (serviceType === "food_truck") {
      return [
        ...baseSteps,
        "food_truck_menu",
        "dessert_selection",
        "dietary_restrictions",
        "additional_info"
      ];
    }
    
    // If service type is cocktail party, show hors d'oeuvres selection
    if (serviceType === "cocktail_appetizers") {
      return [
        ...baseSteps,
        "hors_doeuvres",
        "dessert_selection",
        "dietary_restrictions",
        "additional_info"
      ];
    }
    
    // Default step sequence with menu selection
    return [
      ...baseSteps,
      "menu_selection",
      "dessert_selection",
      "dietary_restrictions",
      "additional_info"
    ];
  };
  
  // Get the actual steps based on service type
  const steps = getSteps();
  
  // Calculate total steps for progress display
  const totalSteps = steps.length;
  
  // Get current step index
  const currentStepIndex = steps.findIndex(step => step === currentStep) + 1;
  
  // Handle next step navigation
  const handleNext = () => {
    const currentIndex = steps.findIndex(step => step === currentStep);
    
    if (currentIndex < steps.length - 1) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      
      // Move to next step
      setCurrentStep(steps[currentIndex + 1]);
    }
  };
  
  // Handle previous step navigation
  const handlePrevious = () => {
    const currentIndex = steps.findIndex(step => step === currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };
  
  // Handle event type selection in step 2
  const handleEventTypeSelect = (type: EventType) => {
    form.setValue("eventType", type);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      // Get all form data
      const formData = form.getValues();
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      setSubmitSuccess(true);
      setSubmitting(false);
      
      // Log data in development (would be sent to API in production)
      console.log("Form submitted:", formData);
    } catch (error) {
      setSubmitError("There was an error submitting your inquiry. Please try again.");
      setSubmitting(false);
    }
  };
  
  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case "contact_info":
        return <ContactInformationStep onNext={handleNext} />;
      case "event_details":
        return (
          <EventDetailsStep 
            onPrevious={handlePrevious} 
            onNext={handleNext}
            onSelectEventType={handleEventTypeSelect}
          />
        );
      case "service_type":
        return <ServiceTypeStep onPrevious={handlePrevious} onNext={handleNext} />;
      case "menu_selection":
        return (
          <MenuSelectionStep
            selectedTheme={requestedTheme}
            guestCount={guestCount}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        );
      case "food_truck_menu":
        return (
          <FoodTruckMenuStep 
            guestCount={guestCount}
            onPrevious={handlePrevious} 
            onNext={handleNext} 
          />
        );
      case "hors_doeuvres":
        return <HorsDoeurvesStep onPrevious={handlePrevious} onNext={handleNext} />;
      case "dessert_selection":
        return <DessertSelectionStep onPrevious={handlePrevious} onNext={handleNext} />;
      case "dietary_restrictions":
        return <DietaryRestrictionsStep onPrevious={handlePrevious} onNext={handleNext} />;
      case "additional_info":
        return <AdditionalInformationStep onPrevious={handlePrevious} onSubmit={handleSubmit} />;
      default:
        return <ContactInformationStep onNext={handleNext} />;
    }
  };
  
  // Render success message after submission
  const renderSuccessMessage = () => (
    <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">Thank You!</h2>
        <p className="mt-2 text-lg text-gray-600">
          Your catering inquiry has been submitted successfully. We'll be in touch soon!
        </p>
        <div className="mt-6">
          <Button
            onClick={() => {
              // Reset form and state for a new inquiry
              form.reset();
              setCurrentStep("contact_info");
              setCompletedSteps([]);
              setSubmitSuccess(false);
            }}
            className="bg-primary"
          >
            Submit Another Inquiry
          </Button>
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      <Helmet>
        <title>Catering Inquiry | Home Bites Catering Services</title>
        <meta 
          name="description" 
          content="Submit a catering inquiry for your next event. We offer a variety of menu options for weddings, corporate events, and more."
        />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 pb-12">
        <PublicFormHeader />
        
        <div className="container mx-auto px-4">
          {!submitSuccess ? (
            <FormProvider {...form}>
              {/* Progress Bar */}
              <FormProgressBar 
                currentStep={currentStepIndex} 
                totalSteps={totalSteps}
                completedSteps={completedSteps}
              />
              
              {/* Current Step */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {renderStep()}
              </div>
              
              {/* Error Message */}
              {submitError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {submitError}
                </div>
              )}
              
              {/* Submitting Indicator */}
              {submitting && (
                <div className="mt-6 text-center">
                  <p className="text-gray-600">Submitting your inquiry...</p>
                </div>
              )}
            </FormProvider>
          ) : (
            renderSuccessMessage()
          )}
        </div>
      </div>
    </>
  );
};

export default ExperimentalInquiryForm;