// Comprehensive wedding inquiry form types

export interface WeddingInquiryFormData {
  // Contact Information
  contactInfo: {
    primaryContact: string;
    partnerName?: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    preferredContactMethod: 'email' | 'phone' | 'text';
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Event Details
  eventDetails: {
    eventDate: string;
    eventTime: string;
    ceremonyTime?: string;
    receptionTime?: string;
    venue: string;
    venueAddress: string;
    venueType: 'indoor' | 'outdoor' | 'mixed' | 'tent';
    hasKitchenFacilities: boolean;
    hasElectricity: boolean;
    hasWater: boolean;
    accessLimitations: string;
    setupTime: string;
    breakdownTime: string;
    eventDuration: number; // hours
  };

  // Guest Information
  guestInfo: {
    totalGuests: number;
    adultGuests: number;
    childrenGuests: number;
    childrenAges?: string;
    expectedAttendanceRate: number; // percentage
    vipGuests: number;
    guestsWithDietaryRestrictions: number;
    detailedDietaryNeeds: string;
  };

  // Service Requirements
  serviceRequirements: {
    serviceStyle: 'plated' | 'buffet' | 'family_style' | 'cocktail' | 'stations' | 'mixed';
    mealType: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'cocktail_reception' | 'multi_course';
    numberOfCourses?: number;
    cocktailHour: boolean;
    cocktailDuration?: number;
    lateNightSnacks: boolean;
    alcoholService: 'none' | 'beer_wine' | 'full_bar' | 'signature_cocktails' | 'champagne_toast';
    bartendingService: boolean;
    numberOfBartenders?: number;
  };

  // Staffing Needs
  staffingNeeds: {
    waitStaff: number;
    chefs: number;
    setupCrew: number;
    cleanupCrew: number;
    expediter: boolean;
    coordinator: boolean;
    captainWaiter: boolean;
  };

  // Equipment & Rentals
  equipmentNeeds: {
    tables: number;
    chairs: number;
    linens: boolean;
    glassware: boolean;
    silverware: boolean;
    plates: boolean;
    servingPieces: boolean;
    chafers: boolean;
    audioVisual: boolean;
    danceFloor: boolean;
    tent: boolean;
    heatingCooling: boolean;
    generators: boolean;
    additionalEquipment: string;
  };

  // Menu Selections
  menuSelections: {
    selectedTheme: string;
    selectedTier: string;
    selectedItems: Record<string, string[]>;
    customizations: string;
    allergensToAvoid: string[];
    specialDietaryAccommodations: string;
  };

  // Budget & Preferences
  budgetInfo: {
    estimatedBudget: string;
    budgetPriorities: string[];
    flexibilityLevel: 'fixed' | 'somewhat_flexible' | 'very_flexible';
    paymentPreference: 'payment_plan' | 'full_payment' | 'milestone_payments';
  };

  // Additional Services
  additionalServices: {
    cakeProvided: boolean;
    cakeServing: boolean;
    flowerArrangements: boolean;
    photographyMeals: boolean;
    vendorMeals: number;
    guestFavors: boolean;
    specialCeremony: boolean;
    culturalRequirements: string;
    religiousRequirements: string;
  };

  // Timeline & Planning
  timeline: {
    howFarInAdvance: string;
    planningStage: 'early' | 'mid' | 'final' | 'last_minute';
    otherVendorsBooked: boolean;
    weddingPlanner: boolean;
    previousCateringExperience: boolean;
    inspiration: string;
    specialRequests: string;
  };
}

export interface FormStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
  isRequired: boolean;
  validation?: (data: Partial<WeddingInquiryFormData>) => boolean;
}

export interface QuestionSection {
  id: string;
  title: string;
  description: string;
  questions: FormQuestion[];
  conditionalDisplay?: (data: Partial<WeddingInquiryFormData>) => boolean;
}

export interface FormQuestion {
  id: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'textarea' | 'date' | 'time';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  conditionalDisplay?: (data: Partial<WeddingInquiryFormData>) => boolean;
  validation?: (value: any) => boolean | string;
  helpText?: string;
}