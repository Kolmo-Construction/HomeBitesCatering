// Wedding/event proposal payload — stored on quotes.proposal and rendered
// by the public quote page. This is the single source of truth for what the
// customer sees. Admin edits go here; the public endpoint reads only this.

export type ProposalMenuCategory =
  | "appetizer"
  | "appetizers"
  | "starters"
  | "cocktail"
  | "entree"
  | "main"
  | "mains"
  | "protein"
  | "side"
  | "sides"
  | "dessert"
  | "desserts"
  | "beverage"
  | "beverages"
  | (string & {}); // allow any string while hinting at the standard set

export interface ProposalMenuItem {
  name: string;
  category: ProposalMenuCategory;
  note?: string;
}

export interface ProposalAppetizer {
  itemName: string;
  quantity: number;
  note?: string;
}

export interface ProposalDessert {
  itemName: string;
  quantity: number;
  note?: string;
}

export interface ProposalBeverages {
  hasNonAlcoholic?: boolean;
  nonAlcoholicSelections?: string[];
  mocktails?: string[];
  hasAlcoholic?: boolean;
  bartendingType?: string;
  liquorQuality?: string;
  coffeeTeaService?: boolean;
}

export interface ProposalEquipmentItem {
  item: string;
  quantity: number;
  note?: string;
}

export interface ProposalEquipment {
  items: ProposalEquipmentItem[];
  otherNotes?: string;
}

export interface ProposalDietary {
  restrictions?: string[];
  allergies?: string[];
  specialNotes?: string;
}

export interface ProposalVenue {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ProposalPricing {
  /** Per-person catering price in cents. If set, shown as "price × guests". */
  perPersonCents?: number;
  /** Sum of all item-level costs, before service fee and tax. In cents. */
  subtotalCents: number;
  /** Service / gratuity fee in cents (optional — zero hides the line). */
  serviceFeeCents?: number;
  /** Tax in cents. */
  taxCents: number;
  /** Grand total in cents. Customer-facing total. */
  totalCents: number;
  /** Deposit percentage (0–100). Defaults to 35 if unset. */
  depositPercent?: number;
}

export interface ProposalLineItem {
  id?: string;
  name: string;
  quantity: number;
  /** In cents. */
  price: number;
}

export interface Proposal {
  /** Schema version so we can migrate shapes later if needed. */
  version: 1;

  // Who
  firstName: string;
  lastName: string;
  partnerFirstName?: string;
  partnerLastName?: string;

  // What
  eventType: string; // "wedding" | "corporate" | etc.
  eventDate: string | null; // ISO date
  guestCount: number;

  // Where
  venue?: ProposalVenue;

  // When — timeline
  hasCeremony?: boolean;
  ceremonyStartTime?: string | null; // "HH:MM"
  ceremonyEndTime?: string | null;
  hasCocktailHour?: boolean;
  cocktailStartTime?: string | null;
  cocktailEndTime?: string | null;
  hasMainMeal?: boolean;
  mainMealStartTime?: string | null;
  mainMealEndTime?: string | null;
  serviceType?: string | null;
  serviceStyle?: string | null;

  // Menu
  menuTheme?: string | null;
  menuTier?: string | null;
  menuSelections: ProposalMenuItem[];
  appetizers: ProposalAppetizer[];
  desserts: ProposalDessert[];
  beverages?: ProposalBeverages;
  equipment?: ProposalEquipment;
  dietary?: ProposalDietary;

  // Special requests (free text, shown in italics on the public page)
  specialRequests?: string | null;

  // Pricing / line items (the admin can edit these directly)
  lineItems: ProposalLineItem[];
  pricing: ProposalPricing;

  // Admin notes shown to the customer (free text, optional)
  customerNotes?: string | null;
}

/** Build an empty proposal scaffold. */
export function emptyProposal(): Proposal {
  return {
    version: 1,
    firstName: "",
    lastName: "",
    eventType: "wedding",
    eventDate: null,
    guestCount: 0,
    menuSelections: [],
    appetizers: [],
    desserts: [],
    lineItems: [],
    pricing: {
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    },
  };
}
