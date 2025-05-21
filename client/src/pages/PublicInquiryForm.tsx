import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cake, Calendar, Gift, Users, Truck, Wine, Utensils, 
  ChevronRight, ChevronLeft, Check, Building, Phone,
  MapPin, Clock, Send, Users2, LayoutGrid, Radio, CircleOff
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

// Define event types
type EventType = 
  | "Wedding" 
  | "Corporate" 
  | "Engagement" 
  | "Birthday" 
  | "Food Truck" 
  | "Mobile Bartending" 
  | "Other Private Party";

// Form steps definition
type FormStep = 
  | "eventType" 
  | "basicInfo" 
  | "eventDetails" 
  | "menuSelection" 
  | "appetizers" 
  | "desserts" 
  | "beverages"
  | "equipment"
  | "review";

// Event type details including description and icon
const eventTypes: {
  type: EventType;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  image?: string;
}[] = [
  {
    type: "Wedding",
    description: "Elegant food service for your special day.",
    icon: <Calendar className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    type: "Corporate",
    description: "Professional catering for business events.",
    icon: <Users className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    type: "Engagement",
    description: "Celebrate your engagement with delicious food.",
    icon: <Gift className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    type: "Birthday",
    description: "Make your birthday celebration memorable.",
    icon: <Cake className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    type: "Food Truck",
    description: "Mobile food service for any outdoor event.",
    icon: <Truck className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-green-500 to-emerald-600",
  },
  {
    type: "Mobile Bartending",
    description: "Professional bartending services at your venue.",
    icon: <Wine className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    type: "Other Private Party",
    description: "Custom catering for your unique gathering.",
    icon: <Utensils className="h-16 w-16 mb-4 text-white" />,
    gradient: "from-teal-500 to-cyan-600",
  },
];

// Define the form data type
type EventInquiryFormData = {
  // Step 1: Event Type
  eventType: EventType | null;
  
  // Step 2: Basic Information
  companyName?: string;
  billingAddress: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contactName: {
    firstName: string;
    lastName: string;
  };
  email: string;
  phone?: string;
  eventDate: string;
  hasPromoCode: boolean;
  promoCode?: string;
  
  // Step 3: Event Details & Venue
  venueSecured: boolean;
  venueName?: string;
  venueLocation?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  eventStartTime?: string;
  eventEndTime?: string;
  ceremonyStartTime?: string;
  ceremonyEndTime?: string;
  setupBeforeCeremony?: boolean;
  hasCocktailHour: boolean;
  cocktailStartTime?: string;
  cocktailEndTime?: string;
  hasMainCourse: boolean;
  foodServiceStartTime?: string;
  foodServiceEndTime?: string;
  guestCount: number;
  serviceStyle: string;
  serviceDuration?: number;
  laborHours?: number;
  requestedTheme: string;
  
  // Step 4: Menu Selection
  selectedPackage?: string;
  menuSelections: {
    proteins: string[];
    sides: string[];
    salads: string[];
    salsas: string[];
    desserts: string[];
    addons: string[];
  };
  
  // Step 5: Appetizers
  appetizerService?: "stationary" | "passed";
  appetizers: Record<string, { name: string, quantity: number, price: number }[]>;
  
  // Hors d'oeuvres selections with matrix selection
  horsDoeurvesSelections: {
    serviceStyle?: "stationary" | "passed";
    categories: Record<string, {
      items: Record<string, {
        name: string;
        price: number;
        quantity: 24 | 36 | 48 | 96 | 144 | null;
      }>;
    }>;
  };
  
  // Step 6: Desserts
  dessertSelections: Record<string, number>;
  
  // Step 7: Beverages
  beverageServiceType?: "alcoholic" | "non_alcoholic" | "both";
  bartendingServiceType?: "dry_hire" | "wet_hire";
  servingAlcohol: string[];
  additionalCocktails: boolean;
  additionalCocktailsCount?: number;
  liquorQuality?: "well" | "mid_shelf" | "top_shelf";
  spiritBrands?: string;
  barEquipment: Record<string, number>;
  nonAlcoholicBeverages: Record<string, string>;
  tableWaterService: boolean;
  
  // Step 8: Equipment
  equipment: {
    furniture: Record<string, number>;
    linens: Record<string, number>;
    servingWare: Record<string, number>;
  };
  
  // Step 9: Notes & Final Review
  adminFee?: number;
  otherFeesDescription?: string;
  otherFeesAmount?: number;
  dietaryNotes?: string;
  beverageNotes?: string;
  specialRequests?: string;
  generalNotes?: string;
};

// Public Form Header component
const PublicFormHeader = () => {
  return (
    <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 mb-8">
      <div className="container mx-auto">
        <h1 className="text-5xl font-extrabold mb-4 text-center">Elite Catering Services</h1>
        <p className="text-xl text-center max-w-2xl mx-auto">
          Exceptional cuisine for extraordinary moments
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

// Step 1: Event Type Selection Component
const EventTypeSelectionStep = ({ 
  onSelectEventType, 
  selectedEventType 
}: { 
  onSelectEventType: (type: EventType) => void;
  selectedEventType: EventType | null;
}) => {
  return (
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
          <EventTypeCard 
            key={event.type}
            event={event}
            onSelect={() => onSelectEventType(event.type)}
            isSelected={selectedEventType === event.type}
          />
        ))}
      </div>
    </div>
  );
};

