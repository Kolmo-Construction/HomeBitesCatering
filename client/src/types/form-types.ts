import { ReactNode } from "react";

// Event types
export type EventType = 
  | "Wedding" 
  | "Corporate" 
  | "Engagement" 
  | "Birthday" 
  | "Food Truck" 
  | "Mobile Bartending" 
  | "Other Private Party";

// Form steps definition
export type FormStep = 
  | "eventType" 
  | "basicInfo" 
  | "eventDetails" 
  | "menuSelection" 
  | "appetizerQuestion" 
  | "appetizers" 
  | "foodTruckMenu"  // Added Food Truck menu step
  | "sandwichFactoryMenu" // Added Sandwich Factory menu step
  | "dessertQuestion" // Added Dessert question step
  | "desserts" 
  | "beverages"
  | "equipment"
  | "dietaryRestrictions"
  | "review";

// Dessert lot sizes for quantity selection
export type DessertLotSize = 36 | 48 | 72 | 96 | 144;

// Dessert item type definition
export type DessertItem = {
  id: string;
  name: string;
  price: number;
};

// Event type details interface
export interface EventTypeDetails {
  type: EventType;
  description: string;
  icon: ReactNode;
  gradient: string;
  image?: string;
}

// Form data type definition
export type EventInquiryFormData = {
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
  selectedPackages: Record<string, string>; // Store package selections by theme
  menuSelections: {
    proteins: string[];
    sides: string[];
    salads: string[];
    salsas: string[];
    desserts: string[];
    addons: string[];
    [key: string]: Array<{id: string, quantity: number}> | string[];
  };
  
  // Food Truck Selections
  foodTruckSelections?: {
    smallBites: string[];
    bigBites: string[];
    vegetarianVegan: string[];
    kidsBites: string[];
    glutenFreeBuns: number;
    includeMenuPoster: boolean;
    includeDesserts: boolean;
  };
  
  // Sandwich Factory Selections
  sandwichFactorySelections?: {
    package: string;
    meats: string[];
    cheeses: string[];
    vegetables: string[];
    breads: string[];
    spreads: string[];
    salads: string[];
    wantsGlutenFreeBread: boolean;
    glutenFreeBreadCount?: number;
    notes?: string;
  };
  
  // Step 5: Appetizer Question
  wantsAppetizers: boolean;
  
  // Step 6: Appetizers
  appetizerService?: "stationary" | "passed";
  appetizers: Record<string, { name: string, quantity: number, price: number }[]>;
  
  // Dessert Question
  wantsDesserts: boolean;
  
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
  
  // Step 9: Dietary Restrictions
  dietaryRestrictions?: {
    vegetarian?: boolean;
    vegan?: boolean;
    gluten_free?: boolean;
    dairy_free?: boolean;
    nut_free?: boolean;
    shellfish_allergy?: boolean;
    kosher?: boolean;
    halal?: boolean;
    [key: string]: boolean | undefined;
  };
  dietaryCount?: {
    vegetarian?: number;
    vegan?: number;
    gluten_free?: number;
    dairy_free?: number;
    nut_free?: number;
    shellfish_allergy?: number;
    kosher?: number;
    halal?: number;
    [key: string]: number | undefined;
  };
  dietaryNotes?: string;
  
  // Step 10: Notes & Final Review
  adminFee?: number;
  otherFeesDescription?: string;
  otherFeesAmount?: number;
  beverageNotes?: string;
  specialRequests?: string;
  generalNotes?: string;
};