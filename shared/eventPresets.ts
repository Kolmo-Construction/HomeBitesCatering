/**
 * Event-type presets — single source of truth.
 *
 * Replaces the older split between `client/src/lib/eventThemes.ts` (visuals)
 * and `shared/eventCopy.ts` (copy). One module describes everything that
 * varies per event type: theme, copy, section opt-ins, per-type defaults,
 * and PDF branding. Used by:
 *   - QuoteProposalView.tsx        (web quote)
 *   - PublicEventPage.tsx          (celebration / event page)
 *   - ClientPortal.tsx             (logged-in customer view)
 *   - server/services/pdfGenerator (downloadable PDF)
 *
 * Pure data + pure functions only — no React, no DOM. The client-side CSS
 * variable helper lives in `client/src/lib/eventPresetCSS.ts` and imports
 * from this module.
 */

// ─── Identity ────────────────────────────────────────────────────────────────

export type EventTypeKey =
  | "wedding"
  | "engagement"
  | "anniversary"
  | "corporate"
  | "conference"
  | "workshop"
  | "fundraiser"
  | "birthday"
  | "baby_shower"
  | "graduation"
  | "holiday_party"
  | "reunion"
  | "cocktail_party"
  | "food_truck"
  | "celebration";

// ─── Person context (input to copy functions) ───────────────────────────────

export interface EventPersonContext {
  firstName?: string | null;
  lastName?: string | null;
  partnerFirstName?: string | null;
  partnerLastName?: string | null;
  company?: string | null;
}

// ─── Sub-packs ──────────────────────────────────────────────────────────────

export interface EventTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  fontHeading: string;
  fontBody: string;
  /** Emoji used in badges / chips / portal cards. */
  icon: string;
  gradient: string;
  borderAccent: string;
}

export interface EventCopy {
  // Section kickers / headlines
  proposalKicker: string;
  celebrationKicker: string;
  testimonialsKicker: string;
  testimonialsHeadline: string;

  // Labels
  comingNextLabel: string;
  countdownUnit: string;
  closingSignoff: string;
  acceptCtaHeadline: string;
  acceptCtaBlurb: string;

  // Status banners
  acceptedHeadline: string;
  acceptedBlurb: string;
  completedHeadline: string;
  completedBlurb: string;
  cancelledBlurb: string;

  // Contextual functions — surfaces pass an EventPersonContext
  displayTitle: (ctx: EventPersonContext) => string;
  proposalLead: (ctx: EventPersonContext) => string;
  celebrationSubtitle: (ctx: EventPersonContext) => string;
  /**
   * Compose the event-page hero title from the person/company title.
   * Wedding → `${title}'s Wedding`, corporate → `${title}` (company name
   * stands alone), birthday → `${title}'s Birthday`. Falls back to
   * `Your ${label}` when no person title is available.
   */
  composeEventTitle: (personTitle: string | null, label: string) => string;
}

export interface EventSections {
  /** Wedding-family flourish: hearts framing the hero kicker + accept CTA. */
  useHeartAccents: boolean;
}

export interface EventDefaults {
  /**
   * Per-type "What's Included" defaults that adapt to service style.
   * Wedding mentions a couple's tasting; corporate omits it; celebratory uses
   * neutral language.
   */
  whatsIncluded: (serviceStyle: string | null | undefined) => string[];
}

export interface PdfPalette {
  primary: string;
  accent: string;
  background: string;
  headerText: string;
  bodyText: string;
  muted: string;
  rule: string;
}

export interface PdfBranding {
  palette: PdfPalette;
}

/**
 * Derive a print-ready palette from an `EventTheme`. Used as a fallback when
 * a preset doesn't supply its own `pdfBranding.palette`, and as a way for the
 * PDF generator to keep web + print in sync when a future redesign changes
 * theme colors. Text colors default to dark near-black regardless of theme
 * because print contrast requirements differ from on-screen.
 */
