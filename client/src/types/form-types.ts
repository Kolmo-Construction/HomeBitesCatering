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
  | "breakfastMenu" // Added Breakfast/Brunch menu step
  | "dessertQuestion" // Added Dessert question step
  | "desserts" 
  | "beverageQuestion"  // New step for initial beverage choice
  | "nonAlcoholicBeverages"  // Step for non-alcoholic beverage selection
  | "alcoholicBeverages"  // Step for alcoholic beverage selection
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
  
  // Breakfast Menu Selections
  breakfastMenuSelections?: {
    menuType: string; // grab_and_go, continental, american, full_monty
    serviceStyle?: string;
    grab_and_go_bites?: Array<{id: string, quantity: number}>;
    grab_and_go_snacks?: Array<{id: string, quantity: number}>;
    grab_and_go_beverages?: Array<{id: string, quantity: number}>;
    continental_staples?: string[];
    continental_beverages?: string[];
    eggs?: string;
    meats?: string[];
    potatoes?: string;
    breads?: string;
    sides?: string;
    beverages?: string[];
    breakfast_meats?: string[];
    sweet_selections?: string[];
    savory_selections?: string[];
    sides_selections?: string[];
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
  beverageServiceChoice?: "non-alcoholic" | "alcoholic" | "none";
  
  // Non-alcoholic beverage selections
  nonAlcoholicBeverageSelections?: {
    bottled_water_1pp?: boolean;
    bottled_water_unlimited?: boolean;
    assorted_soft_drinks_1pp?: boolean;
    assorted_soft_drinks_unlimited?: boolean;
    pellegrino_sodas_1pp?: boolean;
    pellegrino_sodas_unlimited?: boolean;
    assorted_snapple_1pp?: boolean;
    assorted_snapple_unlimited?: boolean;
    assorted_gatorade_1pp?: boolean;
    assorted_gatorade_unlimited?: boolean;
    free_pour_lemonade?: boolean;
    free_pour_iced_tea?: boolean;
    non_alcoholic_mocktails?: boolean;
  };
  
  // Alcoholic beverage selections
  alcoholicBeverageSelections?: {
    bartendingServiceType?: "dry_hire" | "wet_hire";
    drinkingAgedGuests?: number;
    bartendingStartTime?: string;
    bartendingServiceDuration?: string;
    alcoholTypes?: {
      beer?: boolean;
      wine_house?: boolean;
      wine_premium?: boolean;
      wine_beer_2cocktails?: boolean;
      wine_beer_soda_cocktails?: boolean;
      mocktails?: boolean;
      open_bar?: boolean;
      cash_bar?: boolean;
    };
    otherBarEquipment?: {
      mobile_bar_unit?: boolean;
      table_water_service?: boolean;
      coffee_service?: boolean;
      beer_taps?: boolean;
      ice?: boolean;
    };
  };
  
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