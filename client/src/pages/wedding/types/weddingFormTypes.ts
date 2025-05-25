// src/pages/wedding/types/weddingFormTypes.ts
import { ReactNode } from "react";

// Event types (assuming this is shared or relevant for context)
export type EventType =
  | "Wedding"
  | "Corporate"
  | "Engagement"
  | "Birthday"
  | "Food Truck"
  | "Mobile Bartending"
  | "Other Private Party";

// Form steps definition for Wedding
export type WeddingFormStep =
  | "basicInfo"
  | "eventDetails"
  | "serviceStyleSelection"
  | "menuSelection"
  | "appetizerQuestion"
  | "appetizers" // This step now refers to the detailed hors d'oeuvres selection
  | "foodTruckMenu"
  | "sandwichFactoryMenu"
  | "breakfastMenu"
  | "dessertQuestion"
  | "desserts"
  | "beverageQuestion"
  | "nonAlcoholicBeverages"
  | "alcoholicBeverages"
  | "equipmentQuestion"
  | "equipment"
  | "dietaryRestrictions"
  | "review";

// LotSize for Appetizers/Hors d'Oeuvres (as defined in your appetizer data)
export type LotSize = 24 | 36 | 48 | 60 | 72 | 96 | 144;

// For storing selected hors d'oeuvres items with their chosen lot size and price snapshot
export interface SelectedHorsDoeuvreItemDetails {
  name: string;       // Name of the item (copied from data source for record-keeping)
  price: number;      // Price per piece (copied from data source for record-keeping)
  quantity: LotSize;  // The selected lot size (number of pieces)
}

// For storing selected items within a specific category of hors d'oeuvres
export interface SelectedHorsDoeuvresCategoryItems {
  items: Record<string, SelectedHorsDoeuvreItemDetails>; // Key is item ID (e.g., "ts_pate_veg")
}

// For storing selections related to the Spreads Package
export interface SelectedSpreadsDetails {
    isPackageSelected?: boolean; // Tracks if the spreads package itself is chosen
    selectedItems?: string[];    // Array of selected spread item IDs (e.g., ["sp_hummus", "sp_tzatziki"])
}

// Types for Sandwich Factory Selections
export type SandwichPackageIdType = "bronze" | "silver" | "gold" | "diamond" | "";

// OLD TYPE for Gluten-Free Option in Sandwich Factory - This will be replaced
// export interface SelectedGlutenFreeOption {
//     id: string;      // ID of the gluten-free option (e.g., "gf_buns")
//     quantity: number;
// }

// NEW TYPE for selected Gluten-Free option in Sandwich Factory
export interface SelectedGlutenFreeDetails {
  id: 'gf_bread' | 'gf_vegan_bread' | 'none' | null; // Matches IDs from new GlutenFreeOptionNew in data file
  pricePerPerson?: number; // Store the price at the time of selection, for record-keeping
  quantity?: number;       // Number of guests needing this GF option (amount for "pp")
}


