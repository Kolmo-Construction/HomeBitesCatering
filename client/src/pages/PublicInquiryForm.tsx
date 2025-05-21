import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cake, Calendar, Gift, Users, Truck, Wine, Utensils, 
  ChevronRight, ChevronLeft, Check, Building, Phone,
  MapPin, Clock, Send, Users2, LayoutGrid
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
  appetizers: Record<string, { name: string, quantity: number }[]>;
  
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

// Appetizer data
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
    { value: "custom_menu", label: "Custom Menu" },
    { value: "hors_doeuvres", label: "Hor d'oeuvres only (Cocktail party)" },
    { value: "food_truck", label: "Food Truck" },
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
        name: "Bronze Package", 
        price: 21.95,
        description: "2 proteins, 2 sides, cornbread & butter",
        minGuestCount: 50
      },
      { 
        id: "silver",
        name: "Silver Package", 
        price: 26.95,
        description: "3 proteins, 3 sides, cornbread & butter",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold Package", 
        price: 31.95,
        description: "4 proteins, 4 sides, cornbread & butter, 1 dessert",
        minGuestCount: 0
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        items: [
          { id: "pulled_pork", name: "Pulled Pork", upcharge: 0 },
          { id: "brisket", name: "Brisket", upcharge: 3.00 },
          { id: "chicken", name: "BBQ Chicken", upcharge: 0 },
          { id: "ribs", name: "Ribs", upcharge: 3.00 },
          { id: "sausage", name: "Sausage", upcharge: 0 },
          { id: "burnt_ends", name: "Burnt Ends", upcharge: 4.00 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4
        }
      },
      sides: {
        title: "Sides",
        items: [
          { id: "mac_cheese", name: "Mac & Cheese", upcharge: 0 },
          { id: "baked_beans", name: "Baked Beans", upcharge: 0 },
          { id: "coleslaw", name: "Coleslaw", upcharge: 0 },
          { id: "potato_salad", name: "Potato Salad", upcharge: 0 },
          { id: "green_beans", name: "Green Beans", upcharge: 0 },
          { id: "corn", name: "Corn on the Cob", upcharge: 0 },
          { id: "collard_greens", name: "Collard Greens", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4
        }
      }
    }
  },
  taste_of_greece: {
    title: "A Taste of Greece Selections",
    packages: [
      { 
        id: "bronze",
        name: "Bronze Package", 
        price: 22.95,
        description: "2 proteins, 2 sides, pita bread & tzatziki",
        minGuestCount: 40
      },
      { 
        id: "silver",
        name: "Silver Package", 
        price: 27.95,
        description: "3 proteins, 3 sides, pita bread, tzatziki & hummus",
        minGuestCount: 0
      },
      { 
        id: "gold",
        name: "Gold Package", 
        price: 32.95,
        description: "4 proteins, 4 sides, pita bread, dips platter",
        minGuestCount: 0
      }
    ],
    categories: {
      proteins: {
        title: "Proteins",
        items: [
          { id: "chicken_souvlaki", name: "Chicken Souvlaki", upcharge: 0 },
          { id: "pork_souvlaki", name: "Pork Souvlaki", upcharge: 0 },
          { id: "gyro_meat", name: "Gyro Meat (Beef/Lamb)", upcharge: 2.00 },
          { id: "lamb_chops", name: "Lamb Chops", upcharge: 5.00 },
          { id: "moussaka", name: "Moussaka", upcharge: 0 },
          { id: "pastitsio", name: "Pastitsio", upcharge: 0 },
          { id: "stuffed_peppers", name: "Vegetarian Stuffed Peppers", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4
        }
      },
      sides: {
        title: "Sides",
        items: [
          { id: "greek_salad", name: "Greek Salad", upcharge: 0 },
          { id: "lemon_potatoes", name: "Lemon Potatoes", upcharge: 0 },
          { id: "rice_pilaf", name: "Greek Rice Pilaf", upcharge: 0 },
          { id: "spanakopita", name: "Spanakopita", upcharge: 1.50 },
          { id: "dolmades", name: "Dolmades (Stuffed Grape Leaves)", upcharge: 1.50 },
          { id: "orzo_salad", name: "Orzo Salad", upcharge: 0 }
        ],
        limits: {
          "bronze": 2,
          "silver": 3,
          "gold": 4
        }
      }
    }
  }
};

// Step 5: Appetizers Selection Component
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
        {/* Service Style Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Style</h3>
          
          <RadioGroup 
            value={appetizerService} 
            onValueChange={handleServiceStyleChange}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stationary" id="stationary" />
              <Label htmlFor="stationary">Stationary Buffet</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passed" id="passed" />
              <Label htmlFor="passed">Passed by Servers</Label>
            </div>
          </RadioGroup>
          
          {appetizerService === "passed" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Passed service includes a minimum $5.00 per guest surcharge for additional service staff.
              </p>
            </div>
          )}
        </div>
        
        {/* Appetizer Categories */}
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
          disabled={!selectedPackage}
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Main component
export default function PublicInquiryForm() {
  // Define form with default values
  const methods = useForm<EventInquiryFormData>({
    defaultValues: {
      eventType: null,
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
  const [currentStep, setCurrentStep] = useState<FormStep>("eventType");
  
  // Calculate step number and total steps
  const steps: FormStep[] = [
    "eventType", 
    "basicInfo", 
    "eventDetails", 
    "menuSelection", 
    "appetizers", 
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
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
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