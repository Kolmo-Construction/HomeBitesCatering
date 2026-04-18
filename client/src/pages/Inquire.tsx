import { useState, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import homebitesLogo from "@assets/homebites-logo.avif";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Building2,
  Gem,
  Cake,
  Martini,
  Truck,
  HelpCircle,
  Users,
  MapPin,
  UtensilsCrossed,
  ChefHat,
  Wine,
  Package,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Loader2,
  Minus,
  Plus,
  DollarSign,
  PartyPopper,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Venue {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  hasKitchen: boolean;
}

interface PromoValidation {
  valid: boolean;
  id?: number;
  discountPercent?: number;
  description?: string;
}

// --- Event Types ---
const EVENT_TYPES = [
  { value: "wedding", label: "Wedding", icon: Heart },
  { value: "corporate", label: "Corporate", icon: Building2 },
  { value: "engagement", label: "Engagement", icon: Gem },
  { value: "birthday", label: "Birthday", icon: Cake },
  { value: "cocktail_party", label: "Cocktail Party", icon: Martini },
  { value: "food_truck", label: "Food Truck", icon: Truck },
  { value: "other", label: "Other", icon: HelpCircle },
] as const;

// --- Per-event-type form configuration ---
// Declares which sections render, which labels to use, and which extra
// questions each type needs. Keeps the render code free of sprawling
// `if (eventType === "x") else if (...)` branches.
interface EventTypeConfig {
  // Step 2 heading — what we call the "venue" section
  locationSectionTitle: string;
  locationSectionSubtitle: string;
  // How we phrase the Y/N question at the top of Step 2
  hasLocationLabel: string;
  // What we call the on-site point of contact
  onSiteContactLabel: string;
  // Whether Step 2's location flow applies at all (food truck skips it)
  showLocationStep: boolean;
  // Wedding-only: the ceremony timing block
  showCeremonyBlock: boolean;
  // Whether to show an "Our office / External venue / Not decided" branch
  // before the venue Y/N — useful for corporate & birthday (residential)
  showLocationTypeBranch: boolean;
  // Food-truck-only: parking/power/water/permit logistics replace venue
  showTruckLogistics: boolean;
  // Whether the main-meal timing toggle defaults ON and is offered
  mainMealDefault: boolean;
  showMainMealToggle: boolean;
  // Which extras render in the Step 1 per-type details block
  showPartnerNames: boolean;          // wedding, engagement
  showSurpriseFlag: boolean;          // engagement
  showCompanyFields: boolean;         // corporate
  showCorporateContext: boolean;      // corporate: purpose, branded menu, PO
  showBirthdayContext: boolean;       // birthday: guest of honor, milestone, kids
  showOtherDescription: boolean;      // "other" event type
}

const EVENT_TYPE_CONFIG: Record<string, EventTypeConfig> = {
  wedding: {
    locationSectionTitle: "Venue & Logistics",
    locationSectionSubtitle: "Tell us about your venue and logistics.",
    hasLocationLabel: "Have you secured a venue?",
    onSiteContactLabel: "Venue Contact",
    showLocationStep: true,
    showCeremonyBlock: true,
    showLocationTypeBranch: false,
    showTruckLogistics: false,
    mainMealDefault: true,
    showMainMealToggle: true,
    showPartnerNames: true,
    showSurpriseFlag: false,
    showCompanyFields: false,
    showCorporateContext: false,
    showBirthdayContext: false,
    showOtherDescription: false,
  },
  engagement: {
    locationSectionTitle: "Venue & Logistics",
    locationSectionSubtitle: "Tell us about your venue and logistics.",
    hasLocationLabel: "Have you secured a venue?",
    onSiteContactLabel: "Venue Contact",
    showLocationStep: true,
    showCeremonyBlock: false,
    showLocationTypeBranch: false,
    showTruckLogistics: false,
    mainMealDefault: true,
    showMainMealToggle: true,
    showPartnerNames: true,
    showSurpriseFlag: true,
    showCompanyFields: false,
    showCorporateContext: false,
    showBirthdayContext: false,
    showOtherDescription: false,
  },
  corporate: {
    locationSectionTitle: "Event Location & Logistics",
    locationSectionSubtitle: "Tell us where the event will happen and who we'll coordinate with on the day.",
    hasLocationLabel: "Have you secured a location?",
    onSiteContactLabel: "On-site Contact",
    showLocationStep: true,
    showCeremonyBlock: false,
    showLocationTypeBranch: true,
    showTruckLogistics: false,
    mainMealDefault: true,
    showMainMealToggle: true,
    showPartnerNames: false,
    showSurpriseFlag: false,
    showCompanyFields: true,
    showCorporateContext: true,
    showBirthdayContext: false,
    showOtherDescription: false,
  },
  birthday: {
    locationSectionTitle: "Location & Logistics",
    locationSectionSubtitle: "Tell us where you're celebrating.",
    hasLocationLabel: "Do you have a location picked out?",
    onSiteContactLabel: "On-site Contact",
    showLocationStep: true,
    showCeremonyBlock: false,
    showLocationTypeBranch: true,
    showTruckLogistics: false,
    mainMealDefault: true,
    showMainMealToggle: true,
    showPartnerNames: false,
    showSurpriseFlag: false,
    showCompanyFields: false,
    showCorporateContext: false,
    showBirthdayContext: true,
    showOtherDescription: false,
  },
  cocktail_party: {
    locationSectionTitle: "Venue & Logistics",
    locationSectionSubtitle: "Tell us about your venue and logistics.",
    hasLocationLabel: "Have you secured a venue?",
    onSiteContactLabel: "Venue Contact",
    showLocationStep: true,
    showCeremonyBlock: false,
    showLocationTypeBranch: false,
    showTruckLogistics: false,
    mainMealDefault: false, // cocktail parties usually skip main meal
    showMainMealToggle: true, // still let them opt in if they want light bites + dinner
    showPartnerNames: false,
    showSurpriseFlag: false,
    showCompanyFields: false,
    showCorporateContext: false,
    showBirthdayContext: false,
    showOtherDescription: false,
  },
  food_truck: {
    locationSectionTitle: "Event Location & Logistics",
    locationSectionSubtitle: "Where's the event, and where can the truck park?",
    hasLocationLabel: "Do you have a location picked out?",
    onSiteContactLabel: "On-site Contact",
    showLocationStep: true,
    showCeremonyBlock: false,
    showLocationTypeBranch: false,
    showTruckLogistics: true, // legacy flag kept for config symmetry; truck
                              // logistics now render in Step 3 gated by
                              // serviceType === "food_truck".
    mainMealDefault: true,
    showMainMealToggle: false, // food truck = main meal by definition
    showPartnerNames: false,
    showSurpriseFlag: false,
    showCompanyFields: false,
    showCorporateContext: false,
    showBirthdayContext: false,
    showOtherDescription: false,
  },
  other: {
    locationSectionTitle: "Location & Logistics",
    locationSectionSubtitle: "Tell us where you're hosting and any on-site details.",
    hasLocationLabel: "Do you have a location picked out?",
    onSiteContactLabel: "On-site Contact",
    showLocationStep: true,
    showCeremonyBlock: false,
    showLocationTypeBranch: false,
    showTruckLogistics: false,
    mainMealDefault: true,
    showMainMealToggle: true,
    showPartnerNames: false,
    showSurpriseFlag: false,
    showCompanyFields: false,
    showCorporateContext: false,
    showBirthdayContext: false,
    showOtherDescription: true,
  },
};

// Fallback config when eventType is "" (before selection)
const DEFAULT_EVENT_CONFIG: EventTypeConfig = EVENT_TYPE_CONFIG.wedding;

const getEventConfig = (eventType: string): EventTypeConfig =>
  EVENT_TYPE_CONFIG[eventType] || DEFAULT_EVENT_CONFIG;

// --- Corporate purpose options ---
const CORPORATE_PURPOSES = [
  { value: "client_entertainment", label: "Client entertainment" },
  { value: "team_event", label: "Team event / offsite" },
  { value: "conference", label: "Conference / seminar" },
  { value: "training", label: "Training / workshop" },
  { value: "holiday", label: "Holiday party" },
  { value: "launch", label: "Product launch" },
  { value: "other", label: "Other" },
] as const;

// --- Corporate/birthday location-type branch ---
const CORPORATE_LOCATION_TYPES = [
  { value: "our_office", label: "At our office" },
  { value: "external_venue", label: "External venue" },
  { value: "not_decided", label: "Not decided yet" },
] as const;

const BIRTHDAY_LOCATION_TYPES = [
  { value: "home", label: "At home" },
  { value: "venue", label: "At a venue" },
  { value: "outdoor", label: "Outdoor / park" },
  { value: "not_decided", label: "Not decided yet" },
] as const;

// --- Service Types ---
const SERVICE_TYPES = [
  { value: "buffet", label: "Buffet", icon: UtensilsCrossed },
  { value: "plated", label: "Plated", icon: ChefHat },
  { value: "family_style", label: "Family Style", icon: Users },
  { value: "cocktail_party", label: "Cocktail Party", icon: Martini },
  { value: "breakfast_brunch", label: "Breakfast/Brunch", icon: UtensilsCrossed },
  { value: "sandwich", label: "Sandwich", icon: UtensilsCrossed },
  { value: "food_truck", label: "Food Truck", icon: Truck },
  { value: "kids_party", label: "Kids Party", icon: PartyPopper },
] as const;

const BUFFET_STYLES = [
  { value: "drop_off", label: "Drop-off" },
  { value: "standard", label: "Standard" },
  { value: "full_service_no_setup", label: "Full Service (No Setup)" },
  { value: "full_service", label: "Full Service" },
] as const;

// --- Public Menu types (matches API response from /api/quotes/menus/public) ---
interface PublicMenuTier {
  tierKey: string;
  tierName: string;
  pricePerPersonCents: number;
  description?: string;
  displayOrder: number;
  minGuestCount?: number;
  selectionLimits: Record<string, number>;
  included?: string[];
}

interface PublicMenuCategoryItem {
  id: string;
  name: string;
  description?: string;
  upchargeCents?: number;
  dietaryTags?: string[];
  availableInTiers?: string[];
}

interface PublicMenu {
  id: number;
  name: string;
  description?: string | null;
  themeKey: string | null;
  displayOrder: number | null;
  packages: PublicMenuTier[] | null;
  categoryItems: Record<string, PublicMenuCategoryItem[]> | null;
}

// --- Appetizer Data ---
interface AppetizerItem {
  name: string;
  price: number;
  unit: string; // "per piece" or "per person"
}

interface AppetizerCategory {
  label: string;
  items: AppetizerItem[];
  perPerson?: boolean; // If true, quantity = per person instead of lot sizes
}

const LOT_SIZES = [24, 36, 48, 72, 96, 144];

const APPETIZER_CATEGORIES: AppetizerCategory[] = [
  {
    label: "Tea Sandwiches",
    items: [
      { name: "Caprese", price: 1.95, unit: "per piece" },
      { name: "Chicken Cranberry", price: 2.0, unit: "per piece" },
      { name: "Gravlax", price: 2.75, unit: "per piece" },
      { name: "Crab Salad", price: 3.0, unit: "per piece" },
    ],
  },
  {
    label: "Shooters",
    items: [
      { name: "Chicken Satay", price: 2.45, unit: "per piece" },
      { name: "Greek Village", price: 2.25, unit: "per piece" },
      { name: "Gazpacho w/ Shrimp", price: 2.75, unit: "per piece" },
      { name: "Bloody Mary w/ Lobster", price: 4.75, unit: "per piece" },
    ],
  },
  {
    label: "Mini Skewers",
    items: [
      { name: "Korean BBQ Pork Belly", price: 2.75, unit: "per piece" },
      { name: "Chicken Teriyaki", price: 2.75, unit: "per piece" },
      { name: "Mediterranean Shrimp", price: 2.75, unit: "per piece" },
      { name: "Caprese", price: 2.25, unit: "per piece" },
    ],
  },
  {
    label: "Canapes",
    items: [
      { name: "Watermelon Radish", price: 1.5, unit: "per piece" },
      { name: "French Onion Tartlets", price: 2.75, unit: "per piece" },
      { name: "Crostini Goat Cheese", price: 1.95, unit: "per piece" },
      { name: "Focaccia Pizza Bites", price: 2.75, unit: "per piece" },
    ],
  },
  {
    label: "Vol au Vents",
    items: [
      { name: "Gravlax Cream Cheese", price: 3.0, unit: "per piece" },
      { name: "Spinach Feta Leek", price: 3.0, unit: "per piece" },
      { name: "Melted Brie Cranberry", price: 3.5, unit: "per piece" },
      { name: "Tuna Tartare", price: 3.75, unit: "per piece" },
    ],
  },
  {
    label: "Simple Fare",
    items: [
      { name: "Loaded Potato Skins", price: 1.95, unit: "per piece" },
      { name: "Stuffed Mushrooms", price: 2.25, unit: "per piece" },
      { name: "Chicken Wings", price: 2.65, unit: "per piece" },
      { name: "Lobster Rolls", price: 7.5, unit: "per piece" },
    ],
  },
  {
    label: "Charcuterie",
    perPerson: true,
    items: [
      { name: "Cheese & Fruit", price: 10, unit: "per person" },
      { name: "Meat Cheese Fruit", price: 12, unit: "per person" },
      { name: "Mexican", price: 13, unit: "per person" },
      { name: "Mediterranean", price: 14, unit: "per person" },
      { name: "Premium", price: 18, unit: "per person" },
    ],
  },
  {
    label: "Spreads",
    perPerson: true,
    items: [
      { name: "Tzatziki", price: 6.5, unit: "per person" },
      { name: "Hummus", price: 6.5, unit: "per person" },
      { name: "Baba Ghanoush", price: 6.5, unit: "per person" },
      { name: "Spicy Feta", price: 6.5, unit: "per person" },
    ],
  },
];

// --- Dessert Data ---
const DESSERT_ITEMS: AppetizerItem[] = [
  { name: "Petit Fours", price: 2.95, unit: "per piece" },
  { name: "Macaroons", price: 2.75, unit: "per piece" },
  { name: "Cheesecake", price: 5.75, unit: "per piece" },
  { name: "Baklava", price: 5.25, unit: "per piece" },
  { name: "Cannolis", price: 4.75, unit: "per piece" },
  { name: "Tiramisu Cups", price: 5.75, unit: "per piece" },
];

// --- Equipment Data ---
interface EquipmentItem {
  name: string;
  price: number;
  unit: string;
}

interface EquipmentCategory {
  label: string;
  items: EquipmentItem[];
}

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    label: "Linens",
    items: [
      { name: "Napkins", price: 0.5, unit: "each" },
      { name: "Buffet Runners", price: 22, unit: "each" },
      { name: '90" Tablecloths', price: 27, unit: "each" },
    ],
  },
  {
    label: "Serving Ware",
    items: [
      { name: "Biodegradable Set", price: 2.25, unit: "per person" },
      { name: "Premium Disposable", price: 5, unit: "per person" },
      { name: "China/Silverware", price: 8.25, unit: "per person" },
    ],
  },
  {
    label: "Furniture",
    items: [
      { name: '8ft Rectangle Table', price: 27, unit: "each" },
      { name: '6ft Rectangle Table', price: 24, unit: "each" },
      { name: 'Round Table 60"', price: 30, unit: "each" },
      { name: "Folding Chairs", price: 8, unit: "each" },
    ],
  },
];