// Component for individual event type cards
function EventTypeCard({ 
  event, 
  onSelect, 
  isSelected 
}: { 
  event: typeof eventTypes[0]; 
  onSelect: () => void; 
  isSelected: boolean;
}) {
  return (
    <Card 
      className={`
        overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 
        ${isSelected ? 'ring-4 ring-primary ring-offset-2 scale-105' : ''}
      `}
      onClick={onSelect}
    >
      <div className={`bg-gradient-to-r ${event.gradient} p-8 text-white text-center`}>
        {event.icon}
        <h3 className="text-2xl font-bold mb-1">{event.type}</h3>
      </div>
      <CardContent className="p-6">
        <p className="text-gray-600 text-lg mb-4">{event.description}</p>
        <Button 
          className="w-full mt-2 py-6 text-lg transition-all duration-300"
          variant={isSelected ? "default" : "outline"}
          size="lg"
        >
          {isSelected ? "Selected" : "Select This Event"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Step 2: Basic Information Form Component
const BasicInformationStep = ({ 
  eventType,
  onPrevious,
  onNext 
}: { 
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
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
                    <FormLabel>State/Province*</FormLabel>
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
                    <FormLabel>Postal/Zip Code*</FormLabel>
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
          <FormField
            control={control}
            name="hasPromoCode"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Discount Promo Code</FormLabel>
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
        </div>
        
        {/* Conditional Promo Code Field */}
        {hasPromoCode && (
          <div className="mb-6 ml-4 border-l-2 border-primary/30 pl-4 py-2">
            <FormField
              control={control}
              name="promoCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter Promo Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your promo code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
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

// Appetizer data for standard appetizers
const appetizerData = {
  categories: [
    {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      note: "Offered in lots of 36",
      items: [
        { id: "cucumber", name: "Cucumber & Cream Cheese", price: 1.95 },
        { id: "egg_salad", name: "Egg Salad", price: 1.95 },
        { id: "turkey", name: "Turkey & Cheese", price: 1.95 },
        { id: "ham", name: "Ham & Cheese", price: 1.95 },
        { id: "chicken_salad", name: "Chicken Salad", price: 1.95 }
      ],
      lotSizes: [36, 48, 96, 144]
    },
    {
      id: "shooters",
      name: "Shooters",
      note: "Offered in lots of 24",
      items: [
        { id: "gazpacho", name: "Gazpacho", price: 2.50 },
        { id: "shrimp", name: "Shrimp Cocktail", price: 3.25 },
        { id: "ceviche", name: "Ceviche", price: 3.50 },
        { id: "bloody_mary", name: "Bloody Mary", price: 3.00 }
      ],
      lotSizes: [24, 48, 72, 96]
    },
    {
      id: "canapes",
      name: "Canapes",
      note: "Offered in lots of 24",
      items: [
        { id: "bruschetta", name: "Bruschetta", price: 2.25 },
        { id: "endive", name: "Endive with Blue Cheese & Walnuts", price: 2.50 },
        { id: "smoked_salmon", name: "Smoked Salmon on Crostini", price: 3.00 },
        { id: "prosciutto", name: "Prosciutto-Wrapped Melon", price: 2.75 }
      ],
      lotSizes: [24, 48, 72, 96]
    },
    {
      id: "spreads",
      name: "Spreads Platter",
      note: "Select 3 spreads",
      items: [
        { id: "hummus", name: "Classic Hummus", price: 0 },
        { id: "baba_ganoush", name: "Baba Ganoush", price: 0 },
        { id: "tzatziki", name: "Tzatziki", price: 0 },
        { id: "spinach_dip", name: "Spinach & Artichoke Dip", price: 0 },
        { id: "olive_tapenade", name: "Olive Tapenade", price: 0 },
        { id: "guacamole", name: "Guacamole", price: 0 }
      ],
      servingSizes: [24, 36, 48, 60],
      selectLimit: 3,
      basePrice: 4.50 // per person
    }
  ]
};

// Hors d'oeuvres data for matrix selection
const horsDoeurvesData = {
  categories: [
    {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      description: "Offered in lots of 48",
      lotSizes: [36, 48, 96, 144],
      items: [
        { id: "pate_pickled_veg", name: "Pate with pickled veg", price: 1.95 },
        { id: "cream_cheese_shrimp", name: "Cream Cheese and Shrimp", price: 2.50 },
        { id: "blt", name: "BLT - (Bacon Lettuce & Tomato)", price: 1.95 },
        { id: "caprese", name: "Caprese (Mozzarella, Tomato, & Basil)", price: 1.95 },
        { id: "gravlax", name: "Gravlax, Cream Cheese & Cucumber", price: 2.75 },
        { id: "prosciutto_fig", name: "Prosciutto-Fig", price: 2.75 },
        { id: "crab_salad", name: "Crab Salad", price: 3.00 },
        { id: "chicken_cranberry", name: "Chicken Cranberry", price: 2.00 },
        { id: "miso_egg_salad", name: "Miso egg salad", price: 2.25 }
      ]
    },
    {
      id: "shooters",
      name: "Shooters",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      items: [
        { id: "chicken_satay", name: "Chicken Satay", price: 2.45 },
        { id: "greek_village", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "gazpacho_shrimp", name: "Gazpacho with shrimp", price: 2.75 },
        { id: "cucumber_jalapeno", name: "Chilled Cucumber/Jalapeno with shrimp", price: 2.75 },
        { id: "bloody_mary_lobster", name: "Bloody Mary with lobster (non-alcoholic)", price: 4.75 },
        { id: "roasted_beet", name: "Roasted beet Vichyssoise with green bean", price: 2.45 },
        { id: "chilled_peach", name: "Chilled peach soup with Gravlax", price: 2.75 },
        { id: "avocado_soup", name: "Chilled avocado soup with crab and pico", price: 3.75 }
      ]
    },
    {
      id: "mini_skewers",
      name: "Mini Skewers",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      items: [
        { id: "korean_bbq", name: "Korean BBQ pork belly", price: 2.75 },
        { id: "greek_village_skewer", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "chicken_teriyaki", name: "Chicken Teriyaki", price: 2.75 },
        { id: "moroccan_flank", name: "Grilled Moroccan style Flank steak", price: 2.75 },
        { id: "mediterranean_shrimp", name: "Mediterranean style shrimp", price: 2.75 },
        { id: "caprese_skewer", name: "Caprese - Tomato, Basil and Mozzarella - cold", price: 2.25 },
        { id: "prosciutto_melon", name: "Prosciutto, Melon and Basil - cold", price: 2.75 },
        { id: "tofu_hoisin", name: "Tofu with Hoisin plum sauce", price: 2.25 },
        { id: "antipasto_bites", name: "Antipasto Bites", price: 2.75 }
      ]
    },
    {
      id: "canapes",
      name: "Canapes",
      description: "Offered in lots of 48",
      lotSizes: [48, 96, 144],
      items: [
        { id: "watermelon_radish", name: "Watermelon radish chips with apple chutney", price: 2.75 },
        { id: "greek_village_canape", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.75 },
        { id: "onion_tartlets", name: "French onion tartlets with Gruyere and dill", price: 2.75 },
        { id: "pear_camembert", name: "Pear and Camembert tartlet", price: 2.75 },
        { id: "mediterranean_shrimp_canape", name: "Mediterranean style shrimp", price: 2.75 },
        { id: "miso_maple_eggs", name: "Miso maple deviled eggs", price: 2.75 },
        { id: "beet_chips", name: "Beet chips with goat cheese and asparagus tips", price: 2.75 },
        { id: "vegan_bruschetta", name: "Vegan Bruschetta with olive tapenade and mint coulis", price: 2.75 }
      ]
    },
    {
      id: "vol_au_vents",
      name: "Vol au vents",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      items: [
        { id: "gravlax_cream", name: "Gravlax with cream cheese", price: 3.00 },
        { id: "spinach_feta", name: "Spinach, feta and leek", price: 3.00 },
        { id: "chicken_teriyaki_vol", name: "Chicken Teriyaki", price: 3.00 },
        { id: "brie_cranberry", name: "Melted Brie with cranberry relish", price: 3.50 },
        { id: "curried_chicken", name: "Curried chicken salad", price: 3.00 },
        { id: "tuna_tartare", name: "Tuna tartare", price: 3.75 },
        { id: "brie_walnut", name: "Brie with walnuts and mushrooms", price: 3.25 },
        { id: "pulled_pork", name: "Pulled pork with prunes and apple", price: 3.25 }
      ]
    },
    {
      id: "simple_fare",
      name: "Simple fare",
      description: "Offered in lots of 48",
      lotSizes: [48, 96, 144],
      items: [
        { id: "potato_skins", name: "Loaded Potato Skins", price: 1.95 },
        { id: "stuffed_mushrooms", name: "Stuffed mushrooms", price: 2.25 },
        { id: "chicken_wings", name: "Chicken wings", price: 2.65 },
        { id: "deviled_eggs", name: "Deviled eggs with bacon bits and chives", price: 2.25 },
        { id: "meatballs", name: "Meatballs in a blanket", price: 2.50 },
        { id: "mac_cheese", name: "Mac n' cheese bites", price: 2.50 },
        { id: "lumpia", name: "Lumpia (Filipino Spring Rolls) Vegetarian", price: 2.75 },
        { id: "lobster_rolls", name: "Lobster Rolls", price: 6.50 },
        { id: "cheeseburger_bites", name: "Tater tot cheeseburger Bites", price: 2.50 }
      ]
    },
    {
      id: "charcuterie",
      name: "Charcuterie boards",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 72, 96],
      perPersonPricing: true,
      items: [
        { id: "cheese_fruit", name: "Cheese and fruit Grazing Board", price: 8.00 },
        { id: "meat_cheese", name: "Meat, cheese and fruit grazing Board", price: 9.00 },
        { id: "mexican_board", name: "Mexican Grazing Board", price: 10.00 },
        { id: "mediterranean_board", name: "Mediterranean grazing board", price: 11.00 },
        { id: "premium_board", name: "Premium Grazing Board", price: 15.00 },
        { id: "chips_salsa", name: "Chips and salsa bar as an appetizer. Includes an array of corn and flour tortillas, salsas and queso.", price: 5.50 },
        { id: "charcuterie_cones", name: "Charcuterie Cones", price: 4.75 }
      ]
    },
    {
      id: "spreads",
      name: "Spreads",
      description: "Served with Pita bread, and crudité. Select 3 spreads for 24 or more guests",
      note: "$6.50 per person",
      basePrice: 6.50,
      selectLimit: 3,
      servingSizes: [24, 36, 48, 60],
      items: [
        { id: "tzatziki", name: "Tzatziki" },
        { id: "hummus", name: "Hummus" },
        { id: "beet_hummus", name: "Beet Hummus" },
        { id: "baba_ghanoush", name: "Baba Ghannoush" },
        { id: "spicy_feta", name: "Spicy Feta" },
        { id: "taramasalata", name: "Taramasalata" },
        { id: "muhammara", name: "Muhammara" },
        { id: "lebanese_garlic", name: "Lebanese garlic dip" }
      ]
    }
  ]
};

// Step 3: Event Details & Venue Form Component
const EventDetailsStep = ({ 
  eventType,
  onPrevious,
  onNext 
}: { 
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  
  // Watch values to conditionally show fields
  const venueSecured = watch("venueSecured");
  const hasCocktailHour = watch("hasCocktailHour");
  const hasMainCourse = watch("hasMainCourse");
  const serviceStyle = watch("serviceStyle");
  
  // Service style options
  const serviceStyleOptions = [
    { value: "drop_off", label: "Drop-off" },
    { value: "buffet_standard", label: "Buffet Standard" },
    { value: "buffet_full", label: "Buffet Full Service" },
    { value: "family_style", label: "Family Style" },
    { value: "plated_dinner", label: "Plated Dinner" },
    { value: "cocktail_party", label: "Cocktail Party" },
    { value: "food_truck", label: "Food Truck" },
  ];
  
  // Theme options
  const themeOptions = [
    { value: "taco_fiesta", label: "Taco Fiesta" },
    { value: "american_bbq", label: "American BBQ" },
    { value: "taste_of_greece", label: "A Taste of Greece" },
    { value: "kebab_party", label: "Kebab Party" },
    { value: "taste_of_italy", label: "A Taste of Italy" },
    { value: "sandwich_factory", label: "Sandwich Factory" },
    { value: "custom_menu", label: "Custom Menu" },
    { value: "hors_doeuvres", label: "Hor d'oeuvres only (Cocktail party)" },
  ];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Event Details & Venue</h2>
        <p className="text-lg text-gray-600">
          Tell us more about your venue and event timing
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Venue Information */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Venue Information</h3>
          
          <FormField
            control={control}
            name="venueSecured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Have you secured a venue?</FormLabel>
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
          
          {venueSecured && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 space-y-4">
              <FormField
                control={control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Venue Location */}
              <div className="space-y-4">
                <h4 className="text-md font-medium">Venue Location</h4>
                
                <FormField
                  control={control}
                  name="venueLocation.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="venueLocation.street2"
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
                    name="venueLocation.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="venueLocation.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="venueLocation.zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal/Zip Code</FormLabel>
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
          )}
        </div>
        
        {/* Event Schedule */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Event Schedule</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name="eventStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Start Time</FormLabel>
                  <FormControl>
                    <Input placeholder="HH:MM AM/PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="eventEndTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event End Time</FormLabel>
                  <FormControl>
                    <Input placeholder="HH:MM AM/PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Wedding-specific timing fields */}
          {eventType === "Wedding" && (
            <div className="border rounded-md p-4 mb-4 bg-gray-50">
              <h4 className="text-md font-medium mb-3">Wedding Ceremony Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  control={control}
                  name="ceremonyStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="ceremonyEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={control}
                name="setupBeforeCeremony"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 mb-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set-up before Ceremony start time?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Cocktail Hour */}
          <FormField
            control={control}
            name="hasCocktailHour"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Cocktail Hour</FormLabel>
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
          
          {hasCocktailHour && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="cocktailStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail/Appetizer Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="cocktailEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail/Appetizer End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          
          {/* Main Course Service */}
          <FormField
            control={control}
            name="hasMainCourse"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Main Course Service</FormLabel>
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
          
          {hasMainCourse && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="foodServiceStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="foodServiceEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Guest Count and Service Style */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Details</h3>
          
          <FormField
            control={control}
            name="guestCount"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Guest Count</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="Number of guests" 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="serviceStyle"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Service Style</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service style" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceStyleOptions.map((option) => (
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
          
          {/* Service fee notes */}
          {serviceStyle === "buffet_full" && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Service Fee Note - Full Service:</strong> A 20% service fee will be applied for Buffet Full Service. This includes professional servers, complete setup and breakdown, and premium service throughout your event.
              </p>
            </div>
          )}
          
          {serviceStyle === "buffet_standard" && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Service Fee Note - Standard Service:</strong> A 15% service fee will be applied for Buffet Standard Service. This includes basic setup, food service assistance, and cleanup of service areas.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name="serviceDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Duration (hours)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="Duration" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="laborHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Labor Hours</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="1" 
                      placeholder="Labor hours" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Menu Theme Selection */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-4">Menu Selection</h3>
          
          <FormField
            control={control}
            name="requestedTheme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What would you like a quote for?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select menu theme" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {themeOptions.map((option) => (
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

// Menu data for different themes
const themeMenuData = {
  sandwich_factory: {
    title: "Sandwich Factory - Catering Packages",
    packages: [
      { 
        id: "bronze",
        name: "Bronze", 
        price: 13.00,
        description: "Includes: Meats, Cheeses, Veggies, & four condiments, White, multigrain, and whole wheat breads.",
        minGuestCount: 0
      },
      { 
        id: "silver",
        name: "Silver", 
        price: 18.00,
        description: "Includes: Meats, cheeses, veggies, & five condiments, White, Multigrain, and whole wheat breads, croissants, bagels, and two salads.",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold", 
        price: 23.00,
        description: "Includes: Premium meats & cheeses, veggies, fruits & six condiments, White, multigrain, whole wheat sliced breads, croissants, bagels, and two salads.",
        minGuestCount: 0
      },
      { 
        id: "diamond",
        name: "Diamond", 
        price: 28.00,
        description: "Includes: Premium meats & cheeses, veggies, & six condiments, White, multigrain, and whole wheat breads, croissants, bagels and rolls, three salads, and fresh fruit grazing board.",
        minGuestCount: 0
      }
    ],
    categories: {
      meats: {
        title: "Meats",
        description: "Select your desired meats",
        limits: {
          bronze: 2,
          silver: 3,
          gold: 4,
          diamond: 5
        },
        items: [
          { id: "smoked_turkey", name: "Smoked Turkey", upcharge: 0 },
          { id: "black_forest_ham", name: "Black Forest Ham", upcharge: 0 },
          { id: "pepperoni", name: "Pepperoni", upcharge: 0 },
          { id: "salami", name: "Salami", upcharge: 0 },
          { id: "roast_beef", name: "Roast Beef", upcharge: 0 },
          { id: "pastrami", name: "Pastrami", upcharge: 0 }
        ]
      },
      cheeses: {
        title: "Cheeses",
        description: "Select your desired cheeses",
        limits: {
          bronze: 2,
          silver: 3,
          gold: 4,
          diamond: 4
        },
        items: [
          { id: "cheddar", name: "Cheddar Cheese", upcharge: 0 },
          { id: "swiss", name: "Swiss Cheese", upcharge: 0 },
          { id: "monterey", name: "Monterey Cheese", upcharge: 0 },
          { id: "havarti", name: "Havarti", upcharge: 0 },
          { id: "brie", name: "Brie", upcharge: 0 },
          { id: "gouda", name: "Gouda", upcharge: 0 },
          { id: "cream_cheese", name: "Cream Cheese", upcharge: 0 }
        ]
      },
      veggies: {
        title: "Sandwich Veggies",
        description: "Select your desired vegetables",
        limits: {
          bronze: 5,
          silver: 6,
          gold: 7,
          diamond: 8
        },
        items: [
          { id: "lettuce", name: "Lettuce", upcharge: 0 },
          { id: "tomato", name: "Tomato", upcharge: 0 },
          { id: "onion", name: "Onion", upcharge: 0 },
          { id: "avocado", name: "Avocado", upcharge: 0 },
          { id: "spinach", name: "Spinach", upcharge: 0 },
          { id: "arugula", name: "Arugula", upcharge: 0 },
          { id: "pickle", name: "Pickle", upcharge: 0 },
          { id: "bell_pepper", name: "Bell Pepper", upcharge: 0 },
          { id: "cucumber", name: "Cucumber", upcharge: 0 },
          { id: "olives", name: "Olives", upcharge: 0 },
          { id: "sprouts", name: "Sprouts", upcharge: 0 }
        ]
      },
      breads: {
        title: "Breads",
        description: "Select your desired bread types",
        limits: {
          bronze: 3,
          silver: 5,
          gold: 5,
          diamond: 6
        },
        items: [
          { id: "sourdough", name: "Sourdough", upcharge: 0 },
          { id: "rye", name: "Rye", upcharge: 0 },
          { id: "multigrain", name: "Multigrain Bread", upcharge: 0 },
          { id: "whole_wheat", name: "Whole Wheat Bread", upcharge: 0 },
          { id: "white", name: "White Bread", upcharge: 0 },
          { id: "bagels", name: "Bagels", upcharge: 0 },
          { id: "croissants", name: "Croissants", upcharge: 0 },
          { id: "rolls", name: "Rolls", upcharge: 0 }
        ]
      },
      spreads: {
        title: "Sandwich Spreads/Condiments",
        description: "Bronze: Choose 4, Silver: Choose 5, Gold/Diamond: Choose 6",
        limits: {
          bronze: 4,
          silver: 5,
          gold: 6,
          diamond: 6
        },
        items: [
          { id: "classic_mayo", name: "Classic Mayo", upcharge: 0 },
          { id: "vegan_mayo", name: "Vegan Mayo", upcharge: 0 },
          { id: "chipotle_mayo", name: "Chipotle Mayo", upcharge: 0 },
          { id: "dijon_mustard", name: "Dijon Mustard", upcharge: 0 },
          { id: "honey_mustard", name: "Honey Mustard", upcharge: 0 },
          { id: "stone_ground_mustard", name: "Stone Ground Mustard", upcharge: 0 },
          { id: "pesto", name: "Pesto (contains nuts)", upcharge: 0 },
          { id: "vegan_pesto", name: "Vegan Pesto (contains nuts)", upcharge: 0 },
          { id: "vegan_caesar", name: "Vegan Caesar (contains cashews)", upcharge: 0 },
          { id: "hummus", name: "Hummus", upcharge: 0 },
          { id: "baba_ganoush", name: "Baba Ganoush", upcharge: 0 },
          { id: "olive_tapenade", name: "Olive Tapenade", upcharge: 0 },
          { id: "sun_dried_tomato_pesto", name: "Sun-dried Tomato Pesto", upcharge: 0 },
          { id: "ranch_dressing", name: "Ranch Dressing", upcharge: 0 },
          { id: "italian_dressing", name: "Italian Dressing", upcharge: 0 },
          { id: "balsamic_vinaigrette", name: "Balsamic Vinaigrette", upcharge: 0 },
          { id: "fig_jam", name: "Fig Jam", upcharge: 0 },
          { id: "red_pepper_jelly", name: "Red Pepper Jelly", upcharge: 0 },
          { id: "cranberry_sauce", name: "Cranberry Sauce", upcharge: 0 },
          { id: "horseradish_aioli", name: "Horseradish Aioli", upcharge: 0 },
          { id: "garlic_aioli", name: "Garlic Aioli", upcharge: 0 },
          { id: "spicy_aioli", name: "Spicy Aioli", upcharge: 0 },
          { id: "tahini_sauce", name: "Tahini Sauce", upcharge: 0 },
          { id: "guacamole", name: "Guacamole", upcharge: 0 },
          { id: "salsa", name: "Salsa", upcharge: 0 },
          { id: "artichoke_dip", name: "Artichoke Dip", upcharge: 0 },
          { id: "caramelized_onion_jam", name: "Caramelized Onion Jam", upcharge: 0 },
          { id: "roasted_red_pepper_spread", name: "Roasted Red Pepper Spread", upcharge: 0 }
        ]
      },
      salads: {
        title: "Salads",
        description: "Silver & Gold: Pick 2, Diamond: Pick 3",
        limits: {
          bronze: 0,
          silver: 2,
          gold: 2,
          diamond: 3
        },
        items: [
          { id: "side_salad", name: "Side Salad", upcharge: 0 },
          { id: "greek_salad", name: "Greek Village Salad", upcharge: 0 },
          { id: "caesar_salad", name: "Caesar Salad", upcharge: 0 },
          { id: "mediterranean_quinoa", name: "Mediterranean Quinoa Salad", upcharge: 0 },
          { id: "pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "potato_salad", name: "Potato Salad", upcharge: 0 },
          { id: "coleslaw", name: "Coleslaw", upcharge: 0 },
          { id: "fruit_salad", name: "Fruit Salad", upcharge: 0 },
          { id: "caprese_salad", name: "Caprese Salad", upcharge: 0 },
          { id: "asian_noodle_salad", name: "Asian Noodle Salad", upcharge: 0 },
          { id: "beet_salad", name: "Beet Salad", upcharge: 0 },
          { id: "lentil_salad", name: "Lentil Salad", upcharge: 0 },
          { id: "chickpea_salad", name: "Chickpea Salad", upcharge: 0 },
          { id: "waldorf_salad", name: "Waldorf Salad", upcharge: 0 },
          { id: "israeli_couscous_salad", name: "Israeli Couscous Salad", upcharge: 0 },
          { id: "tabbouleh_salad", name: "Tabbouleh Salad", upcharge: 0 },
          { id: "black_bean_corn_salad", name: "Black Bean and Corn Salad", upcharge: 0 },
          { id: "spinach_strawberry_salad", name: "Spinach Salad with Strawberries", upcharge: 0 },
          { id: "arugula_parmesan_salad", name: "Arugula Salad with Parmesan", upcharge: 0 }
        ]
      },
      add_ons: {
        title: "Add-ons",
        description: "Optional extras",
        limits: {
          bronze: 3,
          silver: 3,
          gold: 3,
          diamond: 3
        },
        items: [
          { id: "gluten_free_bread", name: "Gluten Free Bread ($0.50 / each)", upcharge: 0.5 }
        ]
      }
    }
  },
  taco_fiesta: {
    title: "Taco Fiesta Selections",
    packages: [
      { 
        id: "bronze",
        name: "Bronze", 
        price: 28.00,
        description: "Choose 3 Proteins, 2 Sides, 3 Salsas, 4 Condiments",
        minGuestCount: 50
      },
      { 
        id: "silver",
        name: "Silver", 
        price: 34.00,
        description: "Choose 4 Proteins, 3 Sides, 4 Salsas, 6 Condiments",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold", 
        price: 40.00,
        description: "Choose 4 Proteins, 4 Sides, 4 Salsas, 6 Condiments",
        minGuestCount: 0
      },
      { 
        id: "diamond",
        name: "Diamond", 
        price: 46.00,
        description: "Choose 5 Proteins, 5 Sides, 5 Salsas, 8 Condiments",
        minGuestCount: 0
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your protein options",
        items: [
          { id: "barbacoa", name: "Barbacoa", upcharge: 0 },
          { id: "flank_steak", name: "Flank steak Fajitas", upcharge: 2.00 },
          { id: "ground_beef", name: "Ground Beef", upcharge: 0 },
          { id: "pork_carnitas", name: "Pork Carnitas", upcharge: 0 },
          { id: "pork_belly", name: "Pork Belly", upcharge: 0 },
          { id: "chorizo", name: "Chorizo", upcharge: 0 },
          { id: "beef_birria", name: "Beef Birria", upcharge: 0 },
          { id: "mexican_chicken", name: "Mexican Chicken", upcharge: 0 },
          { id: "cod", name: "Cod", upcharge: 0 },
          { id: "shrimp", name: "Shrimp", upcharge: 1.50 },
          { id: "tofu", name: "Tofu (V)", upcharge: 0 },
          { id: "roasted_vegetables", name: "Roasted Vegetables (V)", upcharge: 0 },
          { id: "escabeche", name: "Escabeche - House-made picked vegetable medley (V)", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 4,
          "gold": 4,
          "diamond": 5
        }
      },
      sides: {
        title: "Sides",
        description: "Select your side dishes",
        items: [
          { id: "refried_beans", name: "Refried Beans", upcharge: 0 },
          { id: "street_corn", name: "Mexican Street corn (Elotes)", upcharge: 0 },
          { id: "queso_dip", name: "Queso Dip", upcharge: 0 },
          { id: "chorizo_queso", name: "Chorizo Queso Dip", upcharge: 0.50 },
          { id: "poblano_peppers", name: "Stuffed Poblano peppers", upcharge: 1.00 },
          { id: "mexican_rice", name: "Mexican Rice", upcharge: 0 },
          { id: "cilantro_lime_rice", name: "Cilantro Lime Rice", upcharge: 0 },
          { id: "rice_beans", name: "Rice and Beans", upcharge: 0 },
          { id: "cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "mexican_slaw", name: "Mexican Slaw with Mango", upcharge: 0 },
          { id: "vegetarian_empanadas", name: "Vegetarian Empanadas", upcharge: 1.50 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5
        }
      },
      salsas: {
        title: "Salsas",
        description: "Select your salsa varieties",
        items: [
          { id: "pico_de_gallo", name: "Classic Pico de Gallo", upcharge: 0 },
          { id: "mango_salsa", name: "Fresh Mango Salsa", upcharge: 0 },
          { id: "pineapple_habanero", name: "Pineapple Habanero Salsa", upcharge: 0 },
          { id: "cucumber_apple", name: "Cucumber & Apple Salsa", upcharge: 0 },
          { id: "jicama_papaya", name: "Jicama and Papaya Salsa", upcharge: 0 },
          { id: "salsa_roja", name: "Salsa Roja (red sauce)", upcharge: 0 },
          { id: "salsa_verde", name: "Salsa Verde (green sauce)", upcharge: 0 },
          { id: "creamy_salsa_verde", name: "Creamy Salsa Verde (green sauce)", upcharge: 0 },
          { id: "salsa_macha", name: "Salsa Macha (contains peanuts and sesame seeds)", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 4,
          "gold": 4,
          "diamond": 5
        }
      },
      condiments: {
        title: "Condiments",
        description: "Select your condiment options",
        items: [
          { id: "shredded_cheese", name: "Shredded cheese", upcharge: 0 },
          { id: "vegan_cheese", name: "Shredded vegan cheese", upcharge: 0.50 },
          { id: "onions", name: "Diced Onions", upcharge: 0 },
          { id: "lime_wedges", name: "Lime wedges", upcharge: 0 },
          { id: "jalapenos", name: "Jalapeños", upcharge: 0 },
          { id: "sour_cream", name: "Sour Cream", upcharge: 0 },
          { id: "bell_peppers", name: "Diced bell peppers", upcharge: 0 },
          { id: "guacamole", name: "Guacamole", upcharge: 1.00 },
          { id: "fire_roasted_peppers", name: "Fire roasted bell peppers", upcharge: 0 },
          { id: "radish", name: "Sliced radish", upcharge: 0 },
          { id: "cilantro", name: "Cilantro", upcharge: 0 },
          { id: "pickled_cabbage", name: "Pickled cabbage", upcharge: 0 },
          { id: "escabeche_condiment", name: "Escabeche - House-made picked vegetable medley", upcharge: 0 }
        ],
        limits: {
          "bronze": 4,
          "silver": 6,
          "gold": 6,
          "diamond": 8
        }
      }
    }
  },
  american_bbq: {
    title: "American BBQ Selections",
    packages: [
      { 
        id: "bronze",
        name: "Bronze", 
        price: 32.00,
        description: "Pick 3 Proteins, 2 Sides, 2 Salads, 3 Condiments, 2 Sauces",
        minGuestCount: 50
      },
      { 
        id: "silver",
        name: "Silver", 
        price: 38.00,
        description: "Pick 4 Proteins, 3 Sides, 2 Salads, 3 Condiments, 2 Sauces",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold", 
        price: 46.00,
        description: "Pick 4 Proteins, 4 Sides, 3 Salads, 4 Condiments, 3 Sauces",
        minGuestCount: 0
      },
      { 
        id: "diamond",
        name: "Diamond", 
        price: 54.00,
        description: "Pick 5 Proteins, 5 Sides, 3 Salads, 5 Condiments, 4 Sauces",
        minGuestCount: 0
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your protein options",
        items: [
          { id: "prime_rib", name: "Prime Rib - Boneless - Carving station", upcharge: 4.00 },
          { id: "smoked_brisket", name: "Smoked Brisket", upcharge: 2.00 },
          { id: "beef_ribs", name: "Beef Ribs", upcharge: 3.00 },
          { id: "short_ribs", name: "Guinness Braised Boneless Short Ribs", upcharge: 2.00 },
          { id: "filet_mignon", name: "Bacon Wrapped Fillet Mignon", upcharge: 4.00 },
          { id: "flank_steak", name: "Flank Steak with Chimichurri", upcharge: 0 },
          { id: "sausage_medley", name: "Sausage Medley", upcharge: 0 },
          { id: "hamburger_bar", name: "Hamburger Bar", upcharge: 1.50 },
          { id: "lamb_chops", name: "Lamb Chops", upcharge: 3.00 },
          { id: "smoked_lamb", name: "Smoked Leg of Lamb (Family Style only)", upcharge: 0 },
          { id: "pulled_pork", name: "Pulled Pork", upcharge: 0 },
          { id: "pork_belly", name: "Smoked Pork Belly", upcharge: 0 },
          { id: "baby_back_ribs", name: "Baby Back Ribs", upcharge: 0 },
          { id: "pork_chop", name: "Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze", upcharge: 0 },
          { id: "guinness_chicken", name: "BBQ Guinness Chicken", upcharge: 1.00 },
          { id: "carolina_chicken", name: "Carolina BBQ Chicken", upcharge: 0 },
          { id: "rotisserie_chicken", name: "Rotisserie Chicken", upcharge: 0 },
          { id: "bbq_prawns", name: "BBQ Prawns", upcharge: 1.00 },
          { id: "tiger_prawns", name: "BBQ Black Tiger Prawns", upcharge: 2.00 },
          { id: "salmon", name: "Salmon steak", upcharge: 0 },
          { id: "tofu", name: "Tofu (V)", upcharge: 0 },
          { id: "veg_kebabs", name: "Vegetable kebabs (V)", upcharge: 0 },
          { id: "cauliflower_steaks", name: "Grilled Cauliflower Steaks (V)", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 4,
          "gold": 4,
          "diamond": 5
        }
      },
      sides: {
        title: "Sides",
        description: "Select your side dishes",
        items: [
          { id: "ham_hock_beans", name: "Ham hock baked Beans", upcharge: 0 },
          { id: "avocado_eggs", name: "Avocado deviled Eggs", upcharge: 0 },
          { id: "mac_cheese", name: "Mac n' Cheese", upcharge: 0 },
          { id: "stuffed_poblano", name: "Stuffed Poblano peppers", upcharge: 0 },
          { id: "baked_potato_bar", name: "Baked Potato Bar", upcharge: 1.50 },
          { id: "garlic_mashed", name: "Garlic Mashed Potatoes", upcharge: 0 },
          { id: "mini_smashed", name: "Mini Smashed Potatoes", upcharge: 0 },
          { id: "twice_baked", name: "Twice Baked Potatoes", upcharge: 0.50 },
          { id: "corn_cob", name: "Corn on the Cob", upcharge: 0 },
          { id: "creamed_corn", name: "Creamed Corn", upcharge: 0 },
          { id: "jalapeno_poppers", name: "Jalapeño Poppers", upcharge: 0 },
          { id: "brussels_sprouts", name: "Roasted Brussels Sprouts", upcharge: 0 },
          { id: "corn_bread", name: "Corn Bread", upcharge: 0 },
          { id: "jalapeno_cornbread", name: "Jalapeno cornbread", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 },
          { id: "grilled_asparagus", name: "Grilled Asparagus", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5
        }
      },
      salads: {
        title: "Salads",
        description: "Select your salad options",
        items: [
          { id: "caesar", name: "Caesar", upcharge: 0 },
          { id: "coleslaw", name: "Coleslaw", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 },
          { id: "pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "bacon_jalapeno_corn", name: "Bacon Jalapeño Corn Salad", upcharge: 0 },
          { id: "wedge_salad", name: "Wedge Salad", upcharge: 0 },
          { id: "german_cucumber", name: "German cucumber salad", upcharge: 0 },
          { id: "asian_slaw", name: "Crunchy Asian Slaw", upcharge: 0 },
          { id: "cobb_salad", name: "Tossed Cobb Salad", upcharge: 0 },
          { id: "potato_salad", name: "Classic Potato Salad", upcharge: 0 },
          { id: "german_potato", name: "German Potato Salad", upcharge: 0 },
          { id: "macaroni_salad", name: "Macaroni Salad", upcharge: 0 },
          { id: "hawaiian_macaroni", name: "Hawaiian Macaroni Salad", upcharge: 0 },
          { id: "fruit_salad", name: "Fruit Salad", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 2,
          "gold": 3,
          "diamond": 3
        }
      },
      sauces: {
        title: "Sauces",
        description: "Select your sauce options",
        items: [
          { id: "kansas_city", name: "Kansas City BBQ Sauce", upcharge: 0 },
          { id: "south_carolina", name: "South Carolina Gold BBQ Sauce", upcharge: 0 },
          { id: "north_carolina", name: "North Carolina Vinegar based BBQ Sauce", upcharge: 0 },
          { id: "alabama_white", name: "Alabama White BBQ Sauce", upcharge: 0 },
          { id: "texas_bbq", name: "Texas BBQ Sauce", upcharge: 0 },
          { id: "very_berry", name: "Very Berry BBQ Sauce", upcharge: 0 },
          { id: "smoky_bourbon", name: "Smoky bourbon BBQ Sauce", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 2,
          "gold": 3,
          "diamond": 4
        }
      },
      condiments: {
        title: "Condiments",
        description: "Select your condiment options",
        items: [
          { id: "ketchup", name: "Ketchup", upcharge: 0 },
          { id: "stone_ground", name: "Stone Ground Mustard", upcharge: 0 },
          { id: "dijon", name: "Dijon Mustard", upcharge: 0 },
          { id: "yellow_mustard", name: "Yellow Mustard", upcharge: 0 },
          { id: "mayonnaise", name: "Mayonnaise", upcharge: 0 },
          { id: "sweet_pickle", name: "Sweet pickle Chips", upcharge: 0 },
          { id: "dill_pickle", name: "Dill pickle Chips", upcharge: 0 },
          { id: "sliced_radish", name: "Sliced radish", upcharge: 0 },
          { id: "sweet_relish", name: "Sweet Relish", upcharge: 0 },
          { id: "cranberry_relish", name: "Cranberry Relish", upcharge: 0 },
          { id: "kimchi", name: "Kimchi", upcharge: 0 },
          { id: "giardiniera", name: "Mixed Pickled Vegetables - Giardiniera", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 3,
          "gold": 4,
          "diamond": 5
        }
      }
    }
  },
  taste_of_greece: {
    title: "A Taste of Greece Selections",
    packages: [
      { 
        id: "bronze",
        name: "Bronze", 
        price: 32.00,
        description: "Pick 3 Mains, 3 Sides, 2 Salads, Includes pita bread",
        minGuestCount: 50
      },
      { 
        id: "silver",
        name: "Silver", 
        price: 38.00,
        description: "Pick 4 Mains, 3 Sides, 2 Salads, Includes pita bread",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold", 
        price: 46.00,
        description: "Pick 4 Mains, 4 Sides, 2 Salads, Includes spreads selection and pita bread",
        minGuestCount: 0
      },
      { 
        id: "diamond",
        name: "Diamond", 
        price: 59.00,
        description: "Pick 5 Mains, 4 Sides, 3 Salads, Includes spreads selection, meze platter, and pita bread",
        minGuestCount: 0
      }
    ],
    categories: {
      mains: {
        title: "Mains",
        description: "Select your main dishes",
        items: [
          { id: "papoutsakia", name: "Papoutsakia - Classic moussaka in individual eggplant shells", upcharge: 0 },
          { id: "soutzoukakia", name: "Soutzoukakia - Plump meatballs in cinnamon wine-enhanced tomato sauce", upcharge: 0 },
          { id: "kokinisto", name: "Kokinisto - Boneless short rib in cinnamon-scented tomato sauce", upcharge: 0 },
          { id: "kleftiko", name: "Kleftiko - Boldly seasoned lamb roast (Family style only)", upcharge: 5.00 },
          { id: "pastitsio", name: "Pastitsio - Baked pasta with cinnamon-scented meat and béchamel", upcharge: 0 },
          { id: "kotopoulo_lemonato", name: "Kotopoulo lemonato - Lemony baked chicken with fresh herbs", upcharge: 0 },
          { id: "paidakia", name: "Paidakia - Greek lamb chops marinated and grilled to perfection", upcharge: 4.00 },
          { id: "kotsi_arni", name: "Kotsi Arni - Slowly roasted lamb shank with tomato and herbs", upcharge: 0 },
          { id: "bifteki_gemisto", name: "Bifteki Gemisto - Oven-baked minced beef burgers with cheese", upcharge: 0 },
          { id: "psari_plaki", name: "Psari Plaki - Oven-baked fish fillet with tomato and herbs", upcharge: 0 },
          { id: "brizola_solomou", name: "Brizola Solomou - Grilled salmon steaks with herbs and lemon", upcharge: 0 },
          { id: "bakaliaros_plaki", name: "Bakaliaros Plaki - Oven-baked Cod fillet with tomato and herbs", upcharge: 0 },
          { id: "aginares", name: "Aginares Ala Polita - Artichoke hearts with potatoes (Vegan)", upcharge: 0 },
          { id: "gemista", name: "Gemista - Oven-baked stuffed tomatoes and peppers (Vegan)", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 4,
          "gold": 4,
          "diamond": 5
        }
      },
      sides: {
        title: "Sides",
        description: "Select your side dishes",
        items: [
          { id: "lemon_potatoes", name: "Lemon Potatoes - Roasted with oregano, garlic, and lemon", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita - Phyllo dough pouches with spinach and feta", upcharge: 0 },
          { id: "kritharaki", name: "Kritharaki - Orzo pasta baked in the oven", upcharge: 0 },
          { id: "fasolakia", name: "Fasolakia - Green beans with tomato and herbs", upcharge: 0 },
          { id: "gigandes_plaki", name: "Gigandes Plaki - Oven baked lima beans in tomato sauce", upcharge: 0 },
          { id: "tyrokroketes", name: "Tyrokroketes - Cheese balls coated with sesame seeds", upcharge: 0 },
          { id: "octapodi", name: "Octapodi - Spanish octopus slowly braised", upcharge: 7.00 },
          { id: "dolmades", name: "Dolmades - Grape leaves stuffed with rice and herbs", upcharge: 0 },
          { id: "saganaki", name: "Saganaki Cheese - Deep fried and flambeed (Family style only)", upcharge: 2.00 },
          { id: "rice_pilaf", name: "Greek Rice Pilaf - With vegetables and lemon zest", upcharge: 0 },
          { id: "baked_vegetables", name: "Baked Vegetables (Briam) - Thinly sliced vegetable medley", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 3,
          "gold": 4,
          "diamond": 4
        }
      },
      salads: {
        title: "Salads",
        description: "Select your salad options",
        items: [
          { id: "horiatiki", name: "Salata Horiatiki - Traditional Greek salad with feta and olives", upcharge: 0 },
          { id: "lahanosalata", name: "Lahanosalata - Greek coleslaw with cabbage and carrots", upcharge: 0 },
          { id: "maroulosalata", name: "Maroulosalata - Greek romaine salad with scallions", upcharge: 0 },
          { id: "patatosalata", name: "Patatosalata - Warm potato salad with red onions and olives", upcharge: 0 },
          { id: "dakos", name: "Dakos Bread Salad - Fresh tomatoes, barley rusks, and feta", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad - Mixed greens with vegetables", upcharge: 0 },
          { id: "tabouli", name: "Tabouli - Chopped parsley, couscous, and vegetables", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 2,
          "gold": 2,
          "diamond": 3
        }
      },
      spreads: {
        title: "Spreads",
        description: "Gold and Diamond tiers include a selection of spreads",
        items: [
          { id: "tzatziki", name: "Tzatziki - Yogurt, garlic, cucumber, herbs", upcharge: 0 },
          { id: "hummus", name: "Hummus - Chickpea, tahini, lemon", upcharge: 0 },
          { id: "melitzanosalata", name: "Melitzanosalata - Eggplant, garlic, tahini, cilantro", upcharge: 0 },
          { id: "spicy_feta", name: "Spicy Feta - Feta cheese puree with spicy peppers", upcharge: 0 },
          { id: "taramasalata", name: "Taramasalata - Cod roe, potato, extra virgin olive oil", upcharge: 0 },
          { id: "beet_hummus", name: "Beet Hummus - Roasted beets, chickpea, garlic, tahini", upcharge: 0 }
        ],
        limits: {
          "bronze": 0,
          "silver": 0,
          "gold": 3,
          "diamond": 4
        }
      }
    }
  },
  kebab_party: {
    title: "Kebab Party Selections",
    packages: [
      { 
        id: "bronze",
        name: "Bronze", 
        price: 35.00,
        description: "Pick 3 Proteins, 3 Sides, 2 Salads",
        minGuestCount: 50
      },
      { 
        id: "silver",
        name: "Silver", 
        price: 39.00,
        description: "Pick 4 Proteins, 3 Sides, 2 Salads",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold", 
        price: 49.00,
        description: "Pick 4 Proteins, 4 Sides, 3 Salads, Includes spreads",
        minGuestCount: 0
      },
      { 
        id: "diamond",
        name: "Diamond", 
        price: 63.00,
        description: "Pick 5 Proteins, 5 Sides, 3 Salads, Includes spreads and meze grazing board",
        minGuestCount: 0
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        description: "Select your protein options",
        items: [
          { id: "pork_tenderloin", name: "Pork Tenderloin", upcharge: 0 },
          { id: "chicken", name: "Chicken", upcharge: 0 },
          { id: "beef_tenderloin", name: "Beef Tenderloin", upcharge: 0 },
          { id: "beef_flank", name: "Beef Flank", upcharge: 0 },
          { id: "lamb", name: "Lamb", upcharge: 1.50 },
          { id: "swordfish", name: "Swordfish", upcharge: 0 },
          { id: "shrimp", name: "Shrimp", upcharge: 0 },
          { id: "bacon_asparagus", name: "Bacon wrapped Asparagus", upcharge: 0 },
          { id: "tofu", name: "Tofu (V)", upcharge: 0 },
          { id: "mushrooms", name: "Mushrooms (V)", upcharge: 0 },
          { id: "tomato_gnocchi", name: "Tomato & Gnocchi with pesto (V)", upcharge: 0 },
          { id: "mixed_vegetables", name: "Mixed Vegetables (V)", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 4,
          "gold": 4,
          "diamond": 5
        }
      },
      sides: {
        title: "Sides",
        description: "Select your side dishes",
        items: [
          { id: "falafel", name: "Falafel", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita", upcharge: 0 },
          { id: "dolmades", name: "Dolmades", upcharge: 0 },
          { id: "yellow_rice", name: "Yellow Rice Pilaf", upcharge: 0 },
          { id: "wild_rice", name: "Wild Rice and Mushroom Pilaf", upcharge: 0 },
          { id: "patatas_bravas", name: "Patatas Bravas", upcharge: 0 },
          { id: "potato_croquettes", name: "Potato Croquettes", upcharge: 0 },
          { id: "roasted_beets", name: "Roasted beets", upcharge: 0 },
          { id: "brussels_sprouts", name: "Roasted Brussel Sprouts", upcharge: 0 },
          { id: "moroccan_cauliflower", name: "Moroccan-style roasted Cauliflower", upcharge: 0 },
          { id: "roasted_carrots", name: "Roasted carrots", upcharge: 0 },
          { id: "grilled_vegetables", name: "Grilled Vegetables", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 3,
          "gold": 4,
          "diamond": 5
        }
      },
      salads: {
        title: "Salads",
        description: "Select your salad options",
        items: [
          { id: "tabouli", name: "Tabouli", upcharge: 0 },
          { id: "fattoush", name: "Fattoush", upcharge: 0 },
          { id: "couscous", name: "Cous-cous", upcharge: 0 },
          { id: "lebanese_potato", name: "Lebanese Potato Salad", upcharge: 0 },
          { id: "greek_village", name: "Greek Village Salad", upcharge: 0 },
          { id: "tomato_cucumber", name: "Tomato - Cucumber salad", upcharge: 0 },
          { id: "caprese_pasta", name: "Caprese pasta salad", upcharge: 0 },
          { id: "caesar", name: "Caesar", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 2,
          "gold": 3,
          "diamond": 3
        }
      },
      spreads: {
        title: "Spreads",
        description: "Gold and Diamond tiers include spreads with pita bread, crudité and breadsticks",
        items: [
          { id: "tzatziki", name: "Tzatziki", upcharge: 0 },
          { id: "hummus", name: "Hummus", upcharge: 0 },
          { id: "baba_ghanoush", name: "Baba Ghanoush", upcharge: 0 },
          { id: "spicy_feta", name: "Spicy Feta", upcharge: 0 },
          { id: "taramasalata", name: "Taramasalata", upcharge: 0 },
          { id: "muhammara", name: "Muhammara", upcharge: 0 },
          { id: "lebanese_garlic", name: "Lebanese garlic dip", upcharge: 0 }
        ],
        limits: {
          "bronze": 0,
          "silver": 0,
          "gold": 3,
          "diamond": 3
        }
      }
    }
  },
  taste_of_italy: {
    title: "A Taste of Italy Selections",
    packages: [
      { 
        id: "bronze",
        name: "Bronze", 
        price: 32.00,
        description: "Pick 2 Mains, 3 Sides, 1 Pasta, 1 Salad, Includes garlic bread",
        minGuestCount: 50
      },
      { 
        id: "silver",
        name: "Silver", 
        price: 38.00,
        description: "Pick 3 Mains, 3 Sides, 1 Pasta, 2 Salads, Includes garlic bread",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold", 
        price: 46.00,
        description: "Pick 4 Mains, 4 Sides, 1 Pasta, 2 Salads, Includes garlic bread",
        minGuestCount: 0
      },
      { 
        id: "diamond",
        name: "Diamond", 
        price: 58.00,
        description: "Pick 5 Mains, 4 Sides, 1 Pasta, 3 Salads, Includes garlic bread and antipasti platter",
        minGuestCount: 0
      }
    ],
    categories: {
      mains: {
        title: "Mains",
        description: "Select your main dishes",
        items: [
          { id: "chicken_saltimbocca", name: "Chicken Saltimbocca - With sage, parmesan flakes and prosciutto", upcharge: 0 },
          { id: "chicken_florentine", name: "Chicken Florentine - With spinach, garlic, white wine cream sauce", upcharge: 0 },
          { id: "chicken_piccata", name: "Chicken Piccata - With butter, lemon, capers and parsley", upcharge: 0 },
          { id: "chicken_cacciatore", name: "Chicken Cacciatore - With tomato sauce, mushrooms and peppers", upcharge: 0 },
          { id: "chicken_parmesan_white", name: "Chicken Parmesan White - With sun-dried tomato and cream sauce", upcharge: 0 },
          { id: "chicken_parmesan_red", name: "Chicken Parmesan Red - With tomato sauce and mozzarella", upcharge: 0 },
          { id: "chicken_marsala", name: "Chicken Marsala - With mushrooms and Marsala wine sauce", upcharge: 0 },
          { id: "chicken_puttanesca", name: "Chicken Puttanesca - With olives, capers and red pepper", upcharge: 0 },
          { id: "beef_pizzaiola", name: "Beef Pizzaiola - Slowly cooked beef with tomato sauce", upcharge: 0 },
          { id: "beef_braciole", name: "Beef Braciole - Stuffed flank steak braised in tomato sauce", upcharge: 0 },
          { id: "lasagna", name: "Lasagna - Layered beef & pork with ricotta cheese", upcharge: 0 },
          { id: "veal_saltimbocca", name: "Veal Saltimbocca - With sage, parmesan flakes and prosciutto", upcharge: 3.00 },
          { id: "osso_bucco", name: "Osso Bucco - Beef shanks braised with vegetables and red wine", upcharge: 8.00 },
          { id: "brasato_al_barolo", name: "Brasato Al Barolo - Flank steak braised with barolo wine", upcharge: 0 },
          { id: "italian_meatballs", name: "Italian Meatballs", upcharge: 0 },
          { id: "pesce_all_acqua_pazza", name: "Pesce All'Acqua Pazza - Poached Halibut with tomatoes", upcharge: 0 },
          { id: "manicotti", name: "Spinach and Ricotta Manicotti/Cannelloni", upcharge: 0 },
          { id: "vegetarian_lasagna", name: "Vegetarian Lasagna - With artichoke hearts and bechamel", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4,
          "diamond": 5
        }
      },
      sides: {
        title: "Sides",
        description: "Select your side dishes",
        items: [
          { id: "rosemary_potatoes", name: "Rosemary roasted Potatoes", upcharge: 0 },
          { id: "green_beans_almondine", name: "Green Beans Almondine", upcharge: 0 },
          { id: "baked_cauliflower", name: "Baked Cauliflower with bechamel and shaved Parmesan", upcharge: 0 },
          { id: "asiago_zucchini", name: "Asiago Zucchini bites", upcharge: 0 },
          { id: "eggplant_parmesan", name: "Eggplant Parmesan", upcharge: 0 },
          { id: "cannellini_beans", name: "Cannellini Beans with caponata", upcharge: 0 },
          { id: "peas_pancetta", name: "Peas with Pancetta", upcharge: 0 },
          { id: "tuscan_carrots", name: "Tuscan Roasted Carrots", upcharge: 0 },
          { id: "brussels_sprouts", name: "Roasted Brussels sprouts with balsamic Crema", upcharge: 0 }
        ],
        limits: {
          "bronze": 3,
          "silver": 3,
          "gold": 4,
          "diamond": 4
        }
      },
      pasta: {
        title: "Pasta",
        description: "Select your pasta",
        items: [
          { id: "penne_butter", name: "Penne Pasta with butter", upcharge: 0 },
          { id: "penne_pesto", name: "Penne Pasta with Pesto", upcharge: 0 },
          { id: "penne_marinara", name: "Penne Pasta with Marinara", upcharge: 0 },
          { id: "rigatoni_butter", name: "Rigatoni with butter", upcharge: 0 },
          { id: "rigatoni_pesto", name: "Rigatoni with Pesto", upcharge: 0 },
          { id: "rigatoni_marinara", name: "Rigatoni with Marinara", upcharge: 0 },
          { id: "conchiglie_butter", name: "Conchiglie with butter", upcharge: 0 },
          { id: "conchiglie_pesto", name: "Conchiglie with Pesto", upcharge: 0 },
          { id: "conchiglie_marinara", name: "Conchiglie with Marinara", upcharge: 0 }
        ],
        limits: {
          "bronze": 1,
          "silver": 1,
          "gold": 1,
          "diamond": 1
        }
      },
      salads: {
        title: "Salads",
        description: "Select your salad options",
        items: [
          { id: "caprese_avocado", name: "Caprese Stuffed Avocado", upcharge: 0 },
          { id: "panzanella", name: "Panzanella Bread Salad", upcharge: 0 },
          { id: "italian_cobb", name: "Tossed Italian Cobb Salad", upcharge: 0 },
          { id: "sicilian_fennel", name: "Sicilian Fennel Salad", upcharge: 0 },
          { id: "beets_burrata", name: "Roasted Beets with Burrata", upcharge: 0 },
          { id: "caprese", name: "Caprese", upcharge: 0 },
          { id: "pasta_salad", name: "Pasta Salad", upcharge: 0 },
          { id: "tuscan_orzo", name: "Tuscan Orzo Pesto Salad", upcharge: 0 },
          { id: "caesar", name: "Caesar Salad", upcharge: 0 },
          { id: "garden_salad", name: "Garden Salad", upcharge: 0 }
        ],
        limits: {
          "bronze": 1,
          "silver": 2,
          "gold": 2,
          "diamond": 3
        }
      }
    }
  }
};

// Defining Hors d'oeuvres component properties for each step
const horsDoeurvesComponentData = {
  serviceStyles: [
    { id: "stationary", name: "Stationary buffet" },
    { id: "passed", name: "Passed" }
  ],
  // Using the existing horsDoeurvesData for actual food items
  categories: [
    {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      description: "Offered in lots of 48",
      lotSizes: [36, 48, 96, 144],
      items: [
        { id: "pate", name: "Pate with pickled veg", price: 1.95 },
        { id: "cream_cheese_shrimp", name: "Cream Cheese and Shrimp", price: 2.50 },
        { id: "blt", name: "BLT - (Bacon Lettuce & Tomato)", price: 1.95 },
        { id: "caprese", name: "Caprese (Mozzarella, Tomato, & Basil)", price: 1.95 },
        { id: "gravlax", name: "Gravlax, Cream Cheese & Cucumber", price: 2.75 },
        { id: "prosciutto_fig", name: "Prosciutto-Fig", price: 2.75 },
        { id: "crab_salad", name: "Crab Salad", price: 3.00 },
        { id: "chicken_cranberry", name: "Chicken Cranberry", price: 2.00 },
        { id: "miso_egg", name: "Miso egg salad", price: 2.25 }
      ]
    },
    {
      id: "shooters",
      name: "Shooters",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 96, 144],
      items: [
        { id: "chicken_satay", name: "Chicken Satay", price: 2.45 },
        { id: "greek_village", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "gazpacho", name: "Gazpacho with shrimp", price: 2.75 },
        { id: "cucumber_jalapeno", name: "Chilled Cucumber/Jalapeno with shrimp", price: 2.75 },
        { id: "bloody_mary", name: "Bloody Mary with lobster (non-alcoholic)", price: 4.75 },
        { id: "beet_vichyssoise", name: "Roasted beet Vichyssoise with green bean", price: 2.45 },
        { id: "peach_soup", name: "Chilled peach soup with Gravlax", price: 2.75 },
        { id: "avocado_soup", name: "Chilled avocado soup with crab and pico", price: 3.75 }
      ]
    },
    {
      id: "mini_skewers",
      name: "Mini Skewers",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 96, 144],
      items: [
        { id: "korean_pork", name: "Korean BBQ pork belly", price: 2.75 },
        { id: "greek_village_skewer", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "chicken_teriyaki", name: "Chicken Teriyaki", price: 2.75 },
        { id: "moroccan_flank", name: "Grilled Moroccan style Flank steak", price: 2.75 },
        { id: "med_shrimp", name: "Mediterranean style shrimp", price: 2.75 },
        { id: "caprese_skewer", name: "Caprese - Tomato, Basil and Mozzarella - cold", price: 2.25 },
        { id: "prosciutto_melon", name: "Prosciutto, Melon and Basil - cold", price: 2.75 },
        { id: "tofu_hoisin", name: "Tofu with Hoisin plum sauce", price: 2.25 },
        { id: "antipasto", name: "Antipasto Bites", price: 2.75 }
      ]
    },
    {
      id: "canapes",
      name: "Canapes",
      description: "Offered in lots of 48",
      lotSizes: [48, 96, 144],
      items: [
        { id: "watermelon_radish", name: "Watermelon radish chips with apple chutney", price: 2.75 },
        { id: "greek_village_canape", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.75 },
        { id: "french_onion", name: "French onion tartlets with Gruyere and dill", price: 2.75 },
        { id: "pear_camembert", name: "Pear and Camembert tartlet", price: 2.75 },
        { id: "med_shrimp_canape", name: "Mediterranean style shrimp", price: 2.75 },
        { id: "miso_maple", name: "Miso maple deviled eggs", price: 2.75 },
        { id: "beet_chips", name: "Beet chips with goat cheese and asparagus tips", price: 2.75 },
        { id: "vegan_bruschetta", name: "Vegan Bruschetta with olive tapenade and mint coulis", price: 2.75 }
      ]
    },
    {
      id: "vol_au_vents",
      name: "Vol au vents",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 96],
      items: [
        { id: "gravlax_cream", name: "Gravlax with cream cheese", price: 3.00 },
        { id: "spinach_feta", name: "Spinach, feta and leek", price: 3.00 },
        { id: "chicken_teriyaki_vol", name: "Chicken Teriyaki", price: 3.00 },
        { id: "melted_brie", name: "Melted Brie with cranberry relish", price: 3.50 },
        { id: "curried_chicken", name: "Curried chicken salad", price: 3.00 },
        { id: "tuna_tartare", name: "Tuna tartare", price: 3.75 },
        { id: "brie_walnut", name: "Brie with walnuts and mushrooms", price: 3.25 },
        { id: "pulled_pork", name: "Pulled pork with prunes and apple", price: 3.25 }
      ]
    }
  ]
};

// Matrix-style Hors d'oeuvres component
const HorsDoeurvesMatrix = ({ 
  category, 
  onSelectionChange
}: { 
  category: {
    id: string;
    name: string;
    description: string;
    lotSizes: number[];
    items: Array<{
      id: string;
      name: string;
      price: number;
    }>
  }; 
  onSelectionChange: (itemId: string, quantity: number | null) => void;
}) => {
  const { watch } = useFormContext<EventInquiryFormData>();
  const horsDoeurvesSelections = watch("horsDoeurvesSelections");
  
  // Get selected quantity for an item
  const getSelectedQuantity = (itemId: string): number | null => {
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories || 
        !horsDoeurvesSelections.categories[category.id] || 
        !horsDoeurvesSelections.categories[category.id].items) {
      return null;
    }
    
    return horsDoeurvesSelections.categories[category.id].items[itemId]?.quantity || null;
  };
  
  // Clear a selection
  const clearSelection = (itemId: string) => {
    onSelectionChange(itemId, null);
  };
  
  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2">{category.name} - {category.description}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left w-1/3">Item</th>
              {category.lotSizes.map((size: number) => (
                <th key={size} className="p-2 border text-center">{size}</th>
              ))}
              <th className="p-2 border text-center">Clear Choice</th>
            </tr>
          </thead>
          <tbody>
            {category.items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-2 border">
                  {item.name} (${item.price.toFixed(2)} each)
                </td>
                {category.lotSizes.map((size: number) => (
                  <td key={size} className="p-2 border text-center">
                    <div 
                      className={`w-6 h-6 rounded-full border mx-auto cursor-pointer flex items-center justify-center
                        ${getSelectedQuantity(item.id) === size ? 'bg-primary border-primary' : 'border-gray-300'}`}
                      onClick={() => onSelectionChange(item.id, size)}
                    >
                      {getSelectedQuantity(item.id) === size && <div className="w-3 h-3 rounded-full bg-white"></div>}
                    </div>
                  </td>
                ))}
                <td className="p-2 border text-center">
                  <div 
                    className={`w-6 h-6 rounded-full border mx-auto cursor-pointer flex items-center justify-center
                      ${getSelectedQuantity(item.id) === null ? 'bg-gray-200 border-gray-400' : 'border-gray-300'}`}
                    onClick={() => clearSelection(item.id)}
                  >
                    {getSelectedQuantity(item.id) === null && <div className="w-3 h-3 rounded-full bg-white"></div>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Total: ${calculateCategoryTotal(category, horsDoeurvesSelections).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

// Helper function to calculate total for a category
const calculateCategoryTotal = (category: any, selections: any): number => {
  if (!selections || !selections.categories || !selections.categories[category.id]) {
    return 0;
  }
  
  let total = 0;
  const categorySelections = selections.categories[category.id].items || {};
  
  Object.keys(categorySelections).forEach(itemId => {
    const item = category.items.find((i: any) => i.id === itemId);
    const quantity = categorySelections[itemId].quantity;
    
    if (item && quantity) {
      total += item.price * quantity;
    }
  });
  
  return total;
};

// Step 5: Appetizers & Hors d'oeuvres Selection Component
const AppetizersStep = ({ 
  onPrevious,
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  
  // Get form values
  const appetizerService = watch("appetizerService");
  const appetizers = watch("appetizers");
  const horsDoeurvesSelections = watch("horsDoeurvesSelections");
  
  // Make sure we have the horsDoeurvesSelections structure initialized
  useEffect(() => {
    // Initialize horsDoeurvesSelections with empty structure if needed
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories) {
      setValue("horsDoeurvesSelections", {
        serviceStyle: horsDoeurvesSelections?.serviceStyle || "stationary",
        categories: {}
      });
    }
    
    // We don't modify requestedTheme here to avoid navigation issues
  }, []);
  
  // Initialize appetizers structure if needed
  const initializeCategory = (categoryId: string) => {
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }
  };

  // Handle service style selection
  const handleServiceStyleChange = (value: string) => {
    setValue("appetizerService", value as "stationary" | "passed");
  };
  
  // Initialize horsDoeurvesSelections if needed
  const initializeHorsDoeurvesSelections = () => {
    if (!horsDoeurvesSelections) {
      setValue("horsDoeurvesSelections", {
        serviceStyle: "stationary",
        categories: {}
      });
    }
  };
  
  // Handle Hors d'oeuvres service style selection
  const handleHorsDoeurvesServiceStyleChange = (value: string) => {
    initializeHorsDoeurvesSelections();
    setValue("horsDoeurvesSelections.serviceStyle", value as "stationary" | "passed");
  };
  
  // Handle matrix selection for hors d'oeuvres
  const handleHorsDoeurvesItemSelection = (categoryId: string, itemId: string, quantity: number | null) => {
    initializeHorsDoeurvesSelections();
    
    // Make sure the category exists
    if (!horsDoeurvesSelections?.categories?.[categoryId]) {
      setValue(`horsDoeurvesSelections.categories.${categoryId}`, {
        items: {}
      });
    }
    
    if (quantity === null) {
      // Clear selection
      if (horsDoeurvesSelections?.categories?.[categoryId]?.items?.[itemId]) {
        const updatedItems = { ...horsDoeurvesSelections.categories[categoryId].items };
        delete updatedItems[itemId];
        setValue(`horsDoeurvesSelections.categories.${categoryId}.items`, updatedItems);
      }
    } else {
      // Set selection
      const item = horsDoeurvesData.categories
        .find(cat => cat.id === categoryId)?.items
        .find(item => item.id === itemId);
        
      if (item) {
        setValue(`horsDoeurvesSelections.categories.${categoryId}.items.${itemId}`, {
          name: item.name,
          price: item.price,
          quantity
        });
      }
    }
  };
  
  // Get the selected quantity for an item in the matrix
  const getSelectedQuantity = (categoryId: string, itemId: string): number | null => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items?.[itemId]) {
      return null;
    }
    return horsDoeurvesSelections.categories[categoryId].items[itemId].quantity;
  };
  
  // Calculate total for specific hors d'oeuvres category
  const calculateCategoryTotal = (categoryId: string): number => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items) {
      return 0;
    }
    
    let categoryTotal = 0;
    const category = horsDoeurvesData.categories.find(c => c.id === categoryId);
    const items = horsDoeurvesSelections.categories[categoryId].items;
    
    // For per-person pricing (like charcuterie)
    if (category?.perPersonPricing) {
      const guestCount = watch("guestCount") || 0;
      
      Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.price) {
          categoryTotal += item.price * guestCount;
        }
      });
    } 
    // For item-based pricing (standard options)
    else {
      Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.quantity && item.price) {
          categoryTotal += item.price * item.quantity;
        }
      });
    }
    
    return categoryTotal;
  };
  
  // Count all selected items in a category
  const getCategorySelectionCount = (categoryId: string): number => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items) {
      return 0;
    }
    
    return Object.keys(horsDoeurvesSelections.categories[categoryId].items).length;
  };
  
  // Calculate total for all hors d'oeuvres
  const calculateHorsDoeurvesTotal = (): number => {
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories) {
      return 0;
    }
    
    let total = 0;
    
    // Calculate total for each category
    Object.keys(horsDoeurvesSelections.categories).forEach(categoryId => {
      total += calculateCategoryTotal(categoryId);
    });
    
    // Add passed service surcharge if applicable
    if (horsDoeurvesSelections.serviceStyle === "passed") {
      const guestCount = watch("guestCount") || 0;
      total += 5 * guestCount; // $5 per guest surcharge
    }
    
    return total;
  };
  
  // Handle appetizer quantity change
  const handleQuantityChange = (categoryId: string, itemId: string, itemName: string, quantity: number) => {
    // Make sure the category exists
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }
    
    // Find if the item already exists
    const existingItems = appetizers[categoryId] || [];
    const existingItemIndex = existingItems.findIndex(item => item.name === itemName);
    
    if (quantity === 0) {
      // Remove item if quantity is 0
      if (existingItemIndex !== -1) {
        const newItems = [...existingItems];
        newItems.splice(existingItemIndex, 1);
        setValue(`appetizers.${categoryId}`, newItems);
      }
    } else {
      // Update or add item
      if (existingItemIndex !== -1) {
        // Update existing item
        const newItems = [...existingItems];
        newItems[existingItemIndex] = { name: itemName, quantity };
        setValue(`appetizers.${categoryId}`, newItems);
      } else {
        // Add new item
        setValue(`appetizers.${categoryId}`, [...existingItems, { name: itemName, quantity }]);
      }
    }
  };
  
  // Get quantity for an item
  const getItemQuantity = (categoryId: string, itemName: string): number => {
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) {
      return 0;
    }
    
    const item = appetizers[categoryId].find(item => item && item.name === itemName);
    return item ? item.quantity : 0;
  };
  
  // Handle spread selection
  const handleSpreadSelection = (itemId: string, itemName: string, isSelected: boolean) => {
    const categoryId = "spreads";
    initializeCategory(categoryId);
    
    const spreadsCategory = appetizerData.categories.find(cat => cat.id === categoryId);
    if (!spreadsCategory) return;
    
    const existingItems = appetizers[categoryId] || [];
    const existingItemIndex = existingItems.findIndex(item => item.name === itemName);
    
    if (isSelected) {
      // Check if we're at the selection limit
      if (existingItems.length >= spreadsCategory.selectLimit && existingItemIndex === -1) {
        return; // At limit, don't add
      }
      
      // Add item with default quantity of 1 (will be updated later with serving size)
      if (existingItemIndex === -1) {
        setValue(`appetizers.${categoryId}`, [...existingItems, { name: itemName, quantity: 1 }]);
      }
    } else {
      // Remove item
      if (existingItemIndex !== -1) {
        const newItems = [...existingItems];
        newItems.splice(existingItemIndex, 1);
        setValue(`appetizers.${categoryId}`, newItems);
      }
    }
  };
  
  // Handle spread serving size change
  const handleSpreadServingSizeChange = (servingSize: number) => {
    const categoryId = "spreads";
    const existingItems = appetizers[categoryId] || [];
    
    // Update quantity for all selected spreads
    const updatedItems = existingItems.map(item => ({
      ...item,
      quantity: servingSize
    }));
    
    setValue(`appetizers.${categoryId}`, updatedItems);
  };
  
  // Check if a spread is selected
  const isSpreadSelected = (itemName: string): boolean => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) return false;
    
    return appetizers[categoryId].some(item => item && item.name === itemName);
  };
  
  // Count selected spreads
  const getSelectedSpreadsCount = (): number => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) return 0;
    
    return appetizers[categoryId].length;
  };
  
  // Get the spreads serving size
  const getSpreadsServingSize = (): number => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId]) || appetizers[categoryId].length === 0) {
      return 24; // Default to first serving size
    }
    
    // All spreads have the same quantity/serving size
    return appetizers[categoryId][0].quantity || 24;
  };
  
  // Check if spreads selection limit is reached
  const isSpreadsLimitReached = (): boolean => {
    const categoryId = "spreads";
    const spreadsCategory = appetizerData.categories.find(cat => cat.id === categoryId);
    if (!spreadsCategory) return false;
    
    const selectedCount = getSelectedSpreadsCount();
    return selectedCount >= (spreadsCategory.selectLimit || 3);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Hors d'oeuvres</h2>
        <p className="text-lg text-gray-600">
          Select appetizers to enhance your event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* General Notes and Instructions */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-lg font-medium mb-2">General Notes for Hors d'oeuvres:</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>When selecting a service style, there is a minimum $5.00 per guest surcharge for "Passed" service, depending on the number of guests and service duration.</li>
            <li>Items are offered in specific lot sizes as indicated for each category.</li>
            <li>Click the radio buttons to select the quantity for each item you want.</li>
          </ul>
        </div>
        
        {/* Service Style Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Style</h3>
          
          <RadioGroup 
            value={horsDoeurvesSelections?.serviceStyle || "stationary"} 
            onValueChange={handleHorsDoeurvesServiceStyleChange}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stationary" id="stationary-buffet" />
              <Label htmlFor="stationary-buffet">Stationary buffet</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passed" id="passed-service" />
              <Label htmlFor="passed-service">Passed by Servers</Label>
            </div>
          </RadioGroup>
          
          {horsDoeurvesSelections?.serviceStyle === "passed" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Passed service includes a minimum $5.00 per guest surcharge for additional service staff.
              </p>
            </div>
          )}
        </div>
        
        {/* Matrix Selection for Hors d'oeuvres */}
        <div className="space-y-12">
          {horsDoeurvesData.categories.map((category) => {
            // Special handling for spreads which uses a different UI
            if (category.id === "spreads") {
              // Calculate selectedCount at a higher scope level to fix the scoping issue
              const currentSpreadsCategorySelections = horsDoeurvesSelections?.categories?.[category.id]?.items;
              const selectedCountForSpreads = currentSpreadsCategorySelections ? 
                Object.keys(currentSpreadsCategorySelections).length : 0;
                
              return (
                <div key={category.id} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.description}</p>
                      <p className="text-sm text-gray-500 mt-1">Select up to {category.selectLimit} options ({selectedCountForSpreads} selected)</p>
                    </div>
                    {category.basePrice && (
                      <div className="text-lg font-medium">${category.basePrice.toFixed(2)} <span className="text-sm text-gray-500">per person</span></div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {category.items.map((item) => {
                      const isSelected = currentSpreadsCategorySelections?.[item.id] !== undefined;
                      const isAtLimit = selectedCountForSpreads >= (category.selectLimit || 3) && !isSelected;
                      
                      return (
                        <div key={item.id} className="relative">
                          <label className={`
                            flex items-center p-3 border rounded-md cursor-pointer
                            ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}
                            ${isAtLimit ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                          `}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked === "indeterminate") return;
                                if (checked) {
                                  if (selectedCountForSpreads < (category.selectLimit || 3)) {
                                    handleHorsDoeurvesItemSelection(category.id, item.id, category.servingSizes?.[0] || 24);
                                  }
                                } else {
                                  handleHorsDoeurvesItemSelection(category.id, item.id, null);
                                }
                              }}
                              disabled={isAtLimit}
                              className="mr-3"
                            />
                            <div className="font-medium">{item.name}</div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Serving Size Selection for spreads */}
                  {selectedCountForSpreads > 0 && category.servingSizes && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="font-medium mb-2">Select serving size:</h4>
                      <RadioGroup 
                        value={String(
                          currentSpreadsCategorySelections?.[
                            Object.keys(currentSpreadsCategorySelections || {})[0]
                          ]?.quantity || category.servingSizes[0]
                        )} 
                        onValueChange={(value) => {
                          const quantity = Number(value);
                          // Update all selected items with the same quantity
                          if (currentSpreadsCategorySelections) {
                            Object.keys(currentSpreadsCategorySelections).forEach(itemId => {
                              handleHorsDoeurvesItemSelection(category.id, itemId, quantity);
                            });
                          }
                        }}
                        className="flex flex-wrap gap-4"
                      >
                        {category.servingSizes.map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(size)} id={`serving-${category.id}-${size}`} />
                            <Label htmlFor={`serving-${category.id}-${size}`}>{size} servings</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            }
            
            // Matrix-style selection for other hors d'oeuvres categories
            return (
              <div key={category.id} className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                
                {/* Card-Based Item Selection with Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <Card key={item.id} className="mb-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>
                          ${item.price.toFixed(2)} each. {category.description || `Offered in lots of ${category.lotSizes.join(', ')}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`quantity-${category.id}-${item.id}`} className="text-base">Quantity:</Label>
                          <Controller
                            name={`horsDoeurvesSelections.categories.${category.id}.items.${item.id}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                onValueChange={(value) => {
                                  const newQuantity = value === "0" ? null : parseInt(value, 10);
                                  handleHorsDoeurvesItemSelection(category.id, item.id, newQuantity);
                                }}
                                value={getSelectedQuantity(category.id, item.id)?.toString() || "0"}
                              >
                                <SelectTrigger className="w-[150px]" id={`quantity-${category.id}-${item.id}`}>
                                  <SelectValue placeholder="Select quantity" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">None</SelectItem>
                                  {category.lotSizes.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        
                        {/* Display item total dynamically */}
                        {getSelectedQuantity(category.id, item.id) && (
                          <div className="mt-3 text-sm font-semibold text-right">
                            Item Total: $
                            {(
                              item.price * getSelectedQuantity(category.id, item.id)
                            ).toFixed(2)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Display total for this category */}
                {horsDoeurvesSelections?.categories?.[category.id]?.items && 
                 Object.keys(horsDoeurvesSelections.categories[category.id].items).length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="font-medium">
                        Category Total: ${calculateCategoryTotal(category.id).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Total for all selections */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Total for Hors d'oeuvres</h3>
              <div className="text-xl font-bold text-primary">
                ${calculateHorsDoeurvesTotal().toFixed(2)}
              </div>
            </div>
            
            {horsDoeurvesSelections?.serviceStyle === "passed" && (
              <div className="mt-2 text-sm text-gray-600">
                Includes ${(5 * (watch("guestCount") || 0)).toFixed(2)} service charge for passed service
              </div>
            )}
          </div>
        </div>
        
        {/* Traditional Appetizers Section Header */}
        <div className="mt-12 mb-6 border-t pt-8">
          <h3 className="text-xl font-semibold mb-2">Traditional Appetizers</h3>
          <p className="text-gray-600">You can also select from our traditional appetizer options below:</p>
        </div>
        
        {/* Traditional Appetizer Categories */}
        <div className="space-y-10">
          {appetizerData.categories.map((category) => {
            // Special handling for spreads
            if (category.id === "spreads") {
              return (
                <div key={category.id} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.note} ({getSelectedSpreadsCount()} of {category.selectLimit} selected)</p>
                    </div>
                    <div className="text-lg font-medium">${category.basePrice.toFixed(2)} <span className="text-sm text-gray-500">per person</span></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="relative">
                        <label className={`
                          flex items-center p-3 border rounded-md cursor-pointer
                          ${isSpreadSelected(item.name) ? 'border-primary bg-primary/5' : 'border-gray-200'}
                          ${(!isSpreadSelected(item.name) && isSpreadsLimitReached()) ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                        `}>
                          <Checkbox
                            checked={isSpreadSelected(item.name)}
                            onCheckedChange={(checked) => {
                              if (checked === "indeterminate") return;
                              handleSpreadSelection(item.id, item.name, !!checked);
                            }}
                            disabled={!isSpreadSelected(item.name) && isSpreadsLimitReached()}
                            className="mr-3"
                          />
                          <div className="font-medium">{item.name}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {/* Serving Size Selection - only show if some spreads are selected */}
                  {getSelectedSpreadsCount() > 0 && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="font-medium mb-2">Select serving size:</h4>
                      <RadioGroup 
                        value={String(getSpreadsServingSize())} 
                        onValueChange={(value) => handleSpreadServingSizeChange(Number(value))}
                        className="flex flex-wrap gap-4"
                      >
                        {category.servingSizes.map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(size)} id={`serving-${size}`} />
                            <Label htmlFor={`serving-${size}`}>{size} servings</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            }
            
            // Regular appetizer categories
            return (
              <div key={category.id} className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.note}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-md">
                      <div className="mb-2 md:mb-0">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">${item.price.toFixed(2)} each</div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Label htmlFor={`qty-${category.id}-${item.id}`} className="text-sm whitespace-nowrap">
                          Quantity:
                        </Label>
                        
                        <Select
                          defaultValue="0"
                          value={String(getItemQuantity(category.id, item.name) || 0)}
                          onValueChange={(value) => handleQuantityChange(category.id, item.id, item.name, Number(value))}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Qty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {category.lotSizes?.map((size) => (
                              <SelectItem key={size} value={String(size)}>
                                {size}
                              </SelectItem>
                            )) || (
                              <SelectItem value="24">24</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {getItemQuantity(category.id, item.name) > 0 && (
                          <div className="text-sm font-medium">
                            Total: ${(item.price * getItemQuantity(category.id, item.name)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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

// Step 4: Menu Selection Component
const MenuSelectionStep = ({ 
  selectedTheme,
  guestCount,
  onPrevious,
  onNext 
}: { 
  selectedTheme: string;
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  
  // Watch the selected package
  const selectedPackage = watch("selectedPackage");
  const menuSelections = watch("menuSelections");
  
  // Get the theme menu data or show default message if theme not found
  const themeData = themeMenuData[selectedTheme as keyof typeof themeMenuData];
  
  if (!themeData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Menu Selection</h2>
          <p className="text-lg text-gray-600">
            Please complete the previous steps to select a menu theme.
          </p>
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
        </div>
      </div>
    );
  }
  
  // Get category selection limits based on the selected package
  const getCategoryLimits = (categoryKey: string) => {
    if (!selectedPackage || !themeData.categories[categoryKey as keyof typeof themeData.categories]) {
      return 0;
    }
    
    const category = themeData.categories[categoryKey as keyof typeof themeData.categories];
    return category.limits[selectedPackage as keyof typeof category.limits] || 0;
  };
  
  // Check if a category is available for the selected package
  const isCategoryAvailable = (categoryKey: string) => {
    return getCategoryLimits(categoryKey) > 0;
  };
  
  // Count selected items in a category
  const getSelectedCount = (categoryKey: string) => {
    if (!menuSelections || !menuSelections[categoryKey as keyof typeof menuSelections]) {
      return 0;
    }
    return menuSelections[categoryKey as keyof typeof menuSelections].length;
  };
  
  // Check if selection limit is reached for a category
  const isSelectionLimitReached = (categoryKey: string) => {
    const limit = getCategoryLimits(categoryKey);
    const count = getSelectedCount(categoryKey);
    return count >= limit;
  };
  
  // Handle selection of an item in a category
  const handleItemSelection = (categoryKey: string, itemId: string, isSelected: boolean) => {
    const currentSelections = menuSelections[categoryKey as keyof typeof menuSelections] || [];
    
    let newSelections;
    if (isSelected) {
      // Add item if not at limit
      if (!isSelectionLimitReached(categoryKey)) {
        newSelections = [...currentSelections, itemId];
      } else {
        // At limit, don't add
        newSelections = currentSelections;
      }
    } else {
      // Remove item
      newSelections = currentSelections.filter(id => id !== itemId);
    }
    
    setValue(`menuSelections.${categoryKey}`, newSelections);
  };
  
  // Set hors d'oeuvres as the theme if no other theme is selected
  React.useEffect(() => {
    if (!selectedTheme || selectedTheme === "") {
      setValue("requestedTheme", "hors_doeuvres");
    }
  }, [selectedTheme, setValue]);
  
  // Check if an item is selected
  const isItemSelected = (categoryKey: string, itemId: string) => {
    const currentSelections = menuSelections[categoryKey as keyof typeof menuSelections] || [];
    return currentSelections.includes(itemId);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">{themeData.title}</h2>
        <p className="text-lg text-gray-600">
          Select your preferred package and menu items
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Package Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Select a Package</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {themeData.packages.map((pkg) => (
              <div key={pkg.id}>
                {pkg.minGuestCount > 0 && guestCount < pkg.minGuestCount ? (
                  // Disabled package with warning
                  <div className="border border-gray-200 rounded-md p-4 opacity-60 cursor-not-allowed">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium text-gray-500">{pkg.name}</h4>
                      <span className="text-lg font-semibold text-gray-500">${pkg.price} / person</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{pkg.description}</p>
                    <div className="flex items-center text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">
                        Minimum {pkg.minGuestCount} guests required for this package
                      </span>
                    </div>
                  </div>
                ) : (
                  // Active package
                  <div 
                    className={`border rounded-md p-4 cursor-pointer transition-all duration-200 ${
                      selectedPackage === pkg.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => setValue("selectedPackage", pkg.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium">{pkg.name}</h4>
                      <span className="text-lg font-semibold">${pkg.price} / person</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                    <div className="flex justify-end">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        selectedPackage === pkg.id 
                          ? 'bg-primary text-white' 
                          : 'border border-gray-300'
                      }`}>
                        {selectedPackage === pkg.id && <Check className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Food Categories - Only show if a package is selected */}
        {selectedPackage && (
          <div className="space-y-8">
            {/* Map through available categories */}
            {Object.entries(themeData.categories).map(([categoryKey, category]) => {
              // Skip categories not available for this package
              if (!isCategoryAvailable(categoryKey)) return null;
              
              const selectionLimit = getCategoryLimits(categoryKey);
              const selectedCount = getSelectedCount(categoryKey);
              
              return (
                <div key={categoryKey} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{category.title}</h3>
                    <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full">
                      {selectedCount} of {selectionLimit} selected
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item) => (
                      <div key={item.id} className="relative">
                        <label className={`
                          flex items-center justify-between p-3 border rounded-md
                          ${isItemSelected(categoryKey, item.id) ? 'border-primary bg-primary/5' : 'border-gray-200'}
                          ${(!isItemSelected(categoryKey, item.id) && isSelectionLimitReached(categoryKey)) 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'cursor-pointer hover:border-primary/50'}
                        `}>
                          <div className="flex items-start">
                            <Checkbox
                              checked={isItemSelected(categoryKey, item.id)}
                              onCheckedChange={(checked) => {
                                if (checked === "indeterminate") return;
                                handleItemSelection(categoryKey, item.id, !!checked);
                              }}
                              disabled={!isItemSelected(categoryKey, item.id) && isSelectionLimitReached(categoryKey)}
                              className="mr-3 mt-0.5"
                            />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.upcharge > 0 && (
                                <div className="text-sm text-amber-600">+${item.upcharge.toFixed(2)} per person</div>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!selectedPackage && (
          <div className="text-center p-8 bg-gray-50 rounded-md">
            <p className="text-gray-500">Please select a package above to view food options.</p>
          </div>
        )}
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

// Convert URL parameter to actual event type
function mapUrlToEventType(type: string): EventType | null {
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

export default function PublicInquiryForm({ initialEventType = "" }: { initialEventType?: string }) {
  // Map the URL parameter to a valid event type
  const mappedEventType = initialEventType ? mapUrlToEventType(initialEventType) : null;
  
  // Define form with default values
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
      menuSelections: {
        proteins: [],
        sides: [],
        salads: [],
        salsas: [],
        desserts: [],
        addons: []
      },
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
      dessertSelections: {},
      servingAlcohol: [],
      additionalCocktails: false,
      barEquipment: {},
      nonAlcoholicBeverages: {},
      tableWaterService: false,
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
    "appetizers",    // Keep appetizers as step 5
    "desserts", 
    "beverages",
    "equipment",
    "review"
  ];
  
  const currentStepNumber = steps.indexOf(currentStep) + 1;
  const totalSteps = steps.length;
  
  // Handler for event type selection
  const handleEventTypeSelect = (type: EventType) => {
    setValue("eventType", type);
    setCurrentStep("basicInfo");
  };
  
  // Navigation handlers
  const handlePrevious = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };
  
  const handleNext = () => {
    const currentIndex = steps.indexOf(currentStep);
    const currentFormTheme = watch("requestedTheme"); // Get current theme
    
    if (currentIndex < steps.length - 1) {
      let nextStep = steps[currentIndex + 1];
      
      // Handle special navigation based on current step and theme selection
      if (currentStep === "eventDetails") {
        // If hors_doeuvres is selected, skip menuSelection and go directly to appetizers
        if (currentFormTheme === "hors_doeuvres") {
          // Find the index of appetizers step
          const appetizersIndex = steps.indexOf("appetizers");
          if (appetizersIndex > -1) {
            nextStep = "appetizers";
          }
        }
        // For all other themes, proceed normally to menuSelection
      }
      
      setCurrentStep(nextStep);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Event Inquiry | Elite Catering Services</title>
        <meta name="description" content="Tell us about your event and get a personalized catering quote. We offer services for weddings, corporate events, birthdays, and more special occasions." />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 pb-12">
        <PublicFormHeader />
        
        <FormProvider {...methods}>
          <Form {...methods}>
            <form noValidate className="space-y-8">
              {/* Progress bar - only show after event type selection */}
              {currentStep !== "eventType" && (
                <div className="container mx-auto px-4 max-w-3xl">
                  <FormProgressBar 
                    currentStep={currentStepNumber} 
                    totalSteps={totalSteps} 
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
              
              {currentStep === "appetizers" && eventType && (
                <AppetizersStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {/* Additional steps will be rendered here */}
              {/* For now, we've implemented the first five steps */}
              
              {currentStep !== "eventType" && 
               currentStep !== "basicInfo" && 
               currentStep !== "eventDetails" &&
               currentStep !== "menuSelection" &&
               currentStep !== "appetizers" && (
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