// client/src/types.ts
import { EventType } from "./data/eventOptions";

// Form step enums
export enum FormStep {
  EVENT_TYPE_SELECTION = "EVENT_TYPE_SELECTION",
  BASIC_INFORMATION = "BASIC_INFORMATION",
  EVENT_DETAILS = "EVENT_DETAILS",
  MENU_SELECTION = "MENU_SELECTION",
  APPETIZERS_QUESTION = "APPETIZERS_QUESTION",
  APPETIZERS = "APPETIZERS",
  DESSERT = "DESSERT",
  SPECIAL_REQUESTS = "SPECIAL_REQUESTS",
  REVIEW = "REVIEW"
}

// Form data interface for the event inquiry form
export interface EventInquiryFormData {
  // Basic information
  eventType: EventType | null;
  companyName?: string;
  contactName: {
    firstName: string;
    lastName: string;
  };
  email: string;
  phone: string;
  billingAddress: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  eventDate: string;
  hasPromoCode: boolean;
  promoCode?: string;
  
  // Venue information
  venueSecured: boolean;
  venueName?: string;
  venueLocation?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  
  // Event timeline
  eventStartTime: string;
  eventEndTime: string;
  hasCocktailHour: boolean;
  cocktailStartTime?: string;
  cocktailEndTime?: string;
  hasMainCourse: boolean;
  foodServiceStartTime?: string;
  foodServiceEndTime?: string;
  
  // Wedding specific
  ceremonyStartTime?: string;
  ceremonyEndTime?: string;
  setupBeforeCeremony?: boolean;
  
  // Event details
  guestCount: number;
  serviceStyle?: string;
  serviceDuration?: number;
  laborHours?: number;
  requestedTheme?: string;
  
  // Menu selections
  selectedMenuTheme?: string;
  selectedPackage?: string;
  menuSelections: Record<string, Record<string, string[]>>;
  
  // Appetizers
  wantsAppetizers: boolean;
  appetizerService?: "stationary" | "passed";
  appetizers: Record<string, Array<{
    name: string;
    quantity: number;
    price: number;
  }>>;
  
  // Hors d'oeuvres
  horsDoeurvesSelections: {
    serviceStyle: "stationary" | "passed";
    categories: Record<string, {
      items: Record<string, {
        name: string;
        price: number;
        quantity: number | null;
      }>;
    }>;
  };
  
  // Desserts
  wantsDesserts: boolean;
  dessertSelections: Record<string, number | null>;
  
  // Special requests
  hasAllergies: boolean;
  allergiesDescription?: string;
  hasDietaryRestrictions: boolean;
  dietaryRestrictionsDescription?: string;
  hasSpecialRequests: boolean;
  specialRequestsDescription?: string;
  additionalComments?: string;
  
  // Submission details
  generalNotes?: string;
}

// Default form values
export const defaultFormValues: EventInquiryFormData = {
  // Basic information
  eventType: null,
  contactName: {
    firstName: "",
    lastName: ""
  },
  email: "",
  phone: "",
  billingAddress: {
    street: "",
    city: "",
    state: "",
    zipCode: ""
  },
  eventDate: "",
  hasPromoCode: false,
  
  // Venue information
  venueSecured: false,
  
  // Event timeline
  eventStartTime: "",
  eventEndTime: "",
  hasCocktailHour: false,
  hasMainCourse: true,
  
  // Event details
  guestCount: 50,
  
  // Menu selections
  selectedMenuTheme: "",
  selectedPackage: "",
  menuSelections: {},
  
  // Appetizers
  wantsAppetizers: false,
  appetizers: {},
  horsDoeurvesSelections: {
    serviceStyle: "stationary",
    categories: {}
  },
  
  // Desserts
  wantsDesserts: false,
  dessertSelections: {},
  
  // Special requests
  hasAllergies: false,
  hasDietaryRestrictions: false,
  hasSpecialRequests: false
};