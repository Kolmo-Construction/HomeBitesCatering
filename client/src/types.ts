// client/src/types.ts
import { EventType } from "./data/eventOptions";

export type FormStep = 
  | "eventType" 
  | "basicInfo" 
  | "eventDetails" 
  | "menuSelection" 
  | "appetizerQuestion" 
  | "appetizers" 
  | "desserts" 
  | "beverages"
  | "equipment"
  | "review";

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
  selectedPackage?: string;
  menuSelections: {
    proteins: string[];
    sides: string[];
    salads: string[];
    salsas: string[];
    desserts: string[];
    addons: string[];
    [key: string]: Array<{id: string, quantity: number}> | string[];
  };
  
  // Step 5: Appetizer Question
  wantsAppetizers: boolean;
  
  // Step 6: Appetizers
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