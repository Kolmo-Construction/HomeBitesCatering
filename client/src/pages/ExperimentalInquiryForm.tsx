import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cake, Calendar, Gift, Users, Truck, Wine, Utensils, 
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Import data types and external data files
import type { 
  EventType, 
  FormStep, 
  DessertLotSize, 
  DessertItem, 
  EventInquiryFormData 
} from "../data/experimental-inquiry/types";
import { dessertItems, dessertLotSizes } from "../data/experimental-inquiry/desserts";
import { eventTypes } from "../data/experimental-inquiry/eventTypes";
import { steps } from "../data/experimental-inquiry/formSteps";
import { serviceStyleOptions, themeOptions } from "../data/experimental-inquiry/formOptions";
import { themeMenuData } from "../data/experimental-inquiry/themeMenuData";

// Form header component
const FormHeader = ({ 
  currentStep, 
  steps, 
  currentStepIndex, 
  previousStep 
}: { 
  currentStep: FormStep; 
  steps: FormStep[]; 
  currentStepIndex: number; 
  previousStep: () => void; 
}) => {
  let title = "";
  let subtitle = "";
  
  // Set title and subtitle based on current step
  switch (currentStep) {
    case "eventType":
      title = "What type of event are you planning?";
      subtitle = "Select an event type to get started";
      break;
    case "basicInfo":
      title = "Let's gather some basic information";
      subtitle = "Tell us about yourself and your event";
      break;
    case "eventDetails":
      title = "Event Details";
      subtitle = "Tell us more about your event";
      break;
    case "menuSelection":
      title = "Menu Selection";
      subtitle = "Choose a culinary theme and service style";
      break;
    case "appetizerQuestion":
      title = "Appetizers";
      subtitle = "Would you like to include appetizers?";
      break;
    case "appetizers":
      title = "Appetizer Selection";
      subtitle = "Choose your appetizers";
      break;
    case "desserts":
      title = "Dessert Selection";
      subtitle = "Add some sweet treats to your menu";
      break;
    case "beverages":
      title = "Beverage Package";
      subtitle = "Choose your beverage options";
      break;
    case "review":
      title = "Review Your Information";
      subtitle = "Make sure everything is correct before submitting";
      break;
    default:
      title = "Event Inquiry";
      subtitle = "Tell us about your event";
  }
  
  // Calculate progress percentage
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <Button 
          variant="ghost" 
          onClick={previousStep}
          disabled={currentStep === "eventType"}
          className={currentStep === "eventType" ? "invisible" : ""}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-sm text-gray-500">
          Step {currentStepIndex + 1} of {steps.length}
        </div>
      </div>
      
      <Progress value={progress} className="h-2 mb-4" />
      
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
};

// Progress bar component
const CustomProgressBar = ({ currentStep, steps }: { currentStep: FormStep; steps: FormStep[] }) => {
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <div className="flex justify-between w-full mb-8 relative">
      {/* Progress line */}
      <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200">
        <div 
          className="h-full bg-primary" 
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>
      </div>
      
      {/* Step circles */}
      {steps.map((step, index) => (
        <div 
          key={step} 
          className={`relative z-10 flex flex-col items-center`}
        >
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center
              ${index <= currentIndex ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}
          >
            {index < currentIndex ? <Check size={16} /> : index + 1}
          </div>
        </div>
      ))}
    </div>
  );
};

// Step 1: Event Type Selection Component
const EventTypeSelection = ({ 
  onSelectEventType 
}: { 
  onSelectEventType: (type: EventType) => void;
}) => {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
        {eventTypes.map((item) => (
          <EventTypeCard 
            key={item.type} 
            eventType={item}
            onSelect={() => onSelectEventType(item.type)}
          />
        ))}
      </div>
    </div>
  );
};

// Component for individual event type cards
const EventTypeCard = ({ 
  eventType, 
  onSelect 
}: { 
  eventType: { 
    type: EventType; 
    description: string; 
    icon: JSX.Element; 
    gradient: string; 
    image?: string; 
  }; 
  onSelect: () => void; 
}) => {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow hover:-translate-y-1 transition-transform h-full"
      onClick={onSelect}
    >
      <div className={`bg-gradient-to-r ${eventType.gradient} p-6 flex flex-col items-center text-center`}>
        {eventType.icon}
        <CardTitle className="text-white">{eventType.type}</CardTitle>
      </div>
      <CardContent className="p-6">
        <p className="text-gray-600">{eventType.description}</p>
        <Button className="w-full mt-4" onClick={onSelect}>
          Select
        </Button>
      </CardContent>
    </Card>
  );
};