export function derivePdfPaletteFromTheme(theme: EventTheme): PdfPalette {
  return {
    primary: theme.primary,
    accent: theme.accent,
    background: theme.background,
    headerText: "#1A1A1A",
    bodyText: "#2D2D2D",
    muted: theme.textSecondary || "#6B6B6B",
    rule: theme.borderAccent || "#D8D8D8",
  };
}

export interface EventPreset {
  key: EventTypeKey;
  /** Human-readable label, e.g., "Wedding". Also used as-is in `composeEventTitle`. */
  label: string;
  theme: EventTheme;
  copy: EventCopy;
  sections: EventSections;
  defaults: EventDefaults;
  /**
   * Optional print palette override. When absent, the PDF generator derives
   * a palette from `theme` so new event types only need to define their theme
   * once. Supply this field only when print needs colors that differ from the
   * web theme (e.g., more saturated for CMYK legibility).
   */
  pdfBranding?: PdfBranding;
}

// ─── Person / title formatting helpers ──────────────────────────────────────

function trimOrEmpty(s: string | null | undefined): string {
  return (s || "").trim();
}

function formatSoloName(ctx: EventPersonContext): string {
  const first = trimOrEmpty(ctx.firstName);
  const last = trimOrEmpty(ctx.lastName);
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return "";
}

/** Couple title — never duplicates the same name as `Pascal & Pascal`. */
function formatCoupleTitle(ctx: EventPersonContext): string {
  const a = trimOrEmpty(ctx.firstName);
  const b = trimOrEmpty(ctx.partnerFirstName);
  if (a && b && a.toLowerCase() !== b.toLowerCase()) return `${a} & ${b}`;
  return formatSoloName(ctx);
}

function formatCompanyOrSolo(ctx: EventPersonContext): string {
  return trimOrEmpty(ctx.company) || formatSoloName(ctx);
}

function fallbackGreeting(name: string): string {
  return name || "there";
}

// ─── Default whatsIncluded — neutral base for all non-wedding types ────────

function neutralWhatsIncluded(serviceStyle: string | null | undefined): string[] {
  const style = (serviceStyle || "").toLowerCase();
  const base = [
    "Full menu planning with one round of revisions",
    "On-site cooking and plating by our kitchen team",
    "Professional service staff for the event",
    "Setup of serving lines, chafing dishes, and presentation ware",
    "Full breakdown and cleanup of our equipment after service",
    "Dedicated event coordinator from booking through the day-of",
  ];
  if (style === "plated") {
    return [
      "Full menu planning with one round of revisions",
      "Course-by-course plating in our on-site kitchen",
      "Captain + servers to coordinate plated service with your venue",
      "Setup of plating stations, bussing, and between-course resets",
      "Full breakdown and cleanup of our equipment after service",
      "Dedicated event coordinator from booking through the day-of",
    ];
  }
  if (style === "family_style") {
    return [
      "Full menu planning with one round of revisions",
      "Family-style platters built and refreshed throughout service",
      "Service staff to coordinate platter flow with your venue",
      "Setup of communal platters, utensils, and replenishments",
      "Full breakdown and cleanup of our equipment after service",
      "Dedicated event coordinator from booking through the day-of",
    ];
  }
  if (style === "cocktail_party" || style === "stations") {
    return [
      "Full menu planning with one round of revisions",
      "On-site cooking at stations / passed hors d'oeuvres by our kitchen team",
      "Service staff to pass and replenish throughout the event",
      "Setup of stations, serving platters, and presentation ware",
      "Full breakdown and cleanup of our equipment after service",
      "Dedicated event coordinator from booking through the day-of",
    ];
  }
  return base;
}

function romanticWhatsIncluded(serviceStyle: string | null | undefined): string[] {
  // Wedding family adds a complimentary tasting for the couple.
  const base = neutralWhatsIncluded(serviceStyle);
  return [
    base[0],
    "Complimentary tasting for the couple",
    ...base.slice(1),
  ];
}

function corporateWhatsIncluded(serviceStyle: string | null | undefined): string[] {
  // Corporate: tasting is by request, invoicing terms call-out lives in the
  // contract not the PDF, so the included list stays neutral.
  return neutralWhatsIncluded(serviceStyle);
}