// Main Form data type definition for Wedding Inquiry
export type WeddingInquiryFormData = {
  eventType: "Wedding";

  // Basic Information
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

  // Event Details & Venue
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

  // Menu Selection (for general themed menus)
  selectedPackages: Record<string, string>;
  menuSelections: {
    proteins: string[];
    sides: string[];
    salads: string[];
    salsas: string[];
    desserts: string[];
    addons: string[];
    [key: string]: Array<{ id: string; quantity: number }> | string[];
  };

  // Specialized Menu Selections
  foodTruckSelections: {
    smallBites: string[];
    bigBites: string[];
    vegetarianVegan: string[];
    kidsBites: string[];
    glutenFreeBuns: number; // This was for the old structure, review if food truck GF options change
    includeMenuPoster: boolean;
    includeDesserts: boolean;
  };

  sandwichFactorySelections: {
    package: SandwichPackageIdType;
    // The fields selectedMeats, selectedCheeses, selectedVegetables, selectedBreads
    // are commented out as the new design implies these are informational,
    // derived from the selected package, and not directly selected by the user from a master list.
    // If user customization of these items *beyond* package definition is required, uncomment them.
    // selectedMeats?: string[];
    // selectedCheeses?: string[];
    // selectedVegetables?: string[];
    // selectedBreads?: string[];
    selectedSpreads?: string[];      // Array of selected spread IDs
    selectedSalads?: string[];       // Array of selected salad IDs

    // wantsGlutenFreeBread: boolean; // Replaced by glutenFreeOption.id
    // glutenFreeBreadSelections?: SelectedGlutenFreeOption[]; // Old array structure, replaced by the single object below
    glutenFreeOption?: SelectedGlutenFreeDetails; // Updated structure for GF choice

    notes?: string;
  };

  breakfastMenuSelections: {
    menuType: string;
    serviceStyle?: string;
    grab_and_go_bites?: Array<{id: string, itemId?: string, name?: string, quantity: number, price?: number}>;
    grab_and_go_snacks?: Array<{id: string, itemId?: string, name?: string, quantity: number, price?: number}>;
    grab_and_go_beverages?: Array<{id: string, itemId?: string, name?: string, quantity: number, price?: number}>;
    continental_staples?: string[];
    continental_beverages?: string[];
    eggs?: string;
    meats?: string[];
    potatoes?: string;
    breads?: string;
    sweet_selections?: string[];
    savory_selections?: string[];
    sides_selections?: string[];
    beverages?: string[];
    notes?: string;
  };

  // Appetizer Question & Detailed Hors d'Oeuvres Selections
  wantsAppetizers: boolean;
  horsDoeurvesSelections: {
    serviceStyle?: "stationary" | "passed";
    categories?: Record<string, SelectedHorsDoeuvresCategoryItems>;
    spreads?: SelectedSpreadsDetails;
  };

  // Desserts
  wantsDesserts: boolean;
  dessertSelections: Record<string, number>; // Key is dessert ID, value is quantity

  // Beverages
  beverageServiceChoice?: "non-alcoholic" | "alcoholic" | "none";
  nonAlcoholicBeverageSelections?: {
    bottled_water_1pp?: boolean;
    bottled_water_unlimited?: boolean;
    assorted_soft_drinks_1pp?: boolean;
    assorted_soft_drinks_unlimited?: boolean; // Added from previous version
    pellegrino_sodas_1pp?: boolean; // Added from previous version
    pellegrino_sodas_unlimited?: boolean; // Added from previous version
    assorted_snapple_1pp?: boolean; // Added from previous version
    assorted_snapple_unlimited?: boolean; // Added from previous version
    assorted_gatorade_1pp?: boolean; // Added from previous version
    assorted_gatorade_unlimited?: boolean; // Added from previous version
    free_pour_lemonade?: boolean;
    free_pour_iced_tea?: boolean;
    non_alcoholic_mocktails?: boolean;
  };
  alcoholicBeverageSelections?: {
    bartendingServiceType?: "dry_hire" | "wet_hire";
    drinkingAgedGuests?: number;
    bartendingStartTime?: string;
    bartendingServiceDuration?: string;
    alcoholTypes?: {
      beer?: boolean;
      wine_house?: boolean;
      wine_premium?: boolean; // Added from previous version
      wine_beer_2cocktails?: boolean; // Added from previous version
      wine_beer_soda_cocktails?: boolean; // Added from previous version
      mocktails?: boolean; // Added from previous version
      open_bar?: boolean;
      cash_bar?: boolean;
    };
    otherBarEquipment?: {
      mobile_bar_unit?: boolean;
      table_water_service?: boolean; // Added from previous version
      coffee_service?: boolean; // Added from previous version
      beer_taps?: boolean; // Added from previous version
      ice?: boolean;
    };
  };

  // Equipment
  wantsEquipmentRental?: boolean;
  equipment: {
    furniture: Record<string, number>;
    linens: Record<string, number>;
    servingWare: Record<string, number>;
    decor?: Record<string, number>;
  };

  // Dietary Restrictions
  dietaryRestrictions?: {
    vegetarian?: boolean;
    vegan?: boolean;
    gluten_free?: boolean;
    dairy_free?: boolean; // Added from previous version
    nut_free?: boolean; // Added from previous version
    shellfish_allergy?: boolean; // Added from previous version
    kosher?: boolean; // Added from previous version
    halal?: boolean;
    [key: string]: boolean | undefined;
  };
  dietaryCount?: {
    vegetarian?: number;
    vegan?: number;
    gluten_free?: number;
    dairy_free?: number; // Added from previous version
    nut_free?: number; // Added from previous version
    shellfish_allergy?: number; // Added from previous version
    kosher?: number; // Added from previous version
    halal?: number;
    [key: string]: number | undefined;
  };
  dietaryNotes?: string;

  // Final Notes & Admin
  adminFee?: number;
  otherFeesDescription?: string;
  otherFeesAmount?: number;
  beverageNotes?: string;
  specialRequests?: string;
  generalNotes?: string;
};


// Other existing types from your file (like DessertItem, EventTypeDetails if they are still here)
// These were present in your uploaded file, so I'm keeping them.
export interface DessertItem {
  id: string;
  name: string;
  price: number; // Or pricePerDozen, etc.
  // other properties
}

// This was already in the original file, but it's also related to the dessert data file.
// If DessertLotSize is exclusively for desserts, keeping it distinct is fine.
export type DessertLotSize = 36 | 48 | 72 | 96 | 144;


export interface EventTypeDetails { // Assuming this is still used for other purposes
  type: EventType;
  description: string;
  icon: ReactNode;
  gradient: string;
  image?: string;
}