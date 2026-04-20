import { useState, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmailInput } from "@/components/inquiry/EmailInput";
import { PhoneInput } from "@/components/inquiry/PhoneInput";
import { AddressAutocomplete, type AddressParts } from "@/components/inquiry/AddressAutocomplete";
import { getEventPreset } from "@shared/eventPresets";
import { applyThemeCSS } from "@/lib/eventPresetCSS";
import { motion, AnimatePresence } from "framer-motion";
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
  PartyPopper,
  Sparkles,
  ExternalLink,
  Star,
  Award,
  Mail as MailIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface Venue {
  id: number;
  name: string;
  // Address fields match the DB — nullable because not every venue record
  // has a complete mailing address on file.
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  hasKitchen: boolean | null;
  // Which event types this venue is suitable for. Empty / null = show for
  // all (legacy fallback). Used to hide wedding venues on a corporate inquiry.
  eventTypes: string[] | null;
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
  {
    value: "drop_off",
    label: "Drop-off",
    description:
      "We deliver your order in sealed disposable containers — hot food, salads and appetizers in aluminum trays, sauces and garnishes in plastic. Optional chafing stands (lids, sternos, plastic serving utensils) available as an add-on to keep food warm on a buffet line.",
  },
  {
    value: "standard",
    label: "Standard",
    description:
      "We deliver, set up the buffet, place serving utensils, and keep dishes topped up during the meal. Staff packs out at the end of the meal service period — pickup is limited to buffet items only, and staff does not stay past the meal.",
  },
  {
    value: "full_service_no_setup",
    label: "Full Service (No Setup)",
    description:
      "We deliver, set up the buffet, and keep it stocked during service. Tables, chairs, and other non-buffet equipment stay as-is — that's on you or your venue. Staff stays for the full event, handling bussing, trash, and breakdown of any equipment we brought. Buffet closes after the meal window; final pickup happens at the end of the event.",
  },
  {
    value: "full_service",
    label: "Full Service",
    description:
      "The full package. We deliver and set up the buffet, plus tables, chairs, plates, silverware and any place settings to your spec — equipment supplied by us (additional cost) or by you. Staff runs the full event: serving, replenishment, bussing, trash, and breakdown. Buffet closes after the meal window; pickup happens at the end of the event to stay out of the way.",
  },
] as const;

// Short one-line descriptions for the top-level service types — shown when
// a card is selected so customers know what they're picking.
const SERVICE_TYPE_DESCRIPTIONS: Record<string, string> = {
  buffet:
    "Pick a buffet style below — from simple drop-off to full on-site service.",
  plated:
    "Plated, table-served meal. Full-service staffing, place settings, and coursed delivery. Best for weddings and formal sit-down events.",
  family_style:
    "A middle ground between plated and buffet: food arrives on large shared platters that guests pass around each table, like a family meal at home. Requires a venue with kitchen facilities. Includes table/chair setup, place settings, timely platter delivery, and full-event staffing (bussing, trash, breakdown).",
  cocktail_party:
    "Passed and/or stationed appetizers with a bar. No main meal service — great for networking events, receptions, and shorter gatherings.",
  breakfast_brunch:
    "Morning spread: pastries, fruit, hot items, coffee/tea service. Setup and timing tuned for breakfast or brunch service windows.",
  sandwich:
    "Sandwich / boxed-lunch style service — perfect for quick corporate meetings, working lunches, or casual gatherings.",
  food_truck:
    "Our food truck on-site, cooking fresh and serving guests directly from the window. We'll confirm parking, power, and water on Step 2.",
  kids_party:
    "Kid-friendly menu sized for a younger crowd — think mini-portions, familiar favourites, and easy-to-eat options.",
};

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
  // Trio / pack categories: one lot-size selector for the whole category,
  // customer picks N flavors (no per-flavor price, just variety within
  // that pack). Used for Spreads: $6.50/serving × servings chosen, with
  // 3 flavor picks making up the trio.
  servingPack?: {
    pricePerServing: number;
    flavorsToPick: number;
    description?: string;
  };
}

const LOT_SIZES = [24, 36, 48, 72, 96, 144];

// Appetizer, dessert, and equipment catalogs are fetched at runtime from
// /api/catalog/* (backed by the appetizer_items / dessert_items /
// equipment_items DB tables). Admins edit prices/availability via the
// catalog admin UI — no code change needed.

// --- Equipment Data (types) ---
interface EquipmentItem {
  name: string;
  price: number;
  unit: string;
}

interface EquipmentCategory {
  label: string;
  items: EquipmentItem[];
}

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

// --- Menu-theme hero photos (sourced from homebites.net) ---
// Matched by themeKey. The menu-theme picker on Step 4 shows these so the
// customer sees the cuisine, not just a text label.
const MENU_THEME_PHOTOS: Record<string, string> = {
  taco_fiesta:
    "https://static.wixstatic.com/media/9c66ad_800b0560ce9b4f3c832fa8c3eed32232~mv2.jpeg",
  bbq:
    "https://static.wixstatic.com/media/9c66ad_db826cbe905041cb938365b4bf3f359b~mv2.jpg",
  greece:
    "https://static.wixstatic.com/media/9c66ad_108d9512c7684520a2584910b7a5913b~mv2.jpg",
  italy:
    "https://static.wixstatic.com/media/11062b_4c68ff7404e7429aa4270be3fac9c9f8~mv2_d_4500_3003_s_4_2.jpg",
  vegan:
    "https://static.wixstatic.com/media/9c66ad_7725f81fe79347f9930909d2d00db65b~mv2.jpg",
  kebab:
    "https://static.wixstatic.com/media/9c66ad_94b6888cc94042e08f683e588e599e21~mv2.png",
};