// ─── Copy packs (shared shape, per-flavour values) ──────────────────────────

type CopyPack = Omit<
  EventCopy,
  "proposalKicker" | "celebrationKicker"
>;

const romanticPack: CopyPack = {
  testimonialsKicker: "Kind words",
  testimonialsHeadline: "From couples we've fed",
  comingNextLabel: "The flow of your day",
  countdownUnit: "until your celebration",
  closingSignoff: "Looking forward to celebrating with you,",
  acceptCtaHeadline: "Ready to make it official?",
  acceptCtaBlurb:
    "Accept the proposal and we'll send the contract and deposit instructions within 24 hours.",
  acceptedHeadline: "We're officially booked!",
  acceptedBlurb:
    "Thank you for choosing Homebites to be part of your day. We'll be in touch within 24 hours with the contract and deposit instructions.",
  completedHeadline: "Thank you for letting us be part of your day",
  completedBlurb:
    "It was our honor to prepare your event. If you'd ever like to book with us again, we'd love to be part of your next celebration.",
  cancelledBlurb:
    "This event has been cancelled. If this wasn't intentional, please reach out to us — we'd love to help make it right.",
  displayTitle: formatCoupleTitle,
  proposalLead: (ctx) => {
    const title = formatCoupleTitle(ctx);
    const greeting = title ? `, ${title}` : "";
    return `Congratulations${greeting}. It would be our honor to feed your guests on your big day. Here's what we've put together for you.`;
  },
  celebrationSubtitle: (ctx) => {
    const title = formatCoupleTitle(ctx);
    return title
      ? `A celebration prepared with care for ${title}.`
      : "A celebration prepared with care.";
  },
  composeEventTitle: (personTitle, label) =>
    personTitle ? `${personTitle}'s ${label}` : `Your ${label}`,
};

const corporatePack: CopyPack = {
  testimonialsKicker: "What clients say",
  testimonialsHeadline: "From teams we've catered",
  comingNextLabel: "Run of show",
  countdownUnit: "until your event",
  closingSignoff: "Looking forward to working with you,",
  acceptCtaHeadline: "Ready to confirm?",
  acceptCtaBlurb:
    "Accept the proposal and we'll send the contract and deposit instructions within one business day.",
  acceptedHeadline: "You're confirmed.",
  acceptedBlurb:
    "Thank you for choosing Homebites. We'll follow up within one business day with the contract and deposit instructions.",
  completedHeadline: "Thanks for having us",
  completedBlurb:
    "It was a pleasure catering your event. If your team is planning the next one, we'd love to be considered.",
  cancelledBlurb:
    "This event has been cancelled. If this wasn't intentional, please reach out and we'll help reschedule.",
  displayTitle: formatCompanyOrSolo,
  proposalLead: (ctx) => {
    const name = formatCompanyOrSolo(ctx);
    return `Thank you for considering Homebites${name ? " for " + name : ""}. Here's the proposal we've put together.`;
  },
  celebrationSubtitle: (ctx) => {
    const name = formatCompanyOrSolo(ctx);
    return name ? `${name} — event details at a glance.` : "Event details at a glance.";
  },
  // Corporate: the company name is the title; appending "'s Corporate Event"
  // reads awkward, so render the title alone.
  composeEventTitle: (personTitle, label) => personTitle || `Your ${label}`,
};