// --- Referral Sources ---
const REFERRAL_SOURCES = [
  "Wedding Wire",
  "The Knot",
  "Zola",
  "Google",
  "Instagram",
  "Facebook",
  "Referral",
  "Other",
];

// --- Non-Alcoholic Beverage Options ---
const NON_ALCOHOLIC_OPTIONS = [
  "Water",
  "Soft Drinks",
  "Lemonade",
  "Iced Tea",
  "Mocktails",
];

// --- Alcoholic Beverage Options ---
const ALCOHOL_OPTIONS = [
  "Beer",
  "House Wine",
  "Premium Wine",
  "Beer+Wine+2 Cocktails",
  "Open Bar",
  "Cash Bar",
];

// --- Bar Duration Options ---
const BAR_DURATIONS = ["2.5", "3", "3.5", "4", "4.5", "5"];

// --- Dietary Restrictions ---
const DIETARY_RESTRICTIONS = [
  "Vegan",
  "Vegetarian",
  "Gluten Free",
  "Paleo",
  "Halal",
  "Kosher",
];

// --- Allergies ---
const ALLERGY_OPTIONS = [
  "Dairy",
  "Eggs",
  "Soy",
  "Peanuts",
  "Fish",
  "Shellfish",
  "Wheat",
  "Tree Nuts",
  "Sesame",
];

// --- Decision Timeline ---
const DECISION_TIMELINES = [
  "7-10 days",
  "10-20 days",
  "20-30 days",
  "30-60 days",
];

// --- Industry Referral Needs ---
const INDUSTRY_REFERRALS = [
  "Cakes",
  "Event Planner",
  "Florist",
  "DJ",
  "Photographer",
  "Videographer",
];

// --- Step Labels ---
const STEP_LABELS = [
  "Contact & Event",
  "Venue & Logistics",
  "Service Style",
  "Menu Selection",
  "Appetizers & Desserts",
  "Beverages & Bar",
  "Equipment & Dietary",
  "Review & Submit",
];

// ---------------------------------------------------------------------------
// Form State Interface
// ---------------------------------------------------------------------------

interface AppItemSelection {
  [itemName: string]: number; // quantity selected (lot count for per-piece, or 1/0 for per-person)
}

interface FormState {
  // Step 1
  referralSources: string[];
  referralSourceOther: string;
  promoCode: string;
  promoValid: boolean | null;
  promoId: number | null;
  promoDiscount: number;
  promoDescription: string;
  eventType: string;
  firstName: string;
  lastName: string;
  partnerFirstName: string;
  partnerLastName: string;
  companyName: string;
  companyStreet: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  // Corporate-only context
  corporatePurpose: string;
  corporatePurposeOther: string;
  brandedMenu: boolean;
  poReference: string;
  // Corporate/birthday: where will the event happen
  eventLocationType: string; // "our_office" | "external_venue" | "not_decided" | "home" | "venue" | "outdoor"
  // Engagement-only
  isSurpriseProposal: boolean;
  // Birthday-only
  guestOfHonor: string;
  isMilestone: boolean;
  milestoneAge: string;
  kidsFriendlyMenu: boolean;
  // Food-truck-only logistics
  truckParkingAvailable: string; // "yes" | "no" | "unknown"
  truckPowerAccess: string;      // "yes" | "no" | "unknown"
  truckWaterAccess: string;      // "yes" | "no" | "unknown"
  truckPropertyType: string;     // "private" | "public"
  truckServiceWindowStart: string;
  truckServiceWindowEnd: string;
  // "Other" event type
  otherEventDescription: string;
  email: string;
  phone: string;
  eventDate: string;
  guestCount: number | "";
  eventStartTime: string;
  eventEndTime: string;

  // Step 2
  hasVenue: string; // "yes" | "no"
  selectedVenueId: string; // venue ID or "other"
  locationPreferences: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venueZip: string;
  hasKitchen: string; // "yes" | "no"
  ceremonySameSpace: string; // "yes" | "no" (wedding only)
  ceremonyStartTime: string;
  ceremonyEndTime: string;
  venueContactName: string;
  venueContactPhone: string;

  // Step 3
  serviceType: string;
  buffetStyle: string;
  hasCocktailHour: boolean;
  cocktailStartTime: string;
  cocktailEndTime: string;
  hasMainMeal: boolean;
  mainMealStartTime: string;
  mainMealEndTime: string;

  // Step 4
  menuTheme: string;       // themeKey from database (e.g., "taco_fiesta")
  packageTier: string;     // tierKey from database (e.g., "bronze")
  menuItemSelections: Record<string, string[]>; // category -> array of item ids
  customMenuNotes: string;

  // Step 5
  addAppetizers: boolean;
  appetizerStyle: string; // "stationary" | "passed"
  appetizerSelections: Record<string, AppItemSelection>; // category -> item -> qty
  addDesserts: boolean;
  dessertSelections: AppItemSelection;

  // Step 6
  beverageType: string; // "non_alcoholic" | "alcoholic" | "both" | "none"
  nonAlcoholicSelections: string[];
  barType: string; // "dry_hire" | "wet_hire"
  drinkingGuestCount: number | "";
  barDuration: string;
  alcoholSelections: string[];
  liquorQuality: string; // "well" | "mid_shelf" | "top_shelf"
  needsGlassware: boolean;
  tableWaterService: boolean;
  coffeTeaService: boolean;

  // Step 7
  needsEquipment: boolean;
  equipmentSelections: Record<string, Record<string, number>>; // category -> item -> qty
  dietaryRestrictions: string[];
  allergies: string[];
  specialDietaryNotes: string;

  // Step 8
  specialRequests: string;
  decisionTimeline: string;
  industryReferrals: string[];
}

const initialFormState: FormState = {
  referralSources: [],
  referralSourceOther: "",
  promoCode: "",
  promoValid: null,
  promoId: null,
  promoDiscount: 0,
  promoDescription: "",
  eventType: "",
  firstName: "",
  lastName: "",
  partnerFirstName: "",
  partnerLastName: "",
  companyName: "",
  companyStreet: "",
  companyCity: "",
  companyState: "",
  companyZip: "",
  corporatePurpose: "",
  corporatePurposeOther: "",
  brandedMenu: false,
  poReference: "",
  eventLocationType: "",
  isSurpriseProposal: false,
  guestOfHonor: "",
  isMilestone: false,
  milestoneAge: "",
  kidsFriendlyMenu: false,
  truckParkingAvailable: "",
  truckPowerAccess: "",
  truckWaterAccess: "",
  truckPropertyType: "",
  truckServiceWindowStart: "",
  truckServiceWindowEnd: "",
  otherEventDescription: "",
  email: "",
  phone: "",
  eventDate: "",
  guestCount: "",
  eventStartTime: "",
  eventEndTime: "",

  hasVenue: "",
  selectedVenueId: "",
  locationPreferences: "",
  venueAddress: "",
  venueCity: "",
  venueState: "",
  venueZip: "",
  hasKitchen: "",
  ceremonySameSpace: "",
  ceremonyStartTime: "",
  ceremonyEndTime: "",
  venueContactName: "",
  venueContactPhone: "",

  serviceType: "",
  buffetStyle: "",
  hasCocktailHour: false,
  cocktailStartTime: "",
  cocktailEndTime: "",
  hasMainMeal: false,
  mainMealStartTime: "",
  mainMealEndTime: "",

  menuTheme: "",
  packageTier: "",
  menuItemSelections: {},
  customMenuNotes: "",

  addAppetizers: false,
  appetizerStyle: "stationary",
  appetizerSelections: {},
  addDesserts: false,
  dessertSelections: {},

  beverageType: "",
  nonAlcoholicSelections: [],
  barType: "",
  drinkingGuestCount: "",
  barDuration: "",
  alcoholSelections: [],
  liquorQuality: "",
  needsGlassware: false,
  tableWaterService: false,
  coffeTeaService: false,

  needsEquipment: false,
  equipmentSelections: {},
  dietaryRestrictions: [],
  allergies: [],
  specialDietaryNotes: "",

  specialRequests: "",
  decisionTimeline: "",
  industryReferrals: [],
};