// --- Mocktail Options (shown when "Mocktails" is selected) ---
const MOCKTAIL_OPTIONS = [
  "Pomegranate Splash",
  "Berry Grape Punch",
  "Peach Melba Punch",
  "Watermelon Nojito",
  "Cranberry Sangria Mocktail",
  "Tropical Punch Mocktail",
  "The New Zealander",
  "Mediterranean Sunset",
  "Seattle Fog",
  "Tropical Twist Spritz",
  "Berrylicious Refresher",
];
const MOCKTAIL_MENU_URL = "https://homebites.net/bartending#mocktails";

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
  // Drop-off mode — customer just wants food delivered, not full event catering.
  // Collapses Step 2's venue flow into an address + delivery window + recipient,
  // and forces service type to buffet/drop_off on Step 3.
  isDropOff: boolean;
  dropOffTime: string;
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
  // guestCount is always adults + children; derived from the two inputs below.
  // Kept in FormState for the rest of the form logic that reads total headcount.
  guestCount: number | "";
  adultCount: number | "";
  childCount: number | "";
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
  mocktailSelections: string[];
  barType: string; // "dry_hire" | "wet_hire"
  drinkingGuestCount: number | "";
  barDuration: string;
  alcoholSelections: string[];
  liquorQuality: string; // "well" | "mid_shelf" | "top_shelf"
  preferredLiquorBrands: string;
  subsidizedBar: boolean;
  subsidyAmountDollars: number | "";
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
  isDropOff: false,
  dropOffTime: "",
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
  adultCount: "",
  childCount: 0,
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
  mocktailSelections: [],
  barType: "",
  drinkingGuestCount: "",
  barDuration: "",
  alcoholSelections: [],
  liquorQuality: "",
  preferredLiquorBrands: "",
  subsidizedBar: false,
  subsidyAmountDollars: "",
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

  // ---------- Catalog queries (appetizer / dessert / equipment lists) ----------
  // These used to be hardcoded constants; now sourced from the DB so Mike
  // can edit prices and availability without a deploy.
  const appetizerCatalogQ = useQuery<AppetizerCategory[]>({
    queryKey: ["/api/catalog/appetizers"],
  });
  const dessertCatalogQ = useQuery<AppetizerItem[]>({
    queryKey: ["/api/catalog/desserts"],
  });
  const equipmentCatalogQ = useQuery<EquipmentCategory[]>({
    queryKey: ["/api/catalog/equipment"],
  });
  const appetizerCatalog = appetizerCatalogQ.data ?? [];
  const dessertCatalog = dessertCatalogQ.data ?? [];
  const equipmentCatalog = equipmentCatalogQ.data ?? [];
  const catalogLoading =
    appetizerCatalogQ.isLoading || dessertCatalogQ.isLoading || equipmentCatalogQ.isLoading;
  const catalogError =
    appetizerCatalogQ.error || dessertCatalogQ.error || equipmentCatalogQ.error;

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
            // Coalesce nulls to "" so the <Input value=...> stays a
            // controlled component. Without this, a venue missing address
            // or zip in the DB would break the inputs (they'd go from
            // controlled → uncontrolled mid-lifecycle and typing would
            // silently fail on those fields).
            return {
              ...prev,
              selectedVenueId: venueId,
              venueAddress: v.address ?? "",
              venueCity: v.city ?? "",
              venueState: v.state ?? "",
              venueZip: v.zip ?? "",
              hasKitchen: v.hasKitchen == null ? "" : v.hasKitchen ? "yes" : "no",
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

  // ---------- Pricing ----------
  // Pricing is calculated server-side. The inquiry form shows per-line-item
  // prices (e.g. "$40/person", "$2.75/piece") but no category subtotals,
  // service fees, taxes, or grand total — those are revealed on the quote.
  // The backend recalculates everything from the structured payload sent
  // in submitMutation (see server/utils/quotePricing.ts).
  const perPersonFood = useMemo(() => {
    if (!selectedTier) return 0;
    let cents = selectedTier.pricePerPersonCents;
    if (selectedMenu?.categoryItems) {
      for (const [category, ids] of Object.entries(form.menuItemSelections)) {
        const items = selectedMenu.categoryItems[category] || [];
        for (const id of ids) {
          const item = items.find((i) => i.id === id);
          if (item?.upchargeCents) cents += item.upchargeCents;
        }
      }
    }
    return cents / 100;
  }, [selectedTier, selectedMenu, form.menuItemSelections]);

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
          if (!form.adultCount || Number(form.adultCount) < 1)
            errors.push("Number of adults is required.");
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
          // Cocktail parties don't pick a menu theme/tier — they go straight
          // to hors d'oeuvres. Step 4 is skipped entirely (see goNext/goBack).
          if (form.serviceType === "cocktail_party") break;
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
          // Each category must be filled to its limit — e.g. a tier with
          // "sides: 4" means the customer picked 4 sides, not 1. We only
          // validate categories that actually have items available for this
          // tier, matching what the renderer shows.
          if (
            selectedTier?.selectionLimits &&
            selectedMenu?.categoryItems
          ) {
            for (const [category, limit] of Object.entries(
              selectedTier.selectionLimits,
            )) {
              const allItems =
                selectedMenu.categoryItems[category] || [];
              const items = allItems.filter((it) => {
                const tiers = it.availableInTiers;
                if (!tiers || tiers.length === 0) return true;
                return tiers.includes(selectedTier.tierKey);
              });
              if (items.length === 0) continue;
              const selectedCount = (
                form.menuItemSelections[category] || []
              ).length;
              if (selectedCount < limit) {
                const pretty =
                  category === "salsa"
                    ? "Salsas"
                    : category === "condiment"
                      ? "Condiments"
                      : category === "spread"
                        ? "Spreads"
                        : category === "sauce"
                          ? "Sauces"
                          : category === "pasta"
                            ? "Pasta"
                            : `${category.charAt(0).toUpperCase()}${category.slice(1)}s`;
                errors.push(
                  `${pretty}: please select ${limit} (you have ${selectedCount}).`,
                );
              }
            }
          }
          break;
        case 5:
          // If a serving-pack appetizer category has servings picked, the
          // flavor count must match (e.g. Spreads trio requires exactly 3).
          for (const cat of appetizerCatalog) {
            if (!cat.servingPack) continue;
            const sel = form.appetizerSelections[cat.label] || {};
            const servings = sel["__servings"] || 0;
            if (servings <= 0) continue;
            const picked = cat.items.filter(
              (it) => (sel[it.name] || 0) > 0,
            ).length;
            if (picked !== cat.servingPack.flavorsToPick) {
              errors.push(
                `${cat.label}: please pick ${cat.servingPack.flavorsToPick} flavors (you have ${picked}).`,
              );
            }
          }
          break;
        case 6:
          // Drinking guest count sanity check — can't have more drinkers
          // than total guests.
          if (
            typeof form.drinkingGuestCount === "number" &&
            form.drinkingGuestCount > guestCount
          ) {
            errors.push(
              `Drinking guest count (${form.drinkingGuestCount}) can't exceed total guests (${guestCount}).`,
            );
          }
          break;
        // Steps 5, 7 are optional selections
        default:
          break;
      }
      return errors;
    },
    [form, guestCount, selectedTier, selectedMenu],
  );

  // Cocktail parties have no main meal — skip step 4 (menu theme/tier) and
  // go straight to appetizers. Advance and back should both jump over it.
  const skipMenuStep = form.serviceType === "cocktail_party";

  const goNext = useCallback(() => {
    const errors = validateStep(step);
    if (errors.length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors([]);
    setStep((prev) => {
      const next = prev + 1;
      if (skipMenuStep && next === 4) return 5; // 3 → 5
      return Math.min(next, 8);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, validateStep, skipMenuStep]);

  const goBack = useCallback(() => {
    setStepErrors([]);
    setStep((prev) => {
      const next = prev - 1;
      if (skipMenuStep && next === 4) return 3; // 5 → 3
      return Math.max(next, 1);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [skipMenuStep]);

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

      // --- Structured appetizer/dessert/beverage/equipment payloads ---
      // These match the jsonb shapes the inquiries table expects
      // (QuoteAppetizer[], QuoteDessert[], QuoteBeverages, QuoteEquipmentItem[]).
      // The backend pricing calculator reads these fields; without them, stored
      // estimated totals only include food and everything else is treated as $0.
      const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "_");

      const appetizerSelections: Array<{
        category: string;
        itemName: string;
        pricePerPiece: number;
        quantity: number;
        subtotal: number;
      }> = [];
      appetizerCatalog.forEach((cat) => {
        const sel = form.appetizerSelections[cat.label] || {};
        if (cat.servingPack) {
          const servings = sel["__servings"] || 0;
          if (servings > 0) {
            const picked = cat.items
              .filter((it) => (sel[it.name] || 0) > 0)
              .map((it) => it.name);
            appetizerSelections.push({
              category: slug(cat.label),
              itemName: picked.length
                ? `${cat.label} trio (${picked.join(", ")})`
                : `${cat.label} trio`,
              pricePerPiece: cat.servingPack.pricePerServing,
              quantity: servings,
              subtotal: cat.servingPack.pricePerServing * servings,
            });
          }
          return;
        }
        cat.items.forEach((item) => {
          const qty = sel[item.name] || 0;
          if (qty <= 0) return;
          // For per-person categories (charcuterie boards) qty is the number
          // of servings the customer wants — not tied to guest count. Price
          // is price-per-serving × servings.
          appetizerSelections.push({
            category: slug(cat.label),
            itemName: item.name,
            pricePerPiece: item.price,
            quantity: qty,
            subtotal: item.price * qty,
          });
        });
      });

      const dessertSelections: Array<{
        itemName: string;
        pricePerPiece: number;
        quantity: number;
        subtotal: number;
      }> = [];
      dessertCatalog.forEach((item) => {
        const qty = form.dessertSelections[item.name] || 0;
        if (qty <= 0) return;
        dessertSelections.push({
          itemName: item.name,
          pricePerPiece: item.price,
          quantity: qty,
          subtotal: item.price * qty,
        });
      });

      const beveragesPayload = {
        hasNonAlcoholic:
          form.beverageType === "non_alcoholic" || form.beverageType === "both",
        ...(form.nonAlcoholicSelections.length
          ? { nonAlcoholicSelections: form.nonAlcoholicSelections }
          : {}),
        ...(form.nonAlcoholicSelections.includes("Mocktails") &&
        form.mocktailSelections.length
          ? { mocktailSelections: form.mocktailSelections }
          : {}),
        hasAlcoholic:
          form.beverageType === "alcoholic" || form.beverageType === "both",
        ...(form.barType ? { bartendingType: form.barType } : {}),
        ...(form.barDuration
          ? { bartendingDurationHours: parseFloat(form.barDuration) }
          : {}),
        ...(typeof form.drinkingGuestCount === "number"
          ? { drinkingGuestCount: form.drinkingGuestCount }
          : {}),
        ...(form.alcoholSelections.length
          ? { alcoholSelections: form.alcoholSelections }
          : {}),
        ...(form.liquorQuality ? { liquorQuality: form.liquorQuality } : {}),
        ...(form.liquorQuality && form.liquorQuality !== "well" && form.preferredLiquorBrands.trim()
          ? { preferredLiquorBrands: form.preferredLiquorBrands.trim() }
          : {}),
        ...(form.barType === "wet_hire" && form.subsidizedBar
          ? {
              subsidizedBar: true,
              subsidyAmountCents:
                typeof form.subsidyAmountDollars === "number"
                  ? Math.round(form.subsidyAmountDollars * 100)
                  : null,
            }
          : {}),
        ...(form.tableWaterService ? { tableWaterService: true } : {}),
        ...(form.coffeTeaService ? { coffeeTeaService: true } : {}),
      };
      const hasAnyBeverageInfo =
        beveragesPayload.hasNonAlcoholic ||
        beveragesPayload.hasAlcoholic ||
        form.tableWaterService ||
        form.coffeTeaService;

      const equipmentItems: Array<{
        item: string;
        category: string;
        pricePerUnit: number;
        quantity: number;
        subtotal: number;
      }> = [];
      equipmentCatalog.forEach((cat) => {
        const sel = form.equipmentSelections[cat.label] || {};
        cat.items.forEach((item) => {
          const qty = sel[item.name] || 0;
          if (qty <= 0) return;
          const effectiveQty = item.unit === "per person" ? qty * guestCount : qty;
          equipmentItems.push({
            item: item.name,
            category: slug(cat.label),
            pricePerUnit: item.price,
            quantity: effectiveQty,
            subtotal: item.price * effectiveQty,
          });
        });
      });

      // Strip fields the backend schema doesn't understand / that have
      // type mismatches with FormState, then reshape the rest to match.
      const {
        // Fields to drop: not in inquiries schema
        referralSources: _referralSources,
        referralSourceOther: _referralSourceOther,
        isDropOff: _isDropOff,
        dropOffTime: _dropOffTime,
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
      if (form.isDropOff) {
        typeSummaryLines.push("DROP-OFF ORDER — no on-site service");
        if (form.dropOffTime)
          typeSummaryLines.push(
            `Drop-off target: ${form.dropOffTime} (±15 min window)`,
          );
        if (form.venueContactName)
          typeSummaryLines.push(`Recipient: ${form.venueContactName}`);
        if (form.venueContactPhone)
          typeSummaryLines.push(`Recipient phone: ${form.venueContactPhone}`);
      }
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
        adultCount:
          typeof form.adultCount === "number" ? form.adultCount : guestCount,
        childCount:
          typeof form.childCount === "number" ? form.childCount : 0,
        ...(combinedSpecialRequests
          ? { specialRequests: combinedSpecialRequests }
          : {}),
        ...(billingAddress ? { billingAddress } : {}),
        // Map form fields to schema columns / enums
        menuTier: form.packageTier || undefined,
        menuSelections,
        // Structured jsonb fields — backend recalculates pricing from these
        ...(appetizerSelections.length
          ? {
              appetizers: {
                ...(form.appetizerStyle ? { serviceStyle: form.appetizerStyle } : {}),
                selections: appetizerSelections,
              },
            }
          : {}),
        ...(dessertSelections.length ? { desserts: dessertSelections } : {}),
        ...(hasAnyBeverageInfo ? { beverages: beveragesPayload } : {}),
        ...(equipmentItems.length ? { equipment: { items: equipmentItems } } : {}),
        serviceStyle: formBuffetStyle || undefined, // buffetStyle → serviceStyle enum
        venueHasKitchen: yesNoToBool(formHasKitchen),
        ceremonySameSpace: yesNoToBool(formCeremonySameSpace),
        drinkingGuestCount:
          typeof form.drinkingGuestCount === "number"
            ? form.drinkingGuestCount
            : undefined,
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

    // Theme the thank-you page to match the event type the customer picked.
    const thanksPreset = getEventPreset(form.eventType || "celebration");
    const thanksStyles = applyThemeCSS(thanksPreset.theme);

    return (
      <div
        className="min-h-screen p-4 sm:p-8"
        style={{
          ...thanksStyles,
          background:
            "linear-gradient(135deg, var(--theme-bg) 0%, white 45%, var(--theme-secondary) 100%)",
        }}
      >
        <div
          className={cn(
            "max-w-6xl mx-auto grid gap-6",
            prefilledCalUrl ? "lg:grid-cols-2" : "grid-cols-1 max-w-2xl"
          )}
        >
          {/* ─── Confirmation (left column, or centered if no Cal.com) ─── */}
          <Card
            className="shadow-xl h-fit border"
            style={{
              borderColor:
                "color-mix(in srgb, var(--theme-border) 50%, transparent)",
            }}
            data-testid="card-confirmation"
          >
            <CardContent className="pt-10 pb-10 px-6 sm:px-10 text-center space-y-5">
              {/* Logo + themed medallion */}
              <img
                src={homebitesLogo}
                alt="Home Bites Catering"
                className="h-14 w-auto mx-auto opacity-90"
              />
              <div
                className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-white shadow-md"
                style={{ background: "var(--theme-gradient)" }}
              >
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <p
                  className="text-xs uppercase tracking-[0.3em] font-semibold mb-2"
                  style={{ color: "var(--theme-primary)" }}
                >
                  Thank you
                </p>
                <h2
                  className="text-3xl sm:text-4xl font-semibold"
                  style={{
                    color: "var(--theme-text)",
                    fontFamily:
                      "var(--theme-heading-font), Georgia, serif",
                  }}
                >
                  We're on it, {form.firstName || "friend"}.
                </h2>
              </div>
              <p
                className="text-base sm:text-lg leading-relaxed font-serif"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                Your inquiry is in. I'll personally review the details and put
                together a tailored proposal with pricing and menu notes.
              </p>

              {/* What happens next — 3-step timeline */}
              <div
                className="mt-6 rounded-xl p-5 text-left space-y-4 border"
                style={{
                  background:
                    "color-mix(in srgb, var(--theme-bg) 60%, white)",
                  borderColor:
                    "color-mix(in srgb, var(--theme-border) 50%, transparent)",
                }}
              >
                <p
                  className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: "var(--theme-primary)" }}
                >
                  What happens next
                </p>
                {[
                  {
                    icon: ClipboardCheck,
                    title: "We review your details — tonight or tomorrow morning.",
                  },
                  {
                    icon: MailIcon,
                    title: "You'll get a tailored proposal in your inbox within 24–48 hours.",
                  },
                  {
                    icon: Sparkles,
                    title: "You review, tweak, and accept — then we start cooking.",
                  },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "var(--theme-gradient)" }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div
                          className="font-serif text-[15px]"
                          style={{ color: "var(--theme-text)" }}
                        >
                          {step.title}
                        </div>
                      </div>
                      <Icon
                        className="shrink-0 h-5 w-5 mt-1.5 opacity-70"
                        style={{ color: "var(--theme-primary)" }}
                      />
                    </div>
                  );
                })}
              </div>

              {form.promoValid && form.promoDiscount > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {form.promoDiscount}% promo discount applied
                </Badge>
              )}

              <p
                className="text-sm font-serif italic"
                style={{ color: "var(--theme-text-secondary)" }}
              >
                — Mike &amp; the Home Bites team
              </p>
              <p className="text-xs text-gray-500">
                A confirmation copy is on its way to{" "}
                <span className="font-medium">{form.email}</span>.
              </p>

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
        // Per-event-type tinted hover: for the top-level event-type picker,
        // look up the preset per-option so hovering a "Wedding" card previews
        // the wedding palette and "Corporate" previews navy.
        const optPreset = getEventPreset(opt.value);
        const cardTheme = isActive ? preset.theme : optPreset.theme;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:shadow-md",
              isActive
                ? "shadow-md ring-2"
                : "border-gray-200 bg-white hover:-translate-y-0.5",
            )}
            style={
              isActive
                ? {
                    borderColor: cardTheme.primary,
                    background: `color-mix(in srgb, ${cardTheme.primary} 8%, white)`,
                    // @ts-expect-error — tailwind-ring custom prop, inline
                    "--tw-ring-color": `color-mix(in srgb, ${cardTheme.primary} 25%, transparent)`,
                  }
                : undefined
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = cardTheme.primary;
                (e.currentTarget as HTMLElement).style.background =
                  `color-mix(in srgb, ${cardTheme.background} 80%, white)`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.borderColor = "";
                (e.currentTarget as HTMLElement).style.background = "";
              }
            }}
          >
            {isActive && (
              <div className="absolute top-2 right-2">
                <Check
                  className="h-4 w-4"
                  style={{ color: cardTheme.primary }}
                />
              </div>
            )}
            {Icon && (
              <Icon
                className="h-7 w-7 transition-colors"
                style={{ color: isActive ? cardTheme.primary : "#9ca3af" }}
              />
            )}
            <span
              className="text-sm font-semibold transition-colors"
              style={{ color: isActive ? cardTheme.primary : "#374151" }}
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
      {/* Chef intro — a warm, human first impression. The form is an inquiry
          but the first thing on it should feel like a handshake, not a
          dropdown. */}
      <div
        className="rounded-xl p-5 flex items-start gap-4 border"
        style={{
          background: "color-mix(in srgb, var(--theme-bg) 70%, white)",
          borderColor: "color-mix(in srgb, var(--theme-border) 50%, transparent)",
        }}
      >
        <div
          className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-sm"
          style={{ background: "var(--theme-gradient)" }}
        >
          <ChefHat className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p
            className="font-serif text-lg leading-snug"
            style={{ color: "var(--theme-text)" }}
          >
            Hi, I'm Mike — I'll be cooking for your event.
          </p>
          <p className="text-sm text-gray-600 mt-1 font-serif italic">
            Tell me a little about what you're planning and I'll put together a
            menu you're actually excited about. Nothing generic, no copy-paste.
          </p>
        </div>
      </div>

      {/* Drop-off shortcut — prominent callout at the top for customers who
          just need food delivered, not full event catering. Simplifies the
          rest of the form: Step 2 collapses to address + window + recipient,
          Step 3 skips cocktail/meal timing entirely. */}
      <label
        className={cn(
          "flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
          form.isDropOff
            ? "border-primary bg-primary/5"
            : "border-amber-300 bg-amber-50/50 hover:border-amber-400",
        )}
      >
        <Checkbox
          checked={form.isDropOff}
          onCheckedChange={(v) => {
            const checked = v === true;
            setForm((prev) => ({
              ...prev,
              isDropOff: checked,
              // When flipping ON, lock service type to drop-off buffet and
              // clear the cocktail/main-meal timing that doesn't apply.
              ...(checked
                ? {
                    serviceType: "buffet",
                    buffetStyle: "drop_off",
                    hasCocktailHour: false,
                    cocktailStartTime: "",
                    cocktailEndTime: "",
                    hasMainMeal: false,
                    mainMealStartTime: "",
                    mainMealEndTime: "",
                  }
                : {}),
            }));
          }}
          className="mt-0.5"
        />
        <div>
          <div className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Is this a drop-off order?
          </div>
          <div className="text-sm text-gray-600 mt-0.5">
            Check this if you only need food delivered, with no on-site
            service. We'll keep the rest of the form short — delivery
            address, drop-off time, and who's receiving it.
          </div>
        </div>
      </label>

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
          What kind of celebration are we cooking for? <span className="text-red-500">*</span>
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
        <Label className="text-base font-semibold">Who should we get back to?</Label>
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
          <EmailInput
            id="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <PhoneInput
            id="phone"
            value={form.phone}
            onChange={(v) => update("phone", v)}
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
            <Label htmlFor="adultCount">
              Adults <span className="text-red-500">*</span>
            </Label>
            <Input
              id="adultCount"
              type="number"
              min="1"
              value={form.adultCount}
              onChange={(e) => {
                const n = e.target.value ? Number(e.target.value) : "";
                const adults = typeof n === "number" ? n : 0;
                const kids = typeof form.childCount === "number" ? form.childCount : 0;
                setForm((prev) => ({
                  ...prev,
                  adultCount: n,
                  guestCount: n === "" ? "" : adults + kids,
                }));
              }}
              placeholder="10+ years old"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="childCount">
              Children under 10
            </Label>
            <Input
              id="childCount"
              type="number"
              min="0"
              value={form.childCount}
              onChange={(e) => {
                const n = e.target.value ? Math.max(0, Number(e.target.value)) : 0;
                const adults = typeof form.adultCount === "number" ? form.adultCount : 0;
                setForm((prev) => ({
                  ...prev,
                  childCount: n,
                  guestCount: adults === 0 && n === 0 ? "" : adults + n,
                }));
              }}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              Kids under 10 are charged a reduced food rate (currently 50% off). Other line items still scale with total headcount.
            </p>
          </div>
          <div className="space-y-1.5 flex items-end">
            <p className="text-sm text-gray-600">
              <strong>Total:</strong>{" "}
              {(typeof form.adultCount === "number" ? form.adultCount : 0) +
                (typeof form.childCount === "number" ? form.childCount : 0)}{" "}
              guests
            </p>
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
    // Drop-off mode: short, focused form — delivery address, arrival time,
    // and who's receiving it. Nothing else on this step applies.
    if (form.isDropOff) {
      return (
        <div className="space-y-8">
          <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-4">
            <div className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Drop-off Delivery
            </div>
            <p className="text-sm text-gray-600 mt-1">
              We'll arrive within ±15 minutes of your target time. Please give
              us the delivery address and who we should hand it off to.
            </p>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Delivery Address <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-1.5">
              <AddressAutocomplete
                id="venueAddress"
                value={form.venueAddress}
                onChange={(v) => update("venueAddress", v)}
                onSelect={(p: AddressParts) => {
                  update("venueAddress", p.street);
                  if (p.city) update("venueCity", p.city);
                  if (p.state) update("venueState", p.state);
                  if (p.zip) update("venueZip", p.zip);
                }}
                placeholder="Start typing an address…"
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

          <div className="space-y-3">
            <Label htmlFor="dropOffTime" className="text-base font-semibold">
              Target Drop-off Time <span className="text-red-500">*</span>
            </Label>
            <p className="text-sm text-gray-500">
              We'll arrive within ±15 minutes of this time.
            </p>
            <Input
              id="dropOffTime"
              type="time"
              value={form.dropOffTime}
              onChange={(e) => update("dropOffTime", e.target.value)}
              className="sm:max-w-xs"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Who's receiving the delivery?
            </Label>
            <p className="text-sm text-gray-500 -mt-2">
              The person on-site we can call when we arrive.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="venueContactName">Recipient Name</Label>
                <Input
                  id="venueContactName"
                  value={form.venueContactName}
                  onChange={(e) => update("venueContactName", e.target.value)}
                  placeholder="Name of person receiving delivery"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="venueContactPhone">Recipient Phone</Label>
                <PhoneInput
                  id="venueContactPhone"
                  value={form.venueContactPhone}
                  onChange={(v) => update("venueContactPhone", v)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

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
                // Picking a location type implicitly answers the "have you
                // secured a venue?" question — we drive hasVenue directly
                // so the redundant Y/N step is hidden.
                setForm((prev) => {
                  const next: FormState = {
                    ...prev,
                    eventLocationType: v,
                  };
                  if (v === "our_office" && prev.eventType === "corporate") {
                    // Pre-fill venue from the company address the customer
                    // already typed in Step 1 — saves double entry.
                    next.hasVenue = "yes";
                    next.selectedVenueId = "other";
                    next.venueAddress = prev.companyStreet;
                    next.venueCity = prev.companyCity;
                    next.venueState = prev.companyState;
                    next.venueZip = prev.companyZip;
                  } else if (v === "external_venue") {
                    // Let them pick from the venue dropdown or enter manually.
                    next.hasVenue = "yes";
                    next.selectedVenueId = "";
                    next.venueAddress = "";
                    next.venueCity = "";
                    next.venueState = "";
                    next.venueZip = "";
                  } else if (v === "home" && prev.eventType === "birthday") {
                    // Home address is personal — skip the venue dropdown,
                    // jump straight to manual address entry.
                    next.hasVenue = "yes";
                    next.selectedVenueId = "other";
                  } else if (v === "venue" && prev.eventType === "birthday") {
                    next.hasVenue = "yes";
                    next.selectedVenueId = "";
                  } else if (v === "outdoor" && prev.eventType === "birthday") {
                    next.hasVenue = "yes";
                    next.selectedVenueId = "other";
                  } else if (v === "not_decided") {
                    next.hasVenue = "no";
                  }
                  return next;
                });
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

        {/* Have you secured a venue/location? — hidden once the customer has
            answered the location-type card picker above, since that
            implicitly answers this question. */}
        {!(eventConfig.showLocationTypeBranch && form.eventLocationType) && (
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
                  {(() => {
                    // Filter by current event type: a venue shows if its
                    // eventTypes list includes the current type, OR if its
                    // list is empty (legacy rows default to "show for all").
                    const filtered = venues.filter((v) => {
                      if (!form.eventType) return true;
                      if (!v.eventTypes || v.eventTypes.length === 0) return true;
                      return v.eventTypes.includes(form.eventType);
                    });
                    if (filtered.length === 0) {
                      return (
                        <div className="px-2 py-1.5 text-xs text-gray-500">
                          No venues in our list for this event type — pick "Other" below and enter your location.
                        </div>
                      );
                    }
                    return filtered.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name}
                      </SelectItem>
                    ));
                  })()}
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
              <AddressAutocomplete
                id="venueAddress"
                value={form.venueAddress}
                onChange={(v) => update("venueAddress", v)}
                onSelect={(p: AddressParts) => {
                  update("venueAddress", p.street);
                  if (p.city) update("venueCity", p.city);
                  if (p.state) update("venueState", p.state);
                  if (p.zip) update("venueZip", p.zip);
                }}
                placeholder="Start typing an address…"
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
                  <PhoneInput
                    id="venueContactPhone"
                    value={form.venueContactPhone}
                    onChange={(v) => update("venueContactPhone", v)}
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

  const renderStep3 = () => {
    // Drop-off mode: service style is locked to drop-off buffet, and the
    // cocktail-hour / main-meal timing questions don't apply — the delivery
    // time window in Step 2 already answers "when".
    if (form.isDropOff) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-4">
            <div className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Drop-off Service
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Your order is set as a drop-off buffet — you picked this on
              Step 1 and your delivery time is set on Step 2. Nothing else
              to configure here. Click Next to pick the menu.
            </p>
          </div>
        </div>
      );
    }
    return (
    <div className="space-y-8">
      {/* Service type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Service Type <span className="text-red-500">*</span>
        </Label>
        {renderCardSelector(SERVICE_TYPES, form.serviceType, (v) =>
          setForm((prev) => {
            const isCocktail = v === "cocktail_party";
            return {
              ...prev,
              serviceType: v,
              // Cocktail parties have no main meal — clear any stale state.
              hasMainMeal: isCocktail ? false : prev.hasMainMeal,
              mainMealStartTime: isCocktail ? "" : prev.mainMealStartTime,
              mainMealEndTime: isCocktail ? "" : prev.mainMealEndTime,
              // …and the cocktail/appetizer hour IS the event, so open it
              // automatically so the customer sees the start/end time fields.
              hasCocktailHour: isCocktail ? true : prev.hasCocktailHour,
            };
          }),
        )}
        {/* Plain-language description of the currently selected service
            type — helps customers understand what they're choosing without
            us having to write it out on every card. */}
        {form.serviceType && SERVICE_TYPE_DESCRIPTIONS[form.serviceType] && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 leading-relaxed">
            {SERVICE_TYPE_DESCRIPTIONS[form.serviceType]}
          </div>
        )}
      </div>

      {/* Food-truck logistics — shown whenever serviceType is food_truck,
          regardless of event type. A wedding/corporate/birthday that hires a
          food truck needs these answers just as much as a standalone
          food-truck event. */}
      {form.serviceType === "food_truck" && renderTruckLogistics()}

      {/* Buffet style (conditional) — each option gets a description
          inline so customers know what "Full Service (No Setup)" vs
          "Full Service" actually means before picking. */}
      {form.serviceType === "buffet" && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Buffet Service Style <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={form.buffetStyle}
            onValueChange={(v) => update("buffetStyle", v)}
            className="grid grid-cols-1 gap-3"
          >
            {BUFFET_STYLES.map((bs) => (
              <label
                key={bs.value}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                  form.buffetStyle === bs.value
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <RadioGroupItem
                  value={bs.value}
                  id={`bs-${bs.value}`}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{bs.label}</div>
                  <div className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {bs.description}
                  </div>
                </div>
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
          cocktail parties don't have one at all (hide entirely). */}
      {form.serviceType !== "cocktail_party" && eventConfig.showMainMealToggle ? (
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
      {form.serviceType !== "cocktail_party" && !eventConfig.showMainMealToggle && eventConfig.mainMealDefault && (
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
  };


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
        {/* Menu theme — photo-led grid. Real food photos from homebites.net
            make the cuisine tangible; text-only labels feel like a form.  */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Pick a cuisine — this is where your menu starts coming to life.{" "}
            <span className="text-red-500">*</span>
          </Label>
          {publicMenus.length === 0 ? (
            <p className="text-sm text-gray-500 font-serif italic">
              Pulling up cuisines fresh from the kitchen…
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {themeOptions.map((opt) => {
                const photo = MENU_THEME_PHOTOS[opt.value];
                const isActive = form.menuTheme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      update("menuTheme", opt.value);
                      update("packageTier", "");
                      update("menuItemSelections", {});
                    }}
                    className={cn(
                      "group relative rounded-xl overflow-hidden border-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg bg-white",
                      isActive
                        ? "shadow-lg ring-2"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    style={
                      isActive
                        ? {
                            borderColor: "var(--theme-primary)",
                            // @ts-expect-error custom ring var
                            "--tw-ring-color":
                              "color-mix(in srgb, var(--theme-primary) 25%, transparent)",
                          }
                        : undefined
                    }
                  >
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={opt.label}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: "var(--theme-gradient)" }}
                        >
                          <ChefHat className="h-10 w-10 text-white/80" />
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                        style={{ background: "var(--theme-gradient)" }}
                      >
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="p-3">
                      <p
                        className="font-semibold text-sm leading-snug"
                        style={{
                          color: isActive ? "var(--theme-primary)" : "#111827",
                          fontFamily: "var(--theme-heading-font), Georgia, serif",
                        }}
                      >
                        {opt.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {selectedMenu?.description && (
            <p
              className="text-sm mt-2 italic font-serif"
              style={{ color: "var(--theme-text-secondary)" }}
            >
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
              {appetizerCatalog.map((cat) => {
                const selections = form.appetizerSelections[cat.label] || {};
                const catTotal = cat.servingPack
                  ? cat.servingPack.pricePerServing *
                    (selections["__servings"] || 0)
                  : cat.items.reduce((sum, item) => {
                      const qty = selections[item.name] || 0;
                      // Works for both lot-priced (qty = pieces) and per-person
                      // (qty = servings). Both multiply item.price × qty.
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
                      {cat.servingPack ? (
                        (() => {
                          const servings =
                            selections["__servings"] || 0;
                          const pickedFlavors = cat.items.filter(
                            (it) => (selections[it.name] || 0) > 0,
                          );
                          const maxFlavors = cat.servingPack.flavorsToPick;
                          return (
                            <div className="space-y-4">
                              {cat.servingPack.description && (
                                <p className="text-sm text-gray-600">
                                  {cat.servingPack.description}
                                </p>
                              )}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">
                                    Pick {maxFlavors} flavors
                                  </Label>
                                  <span
                                    className={cn(
                                      "text-xs font-medium px-2 py-0.5 rounded-full",
                                      pickedFlavors.length === maxFlavors
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-600",
                                    )}
                                  >
                                    {pickedFlavors.length} / {maxFlavors}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {cat.items.map((item) => {
                                    const on =
                                      (selections[item.name] || 0) > 0;
                                    const atLimit =
                                      !on &&
                                      pickedFlavors.length >= maxFlavors;
                                    return (
                                      <label
                                        key={item.name}
                                        className={cn(
                                          "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-sm",
                                          on
                                            ? "border-primary bg-primary/5"
                                            : atLimit
                                              ? "border-gray-200 opacity-50 cursor-not-allowed"
                                              : "border-gray-200 hover:border-gray-300",
                                        )}
                                      >
                                        <Checkbox
                                          checked={on}
                                          disabled={atLimit}
                                          onCheckedChange={(v) =>
                                            setAppetizerQty(
                                              cat.label,
                                              item.name,
                                              v === true ? 1 : 0,
                                            )
                                          }
                                        />
                                        <span>{item.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  Servings
                                </Label>
                                <p className="text-xs text-gray-500">
                                  {fmt(cat.servingPack.pricePerServing)}{" "}
                                  per serving
                                </p>
                                {renderLotSelector(servings, (v) =>
                                  setAppetizerQty(cat.label, "__servings", v),
                                )}
                                {servings > 0 && (
                                  <p className="text-sm text-gray-600">
                                    {servings} servings ×{" "}
                                    {fmt(cat.servingPack.pricePerServing)} ={" "}
                                    <strong>
                                      {fmt(
                                        cat.servingPack.pricePerServing *
                                          servings,
                                      )}
                                    </strong>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
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
                                // Per-person boards (charcuterie / grazing).
                                // Customer picks a preset serving size —
                                // independent of guest count. Price =
                                // price-per-serving × servings.
                                <div className="flex items-center gap-3">
                                  <Select
                                    value={qty === 0 ? "" : String(qty)}
                                    onValueChange={(v) =>
                                      setAppetizerQty(
                                        cat.label,
                                        item.name,
                                        v === "" ? 0 : Number(v),
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Servings" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[24, 36, 48, 72, 96, 120].map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                          {n} servings
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {qty > 0 && (
                                    <span className="text-sm text-gray-600 w-24 text-right">
                                      {fmt(item.price * qty)}
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
                      )}
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
            {dessertCatalog.map((item) => {
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
            The drinks table
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

          {/* Nested mocktail picker — only when Mocktails is checked. */}
          <AnimatePresence initial={false}>
          {form.nonAlcoholicSelections.includes("Mocktails") && (
            <motion.div
              key="mocktail-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ overflow: "hidden" }}
              className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <Label className="font-semibold">Pick your mocktails</Label>
                <a
                  href={MOCKTAIL_MENU_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline underline-offset-2 hover:brightness-90"
                >
                  See full menu ↗
                </a>
              </div>
              <p className="text-xs text-gray-600 -mt-1">
                Choose as many as you'd like — we'll confirm quantities during
                planning.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MOCKTAIL_OPTIONS.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.mocktailSelections.includes(opt)}
                      onCheckedChange={() =>
                        toggleArrayItem("mocktailSelections", opt)
                      }
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
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
                onValueChange={(v) => {
                  // When switching bar types, drop state that no longer
                  // applies so stale picks don't sneak into the quote payload:
                  //   - dry_hire: strip wet-hire-only alcohol packages
                  //   - wet_hire: zero out dry-hire ice qty (wet hire
                  //     includes ice, separate row is hidden)
                  //   - dry_hire: zero out wet-hire ice qty (shouldn't exist
                  //     anyway since wet-hire row is hidden for dry_hire)
                  const DRY_HIDDEN = new Set([
                    "House Wine",
                    "Premium Wine",
                    "Open Bar",
                    "Cash Bar",
                  ]);
                  const clearIceForCategory = (
                    eq: Record<string, Record<string, number>>,
                    predicate: (itemName: string) => boolean,
                  ) => {
                    const out: Record<string, Record<string, number>> = {};
                    for (const [cat, items] of Object.entries(eq)) {
                      const kept: Record<string, number> = {};
                      for (const [name, qty] of Object.entries(items)) {
                        if (!predicate(name)) kept[name] = qty;
                      }
                      out[cat] = kept;
                    }
                    return out;
                  };
                  const isDryIce = (n: string) =>
                    /\bice\b/i.test(n) && /\bdry\b/i.test(n);
                  const isWetIce = (n: string) =>
                    /\bice\b/i.test(n) && /(bartend|wet|included|service)/i.test(n);
                  setForm((prev) => ({
                    ...prev,
                    barType: v,
                    alcoholSelections:
                      v === "dry_hire"
                        ? prev.alcoholSelections.filter((s) => !DRY_HIDDEN.has(s))
                        : prev.alcoholSelections,
                    equipmentSelections:
                      v === "wet_hire"
                        ? clearIceForCategory(prev.equipmentSelections, isDryIce)
                        : v === "dry_hire"
                          ? clearIceForCategory(prev.equipmentSelections, isWetIce)
                          : prev.equipmentSelections,
                    // Subsidized bar only applies to wet hire; clear if
                    // switching away.
                    subsidizedBar: v === "wet_hire" ? prev.subsidizedBar : false,
                    subsidyAmountDollars:
                      v === "wet_hire" ? prev.subsidyAmountDollars : "",
                  }));
                }}
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

            {/* Alcohol package — radio (single choice). Previously checkboxes,
                which let customers pick mutually-exclusive packages like
                "Beer" + "Open Bar" simultaneously.

                Dry hire ⇒ customer supplies the alcohol themselves, so the
                packages that describe what WE provide (House Wine, Premium
                Wine, Open Bar, Cash Bar) don't apply and are hidden. */}
            {(() => {
              const DRY_HIRE_HIDDEN = new Set([
                "House Wine",
                "Premium Wine",
                "Open Bar",
                "Cash Bar",
              ]);
              const visibleOptions =
                form.barType === "dry_hire"
                  ? ALCOHOL_OPTIONS.filter((o) => !DRY_HIRE_HIDDEN.has(o))
                  : ALCOHOL_OPTIONS;
              return (
                <div className="space-y-3">
                  <Label>Alcohol Package</Label>
                  <RadioGroup
                    value={form.alcoholSelections[0] || ""}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        alcoholSelections: v ? [v] : [],
                      }))
                    }
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                  >
                    {visibleOptions.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <RadioGroupItem value={opt} id={`alc-${opt}`} />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              );
            })()}

            {/* Subsidized bar (wet hire only).
                Host caps how much alcohol they want to cover; beyond that,
                guests pay cash. Middle ground between Open Bar and Cash Bar. */}
            {form.barType === "wet_hire" && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-white/60 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="pt-0.5">
                    <Switch
                      checked={form.subsidizedBar}
                      onCheckedChange={(v) => {
                        setForm((prev) => ({
                          ...prev,
                          subsidizedBar: !!v,
                          subsidyAmountDollars: v ? prev.subsidyAmountDollars : "",
                        }));
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Offer a subsidized bar?</div>
                    <p className="text-xs text-gray-600 mt-0.5 font-serif italic">
                      You cover a set dollar amount of drinks for your guests;
                      once the tab is reached, guests pay cash for any
                      additional drinks. A popular middle ground between an
                      open bar and a cash bar.
                    </p>
                  </div>
                </label>

                <AnimatePresence initial={false}>
                  {form.subsidizedBar && (
                    <motion.div
                      key="subsidy-amount"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="pt-1 max-w-xs">
                        <Label
                          htmlFor="subsidyAmount"
                          className="text-sm font-medium"
                        >
                          How much would you like to cover?
                        </Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            $
                          </span>
                          <Input
                            id="subsidyAmount"
                            type="number"
                            min={0}
                            step={50}
                            inputMode="decimal"
                            placeholder="500"
                            value={
                              form.subsidyAmountDollars === ""
                                ? ""
                                : String(form.subsidyAmountDollars)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              update(
                                "subsidyAmountDollars",
                                raw === ""
                                  ? ""
                                  : Math.max(0, Number(raw) || 0),
                              );
                            }}
                            className="pl-7"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-serif italic">
                          Round numbers work best — e.g. $500, $1,000, $2,500.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

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

                {/* Brand preferences — only relevant above "Well". */}
                <AnimatePresence initial={false}>
                  {(form.liquorQuality === "mid_shelf" ||
                    form.liquorQuality === "top_shelf") && (
                    <motion.div
                      key="preferred-brands"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                      className="pt-2"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="preferredLiquorBrands">
                          Any brands you'd like us to include?
                        </Label>
                        <p className="text-xs text-gray-500 -mt-0.5 font-serif italic">
                          Optional — list any specific spirits, wines, or
                          brands you'd love on the bar (e.g. Hendrick's gin,
                          Maker's Mark, a particular rosé). We'll do our best
                          to source them.
                        </p>
                        <Textarea
                          id="preferredLiquorBrands"
                          value={form.preferredLiquorBrands}
                          onChange={(e) =>
                            update("preferredLiquorBrands", e.target.value)
                          }
                          placeholder="e.g. Hendrick's gin, Casamigos Blanco, Whispering Angel rosé…"
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
        <p className="text-xs text-gray-500 -mt-2">
          Glassware options (beer, wine, cocktail, water goblets, champagne flutes) live in the next step under <strong>Equipment → Glassware</strong> — pick the exact glasses you want there.
        </p>
        <div className="space-y-3">
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
            {equipmentCatalog.map((cat) => {
              const selections = form.equipmentSelections[cat.label] || {};

              // Ice handling:
              //   - Dry-hire ice: sold in 50 lb bags at $20/bag ($0.40/lb × 50).
              //     Only relevant when the customer has a Dry-Hire bar (or no
              //     bar at all); wet hire includes ice so we hide this row.
              //   - "Ice with bartending" (wet hire): included at $0. Hidden
              //     unless the customer actually chose Wet Hire.
              const matchesDryIce = (n: string) => /\bice\b/i.test(n) && /\bdry\b/i.test(n);
              const matchesWetIce = (n: string) =>
                /\bice\b/i.test(n) && /(bartend|wet|included|service)/i.test(n);

              const visibleItems = cat.items.filter((item) => {
                if (matchesDryIce(item.name)) return form.barType !== "wet_hire";
                if (matchesWetIce(item.name)) return form.barType === "wet_hire";
                return true;
              });

              const catTotal = visibleItems.reduce((sum, item) => {
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
                      {visibleItems.map((item) => {
                        const qty = selections[item.name] || 0;
                        const isPerPerson = item.unit === "per person";
                        const isDryIce = matchesDryIce(item.name);
                        const isWetIce = matchesWetIce(item.name);
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                {isDryIce ? (
                                  <>$20 per 50 lb bag</>
                                ) : isWetIce ? (
                                  <>Included with bartending — no charge.</>
                                ) : (
                                  <>
                                    {fmt(item.price)} {item.unit}
                                    {isPerPerson && guestCount > 0 && (
                                      <>
                                        {" "}
                                        · {guestCount} guests ={" "}
                                        <strong>
                                          {fmt(item.price * guestCount)}
                                        </strong>
                                      </>
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {isWetIce ? (
                                // Wet-hire ice is always on and free — no
                                // qty selector needed.
                                <span className="text-xs font-serif italic text-emerald-700">
                                  Included
                                </span>
                              ) : isDryIce ? (
                                // Dry-hire ice: step in 50 lb bags. Value in
                                // state is the lb count; +/- adds/removes 50.
                                renderQuantitySelector(
                                  qty,
                                  (v) =>
                                    setEquipmentQty(cat.label, item.name, v),
                                  0,
                                  50,
                                )
                              ) : isPerPerson ? (
                                // Per-person items are all-or-nothing: 1 set
                                // per guest, auto-scaled by guestCount. Old
                                // +/- qty confused customers who thought
                                // they needed to type the headcount
                                // themselves.
                                <Checkbox
                                  checked={qty > 0}
                                  onCheckedChange={(v) =>
                                    setEquipmentQty(
                                      cat.label,
                                      item.name,
                                      v === true ? 1 : 0,
                                    )
                                  }
                                />
                              ) : (
                                renderQuantitySelector(
                                  qty,
                                  (v) =>
                                    setEquipmentQty(cat.label, item.name, v),
                                  0,
                                  1,
                                )
                              )}
                              {qty > 0 && !isWetIce && (
                                <span className="text-sm text-gray-600 w-20 text-right">
                                  {fmt(
                                    isPerPerson
                                      ? item.price * guestCount
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
      {/* Branded summary intro — frames this as a preview, not a form recap */}
      <div
        className="rounded-2xl p-6 text-center border"
        style={{
          background:
            "color-mix(in srgb, var(--theme-bg) 75%, white)",
          borderColor:
            "color-mix(in srgb, var(--theme-border) 50%, transparent)",
        }}
      >
        <div
          className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm"
          style={{ background: "var(--theme-gradient)" }}
        >
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <p
          className="font-serif text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--theme-primary)" }}
        >
          Almost done
        </p>
        <h3
          className="text-2xl sm:text-3xl font-semibold mt-1"
          style={{
            color: "var(--theme-text)",
            fontFamily: "var(--theme-heading-font), Georgia, serif",
          }}
        >
          Here's what we've got so far
        </h3>
        <p className="text-sm text-gray-600 mt-2 font-serif italic max-w-md mx-auto">
          Take one last look. Once you submit, we'll put together a tailored
          proposal with final pricing and get it back to you within 24–48h.
        </p>
      </div>

      {/* Summary */}
      <div className="space-y-4">

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
              {form.isDropOff && " · DROP-OFF"}
            </p>
            {form.isDropOff && form.dropOffTime && (
              <p>
                <span className="text-gray-500">Drop-off:</span>{" "}
                {form.dropOffTime} (±15 min window)
              </p>
            )}
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
                {selectedTier.tierName} ({fmt(perPersonFood)}/person)
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

        {/* Appetizers & Desserts summary — show selections, not totals */}
        {(form.addAppetizers || form.addDesserts) && (
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
                  {form.appetizerStyle || "requested"}
                </p>
              )}
              {form.addDesserts && (
                <p>
                  <span className="text-gray-500">Desserts:</span> requested
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
              {form.nonAlcoholicSelections.includes("Mocktails") &&
                form.mocktailSelections.length > 0 && (
                  <p>
                    <span className="text-gray-500">Mocktails:</span>{" "}
                    {form.mocktailSelections.join(", ")}
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
              {form.needsEquipment && (
                <p>
                  <span className="text-gray-500">Equipment:</span> requested
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

  // Theme cascade — once the customer picks an event type, the whole form
  // visually shifts to the matching preset (wedding → cream/gold, corporate →
  // navy, etc). Before pick: neutral Homebites palette (the celebration preset).
  const preset = getEventPreset(form.eventType || "celebration");
  const themeStyles = applyThemeCSS(preset.theme);
  const themeActive = !!form.eventType;

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        ...themeStyles,
        background: themeActive
          ? `linear-gradient(135deg, var(--theme-bg) 0%, white 45%, var(--theme-secondary) 100%)`
          : "linear-gradient(135deg, #faf6ef 0%, #ffffff 50%, #fbf3e7 100%)",
      }}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-[color:var(--theme-border)]/40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center text-center">
          <img
            src={homebitesLogo}
            alt="Home Bites Catering"
            className="h-20 sm:h-24 w-auto mb-4"
          />
          <h1
            className="text-3xl sm:text-4xl font-semibold tracking-tight"
            style={{
              color: themeActive ? "var(--theme-text)" : "#1f2937",
              fontFamily: "var(--theme-heading-font), Georgia, serif",
            }}
          >
            Let's plan your event
          </h1>
          <p
            className="mt-2 text-lg italic"
            style={{
              color: themeActive ? "var(--theme-text-secondary)" : "#6b7280",
              fontFamily: "var(--theme-body-font), Georgia, serif",
            }}
          >
            A few quick questions and we'll get straight to cooking up your menu.
          </p>
          {/* Trust strip */}
          <div className="mt-4 flex flex-wrap justify-center items-center gap-x-5 gap-y-1 text-xs text-gray-500 font-serif">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[color:var(--theme-primary)]" />
              100+ Seattle events catered
            </span>
            <span aria-hidden className="text-gray-300">·</span>
            <span>Licensed &amp; insured</span>
            <span aria-hidden className="text-gray-300">·</span>
            <span>Typical reply within 24–48h</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white/85 backdrop-blur border-b border-[color:var(--theme-border)]/40 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold"
              style={{
                color: "var(--theme-text)",
                fontFamily: "var(--theme-heading-font), Georgia, serif",
              }}
            >
              Step {step} of 8 · {STEP_LABELS[step - 1]}
            </span>
            <span className="text-sm text-gray-500 font-serif italic">
              {Math.round((step / 8) * 100)}% complete
            </span>
          </div>
          {/* Gradient progress bar keyed to the event preset */}
          <div className="h-2 rounded-full bg-[color:var(--theme-border)]/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(step / 8) * 100}%`,
                background: "var(--theme-gradient)",
              }}
            />
          </div>
          {/* Step indicators */}
          <div className="hidden sm:flex justify-between mt-3">
            {STEP_LABELS.map((label, idx) => {
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
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                          ? "text-white shadow-sm"
                          : "bg-gray-200 text-gray-500",
                    )}
                    style={
                      isCurrent
                        ? { background: "var(--theme-gradient)" }
                        : undefined
                    }
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-tight text-center max-w-[60px] font-serif",
                      isCurrent
                        ? "font-semibold"
                        : "text-gray-500",
                    )}
                    style={
                      isCurrent
                        ? { color: "var(--theme-primary)" }
                        : undefined
                    }
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
        <div>
          {/* Main form area — pricing total intentionally hidden; customer
              sees per-line-item prices only. The full breakdown is revealed
              on the quote. */}
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
                  {step === 1 && "A few quick details about you and the occasion — we'll keep the rest fun."}
                  {step === 2 && eventConfig.locationSectionSubtitle}
                  {step === 3 && "How would you like your meal served on the day?"}
                  {step === 4 && "Pick a cuisine and tier — this is where the menu starts coming to life."}
                  {step === 5 && "The little extras that make an event memorable."}
                  {step === 6 && "Wines, mocktails, coffee — tell us how guests will drink."}
                  {step === 7 && "Any rentals we should handle, and anything we should know about dietary needs."}
                  {step === 8 && "One last look, then we'll take it from here."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Catalog loading / error banner — only relevant for steps 5–7 which depend on the catalog. */}
                {[5, 6, 7].includes(step) && catalogLoading && (
                  <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-700 font-serif italic">Pulling up the kitchen notes…</p>
                  </div>
                )}
                {[5, 6, 7].includes(step) && !catalogLoading && catalogError && (
                  <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-sm font-medium text-red-700 mb-1">Couldn't load menu options</p>
                    <p className="text-xs text-red-600">
                      Please refresh the page. If this keeps happening, contact us directly — we'll pick things up from our side.
                    </p>
                  </div>
                )}

                {/* Step content — animated transitions via framer-motion */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                    {step === 6 && renderStep6()}
                    {step === 7 && renderStep7()}
                    {step === 8 && renderStep8()}
                  </motion.div>
                </AnimatePresence>

                {/* Validation errors — shown right above the Back/Next row so
                    the message is visible at the moment the user clicks Next. */}
                {stepErrors.length > 0 && (
                  <div className="mt-8 p-4 rounded-lg border border-red-200 bg-red-50">
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
        </div>
      </div>
    </div>
  );
}