const celebratoryPack: CopyPack = {
  testimonialsKicker: "Kind words",
  testimonialsHeadline: "From hosts we've cooked for",
  comingNextLabel: "What's coming up",
  countdownUnit: "until your celebration",
  closingSignoff: "Can't wait to cook for you,",
  acceptCtaHeadline: "Ready to lock it in?",
  acceptCtaBlurb:
    "Accept the proposal and we'll send the contract and deposit instructions within 24 hours.",
  acceptedHeadline: "You're officially booked!",
  acceptedBlurb:
    "Thanks for choosing Homebites. We'll follow up within 24 hours with the contract and deposit instructions.",
  completedHeadline: "Thank you for letting us be part of it",
  completedBlurb:
    "It was a joy to cook for your celebration. If you ever want to book us again, we'd love to be part of the next one.",
  cancelledBlurb:
    "This event has been cancelled. If this wasn't intentional, just reply to our email and we'll help reschedule.",
  displayTitle: (ctx) => formatSoloName(ctx),
  proposalLead: (ctx) => {
    const greeting = fallbackGreeting(formatSoloName(ctx));
    return `Thanks for thinking of us, ${greeting}. Here's the proposal we've put together for your celebration.`;
  },
  celebrationSubtitle: (ctx) => {
    const name = formatSoloName(ctx);
    return name
      ? `A celebration prepared with care for ${name}.`
      : "A celebration prepared with care.";
  },
  composeEventTitle: (personTitle, label) =>
    personTitle ? `${personTitle}'s ${label}` : `Your ${label}`,
};

const professionalPack: CopyPack = {
  testimonialsKicker: "What clients say",
  testimonialsHeadline: "From organizations we've worked with",
  comingNextLabel: "Run of show",
  countdownUnit: "until your event",
  closingSignoff: "Looking forward to working with you,",
  acceptCtaHeadline: "Ready to confirm?",
  acceptCtaBlurb:
    "Accept the proposal and we'll send the contract and deposit instructions within one business day.",
  acceptedHeadline: "You're confirmed.",
  acceptedBlurb:
    "Thank you for choosing Homebites. We'll follow up within one business day with the contract and deposit instructions.",
  completedHeadline: "Thanks for partnering with us",
  completedBlurb:
    "It was a pleasure catering your event. If you have another in the works, we'd love to be considered.",
  cancelledBlurb:
    "This event has been cancelled. If this wasn't intentional, please reach out and we'll help reschedule.",
  displayTitle: formatCompanyOrSolo,
  proposalLead: (ctx) => {
    const name = formatCompanyOrSolo(ctx);
    return `Thank you for considering Homebites${name ? " for " + name : ""}. Here's the proposal we've put together.`;
  },
  celebrationSubtitle: (ctx) => {
    const name = formatCompanyOrSolo(ctx);
    return name ? `${name} — event details at a glance.` : "Event details at a glance.";
  },
  composeEventTitle: (personTitle, label) => personTitle || `Your ${label}`,
};

// ─── Section opt-in packs ───────────────────────────────────────────────────

const romanticSections: EventSections = { useHeartAccents: true };
const corporateSections: EventSections = { useHeartAccents: false };
const celebratorySections: EventSections = { useHeartAccents: false };
const professionalSections: EventSections = { useHeartAccents: false };

// ─── PDF palettes ───────────────────────────────────────────────────────────
//
// Hand-picked so each event type's PDF feels distinct without the renderer
// needing per-type code. The PDF generator reads `preset.pdfBranding.palette`
// for section headers, rules, totals panel, and footer chrome.

const romanticPdfPalette: PdfPalette = {
  primary: "#8B7355",
  accent: "#C4A265",
  background: "#FBF6EA",
  headerText: "#1F1208",
  bodyText: "#3F2E20",
  muted: "#7A6A55",
  rule: "#E0D0B3",
};
const corporatePdfPalette: PdfPalette = {
  primary: "#1B3A5C",
  accent: "#2E86AB",
  background: "#F7FAFC",
  headerText: "#0F1B2A",
  bodyText: "#1A202C",
  muted: "#4A5568",
  rule: "#CBD5E0",
};
const celebratoryPdfPalette: PdfPalette = {
  primary: "#D69E2E",
  accent: "#ED8936",
  background: "#FFFAF0",
  headerText: "#1A202C",
  bodyText: "#2D3748",
  muted: "#4A5568",
  rule: "#FBE8C9",
};
const professionalPdfPalette: PdfPalette = {
  primary: "#2B6CB0",
  accent: "#3182CE",
  background: "#F7FAFC",
  headerText: "#0F1B2A",
  bodyText: "#1A202C",
  muted: "#4A5568",
  rule: "#CBD5E0",
};

