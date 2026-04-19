import type {
  Inquiry,
  InsertInquiry,
  MenuPackageTier,
  MenuCategoryItem,
  PricingConfig,
} from "@shared/schema";
import { db } from "../db";
import { menus, pricingConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// In-memory cache of menu tier prices by theme key
// ---------------------------------------------------------------------------
interface CachedMenu {
  tierPricesCents: Record<string, number>;      // tierKey -> price
  categoryItems: Record<string, MenuCategoryItem[]>;
  fetchedAt: number;
}
const menuCache = new Map<string, CachedMenu>();
const CACHE_TTL_MS = 60_000; // 1 minute — admin edits propagate within a minute

/**
 * Fetch and cache menu tier pricing from the database.
 * Call this before calculateQuotePricing to ensure prices are current.
 */
export async function refreshMenuPricingCache(themeKey?: string): Promise<void> {
  const results = themeKey
    ? await db.select().from(menus).where(eq(menus.themeKey, themeKey))
    : await db.select().from(menus);

  for (const menu of results) {
    if (!menu.themeKey) continue;
    const packages = (menu.packages as MenuPackageTier[]) || [];
    const tierPricesCents: Record<string, number> = {};
    for (const pkg of packages) {
      tierPricesCents[pkg.tierKey] = pkg.pricePerPersonCents;
    }
    menuCache.set(menu.themeKey, {
      tierPricesCents,
      categoryItems: (menu.categoryItems as Record<string, MenuCategoryItem[]>) || {},
      fetchedAt: Date.now(),
    });
  }
}

function getCachedTierPrice(themeKey: string, tierKey: string): number | null {
  const cached = menuCache.get(themeKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.tierPricesCents[tierKey] ?? null;
}

function getCachedCategoryItems(themeKey: string): Record<string, MenuCategoryItem[]> | null {
  const cached = menuCache.get(themeKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.categoryItems;
}

// ---------------------------------------------------------------------------
// Pricing config cache (single-row table holding beverage rates, service-fee
// tiers, tax rate). Admin edits propagate within the cache TTL.
// Defaults below mirror the DB column defaults, so the calculator keeps
// working even if refreshPricingConfigCache hasn't run yet.
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  wetHireRateCentsPerHour: 1500,
  dryHireRateCentsPerHour: 800,
  liquorMultiplierWell: 100,
  liquorMultiplierMidShelf: 125,
  liquorMultiplierTopShelf: 150,
  nonAlcoholicPackageCents: 500,
  coffeeTeaServiceCents: 400,
  tableWaterServiceCents: 650,
  glasswareCents: 200,
  serviceFeeDropOffBps: 0,
  serviceFeeStandardBps: 1500,
  serviceFeeFullServiceNoSetupBps: 1750,
  serviceFeeFullServiceBps: 2000,
  taxRateBps: 1025,
};
type ConfigShape = typeof DEFAULT_CONFIG;

let pricingConfigCache: { config: ConfigShape; fetchedAt: number } | null = null;

export async function refreshPricingConfigCache(): Promise<void> {
  const [row] = await db.select().from(pricingConfig).limit(1);
  if (row) {
    pricingConfigCache = {
      config: {
        wetHireRateCentsPerHour: row.wetHireRateCentsPerHour,
        dryHireRateCentsPerHour: row.dryHireRateCentsPerHour,
        liquorMultiplierWell: row.liquorMultiplierWell,
        liquorMultiplierMidShelf: row.liquorMultiplierMidShelf,
        liquorMultiplierTopShelf: row.liquorMultiplierTopShelf,
        nonAlcoholicPackageCents: row.nonAlcoholicPackageCents,
        coffeeTeaServiceCents: row.coffeeTeaServiceCents,
        tableWaterServiceCents: row.tableWaterServiceCents,
        glasswareCents: row.glasswareCents,
        serviceFeeDropOffBps: row.serviceFeeDropOffBps,
        serviceFeeStandardBps: row.serviceFeeStandardBps,
        serviceFeeFullServiceNoSetupBps: row.serviceFeeFullServiceNoSetupBps,
        serviceFeeFullServiceBps: row.serviceFeeFullServiceBps,
        taxRateBps: row.taxRateBps,
      },
      fetchedAt: Date.now(),
    };
  }
}

function getPricingConfig(): ConfigShape {
  if (pricingConfigCache && Date.now() - pricingConfigCache.fetchedAt <= CACHE_TTL_MS) {
    return pricingConfigCache.config;
  }
  return DEFAULT_CONFIG;
}

export interface PricingBreakdown {
  perPersonCents: number;
  foodSubtotalCents: number;
  appetizerSubtotalCents: number;
  dessertSubtotalCents: number;
  beverageSubtotalCents: number;
  equipmentSubtotalCents: number;
  subtotalCents: number;
  serviceFeeCents: number;
  serviceFeeRate: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Calculate the full pricing breakdown for a quote request.
 * Reads tier prices from the menu cache (call refreshMenuPricingCache first)
 * and beverage/service/tax rates from pricing_config (call
 * refreshPricingConfigCache first for live values — otherwise defaults apply).
 */
export function calculateQuotePricing(
  quote: InsertInquiry | Inquiry
): PricingBreakdown {
  const guestCount = quote.guestCount || 0;
  const cfg = getPricingConfig();

  // 1. Food cost from menu tier — read from database cache
  let perPersonCents = 0;
  if (quote.menuTheme && quote.menuTier) {
    perPersonCents = getCachedTierPrice(quote.menuTheme, quote.menuTier) || 0;

    // Add per-person upcharges from selected items
    const selections = (quote.menuSelections as any[]) || [];
    const categoryItems = getCachedCategoryItems(quote.menuTheme);
    if (categoryItems) {
      for (const sel of selections) {
        const items = categoryItems[sel.category] || [];
        const match = items.find((i) => i.id === sel.itemId || i.name === sel.name);
        if (match?.upchargeCents) {
          perPersonCents += match.upchargeCents;
        }
      }
    }
  }
  const foodSubtotalCents = perPersonCents * guestCount;

  // 2. Appetizers — use pre-computed subtotal from payload if provided,
  //    otherwise fall back to pricePerPiece × quantity. Subtotals from the
  //    form are already in dollars; multiply by 100 for cents.
  const appetizers = (quote.appetizers as any)?.selections || [];
  const appetizerSubtotalCents = appetizers.reduce((sum: number, a: any) => {
    const subtotalDollars = a.subtotal ?? (a.pricePerPiece || 0) * (a.quantity || 0);
    return sum + Math.round(subtotalDollars * 100);
  }, 0);

  // 3. Desserts
  const desserts = (quote.desserts as any[]) || [];
  const dessertSubtotalCents = desserts.reduce((sum: number, d: any) => {
    const subtotalDollars = d.subtotal ?? (d.pricePerPiece || 0) * (d.quantity || 0);
    return sum + Math.round(subtotalDollars * 100);
  }, 0);

  // 4. Beverages — rates come from pricing_config
  const beverages = quote.beverages as any;
  let beverageSubtotalCents = 0;
  if (beverages?.hasNonAlcoholic) {
    beverageSubtotalCents += cfg.nonAlcoholicPackageCents * guestCount;
  }
  if (
    beverages?.hasAlcoholic &&
    beverages.bartendingType &&
    beverages.bartendingDurationHours
  ) {
    const drinkingGuests = beverages.drinkingGuestCount ?? guestCount;
    const hours = beverages.bartendingDurationHours || 4;
    const baseRate =
      beverages.bartendingType === "wet_hire"
        ? cfg.wetHireRateCentsPerHour
        : cfg.dryHireRateCentsPerHour;
    // Multipliers stored × 100 (100 = 1.0×, 150 = 1.5×)
    let multiplierX100 = cfg.liquorMultiplierWell;
    if (beverages.liquorQuality === "mid_shelf") multiplierX100 = cfg.liquorMultiplierMidShelf;
    else if (beverages.liquorQuality === "top_shelf") multiplierX100 = cfg.liquorMultiplierTopShelf;
    beverageSubtotalCents += Math.round(
      (baseRate * drinkingGuests * hours * multiplierX100) / 100
    );
  }
  if (beverages?.tableWaterService) {
    beverageSubtotalCents += cfg.tableWaterServiceCents * guestCount;
  }
  if (beverages?.coffeeTeaService) {
    beverageSubtotalCents += cfg.coffeeTeaServiceCents * guestCount;
  }
  if (beverages?.glassware) {
    beverageSubtotalCents += cfg.glasswareCents * guestCount;
  }

  // 5. Equipment
  const equipmentItems = (quote.equipment as any)?.items || [];
  const equipmentSubtotalCents = equipmentItems.reduce((sum: number, e: any) => {
    const subtotalDollars = e.subtotal ?? (e.pricePerUnit || 0) * (e.quantity || 0);
    return sum + Math.round(subtotalDollars * 100);
  }, 0);

  // 6. Subtotal
  const subtotalCents =
    foodSubtotalCents +
    appetizerSubtotalCents +
    dessertSubtotalCents +
    beverageSubtotalCents +
    equipmentSubtotalCents;

  // 7. Service fee by service style — rates come from pricing_config (bps)
  let serviceFeeBps = cfg.serviceFeeStandardBps;
  if (quote.serviceStyle === "drop_off") serviceFeeBps = cfg.serviceFeeDropOffBps;
  else if (quote.serviceStyle === "full_service_no_setup")
    serviceFeeBps = cfg.serviceFeeFullServiceNoSetupBps;
  else if (quote.serviceStyle === "full_service")
    serviceFeeBps = cfg.serviceFeeFullServiceBps;
  const serviceFeeRate = serviceFeeBps / 10000;
  const serviceFeeCents = Math.round(subtotalCents * serviceFeeRate);

  // 8. Discount
  const discountPct = quote.discountPercent ? parseFloat(String(quote.discountPercent)) / 100 : 0;
  const discountCents = Math.round((subtotalCents + serviceFeeCents) * discountPct);

  // 9. Tax (WA default 10.25% — configurable)
  const preTaxCents = subtotalCents + serviceFeeCents - discountCents;
  const taxRate = cfg.taxRateBps / 10000;
  const taxCents = Math.round(preTaxCents * taxRate);

  // 10. Total
  const totalCents = preTaxCents + taxCents;

  return {
    perPersonCents,
    foodSubtotalCents,
    appetizerSubtotalCents,
    dessertSubtotalCents,
    beverageSubtotalCents,
    equipmentSubtotalCents,
    subtotalCents,
    serviceFeeCents,
    serviceFeeRate,
    discountCents,
    taxCents,
    totalCents,
  };
}