// ---------------------------------------------------------------------------
// Helper: currency formatter
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Inquire() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({ ...initialFormState });
  const [submitted, setSubmitted] = useState(false);
  // Tracks whether the "Have a promo code?" toggle is expanded. We can't
  // derive this from promoCode/promoValid because when the user *turns it
  // on* those fields are still empty — the input never appears.
  const [showPromoInput, setShowPromoInput] = useState(false);
  // Per-event-type rendering config — drives section labels, which blocks
  // render, and what extra fields show. Falls back to wedding defaults while
  // the user hasn't picked a type yet (Step 1 radio).
  const eventConfig = getEventConfig(form.eventType);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [opportunityId, setOpportunityId] = useState<number | null>(null);
  // P1-3: Cal.com consultation URL, resolved from /api/public/cal-config
  const [consultationUrl, setConsultationUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // P1-3: pull Cal.com consultation URL once, for the post-submit thank-you page.
  useEffect(() => {
    fetch("/api/public/cal-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: { consultationUrl: string | null } | null) => {
        if (cfg?.consultationUrl) setConsultationUrl(cfg.consultationUrl);
      })
      .catch(() => undefined);
  }, []);

  // P2-3: capture URL params + document.referrer once and attach them to any
  // submission this session. Runs once on mount so we don't lose the params if
  // the user navigates within the form.
  const [attribution, setAttribution] = useState<{
    source: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
    utmTerm: string | null;
    referrer: string | null;
  }>({
    source: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    referrer: null,
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : null;
    setAttribution({
      source: params.get("source"),
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"),
      utmTerm: params.get("utm_term"),
      referrer: ref,
    });
  }, []);

  // ---------- Pre-fill from opportunity token (sent via "Send Inquiry" on opp page) ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oppToken = params.get("opp");
    if (!oppToken) return;

    fetch(`/api/public/opportunity/${oppToken}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        setOpportunityId(data.opportunityId);
        setForm((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          eventType: data.eventType || prev.eventType,
          eventDate: data.eventDate ? new Date(data.eventDate).toISOString().split("T")[0] : prev.eventDate,
          guestCount: data.guestCount ? Number(data.guestCount) : prev.guestCount,
        }));
      })
      .catch(() => {});
  }, []);

  // ---------- Pre-fill from invite token (Mike-initiated manual invite) ----------
  // When Mike sends a customer the inquiry link from /clients, the URL is
  // /inquire?invite=<token>. We look up the invite to prefill name/email/phone,
  // and pass the token through to the submit payload so the backend can link
  // the resulting inquiry row back to the invite.
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;

    fetch(`/api/public/inquiry-invite/${token}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setInviteToken(data.token);
        setForm((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          eventType: data.eventType || prev.eventType,
        }));
      })
      .catch(() => {});
  }, []);

  // ---------- Venues query ----------
  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ["/api/quotes/venues"],
  });

  // ---------- Public menus query (drives Step 4 dynamically) ----------
  const { data: publicMenus = [] } = useQuery<PublicMenu[]>({
    queryKey: ["/api/quotes/menus/public"],
  });

  // Find the currently selected menu object from the query data
  const selectedMenu = useMemo(
    () => publicMenus.find((m) => m.themeKey === form.menuTheme) || null,
    [publicMenus, form.menuTheme],
  );
  const selectedTier = useMemo(
    () =>
      selectedMenu?.packages?.find((p) => p.tierKey === form.packageTier) ||
      null,
    [selectedMenu, form.packageTier],
  );

  // When the tier changes, drop any selected items that aren't available in
  // the new tier (e.g. user picked Shrimp in Gold, then downgraded to Bronze).
  useEffect(() => {
    if (!selectedTier || !selectedMenu?.categoryItems) return;
    const categoryItems = selectedMenu.categoryItems;
    setForm((prev) => {
      let changed = false;
      const next: Record<string, string[]> = { ...prev.menuItemSelections };
      for (const [category, ids] of Object.entries(next)) {
        const items = categoryItems[category] || [];
        const validIds = new Set(
          items
            .filter((it) => {
              const tiers = it.availableInTiers;
              if (!tiers || tiers.length === 0) return true;
              return tiers.includes(selectedTier.tierKey);
            })
            .map((it) => it.id),
        );
        const filtered = ids.filter((id) => validIds.has(id));
        if (filtered.length !== ids.length) {
          next[category] = filtered;
          changed = true;
        }
      }
      return changed ? { ...prev, menuItemSelections: next } : prev;
    });
  }, [selectedTier, selectedMenu]);

  // ---------- Form updater ----------
  const update = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleArrayItem = useCallback(
    (key: keyof FormState, item: string) => {
      setForm((prev) => {
        const arr = prev[key] as string[];
        const next = arr.includes(item)
          ? arr.filter((x) => x !== item)
          : [...arr, item];
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  // ---------- Guest count as number ----------
  const guestCount = typeof form.guestCount === "number" ? form.guestCount : 0;

  // ---------- Promo code validation ----------
  const validatePromo = useCallback(async () => {
    if (!form.promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const res = await apiRequest("POST", "/api/quotes/promo-codes/validate", {
        code: form.promoCode.trim(),
      });
      const data: PromoValidation = await res.json();
      if (data.valid) {
        setForm((prev) => ({
          ...prev,
          promoValid: true,
          promoId: data.id ?? null,
          promoDiscount: data.discountPercent ?? 0,
          promoDescription: data.description ?? "",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          promoValid: false,
          promoId: null,
          promoDiscount: 0,
          promoDescription: "",
        }));
      }
    } catch {
      setForm((prev) => ({
        ...prev,
        promoValid: false,
        promoId: null,
        promoDiscount: 0,
        promoDescription: "",
      }));
    } finally {
      setValidatingPromo(false);
    }
  }, [form.promoCode]);

  // ---------- Venue selection handler ----------
  const handleVenueSelect = useCallback(
    (venueId: string) => {
      // Single atomic setForm so selectedVenueId + address fields all update
      // together — prevents any brief render where the id is set but the
      // address still carries a stale value from a previous venue.
      setForm((prev) => {
        if (venueId && venueId !== "other") {
          const v = venues.find((x) => String(x.id) === venueId);
          if (v) {
            return {
              ...prev,
              selectedVenueId: venueId,
              venueAddress: v.address,
              venueCity: v.city,
              venueState: v.state,
              venueZip: v.zip,
              hasKitchen: v.hasKitchen ? "yes" : "no",
            };
          }
        }
        if (venueId === "other") {
          return {
            ...prev,
            selectedVenueId: venueId,
            venueAddress: "",
            venueCity: "",
            venueState: "",
            venueZip: "",
            hasKitchen: "",
          };
        }
        return { ...prev, selectedVenueId: venueId };
      });
    },
    [venues],
  );

  // ---------- Appetizer quantity helpers ----------
  const setAppetizerQty = useCallback(
    (category: string, itemName: string, qty: number) => {
      setForm((prev) => ({
        ...prev,
        appetizerSelections: {
          ...prev.appetizerSelections,
          [category]: {
            ...(prev.appetizerSelections[category] || {}),
            [itemName]: Math.max(0, qty),
          },
        },
      }));
    },
    [],
  );

  const setDessertQty = useCallback((itemName: string, qty: number) => {
    setForm((prev) => ({
      ...prev,
      dessertSelections: {
        ...prev.dessertSelections,
        [itemName]: Math.max(0, qty),
      },
    }));
  }, []);

  const setEquipmentQty = useCallback(
    (category: string, itemName: string, qty: number) => {
      setForm((prev) => ({
        ...prev,
        equipmentSelections: {
          ...prev.equipmentSelections,
          [category]: {
            ...(prev.equipmentSelections[category] || {}),
            [itemName]: Math.max(0, qty),
          },
        },
      }));
    },
    [],
  );

  // ---------- Pricing calculations ----------
  const pricing = useMemo(() => {
    let perPersonFood = 0;
    let appetizerTotal = 0;
    let dessertTotal = 0;
    let beverageQuote = 0;
    let equipmentTotal = 0;

    // Per-person food cost — from the selected tier in the database
    if (selectedTier) {
      perPersonFood = selectedTier.pricePerPersonCents / 100;
      // Add upcharges for any selected items
      if (selectedMenu?.categoryItems) {
        for (const [category, ids] of Object.entries(form.menuItemSelections)) {
          const items = selectedMenu.categoryItems[category] || [];
          for (const id of ids) {
            const item = items.find((i) => i.id === id);
            if (item?.upchargeCents) {
              perPersonFood += item.upchargeCents / 100;
            }
          }
        }
      }
    }

    const foodSubtotal = perPersonFood * guestCount;

    // Appetizers
    APPETIZER_CATEGORIES.forEach((cat) => {
      const selections = form.appetizerSelections[cat.label] || {};
      cat.items.forEach((item) => {
        const qty = selections[item.name] || 0;
        if (cat.perPerson) {
          // qty is 1 (selected) or 0 — cost = price * guestCount
          appetizerTotal += qty > 0 ? item.price * guestCount : 0;
        } else {
          // qty is a lot size count (e.g. 24, 48, etc.)
          appetizerTotal += item.price * qty;
        }
      });
    });

    // Desserts
    DESSERT_ITEMS.forEach((item) => {
      const qty = form.dessertSelections[item.name] || 0;
      dessertTotal += item.price * qty;
    });

    // Beverage quote (rough)
    const drinkGuests =
      typeof form.drinkingGuestCount === "number"
        ? form.drinkingGuestCount
        : 0;
    if (form.beverageType === "non_alcoholic" || form.beverageType === "both") {
      beverageQuote += 5 * guestCount; // $5 pp non-alcoholic base
    }
    if (form.beverageType === "alcoholic" || form.beverageType === "both") {
      const durationHours = parseFloat(form.barDuration) || 3;
      const baseRate = form.barType === "wet_hire" ? 15 : 8;
      const qualityMultiplier =
        form.liquorQuality === "top_shelf"
          ? 1.5
          : form.liquorQuality === "mid_shelf"
            ? 1.25
            : 1;
      beverageQuote +=
        baseRate * qualityMultiplier * durationHours * (drinkGuests || guestCount);
    }
    if (form.tableWaterService) {
      beverageQuote += 6.5 * guestCount;
    }
    if (form.coffeTeaService) {
      beverageQuote += 4 * guestCount;
    }
    if (form.needsGlassware) {
      beverageQuote += 2 * guestCount;
    }

    // Equipment
    EQUIPMENT_CATEGORIES.forEach((cat) => {
      const selections = form.equipmentSelections[cat.label] || {};
      cat.items.forEach((item) => {
        const qty = selections[item.name] || 0;
        if (item.unit === "per person") {
          equipmentTotal += item.price * qty * guestCount;
        } else {
          equipmentTotal += item.price * qty;
        }
      });
    });

    const subtotal =
      foodSubtotal + appetizerTotal + dessertTotal + beverageQuote + equipmentTotal;

    // Service fee
    let serviceFeeRate = 0;
    if (form.buffetStyle === "full_service") {
      serviceFeeRate = 0.2;
    } else if (form.buffetStyle === "standard" || form.serviceType === "plated") {
      serviceFeeRate = 0.15;
    } else if (form.serviceType && form.serviceType !== "buffet") {
      serviceFeeRate = 0.15;
    }
    const serviceFee = subtotal * serviceFeeRate;

    const preDiscountTotal = subtotal + serviceFee;
    const discount =
      form.promoValid && form.promoDiscount
        ? preDiscountTotal * (form.promoDiscount / 100)
        : 0;
    const estimatedTotal = preDiscountTotal - discount;

    return {
      perPersonFood,
      foodSubtotal,
      appetizerTotal,
      dessertTotal,
      beverageQuote,
      equipmentTotal,
      subtotal,
      serviceFeeRate,
      serviceFee,
      discount,
      estimatedTotal,
    };
  }, [form, guestCount]);

  // ---------- Step validation ----------
  const validateStep = useCallback(
    (s: number): string[] => {
      const errors: string[] = [];
      switch (s) {
        case 1:
          if (!form.eventType) errors.push("Please select an event type.");
          if (!form.firstName.trim()) errors.push("First name is required.");
          if (!form.lastName.trim()) errors.push("Last name is required.");
          if (!form.email.trim()) errors.push("Email is required.");
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            errors.push("Please enter a valid email address.");
          if (!form.eventDate) errors.push("Event date is required.");
          if (!form.guestCount || Number(form.guestCount) < 1)
            errors.push("Guest count is required.");
          break;
        case 2:
          if (!form.hasVenue)
            errors.push("Please indicate if you have secured a venue.");
          if (form.hasVenue === "yes" && !form.selectedVenueId)
            errors.push("Please select a venue.");
          break;
        case 3:
          if (!form.serviceType) errors.push("Please select a service type.");
          if (form.serviceType === "buffet" && !form.buffetStyle)
            errors.push("Please select a buffet style.");
          break;
        case 4:
          if (!form.menuTheme) errors.push("Please select a menu theme.");
          if (form.menuTheme !== "custom" && !form.packageTier)
            errors.push("Please select a package tier.");
          if (
            selectedTier &&
            selectedTier.minGuestCount &&
            guestCount > 0 &&
            guestCount < selectedTier.minGuestCount
          )
            errors.push(
              `${selectedTier.tierName} tier requires at least ${selectedTier.minGuestCount} guests.`,
            );
          break;
        // Steps 5-7 are optional selections
        default:
          break;
      }
      return errors;
    },
    [form, guestCount],
  );

  const goNext = useCallback(() => {
    const errors = validateStep(step);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setStep((prev) => Math.min(prev + 1, 8));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setStepErrors([]);
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ---------- Submit mutation ----------
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Build menuSelections array from the selected items + menu data
      const menuSelections: Array<{
        itemId?: string;
        name: string;
        category: string;
        upcharge?: number;
      }> = [];
      if (selectedMenu?.categoryItems) {
        for (const [category, ids] of Object.entries(form.menuItemSelections)) {
          const items = selectedMenu.categoryItems[category] || [];
          for (const id of ids) {
            const item = items.find((i) => i.id === id);
            if (item) {
              menuSelections.push({
                itemId: item.id,
                name: item.name,
                category,
                upcharge: (item.upchargeCents || 0) / 100,
              });
            }
          }
        }
      }

      // Strip fields the backend schema doesn't understand / that have
      // type mismatches with FormState, then reshape the rest to match.
      const {
        // Fields to drop: not in inquiries schema
        referralSources: _referralSources,
        referralSourceOther: _referralSourceOther,
        promoCode: _promoCode,
        promoValid: _promoValid,
        promoId: _promoId,
        promoDiscount: _promoDiscount,
        promoDescription: _promoDescription,
        hasVenue: _hasVenue,
        selectedVenueId: _selectedVenueId,
        locationPreferences: _locationPreferences,
        // Fields to remap below
        hasKitchen: formHasKitchen,
        ceremonySameSpace: formCeremonySameSpace,
        buffetStyle: formBuffetStyle,
        packageTier: _packageTier,
        menuItemSelections: _menuItemSelections,
        appetizerSelections: _appetizerSelections,
        dessertSelections: _dessertSelections,
        addAppetizers: _addAppetizers,
        addDesserts: _addDesserts,
        appetizerStyle: _appetizerStyle,
        nonAlcoholicSelections: _nonAlcoholicSelections,
        alcoholSelections: _alcoholSelections,
        beverageType: _beverageType,
        barType: _barType,
        barDuration: _barDuration,
        liquorQuality: _liquorQuality,
        needsGlassware: _needsGlassware,
        tableWaterService: _tableWaterService,
        coffeTeaService: _coffeTeaService,
        needsEquipment: _needsEquipment,
        equipmentSelections: _equipmentSelections,
        dietaryRestrictions: _dietaryRestrictions,
        allergies: _allergies,
        specialDietaryNotes: _specialDietaryNotes,
        industryReferrals: _industryReferrals,
        customMenuNotes: _customMenuNotes,
        // Corporate address: bundled into billingAddress jsonb below
        companyStreet: _companyStreet,
        companyCity: _companyCity,
        companyState: _companyState,
        companyZip: _companyZip,
        // Per-event-type extras: folded into specialRequests summary below
        corporatePurpose: _corporatePurpose,
        corporatePurposeOther: _corporatePurposeOther,
        brandedMenu: _brandedMenu,
        poReference: _poReference,
        eventLocationType: _eventLocationType,
        isSurpriseProposal: _isSurpriseProposal,
        guestOfHonor: _guestOfHonor,
        isMilestone: _isMilestone,
        milestoneAge: _milestoneAge,
        kidsFriendlyMenu: _kidsFriendlyMenu,
        truckParkingAvailable: _truckParkingAvailable,
        truckPowerAccess: _truckPowerAccess,
        truckWaterAccess: _truckWaterAccess,
        truckPropertyType: _truckPropertyType,
        truckServiceWindowStart: _truckServiceWindowStart,
        truckServiceWindowEnd: _truckServiceWindowEnd,
        otherEventDescription: _otherEventDescription,
        ...rest
      } = form;

      // Build billingAddress jsonb from the corporate address inputs (only
      // included if at least one field is filled in).
      const hasCompanyAddress =
        form.eventType === "corporate" &&
        (form.companyStreet || form.companyCity || form.companyState || form.companyZip);
      const billingAddress = hasCompanyAddress
        ? {
            street: form.companyStreet || undefined,
            city: form.companyCity || undefined,
            state: form.companyState || undefined,
            zip: form.companyZip || undefined,
          }
        : undefined;

      // Build a human-readable per-event-type summary that's prepended to
      // specialRequests. We don't have a dedicated jsonb column for this
      // today, but the summary keeps all the structured answers in front of
      // the admin reviewing the inquiry.
      const typeSummaryLines: string[] = [];
      if (form.eventType === "corporate") {
        if (form.corporatePurpose) {
          const label = CORPORATE_PURPOSES.find(
            (p) => p.value === form.corporatePurpose,
          )?.label;
          typeSummaryLines.push(
            `Event purpose: ${form.corporatePurpose === "other" ? form.corporatePurposeOther || "Other" : label}`,
          );
        }
        if (form.brandedMenu) typeSummaryLines.push("Branded menu cards: Yes");
        if (form.poReference)
          typeSummaryLines.push(`PO/Invoice reference: ${form.poReference}`);
        if (form.eventLocationType) {
          const label = CORPORATE_LOCATION_TYPES.find(
            (l) => l.value === form.eventLocationType,
          )?.label;
          if (label) typeSummaryLines.push(`Location type: ${label}`);
        }
      }
      if (form.eventType === "engagement" && form.isSurpriseProposal) {
        typeSummaryLines.push("Surprise proposal — please be discreet");
      }
      if (form.eventType === "birthday") {
        if (form.guestOfHonor)
          typeSummaryLines.push(`Guest of honor: ${form.guestOfHonor}`);
        if (form.isMilestone) {
          typeSummaryLines.push(
            form.milestoneAge
              ? `Milestone birthday: ${form.milestoneAge}`
              : "Milestone birthday",
          );
        }
        if (form.kidsFriendlyMenu)
          typeSummaryLines.push("Kids attending — kid-friendly options");
        if (form.eventLocationType) {
          const label = BIRTHDAY_LOCATION_TYPES.find(
            (l) => l.value === form.eventLocationType,
          )?.label;
          if (label) typeSummaryLines.push(`Location type: ${label}`);
        }
      }
      if (form.eventType === "food_truck") {
        if (form.truckPropertyType)
          typeSummaryLines.push(
            `Property type: ${form.truckPropertyType === "private" ? "Private" : "Public/street"}`,
          );
        if (form.truckParkingAvailable)
          typeSummaryLines.push(
            `Parking available: ${form.truckParkingAvailable}`,
          );
        if (form.truckPowerAccess)
          typeSummaryLines.push(`Power on-site: ${form.truckPowerAccess}`);
        if (form.truckWaterAccess)
          typeSummaryLines.push(`Water on-site: ${form.truckWaterAccess}`);
        if (form.truckServiceWindowStart || form.truckServiceWindowEnd) {
          typeSummaryLines.push(
            `Service window: ${form.truckServiceWindowStart || "?"} – ${form.truckServiceWindowEnd || "?"}`,
          );
        }
      }
      if (form.eventType === "other" && form.otherEventDescription) {
        typeSummaryLines.push(
          `Event description: ${form.otherEventDescription}`,
        );
      }
      const typeSummary = typeSummaryLines.length
        ? `— Event details —\n${typeSummaryLines.join("\n")}`
        : "";
      const combinedSpecialRequests = [form.specialRequests?.trim(), typeSummary]
        .filter(Boolean)
        .join("\n\n");

      // "yes"/"no" → boolean mapper, returns undefined when the radio was untouched
      const yesNoToBool = (v: string | undefined | null): boolean | undefined => {
        if (v === "yes") return true;
        if (v === "no") return false;
        return undefined;
      };

      const payload: Record<string, any> = {
        ...rest,
        guestCount,
        ...(combinedSpecialRequests
          ? { specialRequests: combinedSpecialRequests }
          : {}),
        ...(billingAddress ? { billingAddress } : {}),
        // Map form fields to schema columns / enums
        menuTier: form.packageTier || undefined,
        menuSelections,
        serviceStyle: formBuffetStyle || undefined, // buffetStyle → serviceStyle enum
        venueHasKitchen: yesNoToBool(formHasKitchen),
        ceremonySameSpace: yesNoToBool(formCeremonySameSpace),
        drinkingGuestCount:
          typeof form.drinkingGuestCount === "number"
            ? form.drinkingGuestCount
            : undefined,
        estimatedTotal: pricing.estimatedTotal,
        ...(opportunityId ? { opportunityId } : {}),
        ...(inviteToken ? { inviteToken } : {}),
        // P2-3: prefer utm_source over explicit source param, fall back to "website"
        source: attribution.utmSource || attribution.source || "website",
        // Individual UTM columns — used at convert-time to populate the opportunity
        utmMedium: attribution.utmMedium || undefined,
        utmCampaign: attribution.utmCampaign || undefined,
        utmContent: attribution.utmContent || undefined,
        utmTerm: attribution.utmTerm || undefined,
        referrer: attribution.referrer || undefined,
        // Human-readable summary for the admin UI
        referralDetail:
          [
            attribution.utmCampaign ? `campaign=${attribution.utmCampaign}` : null,
            attribution.utmMedium ? `medium=${attribution.utmMedium}` : null,
            attribution.utmContent ? `content=${attribution.utmContent}` : null,
            attribution.utmTerm ? `term=${attribution.utmTerm}` : null,
            attribution.referrer ? `referrer=${attribution.referrer}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      };

      // Strip keys whose value is `undefined` so we don't trip optional-but-
      // strictly-typed fields in Zod.
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
      const res = await apiRequest(
        "POST",
        "/api/inquiries",
        payload,
      );
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Quote Request Submitted!",
        description:
          "Thank you! We will review your request and get back to you soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description:
          error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ---------- Menu item selection helpers ----------
  // NOTE: this MUST live above the `if (submitted) return ...` below. Moving
  // it below triggers React error #300 ("rendered fewer hooks than during the
  // previous render") because the thank-you render skips this useCallback.
  const toggleMenuItem = useCallback(
    (category: string, itemId: string, limit: number) => {
      setForm((prev) => {
        const current = prev.menuItemSelections[category] || [];
        const isSelected = current.includes(itemId);
        let next: string[];
        if (isSelected) {
          next = current.filter((id) => id !== itemId);
        } else if (current.length < limit) {
          next = [...current, itemId];
        } else {
          toast({
            title: "Selection limit reached",
            description: `This tier allows up to ${limit} ${category}${limit === 1 ? "" : "s"}.`,
            variant: "destructive",
          });
          return prev;
        }
        return {
          ...prev,
          menuItemSelections: { ...prev.menuItemSelections, [category]: next },
        };
      });
    },
    [toast],
  );

  // ---------- Thank You Screen ----------
  if (submitted) {
    // Build the prefilled Cal.com URL for the embedded booking widget.
    // If Cal.com isn't configured, the right column collapses gracefully.
    let prefilledCalUrl: string | null = null;
    if (consultationUrl) {
      try {
        const u = new URL(consultationUrl);
        const name = `${form.firstName || ""} ${form.lastName || ""}`.trim();
        if (name) u.searchParams.set("name", name);
        if (form.email) u.searchParams.set("email", form.email);
        prefilledCalUrl = u.toString();
      } catch {
        prefilledCalUrl = consultationUrl;
      }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50 p-4 sm:p-8">
        <div
          className={cn(
            "max-w-6xl mx-auto grid gap-6",
            prefilledCalUrl ? "lg:grid-cols-2" : "grid-cols-1 max-w-lg"
          )}
        >
          {/* ─── Confirmation (left column, or centered if no Cal.com) ─── */}
          <Card className="shadow-xl h-fit" data-testid="card-confirmation">
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Thank You!</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Your quote request has been submitted. Our team will review
                your event details and respond within{" "}
                <span className="font-semibold">24-48 hours</span>.
              </p>
              {form.promoValid && form.promoDiscount > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {form.promoDiscount}% promo discount applied
                </Badge>
              )}
              <Separator />
              <p className="text-sm text-gray-500">
                A confirmation email has been sent to{" "}
                <span className="font-medium">{form.email}</span>.
              </p>
              {prefilledCalUrl && (
                <p className="text-sm text-gray-700 font-medium pt-1">
                  Want answers faster? Book a free 15-minute call →
                </p>
              )}
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setForm({ ...initialFormState });
                  setStep(1);
                  setSubmitted(false);
                }}
              >
                Submit Another Request
              </Button>
            </CardContent>
          </Card>

          {/* ─── Cal.com embed (right column, only when configured) ─── */}
          {prefilledCalUrl && (
            <Card className="shadow-xl overflow-hidden" data-testid="card-cal-embed">
              <div className="px-6 py-4 border-b bg-white">
                <h3 className="text-lg font-semibold text-gray-900">
                  Book a quick call with Mike
                </h3>
                <p className="text-sm text-gray-500">
                  Zoom or phone — your pick. Totally optional.
                </p>
              </div>
              <iframe
                src={prefilledCalUrl}
                title="Book a consultation"
                className="w-full border-0"
                style={{ height: "min(75vh, 720px)" }}
                data-testid="iframe-inquiry-cal-booking"
              />
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ---------- Render helpers ----------

  /** Visual card selector (event types, service types, menu themes) */
  const renderCardSelector = (
    options: readonly { value: string; label: string; icon?: any }[],
    selected: string,
    onSelect: (v: string) => void,
    cols?: string,
  ) => (
    <div
      className={cn(
        "grid gap-3",
        cols || "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:shadow-md",
              isActive
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "border-gray-200 bg-white hover:border-gray-300",
            )}
          >
            {isActive && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            {Icon && (
              <Icon
                className={cn(
                  "h-7 w-7",
                  isActive ? "text-primary" : "text-gray-400",
                )}
              />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                isActive ? "text-primary" : "text-gray-700",
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  /** Quantity selector with +/- buttons */
  const renderQuantitySelector = (
    value: number,
    onChange: (v: number) => void,
    min = 0,
    step_size = 1,
  ) => (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(min, value - step_size))}
        disabled={value <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-12 text-center font-medium tabular-nums">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(value + step_size)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );

  /** Lot size selector for appetizers */
  const renderLotSelector = (
    value: number,
    onChange: (v: number) => void,
  ) => (
    <Select
      value={value > 0 ? String(value) : ""}
      onValueChange={(v) => onChange(v ? Number(v) : 0)}
    >
      <SelectTrigger className="w-28">
        <SelectValue placeholder="Qty" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">None</SelectItem>
        {LOT_SIZES.map((s) => (
          <SelectItem key={s} value={String(s)}>
            {s} pcs
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // =========================================================================
  // STEP CONTENT
  // =========================================================================

  const renderStep1 = () => (
    <div className="space-y-8">
      {/* How did you hear about us */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          How did you hear about us?
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {REFERRAL_SOURCES.map((src) => (
            <label
              key={src}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={form.referralSources.includes(src)}
                onCheckedChange={() => {
                  toggleArrayItem("referralSources", src);
                  // Clear the free-text box when "Other" is un-checked
                  if (src === "Other" && form.referralSources.includes("Other")) {
                    update("referralSourceOther", "");
                  }
                }}
              />
              <span className="text-sm">{src}</span>
            </label>
          ))}
        </div>
        {form.referralSources.includes("Other") && (
          <div className="space-y-1.5">
            <Label htmlFor="referralSourceOther" className="text-sm">
              Please tell us how you heard about us
            </Label>
            <Input
              id="referralSourceOther"
              value={form.referralSourceOther}
              onChange={(e) => update("referralSourceOther", e.target.value)}
              placeholder="e.g. friend's name, specific publication, etc."
            />
          </div>
        )}
      </div>

      {/* Promo code */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-base font-semibold">Have a promo code?</Label>
          <Switch
            checked={showPromoInput}
            onCheckedChange={(checked) => {
              setShowPromoInput(checked);
              if (!checked) {
                setForm((prev) => ({
                  ...prev,
                  promoCode: "",
                  promoValid: null,
                  promoId: null,
                  promoDiscount: 0,
                  promoDescription: "",
                }));
              }
            }}
          />
        </div>
        {showPromoInput && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter promo code"
              value={form.promoCode}
              onChange={(e) => {
                update("promoCode", e.target.value);
                if (form.promoValid !== null) {
                  update("promoValid", null);
                }
              }}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={validatePromo}
              disabled={validatingPromo || !form.promoCode.trim()}
            >
              {validatingPromo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Validate"
              )}
            </Button>
            {form.promoValid === true && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {form.promoDiscount}% off
                  {form.promoDescription && ` - ${form.promoDescription}`}
                </span>
              </div>
            )}
            {form.promoValid === false && (
              <div className="flex items-center gap-1 text-red-500">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Invalid code</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Event Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Event Type <span className="text-red-500">*</span>
        </Label>
        {renderCardSelector(EVENT_TYPES, form.eventType, (v) => {
          update("eventType", v);
          // If they picked the "Food Truck" event type, pre-select the
          // matching service style so they don't have to pick it again on
          // Step 3. They can still change it later.
          if (v === "food_truck" && !form.serviceType) {
            update("serviceType", "food_truck");
          }
        })}
      </div>

      <Separator />

      {/* Contact Info */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Your Information</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Last name"
            />
          </div>
        </div>

        {/* Partner name (Wedding / Engagement) */}
        {eventConfig.showPartnerNames && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="partnerFirst">Partner First Name</Label>
              <Input
                id="partnerFirst"
                value={form.partnerFirstName}
                onChange={(e) => update("partnerFirstName", e.target.value)}
                placeholder="Partner's first name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partnerLast">Partner Last Name</Label>
              <Input
                id="partnerLast"
                value={form.partnerLastName}
                onChange={(e) => update("partnerLastName", e.target.value)}
                placeholder="Partner's last name"
              />
            </div>
          </div>
        )}

        {/* Company details (Corporate) */}
        {form.eventType === "corporate" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyStreet">Company Address</Label>
              <Input
                id="companyStreet"
                value={form.companyStreet}
                onChange={(e) => update("companyStreet", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="companyCity">City</Label>
                <Input
                  id="companyCity"
                  value={form.companyCity}
                  onChange={(e) => update("companyCity", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyState">State</Label>
                <Input
                  id="companyState"
                  value={form.companyState}
                  onChange={(e) => update("companyState", e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyZip">ZIP</Label>
                <Input
                  id="companyZip"
                  value={form.companyZip}
                  onChange={(e) => update("companyZip", e.target.value)}
                  placeholder="ZIP code"
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <Separator />

      {/* Event Details */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Event Details</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="eventDate">
              Event Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="eventDate"
              type="date"
              value={form.eventDate}
              onChange={(e) => update("eventDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guestCount">
              Guest Count <span className="text-red-500">*</span>
            </Label>
            <Input
              id="guestCount"
              type="number"
              min="1"
              value={form.guestCount}
              onChange={(e) =>
                update(
                  "guestCount",
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              placeholder="Number of guests"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Event Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={form.eventStartTime}
              onChange={(e) => update("eventStartTime", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime">Event End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={form.eventEndTime}
              onChange={(e) => update("eventEndTime", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Per-event-type context block — only renders when the eventType
          config asks for at least one of these extras. Customer sees
          different questions depending on what they're hosting. */}
      {(eventConfig.showSurpriseFlag ||
        eventConfig.showCorporateContext ||
        eventConfig.showBirthdayContext ||
        eventConfig.showOtherDescription) && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              {form.eventType === "engagement"
                ? "About Your Engagement"
                : form.eventType === "corporate"
                ? "About the Event"
                : form.eventType === "birthday"
                ? "About the Birthday"
                : "About Your Event"}
            </Label>

            {/* Engagement: is this a surprise? */}
            {eventConfig.showSurpriseFlag && (
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={form.isSurpriseProposal}
                  onCheckedChange={(v) =>
                    update("isSurpriseProposal", v === true)
                  }
                />
                <div>
                  <div className="font-medium">
                    This is a surprise proposal
                  </div>
                  <div className="text-sm text-gray-500">
                    We'll be extra discreet with any coordination and won't
                    contact anyone besides you.
                  </div>
                </div>
              </label>
            )}

            {/* Corporate: purpose, branded menu, PO/invoice reference */}
            {eventConfig.showCorporateContext && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="corporatePurpose">
                    What kind of corporate event is this?
                  </Label>
                  <Select
                    value={form.corporatePurpose}
                    onValueChange={(v) => update("corporatePurpose", v)}
                  >
                    <SelectTrigger id="corporatePurpose">
                      <SelectValue placeholder="Select a purpose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CORPORATE_PURPOSES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.corporatePurpose === "other" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="corporatePurposeOther">
                      Tell us more
                    </Label>
                    <Input
                      id="corporatePurposeOther"
                      value={form.corporatePurposeOther}
                      onChange={(e) =>
                        update("corporatePurposeOther", e.target.value)
                      }
                      placeholder="Brief description of the event"
                    />
                  </div>
                )}
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.brandedMenu}
                    onCheckedChange={(v) => update("brandedMenu", v === true)}
                  />
                  <div>
                    <div className="font-medium">
                      Include branded menu cards
                    </div>
                    <div className="text-sm text-gray-500">
                      We can print menu cards with your company logo for each
                      place setting.
                    </div>
                  </div>
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="poReference">
                    PO / Invoice reference{" "}
                    <span className="text-gray-400 text-sm font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="poReference"
                    value={form.poReference}
                    onChange={(e) => update("poReference", e.target.value)}
                    placeholder="e.g. PO-12345"
                  />
                </div>
              </div>
            )}

            {/* Birthday: guest of honor, milestone, kid-friendly */}
            {eventConfig.showBirthdayContext && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guestOfHonor">Guest of Honor</Label>
                  <Input
                    id="guestOfHonor"
                    value={form.guestOfHonor}
                    onChange={(e) => update("guestOfHonor", e.target.value)}
                    placeholder="Who is this birthday for?"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.isMilestone}
                    onCheckedChange={(v) => {
                      const checked = v === true;
                      update("isMilestone", checked);
                      if (!checked) update("milestoneAge", "");
                    }}
                  />
                  <div>
                    <div className="font-medium">
                      This is a milestone birthday
                    </div>
                    <div className="text-sm text-gray-500">
                      e.g. 16th, 21st, 30th, 50th — lets us plan something
                      extra special.
                    </div>
                  </div>
                </label>
                {form.isMilestone && (
                  <div className="space-y-1.5">
                    <Label htmlFor="milestoneAge">Age being celebrated</Label>
                    <Input
                      id="milestoneAge"
                      type="number"
                      min="1"
                      value={form.milestoneAge}
                      onChange={(e) =>
                        update("milestoneAge", e.target.value)
                      }
                      placeholder="e.g. 30"
                      className="sm:w-32"
                    />
                  </div>
                )}
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.kidsFriendlyMenu}
                    onCheckedChange={(v) =>
                      update("kidsFriendlyMenu", v === true)
                    }
                  />
                  <div>
                    <div className="font-medium">
                      Kids will be attending — include kid-friendly options
                    </div>
                    <div className="text-sm text-gray-500">
                      We'll suggest simpler dishes and kid-appropriate
                      portions alongside the main menu.
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* "Other": short description so we know what we're quoting for */}
            {eventConfig.showOtherDescription && (
              <div className="space-y-1.5">
                <Label htmlFor="otherEventDescription">
                  Tell us about your event{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="otherEventDescription"
                  value={form.otherEventDescription}
                  onChange={(e) =>
                    update("otherEventDescription", e.target.value)
                  }
                  placeholder="What are you celebrating? What's the vibe? Any important details?"
                  rows={4}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // Truck-specific logistics block — rendered wherever serviceType=food_truck,
  // regardless of event type. A wedding that picks a food truck for the
  // reception needs the same parking/power/water answers as a standalone
  // food-truck event.
  const renderTruckLogistics = () => (
    <div className="space-y-6 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/40 p-5">
      <div>
        <Label className="text-base font-semibold">Food Truck Logistics</Label>
        <p className="text-sm text-gray-600 mt-1">
          A few extra questions since you're going with a food truck — this
          helps us confirm we can actually park, power, and serve on the day.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Is this private or public property?
        </Label>
        <RadioGroup
          value={form.truckPropertyType}
          onValueChange={(v) => update("truckPropertyType", v)}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="private" id="truck-private" />
            <Label htmlFor="truck-private">Private property</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="public" id="truck-public" />
            <Label htmlFor="truck-public">Public / street</Label>
          </div>
        </RadioGroup>
        {form.truckPropertyType === "public" && (
          <p className="text-sm text-gray-500">
            We'll need to confirm permits and any street-use restrictions
            for your area before the event.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Is there space for the truck to park and serve from?
        </Label>
        <RadioGroup
          value={form.truckParkingAvailable}
          onValueChange={(v) => update("truckParkingAvailable", v)}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="truck-parking-yes" />
            <Label htmlFor="truck-parking-yes">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="truck-parking-no" />
            <Label htmlFor="truck-parking-no">No</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unknown" id="truck-parking-unknown" />
            <Label htmlFor="truck-parking-unknown">Not sure</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Is on-site power available?
        </Label>
        <p className="text-sm text-gray-500 -mt-2">
          We can run on the truck's generator, but a grid hookup is quieter
          and better for the neighbours.
        </p>
        <RadioGroup
          value={form.truckPowerAccess}
          onValueChange={(v) => update("truckPowerAccess", v)}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="truck-power-yes" />
            <Label htmlFor="truck-power-yes">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="truck-power-no" />
            <Label htmlFor="truck-power-no">No — we'll run on generator</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unknown" id="truck-power-unknown" />
            <Label htmlFor="truck-power-unknown">Not sure</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Is on-site water access available?
        </Label>
        <RadioGroup
          value={form.truckWaterAccess}
          onValueChange={(v) => update("truckWaterAccess", v)}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id="truck-water-yes" />
            <Label htmlFor="truck-water-yes">Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id="truck-water-no" />
            <Label htmlFor="truck-water-no">No — we'll self-supply</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="unknown" id="truck-water-unknown" />
            <Label htmlFor="truck-water-unknown">Not sure</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Service Window
        </Label>
        <p className="text-sm text-gray-500 -mt-2">
          When should the truck be serving? We typically need 45–60 minutes
          of setup before service starts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="truckStart">Service Start</Label>
            <Input
              id="truckStart"
              type="time"
              value={form.truckServiceWindowStart}
              onChange={(e) =>
                update("truckServiceWindowStart", e.target.value)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="truckEnd">Service End</Label>
            <Input
              id="truckEnd"
              type="time"
              value={form.truckServiceWindowEnd}
              onChange={(e) =>
                update("truckServiceWindowEnd", e.target.value)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    // Venue/location flow driven by EVENT_TYPE_CONFIG. Food-truck event type
    // goes through this same flow — truck-specific questions (parking,
    // power, etc.) live in Step 3, tied to serviceType=food_truck so they
    // also appear for e.g. a wedding that hires a food truck.
    const locationTypes =
      form.eventType === "corporate"
        ? CORPORATE_LOCATION_TYPES
        : form.eventType === "birthday"
        ? BIRTHDAY_LOCATION_TYPES
        : null;

    return (
      <div className="space-y-8">
        {/* Corporate / birthday: "Where's the event?" branch — comes before
            the more rigid Yes/No venue question so we can tailor what
            follows. */}
        {eventConfig.showLocationTypeBranch && locationTypes && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Where will the event take place?{" "}
              <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={form.eventLocationType}
              onValueChange={(v) => {
                update("eventLocationType", v);
                // Our-office / at-home shortcut: pre-fill venue so the user
                // doesn't have to retype the address they already gave us.
                if (v === "our_office" && form.eventType === "corporate") {
                  update("hasVenue", "yes");
                  update("selectedVenueId", "other");
                  update("venueAddress", form.companyStreet);
                  update("venueCity", form.companyCity);
                  update("venueState", form.companyState);
                  update("venueZip", form.companyZip);
                } else if (v === "home" && form.eventType === "birthday") {
                  update("hasVenue", "yes");
                  update("selectedVenueId", "other");
                } else if (v === "not_decided") {
                  update("hasVenue", "no");
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {locationTypes.map((lt) => (
                <label
                  key={lt.value}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all",
                    form.eventLocationType === lt.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <RadioGroupItem
                    value={lt.value}
                    id={`loc-type-${lt.value}`}
                  />
                  <span className="font-medium">{lt.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Have you secured a venue/location? — skip for corporate if they
            already said "our office" or "not decided", since those answered
            the question implicitly. */}
        {!(
          eventConfig.showLocationTypeBranch &&
          (form.eventLocationType === "our_office" ||
            form.eventLocationType === "home" ||
            form.eventLocationType === "not_decided")
        ) && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {eventConfig.hasLocationLabel}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={form.hasVenue}
              onValueChange={(v) => {
                update("hasVenue", v);
                if (v === "no") {
                  update("selectedVenueId", "");
                }
              }}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="venue-yes" />
                <Label htmlFor="venue-yes">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="venue-no" />
                <Label htmlFor="venue-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Venue/location selection (if Yes) */}
        {form.hasVenue === "yes" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                {form.eventType === "corporate" ||
                form.eventType === "birthday"
                  ? "Select a location"
                  : "Select Venue"}
              </Label>
              <Select
                value={form.selectedVenueId}
                onValueChange={handleVenueSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a venue..." />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other (enter manually)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venueAddress">
                {form.eventType === "corporate" ||
                form.eventType === "birthday"
                  ? "Address"
                  : "Venue Address"}
              </Label>
              <Input
                id="venueAddress"
                value={form.venueAddress}
                onChange={(e) => update("venueAddress", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="venueCity">City</Label>
                <Input
                  id="venueCity"
                  value={form.venueCity}
                  onChange={(e) => update("venueCity", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venueState">State</Label>
                <Input
                  id="venueState"
                  value={form.venueState}
                  onChange={(e) => update("venueState", e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venueZip">ZIP</Label>
                <Input
                  id="venueZip"
                  value={form.venueZip}
                  onChange={(e) => update("venueZip", e.target.value)}
                  placeholder="ZIP code"
                />
              </div>
            </div>
          </div>
        )}

        {/* Location preferences (if No) */}
        {form.hasVenue === "no" && (
          <div className="space-y-1.5">
            <Label htmlFor="locationPrefs">Location Preferences</Label>
            <Textarea
              id="locationPrefs"
              value={form.locationPreferences}
              onChange={(e) => update("locationPreferences", e.target.value)}
              placeholder="Describe your preferred area, venue type, or any location requirements..."
              rows={3}
            />
          </div>
        )}

        {/* Kitchen facilities — only if they have a location */}
        {form.hasVenue === "yes" && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {form.eventType === "corporate" ||
              form.eventType === "birthday"
                ? "Is there a kitchen on-site we can use?"
                : "Does the venue have kitchen facilities?"}
            </Label>
            <RadioGroup
              value={form.hasKitchen}
              onValueChange={(v) => update("hasKitchen", v)}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="kitchen-yes" />
                <Label htmlFor="kitchen-yes">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="kitchen-no" />
                <Label htmlFor="kitchen-no">No</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Wedding-specific: ceremony same space */}
        {eventConfig.showCeremonyBlock && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-semibold">Ceremony Details</Label>
              <div className="space-y-3">
                <Label>Will the ceremony be in the same space as the reception?</Label>
                <RadioGroup
                  value={form.ceremonySameSpace}
                  onValueChange={(v) => update("ceremonySameSpace", v)}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="yes" id="ceremony-same-yes" />
                    <Label htmlFor="ceremony-same-yes">Yes</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="ceremony-same-no" />
                    <Label htmlFor="ceremony-same-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ceremonyStart">Ceremony Start Time</Label>
                  <Input
                    id="ceremonyStart"
                    type="time"
                    value={form.ceremonyStartTime}
                    onChange={(e) => update("ceremonyStartTime", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ceremonyEnd">Ceremony End Time</Label>
                  <Input
                    id="ceremonyEnd"
                    type="time"
                    value={form.ceremonyEndTime}
                    onChange={(e) => update("ceremonyEndTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* On-site / venue contact — only when they actually have a venue.
            We hid this block before answering Yes/No, which was confusing. */}
        {form.hasVenue === "yes" && (
          <>
            <Separator />
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                {eventConfig.onSiteContactLabel}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="venueContactName">Contact Name</Label>
                  <Input
                    id="venueContactName"
                    value={form.venueContactName}
                    onChange={(e) => update("venueContactName", e.target.value)}
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="venueContactPhone">Contact Phone</Label>
                  <Input
                    id="venueContactPhone"
                    type="tel"
                    value={form.venueContactPhone}
                    onChange={(e) => update("venueContactPhone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-8">
      {/* Service type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Service Type <span className="text-red-500">*</span>
        </Label>
        {renderCardSelector(SERVICE_TYPES, form.serviceType, (v) =>
          update("serviceType", v),
        )}
      </div>

      {/* Food-truck logistics — shown whenever serviceType is food_truck,
          regardless of event type. A wedding/corporate/birthday that hires a
          food truck needs these answers just as much as a standalone
          food-truck event. */}
      {form.serviceType === "food_truck" && renderTruckLogistics()}

      {/* Buffet style (conditional) */}
      {form.serviceType === "buffet" && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Buffet Service Style <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={form.buffetStyle}
            onValueChange={(v) => update("buffetStyle", v)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {BUFFET_STYLES.map((bs) => (
              <label
                key={bs.value}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                  form.buffetStyle === bs.value
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <RadioGroupItem value={bs.value} id={`bs-${bs.value}`} />
                <span className="font-medium">{bs.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}

      <Separator />

      {/* Cocktail / appetizer hour */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Cocktail / Appetizer Hour
          </Label>
          <Switch
            checked={form.hasCocktailHour}
            onCheckedChange={(v) => update("hasCocktailHour", v)}
          />
        </div>
        {form.hasCocktailHour && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cocktailStart">Start Time</Label>
              <Input
                id="cocktailStart"
                type="time"
                value={form.cocktailStartTime}
                onChange={(e) => update("cocktailStartTime", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cocktailEnd">End Time</Label>
              <Input
                id="cocktailEnd"
                type="time"
                value={form.cocktailEndTime}
                onChange={(e) => update("cocktailEndTime", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Main meal service — food truck always serves a main meal (no toggle),
          cocktail parties default OFF (but can opt in) */}
      {eventConfig.showMainMealToggle ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Main Meal Service</Label>
            <Switch
              checked={form.hasMainMeal}
              onCheckedChange={(v) => update("hasMainMeal", v)}
            />
          </div>
          {form.hasMainMeal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mainMealStart">Start Time</Label>
                <Input
                  id="mainMealStart"
                  type="time"
                  value={form.mainMealStartTime}
                  onChange={(e) => update("mainMealStartTime", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mainMealEnd">End Time</Label>
                <Input
                  id="mainMealEnd"
                  type="time"
                  value={form.mainMealEndTime}
                  onChange={(e) => update("mainMealEndTime", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}
      {/* Unconditional meal timing block — only reachable when the toggle
          is hidden AND the config wants a main meal (food truck). */}
      {!eventConfig.showMainMealToggle && eventConfig.mainMealDefault && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mainMealStart">Start Time</Label>
              <Input
                id="mainMealStart"
                type="time"
                value={form.mainMealStartTime}
                onChange={(e) => update("mainMealStartTime", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mainMealEnd">End Time</Label>
              <Input
                id="mainMealEnd"
                type="time"
                value={form.mainMealEndTime}
                onChange={(e) => update("mainMealEndTime", e.target.value)}
              />
            </div>
          </div>
        )}
    </div>
  );


  // Tier visual palette keyed by known tier slugs — falls back to primary color for custom tiers
  const TIER_COLORS: Record<string, { gradient: string; border: string }> = {
    bronze: { gradient: "from-amber-700 to-amber-900", border: "border-amber-400" },
    silver: { gradient: "from-gray-400 to-gray-600", border: "border-gray-400" },
    gold: { gradient: "from-yellow-400 to-yellow-600", border: "border-yellow-400" },
    diamond: { gradient: "from-blue-300 to-blue-500", border: "border-blue-400" },
  };

  const renderStep4 = () => {
    // Build theme cards from the dynamic menu data, plus a "Custom" option
    const themeOptions = publicMenus
      .filter((m) => m.themeKey) // only include menus with a theme key
      .map((m) => ({
        value: m.themeKey!,
        label: m.name,
        icon: ChefHat,
      }));
    themeOptions.push({ value: "custom", label: "Custom", icon: ChefHat });

    return (
      <div className="space-y-8">
        {/* Menu theme */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Menu Theme <span className="text-red-500">*</span>
          </Label>
          {publicMenus.length === 0 ? (
            <p className="text-sm text-gray-500">Loading menu options…</p>
          ) : (
            renderCardSelector(
              themeOptions,
              form.menuTheme,
              (v) => {
                update("menuTheme", v);
                update("packageTier", "");
                update("menuItemSelections", {});
              },
              "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
            )
          )}
          {selectedMenu?.description && (
            <p className="text-sm text-gray-600 mt-2 italic">
              {selectedMenu.description}
            </p>
          )}
        </div>

        {/* Package tier */}
        {selectedMenu && selectedMenu.packages && selectedMenu.packages.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Package Tier <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...selectedMenu.packages]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((tier) => {
                  const price = tier.pricePerPersonCents / 100;
                  const disabled =
                    tier.minGuestCount &&
                    guestCount > 0 &&
                    guestCount < tier.minGuestCount;
                  const isActive = form.packageTier === tier.tierKey;
                  const colors = TIER_COLORS[tier.tierKey] || {
                    gradient: "from-purple-500 to-purple-700",
                    border: "border-purple-400",
                  };
                  return (
                    <button
                      key={tier.tierKey}
                      type="button"
                      disabled={!!disabled}
                      onClick={() => {
                        update("packageTier", tier.tierKey);
                        update("menuItemSelections", {});
                      }}
                      className={cn(
                        "relative rounded-xl border-2 p-5 text-left transition-all",
                        disabled
                          ? "opacity-40 cursor-not-allowed border-gray-200"
                          : isActive
                            ? `${colors.border} shadow-lg ring-2 ring-primary/20`
                            : "border-gray-200 hover:shadow-md hover:border-gray-300",
                      )}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "text-xs font-bold uppercase tracking-wider mb-2 bg-gradient-to-r bg-clip-text text-transparent",
                          colors.gradient,
                        )}
                      >
                        {tier.tierName}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {fmt(price)}
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          / person
                        </span>
                      </div>
                      {tier.description && (
                        <div className="text-xs text-gray-600 mt-2 leading-snug">
                          {tier.description}
                        </div>
                      )}
                      {disabled && (
                        <div className="text-xs text-red-500 mt-2 font-medium">
                          Min {tier.minGuestCount} guests
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Item selection per category */}
        {selectedTier && selectedMenu?.categoryItems && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Select Your Items
              </Label>
              {selectedTier.included && selectedTier.included.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Includes: {selectedTier.included.join(", ")}
                </Badge>
              )}
            </div>
            {Object.entries(selectedTier.selectionLimits).map(
              ([category, limit]) => {
                const allItems = selectedMenu.categoryItems![category] || [];
                // Items can be gated to specific tiers; empty/undefined = all tiers
                const items = allItems.filter((it) => {
                  const tiers = it.availableInTiers;
                  if (!tiers || tiers.length === 0) return true;
                  return tiers.includes(selectedTier.tierKey);
                });
                const selected = form.menuItemSelections[category] || [];
                if (items.length === 0) return null;
                return (
                  <div
                    key={category}
                    className="rounded-xl border bg-white p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold capitalize">
                        {category === "salsa"
                          ? "Salsas"
                          : category === "condiment"
                            ? "Condiments"
                            : category === "spread"
                              ? "Spreads"
                              : category === "sauce"
                                ? "Sauces"
                                : category === "pasta"
                                  ? "Pasta"
                                  : `${category.charAt(0).toUpperCase()}${category.slice(1)}s`}
                      </h4>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          selected.length === limit
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600",
                        )}
                      >
                        {selected.length} / {limit} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {items.map((item) => {
                        const isSelected = selected.includes(item.id);
                        const upcharge = (item.upchargeCents || 0) / 100;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              toggleMenuItem(category, item.id, limit)
                            }
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-sm transition-all",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0",
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-gray-300",
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span className="truncate">{item.name}</span>
                            </div>
                            {upcharge > 0 && (
                              <span className="text-xs text-amber-600 font-medium flex-shrink-0">
                                +${upcharge.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Custom menu notes */}
        {form.menuTheme === "custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="customMenu">
              Tell us about your custom menu vision
            </Label>
            <Textarea
              id="customMenu"
              value={form.customMenuNotes}
              onChange={(e) => update("customMenuNotes", e.target.value)}
              placeholder="Describe your dream menu, dietary preferences, specific dishes, cuisine style..."
              rows={5}
            />
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-8">
      {/* Appetizers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Add Appetizers?</Label>
          <Switch
            checked={form.addAppetizers}
            onCheckedChange={(v) => update("addAppetizers", v)}
          />
        </div>

        {form.addAppetizers && (
          <>
            <div className="space-y-3">
              <Label>Appetizer Service Style</Label>
              <RadioGroup
                value={form.appetizerStyle}
                onValueChange={(v) => update("appetizerStyle", v)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="stationary" id="app-stationary" />
                  <Label htmlFor="app-stationary">Stationary</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="passed" id="app-passed" />
                  <Label htmlFor="app-passed">Passed</Label>
                </div>
              </RadioGroup>
            </div>

            <Accordion type="multiple" className="w-full">
              {APPETIZER_CATEGORIES.map((cat) => {
                const selections = form.appetizerSelections[cat.label] || {};
                const catTotal = cat.items.reduce((sum, item) => {
                  const qty = selections[item.name] || 0;
                  if (cat.perPerson) {
                    return sum + (qty > 0 ? item.price * guestCount : 0);
                  }
                  return sum + item.price * qty;
                }, 0);

                return (
                  <AccordionItem key={cat.label} value={cat.label}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{cat.label}</span>
                        {catTotal > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {fmt(catTotal)}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {cat.items.map((item) => {
                          const qty = selections[item.name] || 0;
                          return (
                            <div
                              key={item.name}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <div>
                                <p className="font-medium text-sm">
                                  {item.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {fmt(item.price)} {item.unit}
                                </p>
                              </div>
                              {cat.perPerson ? (
                                <div className="flex items-center gap-3">
                                  <Switch
                                    checked={qty > 0}
                                    onCheckedChange={(checked) =>
                                      setAppetizerQty(
                                        cat.label,
                                        item.name,
                                        checked ? 1 : 0,
                                      )
                                    }
                                  />
                                  {qty > 0 && (
                                    <span className="text-sm text-gray-600">
                                      {fmt(item.price * guestCount)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  {renderLotSelector(qty, (v) =>
                                    setAppetizerQty(cat.label, item.name, v),
                                  )}
                                  {qty > 0 && (
                                    <span className="text-sm text-gray-600 w-20 text-right">
                                      {fmt(item.price * qty)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
      </div>

      <Separator />

      {/* Desserts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Add Desserts?</Label>
          <Switch
            checked={form.addDesserts}
            onCheckedChange={(v) => update("addDesserts", v)}
          />
        </div>

        {form.addDesserts && (
          <div className="space-y-3">
            {DESSERT_ITEMS.map((item) => {
              const qty = form.dessertSelections[item.name] || 0;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {fmt(item.price)} {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderLotSelector(qty, (v) =>
                      setDessertQty(item.name, v),
                    )}
                    {qty > 0 && (
                      <span className="text-sm text-gray-600 w-20 text-right">
                        {fmt(item.price * qty)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-8">
      {/* Beverage service type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Beverage Service</Label>
        <RadioGroup
          value={form.beverageType}
          onValueChange={(v) => update("beverageType", v)}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { value: "non_alcoholic", label: "Non-Alcoholic Only" },
            { value: "alcoholic", label: "Alcoholic" },
            { value: "both", label: "Both" },
            { value: "none", label: "None" },
          ].map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all text-sm",
                form.beverageType === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <RadioGroupItem value={opt.value} id={`bev-${opt.value}`} />
              <span className="font-medium">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Non-alcoholic selections */}
      {(form.beverageType === "non_alcoholic" ||
        form.beverageType === "both") && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Non-Alcoholic Beverages
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NON_ALCOHOLIC_OPTIONS.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={form.nonAlcoholicSelections.includes(opt)}
                  onCheckedChange={() =>
                    toggleArrayItem("nonAlcoholicSelections", opt)
                  }
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Alcoholic selections */}
      {(form.beverageType === "alcoholic" || form.beverageType === "both") && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label className="text-base font-semibold">Bar Service</Label>

            {/* Bar type */}
            <div className="space-y-3">
              <Label>Bar Type</Label>
              <RadioGroup
                value={form.barType}
                onValueChange={(v) => update("barType", v)}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <label
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border-2 p-4 cursor-pointer transition-all",
                    form.barType === "dry_hire"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="dry_hire" id="bar-dry" />
                    <span className="font-medium">Dry Hire</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-6">
                    You provide the alcohol, we provide bartenders & setup
                  </span>
                </label>
                <label
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border-2 p-4 cursor-pointer transition-all",
                    form.barType === "wet_hire"
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="wet_hire" id="bar-wet" />
                    <span className="font-medium">Wet Hire</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-6">
                    We provide everything including all beverages
                  </span>
                </label>
              </RadioGroup>
            </div>

            {/* Drinking guest count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="drinkingGuests">Drinking Guest Count</Label>
                <Input
                  id="drinkingGuests"
                  type="number"
                  min="1"
                  value={form.drinkingGuestCount}
                  onChange={(e) =>
                    update(
                      "drinkingGuestCount",
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  placeholder="Number of drinking guests"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bar Duration</Label>
                <Select
                  value={form.barDuration}
                  onValueChange={(v) => update("barDuration", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BAR_DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d} hours
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Alcohol selections */}
            <div className="space-y-3">
              <Label>Alcohol Package</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALCOHOL_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.alcoholSelections.includes(opt)}
                      onCheckedChange={() =>
                        toggleArrayItem("alcoholSelections", opt)
                      }
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Liquor quality (wet hire only) */}
            {form.barType === "wet_hire" && (
              <div className="space-y-3">
                <Label>Liquor Quality</Label>
                <RadioGroup
                  value={form.liquorQuality}
                  onValueChange={(v) => update("liquorQuality", v)}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="well" id="liq-well" />
                    <Label htmlFor="liq-well">Well</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="mid_shelf" id="liq-mid" />
                    <Label htmlFor="liq-mid">Mid Shelf</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="top_shelf" id="liq-top" />
                    <Label htmlFor="liq-top">Top Shelf</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* Additional beverage options */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          Additional Beverage Options
        </Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Glassware Service</p>
              <p className="text-xs text-gray-500">
                Professional glassware for your event
              </p>
            </div>
            <Switch
              checked={form.needsGlassware}
              onCheckedChange={(v) => update("needsGlassware", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Table Water Service</p>
              <p className="text-xs text-gray-500">
                {fmt(6.5)} per person
              </p>
            </div>
            <Switch
              checked={form.tableWaterService}
              onCheckedChange={(v) => update("tableWaterService", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Coffee & Tea Service</p>
              <p className="text-xs text-gray-500">
                Freshly brewed coffee and assorted teas
              </p>
            </div>
            <Switch
              checked={form.coffeTeaService}
              onCheckedChange={(v) => update("coffeTeaService", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-8">
      {/* Equipment rentals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Need Equipment Rentals?
          </Label>
          <Switch
            checked={form.needsEquipment}
            onCheckedChange={(v) => update("needsEquipment", v)}
          />
        </div>

        {form.needsEquipment && (
          <Accordion type="multiple" className="w-full">
            {EQUIPMENT_CATEGORIES.map((cat) => {
              const selections = form.equipmentSelections[cat.label] || {};
              const catTotal = cat.items.reduce((sum, item) => {
                const qty = selections[item.name] || 0;
                if (item.unit === "per person") {
                  return sum + item.price * qty * guestCount;
                }
                return sum + item.price * qty;
              }, 0);

              return (
                <AccordionItem key={cat.label} value={cat.label}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{cat.label}</span>
                      {catTotal > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {fmt(catTotal)}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {cat.items.map((item) => {
                        const qty = selections[item.name] || 0;
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {fmt(item.price)} {item.unit}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {renderQuantitySelector(
                                qty,
                                (v) =>
                                  setEquipmentQty(cat.label, item.name, v),
                                0,
                                item.unit === "per person" ? 1 : 1,
                              )}
                              {qty > 0 && (
                                <span className="text-sm text-gray-600 w-20 text-right">
                                  {fmt(
                                    item.unit === "per person"
                                      ? item.price * qty * guestCount
                                      : item.price * qty,
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      <Separator />

      {/* Dietary restrictions */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Dietary Restrictions</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DIETARY_RESTRICTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={form.dietaryRestrictions.includes(opt)}
                onCheckedChange={() =>
                  toggleArrayItem("dietaryRestrictions", opt)
                }
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Allergies</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALLERGY_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={form.allergies.includes(opt)}
                onCheckedChange={() => toggleArrayItem("allergies", opt)}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Special dietary notes */}
      <div className="space-y-1.5">
        <Label htmlFor="dietaryNotes">Special Dietary Notes</Label>
        <Textarea
          id="dietaryNotes"
          value={form.specialDietaryNotes}
          onChange={(e) => update("specialDietaryNotes", e.target.value)}
          placeholder="Any additional dietary requirements or notes..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep8 = () => (
    <div className="space-y-8">
      {/* Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Review Your Selections</h3>

        {/* Contact & Event */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Contact & Event
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">Name:</span>{" "}
              {form.firstName} {form.lastName}
            </p>
            {(form.eventType === "wedding" || form.eventType === "engagement") &&
              form.partnerFirstName && (
                <p>
                  <span className="text-gray-500">Partner:</span>{" "}
                  {form.partnerFirstName} {form.partnerLastName}
                </p>
              )}
            {form.eventType === "corporate" && form.companyName && (
              <p>
                <span className="text-gray-500">Company:</span>{" "}
                {form.companyName}
              </p>
            )}
            {form.eventType === "corporate" &&
              (form.companyStreet || form.companyCity) && (
                <p>
                  <span className="text-gray-500">Address:</span>{" "}
                  {[
                    form.companyStreet,
                    [form.companyCity, form.companyState].filter(Boolean).join(", "),
                    form.companyZip,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
            {form.eventType === "corporate" && form.corporatePurpose && (
              <p>
                <span className="text-gray-500">Purpose:</span>{" "}
                {form.corporatePurpose === "other"
                  ? form.corporatePurposeOther || "Other"
                  : CORPORATE_PURPOSES.find(
                      (p) => p.value === form.corporatePurpose,
                    )?.label}
              </p>
            )}
            {form.eventType === "corporate" && form.brandedMenu && (
              <p>
                <span className="text-gray-500">Branded menu cards:</span> Yes
              </p>
            )}
            {form.eventType === "corporate" && form.poReference && (
              <p>
                <span className="text-gray-500">PO/Invoice ref:</span>{" "}
                {form.poReference}
              </p>
            )}
            {form.eventType === "engagement" && form.isSurpriseProposal && (
              <p>
                <span className="text-gray-500">Surprise proposal:</span> Yes
                — please be discreet
              </p>
            )}
            {form.eventType === "birthday" && form.guestOfHonor && (
              <p>
                <span className="text-gray-500">Guest of honor:</span>{" "}
                {form.guestOfHonor}
                {form.isMilestone && form.milestoneAge
                  ? ` (${form.milestoneAge})`
                  : form.isMilestone
                  ? " (milestone)"
                  : ""}
              </p>
            )}
            {form.eventType === "birthday" && form.kidsFriendlyMenu && (
              <p>
                <span className="text-gray-500">Kid-friendly menu:</span> Yes
              </p>
            )}
            {form.eventType === "food_truck" && (
              <>
                {form.truckPropertyType && (
                  <p>
                    <span className="text-gray-500">Property:</span>{" "}
                    {form.truckPropertyType === "private"
                      ? "Private"
                      : "Public / street"}
                  </p>
                )}
                {(form.truckServiceWindowStart ||
                  form.truckServiceWindowEnd) && (
                  <p>
                    <span className="text-gray-500">Service window:</span>{" "}
                    {form.truckServiceWindowStart || "?"} –{" "}
                    {form.truckServiceWindowEnd || "?"}
                  </p>
                )}
              </>
            )}
            {form.eventType === "other" && form.otherEventDescription && (
              <p>
                <span className="text-gray-500">Event:</span>{" "}
                {form.otherEventDescription}
              </p>
            )}
            <p>
              <span className="text-gray-500">Email:</span> {form.email}
            </p>
            {form.phone && (
              <p>
                <span className="text-gray-500">Phone:</span> {form.phone}
              </p>
            )}
            <p>
              <span className="text-gray-500">Event Type:</span>{" "}
              {EVENT_TYPES.find((t) => t.value === form.eventType)?.label || form.eventType}
            </p>
            <p>
              <span className="text-gray-500">Date:</span> {form.eventDate}
            </p>
            <p>
              <span className="text-gray-500">Guests:</span> {guestCount}
            </p>
            {form.eventStartTime && (
              <p>
                <span className="text-gray-500">Time:</span>{" "}
                {form.eventStartTime}
                {form.eventEndTime && ` - ${form.eventEndTime}`}
              </p>
            )}
            {form.referralSources.length > 0 && (
              <p>
                <span className="text-gray-500">Heard about us:</span>{" "}
                {form.referralSources
                  .map((s) =>
                    s === "Other" && form.referralSourceOther
                      ? `Other: ${form.referralSourceOther}`
                      : s,
                  )
                  .join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Venue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Venue
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {form.hasVenue === "yes" ? (
              <>
                {form.selectedVenueId && form.selectedVenueId !== "other" && (
                  <p>
                    <span className="text-gray-500">Venue:</span>{" "}
                    {venues.find(
                      (v) => String(v.id) === form.selectedVenueId,
                    )?.name || "Selected venue"}
                  </p>
                )}
                {form.venueAddress && (
                  <p>
                    <span className="text-gray-500">Address:</span>{" "}
                    {form.venueAddress}, {form.venueCity}, {form.venueState}{" "}
                    {form.venueZip}
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Kitchen:</span>{" "}
                  {form.hasKitchen === "yes" ? "Yes" : "No"}
                </p>
              </>
            ) : form.hasVenue === "no" ? (
              <p>
                <span className="text-gray-500">Preferences:</span>{" "}
                {form.locationPreferences || "No preferences specified"}
              </p>
            ) : (
              <p className="text-gray-400 italic">Not specified</p>
            )}
          </CardContent>
        </Card>

        {/* Service & Menu */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" /> Service & Menu
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">Service Type:</span>{" "}
              {SERVICE_TYPES.find((s) => s.value === form.serviceType)?.label ||
                form.serviceType ||
                "Not selected"}
            </p>
            {form.serviceType === "buffet" && form.buffetStyle && (
              <p>
                <span className="text-gray-500">Buffet Style:</span>{" "}
                {BUFFET_STYLES.find((b) => b.value === form.buffetStyle)
                  ?.label || form.buffetStyle}
              </p>
            )}
            {form.hasCocktailHour && (
              <p>
                <span className="text-gray-500">Cocktail Hour:</span> Yes
                {form.cocktailStartTime &&
                  ` (${form.cocktailStartTime} - ${form.cocktailEndTime})`}
              </p>
            )}
            {form.hasMainMeal && (
              <p>
                <span className="text-gray-500">Main Meal:</span> Yes
                {form.mainMealStartTime &&
                  ` (${form.mainMealStartTime} - ${form.mainMealEndTime})`}
              </p>
            )}
            <p>
              <span className="text-gray-500">Menu Theme:</span>{" "}
              {selectedMenu?.name || form.menuTheme || "Not selected"}
            </p>
            {selectedTier && (
              <p>
                <span className="text-gray-500">Package:</span>{" "}
                {selectedTier.tierName} ({fmt(pricing.perPersonFood)}/person)
              </p>
            )}
            {selectedTier && selectedMenu?.categoryItems && (
              <div className="mt-2 space-y-1">
                {Object.entries(form.menuItemSelections).map(
                  ([category, ids]) => {
                    if (ids.length === 0) return null;
                    const items = selectedMenu.categoryItems![category] || [];
                    const names = ids
                      .map((id) => items.find((i) => i.id === id)?.name)
                      .filter(Boolean);
                    if (names.length === 0) return null;
                    return (
                      <p key={category} className="text-xs">
                        <span className="text-gray-500 capitalize">
                          {category}s:
                        </span>{" "}
                        {names.join(", ")}
                      </p>
                    );
                  },
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appetizers & Desserts summary */}
        {(pricing.appetizerTotal > 0 || pricing.dessertTotal > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ChefHat className="h-4 w-4" /> Appetizers & Desserts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {form.addAppetizers && (
                <p>
                  <span className="text-gray-500">Appetizers:</span>{" "}
                  {fmt(pricing.appetizerTotal)} ({form.appetizerStyle})
                </p>
              )}
              {form.addDesserts && (
                <p>
                  <span className="text-gray-500">Desserts:</span>{" "}
                  {fmt(pricing.dessertTotal)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Beverages */}
        {form.beverageType && form.beverageType !== "none" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wine className="h-4 w-4" /> Beverages
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                <span className="text-gray-500">Type:</span>{" "}
                {form.beverageType === "both"
                  ? "Alcoholic & Non-Alcoholic"
                  : form.beverageType === "non_alcoholic"
                    ? "Non-Alcoholic Only"
                    : "Alcoholic"}
              </p>
              {form.nonAlcoholicSelections.length > 0 && (
                <p>
                  <span className="text-gray-500">Non-Alcoholic:</span>{" "}
                  {form.nonAlcoholicSelections.join(", ")}
                </p>
              )}
              {(form.beverageType === "alcoholic" ||
                form.beverageType === "both") && (
                <>
                  <p>
                    <span className="text-gray-500">Bar:</span>{" "}
                    {form.barType === "wet_hire" ? "Wet Hire" : "Dry Hire"}
                    {form.barDuration && ` (${form.barDuration} hours)`}
                  </p>
                  {form.alcoholSelections.length > 0 && (
                    <p>
                      <span className="text-gray-500">Alcohol:</span>{" "}
                      {form.alcoholSelections.join(", ")}
                    </p>
                  )}
                  {form.barType === "wet_hire" && form.liquorQuality && (
                    <p>
                      <span className="text-gray-500">Quality:</span>{" "}
                      {form.liquorQuality === "top_shelf"
                        ? "Top Shelf"
                        : form.liquorQuality === "mid_shelf"
                          ? "Mid Shelf"
                          : "Well"}
                    </p>
                  )}
                </>
              )}
              {form.tableWaterService && (
                <p>
                  <span className="text-gray-500">Table Water:</span> Yes
                </p>
              )}
              {form.coffeTeaService && (
                <p>
                  <span className="text-gray-500">Coffee/Tea:</span> Yes
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Equipment & Dietary */}
        {(form.needsEquipment ||
          form.dietaryRestrictions.length > 0 ||
          form.allergies.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Equipment & Dietary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {form.needsEquipment && pricing.equipmentTotal > 0 && (
                <p>
                  <span className="text-gray-500">Equipment:</span>{" "}
                  {fmt(pricing.equipmentTotal)}
                </p>
              )}
              {form.dietaryRestrictions.length > 0 && (
                <p>
                  <span className="text-gray-500">Dietary:</span>{" "}
                  {form.dietaryRestrictions.join(", ")}
                </p>
              )}
              {form.allergies.length > 0 && (
                <p>
                  <span className="text-gray-500">Allergies:</span>{" "}
                  {form.allergies.join(", ")}
                </p>
              )}
              {form.specialDietaryNotes && (
                <p>
                  <span className="text-gray-500">Notes:</span>{" "}
                  {form.specialDietaryNotes}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Pricing Breakdown */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> Estimated Pricing
        </h3>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              {pricing.perPersonFood > 0 && (
                <div className="flex justify-between">
                  <span>
                    Food ({fmt(pricing.perPersonFood)}/person x {guestCount}{" "}
                    guests)
                  </span>
                  <span className="font-medium">
                    {fmt(pricing.foodSubtotal)}
                  </span>
                </div>
              )}
              {pricing.appetizerTotal > 0 && (
                <div className="flex justify-between">
                  <span>Appetizers</span>
                  <span className="font-medium">
                    {fmt(pricing.appetizerTotal)}
                  </span>
                </div>
              )}
              {pricing.dessertTotal > 0 && (
                <div className="flex justify-between">
                  <span>Desserts</span>
                  <span className="font-medium">
                    {fmt(pricing.dessertTotal)}
                  </span>
                </div>
              )}
              {pricing.beverageQuote > 0 && (
                <div className="flex justify-between">
                  <span>Beverages (quote)</span>
                  <span className="font-medium">
                    {fmt(pricing.beverageQuote)}
                  </span>
                </div>
              )}
              {pricing.equipmentTotal > 0 && (
                <div className="flex justify-between">
                  <span>Equipment</span>
                  <span className="font-medium">
                    {fmt(pricing.equipmentTotal)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{fmt(pricing.subtotal)}</span>
              </div>
              {pricing.serviceFeeRate > 0 && (
                <div className="flex justify-between">
                  <span>
                    Service Fee ({Math.round(pricing.serviceFeeRate * 100)}%)
                  </span>
                  <span className="font-medium">
                    {fmt(pricing.serviceFee)}
                  </span>
                </div>
              )}
              {pricing.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Promo Discount ({form.promoDiscount}%)</span>
                  <span className="font-medium">-{fmt(pricing.discount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Estimated Total</span>
                <span>{fmt(pricing.estimatedTotal)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This is an quote. Final pricing will be confirmed by our team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Special requests */}
      <div className="space-y-1.5">
        <Label htmlFor="specialRequests">Special Requests / Comments</Label>
        <Textarea
          id="specialRequests"
          value={form.specialRequests}
          onChange={(e) => update("specialRequests", e.target.value)}
          placeholder="Any additional requests, questions, or special accommodations..."
          rows={4}
        />
      </div>

      {/* Decision timeline */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          When do you need to finalize your decision?
        </Label>
        <RadioGroup
          value={form.decisionTimeline}
          onValueChange={(v) => update("decisionTimeline", v)}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {DECISION_TIMELINES.map((t) => (
            <label
              key={t}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 p-3 cursor-pointer transition-all text-sm",
                form.decisionTimeline === t
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300",
              )}
            >
              <RadioGroupItem value={t} id={`timeline-${t}`} />
              <span className="font-medium">{t}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Industry referral needs */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Need referrals for other services?
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INDUSTRY_REFERRALS.map((ref) => (
            <label
              key={ref}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={form.industryReferrals.includes(ref)}
                onCheckedChange={() =>
                  toggleArrayItem("industryReferrals", ref)
                }
              />
              <span className="text-sm">{ref}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // PRICING SIDEBAR (visible from step 4 onward)
  // =========================================================================

  const renderPricingSidebar = () => {
    if (step < 4 || guestCount === 0) return null;
    return (
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Running Total
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {pricing.foodSubtotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Food</span>
              <span>{fmt(pricing.foodSubtotal)}</span>
            </div>
          )}
          {pricing.appetizerTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Appetizers</span>
              <span>{fmt(pricing.appetizerTotal)}</span>
            </div>
          )}
          {pricing.dessertTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Desserts</span>
              <span>{fmt(pricing.dessertTotal)}</span>
            </div>
          )}
          {pricing.beverageQuote > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Beverages</span>
              <span>{fmt(pricing.beverageQuote)}</span>
            </div>
          )}
          {pricing.equipmentTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Equipment</span>
              <span>{fmt(pricing.equipmentTotal)}</span>
            </div>
          )}
          {pricing.serviceFee > 0 && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span>{fmt(pricing.serviceFee)}</span>
              </div>
            </>
          )}
          {pricing.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{fmt(pricing.discount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Quote</span>
            <span>{fmt(pricing.estimatedTotal)}</span>
          </div>
          <p className="text-xs text-gray-400">
            {guestCount} guests
            {pricing.perPersonFood > 0 &&
              ` | ${fmt(pricing.perPersonFood)}/pp`}
          </p>
        </CardContent>
      </Card>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  const stepIcons = [
    Users,
    MapPin,
    UtensilsCrossed,
    ChefHat,
    UtensilsCrossed,
    Wine,
    Package,
    ClipboardCheck,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center text-center">
          <img
            src={homebitesLogo}
            alt="Home Bites Catering"
            className="h-20 sm:h-24 w-auto mb-4"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Request a Quote
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Tell us about your event and we will craft the perfect catering
            experience
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {step} of 8: {STEP_LABELS[step - 1]}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((step / 8) * 100)}%
            </span>
          </div>
          <Progress value={(step / 8) * 100} className="h-2" />
          {/* Step indicators */}
          <div className="hidden sm:flex justify-between mt-3">
            {STEP_LABELS.map((label, idx) => {
              const StepIcon = stepIcons[idx];
              const stepNum = idx + 1;
              const isCompleted = stepNum < step;
              const isCurrent = stepNum === step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (stepNum < step) {
                      setStepErrors([]);
                      setStep(stepNum);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  disabled={stepNum > step}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all",
                    stepNum > step
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer hover:opacity-80",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-500",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-tight text-center max-w-[60px]",
                      isCurrent
                        ? "text-primary font-semibold"
                        : "text-gray-500",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div
          className={cn(
            "gap-8",
            step >= 4 ? "lg:grid lg:grid-cols-[1fr_280px]" : "",
          )}
        >
          {/* Main form area */}
          <div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = stepIcons[step - 1];
                    return <Icon className="h-5 w-5 text-primary" />;
                  })()}
                  {step === 2
                    ? eventConfig.locationSectionTitle
                    : STEP_LABELS[step - 1]}
                </CardTitle>
                <CardDescription>
                  {step === 1 && "Let us know who you are and what you're planning."}
                  {step === 2 && eventConfig.locationSectionSubtitle}
                  {step === 3 && "Choose how you'd like your meal served."}
                  {step === 4 && "Select your menu theme and package level."}
                  {step === 5 && "Add appetizers and desserts to your event."}
                  {step === 6 && "Set up your bar and beverage service."}
                  {step === 7 && "Add equipment rentals and note dietary needs."}
                  {step === 8 && "Review everything and submit your request."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Validation errors */}
                {stepErrors.length > 0 && (
                  <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50">
                    <p className="font-medium text-red-700 mb-1">
                      Please fix the following:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
                      {stepErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step content */}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
                {step === 6 && renderStep6()}
                {step === 7 && renderStep7()}
                {step === 8 && renderStep8()}

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={step === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>

                  {step < 8 ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      className="gap-2 px-8"
                      size="lg"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Submit Quote Request
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing sidebar (desktop, step 4+) */}
          {step >= 4 && (
            <div className="hidden lg:block">{renderPricingSidebar()}</div>
          )}
        </div>

        {/* Pricing inline (mobile, step 4+) */}
        {step >= 4 && guestCount > 0 && (
          <div className="lg:hidden mt-6">{renderPricingSidebar()}</div>
        )}
      </div>
    </div>
  );
}