// ─── Preset registry ────────────────────────────────────────────────────────

const presets: Record<EventTypeKey, EventPreset> = {
  wedding: {
    key: "wedding",
    label: "Wedding",
    theme: {
      primary: "#C4A265",
      secondary: "#F5E6D3",
      accent: "#D4A5A5",
      background: "#FFF9F5",
      textPrimary: "#2D1810",
      textSecondary: "#6B5345",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
      icon: "\u{1F48D}",
      gradient: "linear-gradient(135deg, #C4A265 0%, #D4A5A5 50%, #F5E6D3 100%)",
      borderAccent: "#C4A265",
    },
    copy: { ...romanticPack, proposalKicker: "A Wedding Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: romanticSections,
    defaults: { whatsIncluded: romanticWhatsIncluded },
    pdfBranding: { palette: romanticPdfPalette },
  },
  engagement: {
    key: "engagement",
    label: "Engagement",
    theme: {
      primary: "#D4AF37",
      secondary: "#FFF5E6",
      accent: "#E8B4B4",
      background: "#FFFAF0",
      textPrimary: "#2D1810",
      textSecondary: "#6B5345",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
      icon: "\u{1F942}",
      gradient: "linear-gradient(135deg, #D4AF37 0%, #E8B4B4 100%)",
      borderAccent: "#D4AF37",
    },
    copy: { ...romanticPack, proposalKicker: "An Engagement Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: romanticSections,
    defaults: { whatsIncluded: romanticWhatsIncluded },
    pdfBranding: { palette: romanticPdfPalette },
  },
  anniversary: {
    key: "anniversary",
    label: "Anniversary",
    theme: {
      primary: "#8B4513",
      secondary: "#F5E6D3",
      accent: "#C4A265",
      background: "#FFF9F5",
      textPrimary: "#2D1810",
      textSecondary: "#6B5345",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
      icon: "\u{1F495}",
      gradient: "linear-gradient(135deg, #8B4513 0%, #C4A265 100%)",
      borderAccent: "#C4A265",
    },
    copy: { ...romanticPack, proposalKicker: "An Anniversary Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: romanticSections,
    defaults: { whatsIncluded: romanticWhatsIncluded },
    pdfBranding: { palette: romanticPdfPalette },
  },
  corporate: {
    key: "corporate",
    label: "Corporate Event",
    theme: {
      primary: "#1B3A5C",
      secondary: "#F0F4F8",
      accent: "#2E86AB",
      background: "#FAFBFC",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Inter', system-ui, sans-serif",
      fontBody: "'Inter', system-ui, sans-serif",
      icon: "\u{1F3E2}",
      gradient: "linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)",
      borderAccent: "#2E86AB",
    },
    copy: { ...corporatePack, proposalKicker: "A Corporate Event Proposal", celebrationKicker: "Your event, handled" },
    sections: corporateSections,
    defaults: { whatsIncluded: corporateWhatsIncluded },
    pdfBranding: { palette: corporatePdfPalette },
  },
  conference: {
    key: "conference",
    label: "Conference",
    theme: {
      primary: "#2B6CB0",
      secondary: "#EBF8FF",
      accent: "#3182CE",
      background: "#F7FAFC",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Inter', system-ui, sans-serif",
      fontBody: "'Inter', system-ui, sans-serif",
      icon: "\u{1F3A4}",
      gradient: "linear-gradient(135deg, #2B6CB0 0%, #3182CE 100%)",
      borderAccent: "#3182CE",
    },
    copy: { ...professionalPack, proposalKicker: "A Conference Catering Proposal", celebrationKicker: "Your event, handled" },
    sections: professionalSections,
    defaults: { whatsIncluded: corporateWhatsIncluded },
    pdfBranding: { palette: professionalPdfPalette },
  },
  workshop: {
    key: "workshop",
    label: "Workshop",
    theme: {
      primary: "#2C7A7B",
      secondary: "#E6FFFA",
      accent: "#38B2AC",
      background: "#F0FFF4",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Inter', system-ui, sans-serif",
      fontBody: "'Inter', system-ui, sans-serif",
      icon: "\u{1F527}",
      gradient: "linear-gradient(135deg, #2C7A7B 0%, #38B2AC 100%)",
      borderAccent: "#38B2AC",
    },
    copy: { ...professionalPack, proposalKicker: "A Workshop Catering Proposal", celebrationKicker: "Your event, handled" },
    sections: professionalSections,
    defaults: { whatsIncluded: corporateWhatsIncluded },
    pdfBranding: { palette: professionalPdfPalette },
  },
  fundraiser: {
    key: "fundraiser",
    label: "Fundraiser",
    theme: {
      primary: "#553C9A",
      secondary: "#FAF5FF",
      accent: "#D69E2E",
      background: "#FAFAFE",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Inter', system-ui, sans-serif",
      fontBody: "'Inter', system-ui, sans-serif",
      icon: "\u2728",
      gradient: "linear-gradient(135deg, #553C9A 0%, #D69E2E 100%)",
      borderAccent: "#553C9A",
    },
    copy: { ...professionalPack, proposalKicker: "A Fundraiser Catering Proposal", celebrationKicker: "Your event, handled" },
    sections: professionalSections,
    defaults: { whatsIncluded: corporateWhatsIncluded },
    pdfBranding: { palette: professionalPdfPalette },
  },
  birthday: {
    key: "birthday",
    label: "Birthday",
    theme: {
      primary: "#FF6B6B",
      secondary: "#FFE66D",
      accent: "#4ECDC4",
      background: "#FFF8F0",
      textPrimary: "#2D3748",
      textSecondary: "#4A5568",
      fontHeading: "'Poppins', system-ui, sans-serif",
      fontBody: "'Nunito', system-ui, sans-serif",
      icon: "\u{1F382}",
      gradient: "linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)",
      borderAccent: "#FF6B6B",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Birthday Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  baby_shower: {
    key: "baby_shower",
    label: "Baby Shower",
    theme: {
      primary: "#B8D4E3",
      secondary: "#F2D7D9",
      accent: "#C5E0B4",
      background: "#FAFBFF",
      textPrimary: "#2D3748",
      textSecondary: "#718096",
      fontHeading: "'Quicksand', system-ui, sans-serif",
      fontBody: "'Nunito', system-ui, sans-serif",
      icon: "\u{1F476}",
      gradient: "linear-gradient(135deg, #B8D4E3 0%, #F2D7D9 50%, #C5E0B4 100%)",
      borderAccent: "#B8D4E3",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Baby Shower Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  graduation: {
    key: "graduation",
    label: "Graduation",
    theme: {
      primary: "#1A365D",
      secondary: "#EBF8FF",
      accent: "#D69E2E",
      background: "#F7FAFC",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Inter', system-ui, sans-serif",
      fontBody: "'Inter', system-ui, sans-serif",
      icon: "\u{1F393}",
      gradient: "linear-gradient(135deg, #1A365D 0%, #D69E2E 100%)",
      borderAccent: "#D69E2E",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Graduation Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  holiday_party: {
    key: "holiday_party",
    label: "Holiday Party",
    theme: {
      primary: "#C53030",
      secondary: "#F0FFF4",
      accent: "#276749",
      background: "#FFFBF0",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
      icon: "\u{1F384}",
      gradient: "linear-gradient(135deg, #C53030 0%, #276749 100%)",
      borderAccent: "#C53030",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Holiday Party Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  reunion: {
    key: "reunion",
    label: "Reunion",
    theme: {
      primary: "#744210",
      secondary: "#FFFFF0",
      accent: "#DD6B20",
      background: "#FFFFF0",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Georgia', serif",
      fontBody: "'Georgia', serif",
      icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
      gradient: "linear-gradient(135deg, #744210 0%, #DD6B20 100%)",
      borderAccent: "#DD6B20",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Reunion Proposal", celebrationKicker: "A celebration prepared with care" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  food_truck: {
    key: "food_truck",
    label: "Food Truck",
    theme: {
      primary: "#E53E3E",
      secondary: "#FFF5F5",
      accent: "#38A169",
      background: "#FFFFF0",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Poppins', system-ui, sans-serif",
      fontBody: "'Nunito', system-ui, sans-serif",
      icon: "\u{1F69A}",
      gradient: "linear-gradient(135deg, #E53E3E 0%, #38A169 100%)",
      borderAccent: "#E53E3E",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Food Truck Proposal", celebrationKicker: "Your event, handled" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  cocktail_party: {
    key: "cocktail_party",
    label: "Cocktail Party",
    theme: {
      primary: "#8E4585",
      secondary: "#FAF0F8",
      accent: "#D4AF37",
      background: "#FFF9F5",
      textPrimary: "#2D1810",
      textSecondary: "#6B5345",
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
      icon: "\u{1F378}",
      gradient: "linear-gradient(135deg, #8E4585 0%, #D4AF37 100%)",
      borderAccent: "#8E4585",
    },
    copy: { ...celebratoryPack, proposalKicker: "A Cocktail Party Proposal", celebrationKicker: "An evening prepared with care" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
  celebration: {
    key: "celebration",
    label: "Event",
    theme: {
      primary: "#8B7355",
      secondary: "#F5E6D3",
      accent: "#E28C0A",
      background: "#FBF6EA",
      textPrimary: "#1A202C",
      textSecondary: "#4A5568",
      fontHeading: "'Georgia', serif",
      fontBody: "'Georgia', serif",
      icon: "\u{1F37D}\uFE0F",
      gradient: "linear-gradient(135deg, #8B7355 0%, #E28C0A 100%)",
      borderAccent: "#8B7355",
    },
    copy: { ...celebratoryPack, proposalKicker: "An Event Proposal", celebrationKicker: "Your event, handled" },
    sections: celebratorySections,
    defaults: { whatsIncluded: neutralWhatsIncluded },
    pdfBranding: { palette: celebratoryPdfPalette },
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Aliases for non-canonical event-type strings the system has accumulated
 * over time (raw inquiry text, legacy DB values). Anything not listed here
 * falls back to the neutral "celebration" preset, but with the original input
 * preserved as the display label so unknown types still read naturally.
 */
const KEY_ALIASES: Record<string, EventTypeKey> = {
  other: "celebration",
};

function titleCaseFromKey(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize any user-supplied event-type string to a canonical key. */
export function normalizeEventTypeKey(eventType: string | null | undefined): EventTypeKey {
  if (!eventType) return "celebration";
  const k = eventType.toLowerCase().replace(/[\s-]+/g, "_");
  if (k in presets) return k as EventTypeKey;
  if (k in KEY_ALIASES) return KEY_ALIASES[k];
  return "celebration";
}

/**
 * Return the full preset for an event type. Unknown / missing types fall back
 * to the neutral "celebration" preset — never wedding by default. When the
 * input doesn't match a known key, the celebration preset is returned with
 * its label overridden to a title-cased version of the input, so a stored
 * value like "bar_mitzvah" still displays as "Bar Mitzvah" in the UI.
 */
export function getEventPreset(eventType: string | null | undefined): EventPreset {
  const key = normalizeEventTypeKey(eventType);
  const preset = presets[key];
  // Known key (or empty input) → return as-is.
  if (key !== "celebration" || !eventType) return preset;
  const normalized = eventType.toLowerCase().replace(/[\s-]+/g, "_");
  // Input was a known alias for celebration (e.g. "other") — keep canonical label.
  if (normalized in presets || normalized in KEY_ALIASES) return preset;
  // Unknown input → keep the celebration theme but preserve the user-visible name.
  return { ...preset, label: titleCaseFromKey(eventType) };
}

/** All available event-type keys, useful for admin pickers and tests. */
export function listEventTypeKeys(): EventTypeKey[] {
  return Object.keys(presets) as EventTypeKey[];
}