// Basic Info Step Component
const BasicInfoStep = () => {
  const { control } = useFormContext<EventInquiryFormData>();
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="firstName"
          rules={{ required: "First name is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="First name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lastName"
          rules={{ required: "Last name is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Last name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="email"
        rules={{ 
          required: "Email is required",
          pattern: {
            value: /\S+@\S+\.\S+/,
            message: "Please enter a valid email"
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="your@email.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="phone"
        rules={{ required: "Phone number is required" }}
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
            <FormLabel>Company Name (if applicable)</FormLabel>
            <FormControl>
              <Input placeholder="Company name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="howDidYouHear"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How did you hear about us?</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="friend">Friend/Family</SelectItem>
                <SelectItem value="venue">Venue Recommendation</SelectItem>
                <SelectItem value="event_planner">Event Planner</SelectItem>
                <SelectItem value="advertisement">Advertisement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Event Details Step Component
const EventDetailsStep = () => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  const hasVenueBooked = watch("hasVenueBooked");
  
  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="eventDate"
        rules={{ required: "Event date is required" }}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Event Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(new Date(field.value), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) field.onChange(date.toISOString());
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="startTime"
          rules={{ required: "Start time is required" }}
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
          rules={{ required: "End time is required" }}
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
        name="guestCount"
        rules={{ required: "Guest count is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estimated Guest Count</FormLabel>
            <FormControl>
              <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || '')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="hasVenueBooked"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>I have already booked a venue</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {hasVenueBooked && (
        <>
          <FormField
            control={control}
            name="venueName"
            rules={{ required: hasVenueBooked ? "Venue name is required" : false }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Name</FormLabel>
                <FormControl>
                  <Input placeholder="Venue name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="venueAddress"
            rules={{ required: hasVenueBooked ? "Venue address is required" : false }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue Address</FormLabel>
                <FormControl>
                  <Textarea placeholder="Venue address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <FormField
        control={control}
        name="specialRequests"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Special Requests or Additional Information</FormLabel>
            <FormControl>
              <Textarea placeholder="Tell us any additional details or special requests" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Menu Selection Step Component
const MenuSelectionStep = () => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  const selectedTheme = watch("theme");
  
  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="serviceStyle"
        rules={{ required: "Service style is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Service Style</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service style" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {serviceStyleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="theme"
        rules={{ required: "Theme is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Culinary Theme</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {themeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedTheme && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{themeMenuData[selectedTheme as keyof typeof themeMenuData]?.title || selectedTheme}</CardTitle>
            <CardDescription>
              {themeMenuData[selectedTheme as keyof typeof themeMenuData]?.description || ""}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <FormField
        control={control}
        name="dietaryRestrictions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dietary Restrictions</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Please note any dietary restrictions or allergies we should be aware of" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Appetizer Question Step Component
const AppetizerQuestionStep = () => {
  const { control } = useFormContext<EventInquiryFormData>();
  
  return (
    <div className="space-y-6">
      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <Utensils className="h-12 w-12 mx-auto mb-2 text-primary" />
            <h3 className="text-xl font-medium">Would you like to include appetizers?</h3>
            <p className="text-gray-500">Appetizers are a great way to welcome your guests</p>
          </div>
          
          <FormField
            control={control}
            name="includeAppetizers"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === "true")}
                    defaultValue={field.value ? "true" : "false"}
                    className="flex flex-col space-y-3"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="true" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Yes, include appetizers
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="false" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        No, skip appetizers
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Dessert Matrix component for selecting quantities
const DessertMatrixSelector = ({ 
  item, 
  selectedSize, 
  onSelect, 
  onDeselect 
}: { 
  item: DessertItem;
  selectedSize: DessertLotSize | null;
  onSelect: (lotSize: DessertLotSize) => void;
  onDeselect: () => void;
}) => {
  const handleLotSelect = (lotSize: DessertLotSize) => {
    if (selectedSize === lotSize) {
      // If clicking on already selected size, deselect it
      onDeselect();
    } else {
      // Otherwise select the new size
      onSelect(lotSize);
    }
  };
  
  return (
    <div className="border rounded-md p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">{item.name}</h3>
        {selectedSize && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDeselect}
            className="h-6 p-0 px-2"
          >
            <X className="h-4 w-4 mr-1" /> Remove
          </Button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-3">{item.description}</p>
      
      <div className="grid grid-cols-3 gap-2">
        {dessertLotSizes.map((size) => (
          <Button
            key={size.id}
            variant={selectedSize?.id === size.id ? "default" : "outline"}
            className="flex flex-col h-auto py-2 text-center"
            onClick={() => handleLotSelect(size)}
          >
            <span className="text-xs">{size.name}</span>
            <span className="font-bold">${item.pricing[size.id].toFixed(2)}</span>
            <span className="text-xs">{size.servings} servings</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

// Desserts step component
const DessertsStep = () => {
  const { control, setValue, watch } = useFormContext<EventInquiryFormData>();
  const dessertSelections = watch("dessertSelections") || {};
  
  // Handle selecting a dessert with a specific lot size
  const handleSelectDessert = (itemId: string, lotSize: DessertLotSize) => {
    const updatedSelections = { 
      ...dessertSelections, 
      [itemId]: lotSize.id 
    };
    setValue("dessertSelections", updatedSelections);
  };
  
  // Handle deselecting a dessert
  const handleDeselectDessert = (itemId: string) => {
    const updatedSelections = { ...dessertSelections };
    delete updatedSelections[itemId];
    setValue("dessertSelections", updatedSelections);
  };
  
  // Calculate total based on selections
  const calculateTotal = () => {
    return Object.entries(dessertSelections).reduce((total, [itemId, lotSizeId]) => {
      const item = dessertItems.find(i => i.id === itemId);
      if (item) {
        total += item.pricing[lotSizeId as keyof typeof item.pricing];
      }
      return total;
    }, 0);
  };
  
  // Count selected items
  const selectedCount = Object.keys(dessertSelections).length;
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-medium mb-2">Dessert Selection</h3>
        <p className="text-gray-600 text-sm mb-4">
          Select from our dessert options to complete your menu. Each option 
          comes in different serving sizes to accommodate your guest count.
        </p>
        
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Selected Desserts: {selectedCount}</span>
          <span>Total: ${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
      
      <div>
        {dessertItems.map((item) => (
          <DessertMatrixSelector
            key={item.id}
            item={item}
            selectedSize={dessertSelections[item.id] 
              ? dessertLotSizes.find(size => size.id === dessertSelections[item.id]) || null
              : null}
            onSelect={(lotSize) => handleSelectDessert(item.id, lotSize)}
            onDeselect={() => handleDeselectDessert(item.id)}
          />
        ))}
      </div>
      
      <FormField
        control={control}
        name="dessertNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Dessert Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any special requests for desserts?"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Appetizer data for standard appetizers
const standardAppetizers = [
  { id: "bruschetta", name: "Bruschetta", description: "Toasted bread topped with tomatoes, garlic, and basil" },
  { id: "meatballs", name: "Cocktail Meatballs", description: "Savory meatballs in a tangy sauce" },
  { id: "shrimp_cocktail", name: "Shrimp Cocktail", description: "Chilled shrimp with cocktail sauce" },
  { id: "spinach_dip", name: "Spinach Artichoke Dip", description: "Creamy dip with spinach, artichokes, and cheese" },
  { id: "stuffed_mushrooms", name: "Stuffed Mushrooms", description: "Mushroom caps with savory filling" },
  { id: "chicken_skewers", name: "Chicken Skewers", description: "Grilled chicken skewers with dipping sauce" },
  { id: "veggie_tray", name: "Vegetable Crudité", description: "Fresh vegetables with dip" },
  { id: "cheese_board", name: "Cheese Board", description: "Assorted cheeses with crackers and accompaniments" },
];

// Appetizers step component
const AppetizersStep = () => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  const appetizers = watch("appetizers") || [];
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-medium mb-2">Appetizer Selection</h3>
        <p className="text-gray-600 text-sm">
          Select appetizers to be served before the main meal. We recommend 
          2-3 options for most events.
        </p>
      </div>
      
      <FormField
        control={control}
        name="appetizers"
        render={({ field }) => (
          <FormItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standardAppetizers.map((appetizer) => (
                <div
                  key={appetizer.id}
                  className={`border rounded-md p-4 cursor-pointer transition-colors ${
                    appetizers.includes(appetizer.id)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    const updatedAppetizers = appetizers.includes(appetizer.id)
                      ? appetizers.filter(id => id !== appetizer.id)
                      : [...appetizers, appetizer.id];
                    field.onChange(updatedAppetizers);
                  }}
                >
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">{appetizer.name}</h4>
                      <p className="text-gray-500 text-sm">{appetizer.description}</p>
                    </div>
                    <Checkbox
                      checked={appetizers.includes(appetizer.id)}
                      className="pointer-events-none"
                    />
                  </div>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="appetizerNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Appetizer Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any special requests for appetizers?"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Beverages step component
const BeveragesStep = () => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  const beverageType = watch("beverageType");
  const alcoholicOptions = watch("alcoholicOptions") || [];
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="font-medium mb-2">Beverage Package</h3>
        <p className="text-gray-600 text-sm">
          Choose your preferred beverage service for the event.
        </p>
      </div>
      
      <FormField
        control={control}
        name="beverageType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Beverage Service Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-3"
              >
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="non_alcoholic" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Non-Alcoholic Beverages Only
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="alcoholic" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Include Alcoholic Beverages
                  </FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-3 space-y-0">
                  <FormControl>
                    <RadioGroupItem value="client_provided" />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">
                    Client-Provided Beverages
                  </FormLabel>
                </FormItem>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {beverageType === "non_alcoholic" && (
        <Card className="border-dashed border p-4">
          <CardContent className="p-0">
            <h4 className="font-medium mb-2">Standard Non-Alcoholic Package Includes:</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Filtered Water</li>
              <li>Iced Tea</li>
              <li>Lemonade</li>
              <li>Assorted Sodas</li>
              <li>Coffee Service</li>
            </ul>
          </CardContent>
        </Card>
      )}
      
      {beverageType === "alcoholic" && (
        <>
          <FormField
            control={control}
            name="alcoholicOptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Alcoholic Options</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "beer", name: "Beer", description: "Domestic and imported options" },
                    { id: "wine", name: "Wine", description: "Red and white selections" },
                    { id: "full_bar", name: "Full Bar", description: "Liquor with mixers" },
                    { id: "signature_cocktails", name: "Signature Cocktails", description: "Custom cocktails" },
                    { id: "champagne_toast", name: "Champagne Toast", description: "For special moments" },
                  ].map((option) => (
                    <div
                      key={option.id}
                      className={`border rounded-md p-4 cursor-pointer transition-colors ${
                        alcoholicOptions.includes(option.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        const updatedOptions = alcoholicOptions.includes(option.id)
                          ? alcoholicOptions.filter(id => id !== option.id)
                          : [...alcoholicOptions, option.id];
                        field.onChange(updatedOptions);
                      }}
                    >
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-medium">{option.name}</h4>
                          <p className="text-gray-500 text-sm">{option.description}</p>
                        </div>
                        <Checkbox
                          checked={alcoholicOptions.includes(option.id)}
                          className="pointer-events-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="barServiceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bar Service Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bar service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash_bar">Cash Bar</SelectItem>
                    <SelectItem value="open_bar">Open Bar</SelectItem>
                    <SelectItem value="consumption_bar">Consumption Bar</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
      
      {beverageType === "client_provided" && (
        <Card className="border-dashed border p-4">
          <CardContent className="p-0">
            <h4 className="font-medium mb-2">Client-Provided Beverage Information:</h4>
            <p className="text-gray-600 mb-4">
              Please note that if you choose to provide your own alcoholic beverages, you may need to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Obtain any necessary permits</li>
              <li>Provide liability insurance coverage</li>
              <li>Hire licensed bartenders if required by the venue</li>
            </ul>
          </CardContent>
        </Card>
      )}
      
      <FormField
        control={control}
        name="beverageNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Beverage Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any special requests or preferences for beverages?"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

// Review step component
const ReviewStep = () => {
  const { watch } = useFormContext<EventInquiryFormData>();
  const formData = watch();
  
  // Function to format the date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified";
    return format(new Date(dateString), "MMMM d, yyyy");
  };
  
  // Get theme and service style labels
  const getThemeLabel = (value?: string) => {
    if (!value) return "Not selected";
    const option = themeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  
  const getServiceStyleLabel = (value?: string) => {
    if (!value) return "Not selected";
    const option = serviceStyleOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Information</CardTitle>
          <CardDescription>
            Please review all your event details before submitting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p>{formData.firstName} {formData.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{formData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p>{formData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p>{formData.companyName || "Not provided"}</p>
              </div>
            </div>
          </div>
          
          {/* Event Details */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Event Type</p>
                <p>{formData.eventType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p>{formatDate(formData.eventDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p>{formData.startTime} - {formData.endTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Guest Count</p>
                <p>{formData.guestCount}</p>
              </div>
            </div>
            
            {formData.hasVenueBooked && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Venue</p>
                <p>{formData.venueName}</p>
                <p className="text-sm mt-2">{formData.venueAddress}</p>
              </div>
            )}
            
            {formData.specialRequests && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Special Requests</p>
                <p>{formData.specialRequests}</p>
              </div>
            )}
          </div>
          
          {/* Menu Details */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Menu Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Service Style</p>
                <p>{getServiceStyleLabel(formData.serviceStyle)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Culinary Theme</p>
                <p>{getThemeLabel(formData.theme)}</p>
              </div>
            </div>
            
            {formData.dietaryRestrictions && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Dietary Restrictions</p>
                <p>{formData.dietaryRestrictions}</p>
              </div>
            )}
          </div>
          
          {/* Appetizers */}
          {formData.includeAppetizers && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Appetizers</h3>
              {formData.appetizers && formData.appetizers.length > 0 ? (
                <div>
                  <ul className="list-disc pl-5">
                    {formData.appetizers.map(id => {
                      const appetizer = standardAppetizers.find(a => a.id === id);
                      return appetizer ? (
                        <li key={id}>{appetizer.name}</li>
                      ) : null;
                    })}
                  </ul>
                  
                  {formData.appetizerNotes && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p>{formData.appetizerNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p>No appetizers selected</p>
              )}
            </div>
          )}
          
          {/* Desserts */}
          {formData.dessertSelections && Object.keys(formData.dessertSelections).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Desserts</h3>
              <ul className="list-disc pl-5">
                {Object.entries(formData.dessertSelections).map(([itemId, sizeId]) => {
                  const item = dessertItems.find(i => i.id === itemId);
                  const size = dessertLotSizes.find(s => s.id === sizeId);
                  return item && size ? (
                    <li key={itemId}>
                      {item.name} - {size.name} (${item.pricing[sizeId as keyof typeof item.pricing].toFixed(2)})
                    </li>
                  ) : null;
                })}
              </ul>
              
              {formData.dessertNotes && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Notes</p>
                  <p>{formData.dessertNotes}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Beverages */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Beverages</h3>
            <div>
              <p className="text-sm text-gray-500">Package Type</p>
              <p>
                {formData.beverageType === "non_alcoholic" && "Non-Alcoholic Beverages Only"}
                {formData.beverageType === "alcoholic" && "Including Alcoholic Beverages"}
                {formData.beverageType === "client_provided" && "Client-Provided Beverages"}
                {!formData.beverageType && "Not specified"}
              </p>
            </div>
            
            {formData.beverageType === "alcoholic" && formData.alcoholicOptions && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Alcoholic Options</p>
                <ul className="list-disc pl-5">
                  {formData.alcoholicOptions.map(option => (
                    <li key={option}>
                      {option === "beer" && "Beer"}
                      {option === "wine" && "Wine"}
                      {option === "full_bar" && "Full Bar"}
                      {option === "signature_cocktails" && "Signature Cocktails"}
                      {option === "champagne_toast" && "Champagne Toast"}
                    </li>
                  ))}
                </ul>
                
                {formData.barServiceType && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Bar Service</p>
                    <p>
                      {formData.barServiceType === "cash_bar" && "Cash Bar"}
                      {formData.barServiceType === "open_bar" && "Open Bar"}
                      {formData.barServiceType === "consumption_bar" && "Consumption Bar"}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {formData.beverageNotes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Notes</p>
                <p>{formData.beverageNotes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main component
// Helper function to validate if a string is a valid event type
function validateEventType(type: string): boolean {
  // Convert input to match case-sensitive event types
  const eventTypeMap: Record<string, EventType> = {
    "wedding": "Wedding",
    "corporate": "Corporate",
    "engagement": "Engagement",
    "birthday": "Birthday",
    "foodtruck": "Food Truck",
    "mobilebartending": "Mobile Bartending",
    "otherprivateparty": "Other Private Party"
  };
  
  return !!eventTypeMap[type.toLowerCase()];
}

// Helper function to map URL parameter to EventType
function mapUrlToEventType(type: string): EventType | null {
  // Convert input to match case-sensitive event types
  const eventTypeMap: Record<string, EventType> = {
    "wedding": "Wedding",
    "corporate": "Corporate",
    "engagement": "Engagement",
    "birthday": "Birthday",
    "foodtruck": "Food Truck",
    "mobilebartending": "Mobile Bartending",
    "otherprivateparty": "Other Private Party"
  };
  
  return eventTypeMap[type.toLowerCase()] || null;
}

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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Helmet>
          <title>Start Your Event Inquiry | Catering Service</title>
          <meta name="description" content="Begin your event inquiry by selecting the type of event you're planning. We offer catering for weddings, corporate events, birthdays, and more." />
        </Helmet>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Find the Perfect Menu for Your Event</h1>
          <p className="text-gray-600">What type of event are you planning?</p>
        </div>
        
        <EventTypeSelection 
          onSelectEventType={(type) => {
            navigate(`/inquiry/${type.toLowerCase().replace(/\s+/g, "")}`);
          }}
        />
      </div>
    );
  }
  
  // Use the mapped event type or default to Wedding
  const eventType = mappedEventType || "Wedding";
  
  // Steps for the multi-step form
  // We'll use different steps based on the event type selection
  
  // State for current step
  const [currentStep, setCurrentStep] = useState<FormStep>(steps[0]);
  const currentStepIndex = steps.indexOf(currentStep);
  
  // Form setup
  const form = useForm<EventInquiryFormData>({
    defaultValues: {
      eventType,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
      howDidYouHear: "",
      eventDate: undefined,
      startTime: "18:00",
      endTime: "22:00",
      guestCount: 50,
      hasVenueBooked: false,
      venueName: "",
      venueAddress: "",
      specialRequests: "",
      serviceStyle: "",
      theme: "",
      dietaryRestrictions: "",
      includeAppetizers: false,
      appetizers: [],
      appetizerNotes: "",
      dessertSelections: {},
      dessertNotes: "",
      beverageType: "non_alcoholic",
      alcoholicOptions: [],
      barServiceType: "",
      beverageNotes: "",
    },
  });
  
  // Watch values for conditional logic
  const includeAppetizers = form.watch("includeAppetizers");
  const hasMainCourse = form.watch("hasMainCourse");
  const serviceStyle = form.watch("serviceStyle");
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Helmet>
        <title>{eventType} Inquiry | Catering Service</title>
        <meta 
          name="description" 
          content={`Create a personalized catering package for your ${eventType.toLowerCase()}. Fill out our detailed inquiry form to get started.`} 
        />
      </Helmet>
      
      <FormHeader 
        currentStep={currentStep}
        steps={steps}
        currentStepIndex={currentStepIndex}
        previousStep={() => {
          // Go to previous step or stay at the first step
          if (currentStepIndex > 0) {
            // Skip the appetizer step if appetizers are not included
            if (steps[currentStepIndex - 1] === "appetizers" && !includeAppetizers) {
              setCurrentStep(steps[currentStepIndex - 2]);
            } else {
              setCurrentStep(steps[currentStepIndex - 1]);
            }
          }
        }}
      />
      
      <FormProvider {...form}>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => {
              // If we're at the end, submit the form
              if (currentStepIndex === steps.length - 1) {
                console.log("Form submitted:", data);
                alert("Thank you for your inquiry! We'll be in touch shortly.");
                // Here you would normally submit to your backend API
              } else {
                // Move to next step
                const nextStepIndex = currentStepIndex + 1;
                
                // Skip the appetizer step if appetizers are not included
                if (steps[nextStepIndex] === "appetizers" && !includeAppetizers) {
                  setCurrentStep(steps[nextStepIndex + 1]);
                } else {
                  setCurrentStep(steps[nextStepIndex]);
                }
              }
            })}
          >
            {/* Current step content */}
            {currentStep === "eventType" && (
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <p className="text-center mb-4">You've selected {eventType} as your event type.</p>
                <p className="text-center text-gray-600 mb-4">Not the right event type? <span className="text-primary cursor-pointer underline" onClick={() => navigate('/inquiry')}>Go back</span></p>
              </div>
            )}
            
            {currentStep === "basicInfo" && <BasicInfoStep />}
            {currentStep === "eventDetails" && <EventDetailsStep />}
            {currentStep === "menuSelection" && <MenuSelectionStep />}
            {currentStep === "appetizerQuestion" && <AppetizerQuestionStep />}
            {currentStep === "appetizers" && includeAppetizers && <AppetizersStep />}
            {currentStep === "desserts" && <DessertsStep />}
            {currentStep === "beverages" && <BeveragesStep />}
            {currentStep === "review" && <ReviewStep />}
            
            {/* Navigation buttons */}
            <div className="mt-8 flex justify-end">
              <Button 
                type="submit"
                className="px-8"
              >
                {currentStepIndex === steps.length - 1 ? (
                  <>Submit Inquiry <Send className="ml-2 h-4 w-4" /></>
                ) : (
                  <>Next <ChevronRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </FormProvider>
    </div>
  );
}