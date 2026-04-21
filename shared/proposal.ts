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
  /** Short flavor description shown under the item name on the customer page. */
  description?: string;
  note?: string;
}

export interface ProposalAppetizer {
  itemName: string;
  quantity: number;
  description?: string;
  note?: string;
}

export interface ProposalDessert {
  itemName: string;
  quantity: number;
  description?: string;
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
  /** Discount in cents (positive number). Subtracted from line-item subtotal
   *  before service fee + tax. Optional discount label shown next to the line. */
  discountCents?: number;
  discountLabel?: string;
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

  // ─── Trust + voice additions ────────────────────────────────────────────
  // All optional. If unset, the renderer uses sensible defaults driven by
  // serviceStyle / siteConfig. Admin can override per quote when a specific
  // event needs tailored language (destination weddings, corporate policies).

  /**
   * Ordered list of what the price covers. Rendered as a checklist card
   * between the menu and the investment total. When unset, a default list
   * is derived from proposal.serviceStyle.
   */
  whatsIncluded?: string[];

  /**
   * Personal note from the chef to the customer. When unset, a default is
   * assembled from siteConfig.chef (name/role/bio).
   */
  chefNote?: {
    firstName: string;
    role: string;
    message: string;
    photoUrl?: string | null;
  } | null;

  /**
   * Short testimonial quotes to anchor social proof above the accept CTA.
   * Omit to hide the section entirely — better no testimonials than fake ones.
   */
  testimonials?: Array<{
    quote: string;
    author: string;
    eventType?: string;
  }>;

  // ─── Per-quote overrides ────────────────────────────────────────────────
  // Everything below lets the admin break out of the preset/global defaults
  // for a specific quote without forking the codebase. All optional; null/
  // undefined means "use the preset/global default."

  /** Override the logo + palette used on the public proposal + PDF. */
  branding?: {
    /** Absolute URL to a logo image (PNG/JPG/SVG-as-PNG). */
    logoUrl?: string | null;
    /** Hex colors — when set, override the event preset's palette. */
    primary?: string | null;
    accent?: string | null;
    background?: string | null;
  } | null;

  /**
   * Override the T&Cs presented at accept time. When set, replaces the
   * global `getTermsConfig()` body entirely for this quote (the version
   * string is prefixed with "custom-" in the audit log).
   */
  termsOverride?: {
    heading?: string | null;
    body: string;
  } | null;

  /**
   * Free-text custom sections rendered on the public proposal between
   * What's Included and the Investment card. Order preserved. Admin edits
   * each as a titled textarea.
   */
  customSections?: Array<{
    id?: string;
    title: string;
    body: string;
  }>;

  /**
   * Per-quote copy overrides for section labels. When set, replaces the
   * preset's copy.* field. Only fields the admin actually edited should be
   * populated — unset keys fall back to the preset.
   */
  sectionLabelOverrides?: {
    proposalKicker?: string;
    acceptCtaHeadline?: string;
    acceptCtaBlurb?: string;
    closingSignoff?: string;
  };
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
