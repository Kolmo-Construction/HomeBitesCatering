import type { Inquiry, InsertInquiry, MenuPackageTier, MenuCategoryItem } from "@shared/schema";
import { db } from "../db";
import { menus } from "@shared/schema";
import { eq } from "drizzle-orm";

// In-memory cache of tier prices by theme key — refreshed from DB on demand
// This lets the pricing calculator stay synchronous while still reading from the database.
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

/**
 * Get tier price (cents) for a theme + tier, using the cache if fresh.
 * Returns null if the theme/tier isn't found.
 */
function getCachedTierPrice(themeKey: string, tierKey: string): number | null {
  const cached = menuCache.get(themeKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.tierPricesCents[tierKey] ?? null;
}

/**
 * Get category items for a theme (used to resolve upcharges).
 */
function getCachedCategoryItems(themeKey: string): Record<string, MenuCategoryItem[]> | null {
  const cached = menuCache.get(themeKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return null;
  return cached.categoryItems;
}

const WA_DEFAULT_TAX_RATE = 0.101;

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
 * Reads tier prices from the menu cache (call refreshMenuPricingCache first).
 */
export function calculateQuotePricing(
  quote: InsertInquiry | Inquiry
): PricingBreakdown {
  const guestCount = quote.guestCount || 0;

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

  // 2. Appetizers
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

  // 4. Beverages — rough quote based on type
  const beverages = quote.beverages as any;
  let beverageSubtotalCents = 0;
  if (beverages?.hasAlcoholic && beverages.bartendingType && beverages.bartendingDurationHours) {
    const drinkingGuests = beverages.drinkingGuestCount || guestCount;
    const hours = beverages.bartendingDurationHours || 4;
    // Base rates (cents per person per hour)
    const baseRates: Record<string, number> = {
      wet_hire: 595, // $5.95/hr/person includes beer/wine + 2 cocktails
      dry_hire: 150, // $1.50/hr/person for bartender only
    };
    const rate = baseRates[beverages.bartendingType] || 300;
    // Liquor quality multiplier
    const qualityMultiplier: Record<string, number> = {
      well: 1.0,
      mid_shelf: 1.25,
      top_shelf: 1.6,
    };
    const multiplier = beverages.liquorQuality ? qualityMultiplier[beverages.liquorQuality] || 1 : 1;
    beverageSubtotalCents = Math.round(rate * drinkingGuests * hours * multiplier);
  }
  if (beverages?.tableWaterService) {
    beverageSubtotalCents += 650 * guestCount; // $6.50/pp
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

  // 7. Service fee (20% for full service, 15% otherwise)
  const serviceFeeRate = quote.serviceStyle === "full_service" ? 0.2 : 0.15;
  const serviceFeeCents = Math.round(subtotalCents * serviceFeeRate);

  // 8. Discount
  const discountPct = quote.discountPercent ? parseFloat(String(quote.discountPercent)) / 100 : 0;
  const discountCents = Math.round((subtotalCents + serviceFeeCents) * discountPct);

  // 9. Tax (WA default 10.1%)
  const preTaxCents = subtotalCents + serviceFeeCents - discountCents;
  const taxCents = Math.round(preTaxCents * WA_DEFAULT_TAX_RATE);

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
