/**
 * Tier 3, Item 11: Event Theme System
 *
 * Each event type gets its own visual theme: colors, fonts, patterns, icons.
 * Used by PublicEventPage, ClientPortal, and PublicQuote.
 */

export interface EventTheme {
  key: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  fontHeading: string;
  fontBody: string;
  icon: string;  // emoji
  gradient: string; // CSS gradient for hero sections
  borderAccent: string;
}

const themes: Record<string, EventTheme> = {
  wedding: {
    key: "wedding",
    label: "Wedding",
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
  corporate: {
    key: "corporate",
    label: "Corporate",
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
  birthday: {
    key: "birthday",
    label: "Birthday",
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
  baby_shower: {
    key: "baby_shower",
    label: "Baby Shower",
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
  engagement: {
    key: "engagement",
    label: "Engagement",
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
  anniversary: {
    key: "anniversary",
    label: "Anniversary",
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
  graduation: {
    key: "graduation",
    label: "Graduation",
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
  holiday_party: {
    key: "holiday_party",
    label: "Holiday Party",
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
  fundraiser: {
    key: "fundraiser",
    label: "Fundraiser",
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
  reunion: {
    key: "reunion",
    label: "Reunion",
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
  food_truck: {
    key: "food_truck",
    label: "Food Truck",
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
  celebration: {
    key: "celebration",
    label: "Celebration",
    primary: "#D69E2E",
    secondary: "#FFFFF0",
    accent: "#ED8936",
    background: "#FFFAF0",
    textPrimary: "#1A202C",
    textSecondary: "#4A5568",
    fontHeading: "'Poppins', system-ui, sans-serif",
    fontBody: "'Nunito', system-ui, sans-serif",
    icon: "\u{1F389}",
    gradient: "linear-gradient(135deg, #D69E2E 0%, #ED8936 100%)",
    borderAccent: "#D69E2E",
  },
  conference: {
    key: "conference",
    label: "Conference",
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
  workshop: {
    key: "workshop",
    label: "Workshop",
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
};

// Elegant neutral fallback for any unrecognized event type
const defaultTheme: EventTheme = {
  key: "default",
  label: "Event",
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
};

export function getEventTheme(eventType: string | null | undefined): EventTheme {
  if (!eventType) return defaultTheme;
  const normalized = eventType.toLowerCase().replace(/[\s-]+/g, "_");
  return themes[normalized] || defaultTheme;
}

export function applyThemeCSS(theme: EventTheme): React.CSSProperties {
  return {
    "--theme-primary": theme.primary,
    "--theme-secondary": theme.secondary,
    "--theme-accent": theme.accent,
    "--theme-bg": theme.background,
    "--theme-text": theme.textPrimary,
    "--theme-text-secondary": theme.textSecondary,
    "--theme-heading-font": theme.fontHeading,
    "--theme-body-font": theme.fontBody,
    "--theme-gradient": theme.gradient,
    "--theme-border": theme.borderAccent,
  } as React.CSSProperties;
}

export { themes, defaultTheme };
