// Builds the customer-facing Proposal blob from a inquiry row plus an
// quote row. This is the ONE place that translates lead data into the
// customer-facing shape; used at conversion time AND as a fallback hydrator
// for legacy quotes that don't yet have quote.proposal populated.

import type { Proposal, ProposalLineItem, ProposalMenuItem } from "@shared/proposal";
import type { quotes, inquiries, MenuCategoryItem } from "@shared/schema";
import { menus } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

type InquiryRow = typeof inquiries.$inferSelect;
type QuoteRow = typeof quotes.$inferSelect;

/**
 * Build a case-insensitive name → description map across every category item
 * in a menu. Used to surface flavor copy for each selection the customer made.
 */
async function buildMenuDescriptionIndex(
  themeKey: string | null | undefined,
): Promise<Map<string, string>> {
  const idx = new Map<string, string>();
  if (!themeKey) return idx;
  const [menu] = await db.select().from(menus).where(eq(menus.themeKey, themeKey));
  if (!menu) return idx;
  const categoryItems = (menu.categoryItems as Record<string, MenuCategoryItem[]> | null) || {};
  for (const items of Object.values(categoryItems)) {
    for (const it of items || []) {
      if (it?.description && it.name) {
        idx.set(it.name.toLowerCase().trim(), it.description);
      }
    }
  }
  return idx;
}

// Coerce whatever is stored in quote.items (JSONB or JSON-stringified blob)
// into a clean ProposalLineItem[].
function coerceLineItems(raw: unknown): ProposalLineItem[] {
  if (!raw) return [];
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
    .map((it) => ({
      id: typeof it.id === "string" ? it.id : undefined,
      name: String(it.name ?? ""),
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
    }));
}

export async function buildProposalFromInquiry(
  q: InquiryRow,
  e: QuoteRow,
): Promise<Proposal> {
  const venueAddr = (q.venueAddress as any) || {};

  // Load descriptions from the menu catalog so customer-facing items carry
  // flavor copy when the admin has filled it in on the menu.
  const descIdx = await buildMenuDescriptionIndex(q.menuTheme);
  const lookupDescription = (name: string | null | undefined): string | undefined => {
    if (!name) return undefined;
    return descIdx.get(name.toLowerCase().trim());
  };

  const menuSelections = Array.isArray(q.menuSelections)
    ? ((q.menuSelections as any[]).map((sel) => {
        const name = String(sel.name ?? "");
        return {
          name,
          category: String(sel.category ?? "main"),
          description: lookupDescription(name),
        };
      }) as ProposalMenuItem[])
    : [];

  const appetizerSelections: Array<{ itemName?: string; quantity?: number }> =
    (q.appetizers as any)?.selections ?? [];
  const dessertItems: Array<{ itemName?: string; quantity?: number }> =
    (q.desserts as any) ?? [];
  const equipmentItems: Array<{ item?: string; quantity?: number }> =
    (q.equipment as any)?.items ?? [];

  return {
    version: 1,
    firstName: q.firstName || "",
    lastName: q.lastName || "",
    partnerFirstName: q.partnerFirstName ?? undefined,
    partnerLastName: q.partnerLastName ?? undefined,

    eventType: q.eventType || e.eventType,
    eventDate: q.eventDate
      ? new Date(q.eventDate).toISOString()
      : e.eventDate
      ? new Date(e.eventDate).toISOString()
      : null,
    guestCount: q.guestCount ?? e.guestCount ?? 0,

    venue: {
      name: q.venueName ?? e.venue ?? undefined,
      street: venueAddr.street ?? e.venueAddress ?? undefined,
      city: venueAddr.city ?? e.venueCity ?? undefined,
      state: venueAddr.state ?? e.venueState ?? undefined,
      zip: venueAddr.zip ?? e.venueZip ?? undefined,
    },

    hasCeremony: q.hasCeremony ?? undefined,
    ceremonyStartTime: q.ceremonyStartTime ?? null,
    ceremonyEndTime: q.ceremonyEndTime ?? null,
    hasCocktailHour: q.hasCocktailHour ?? undefined,
    cocktailStartTime: q.cocktailStartTime ?? null,
    cocktailEndTime: q.cocktailEndTime ?? null,
    hasMainMeal: q.hasMainMeal ?? undefined,
    mainMealStartTime: q.mainMealStartTime ?? null,
    mainMealEndTime: q.mainMealEndTime ?? null,
    serviceType: q.serviceType ?? null,
    serviceStyle: q.serviceStyle ?? null,

    menuTheme: q.menuTheme ?? null,
    menuTier: q.menuTier ?? null,
    menuSelections,
    appetizers: appetizerSelections.map((a) => {
      const itemName = String(a.itemName ?? "");
      return {
        itemName,
        quantity: Number(a.quantity) || 0,
        description: lookupDescription(itemName),
      };
    }),
    desserts: dessertItems.map((d) => {
      const itemName = String(d.itemName ?? "");
      return {
        itemName,
        quantity: Number(d.quantity) || 0,
        description: lookupDescription(itemName),
      };
    }),
    beverages: (q.beverages as any) ?? undefined,
    equipment: {
      items: equipmentItems.map((e) => ({
        item: String(e.item ?? ""),
        quantity: Number(e.quantity) || 1,
      })),
      otherNotes: (q.equipment as any)?.otherNotes ?? undefined,
    },
    dietary: (q.dietary as any) ?? undefined,

    specialRequests: q.specialRequests ?? null,

    lineItems: coerceLineItems(e.items),
    pricing: {
      perPersonCents: q.estimatedPerPersonCents ?? undefined,
      subtotalCents: e.subtotal,
      serviceFeeCents: q.estimatedServiceFeeCents ?? undefined,
      taxCents: e.tax,
      totalCents: e.total,
      depositPercent: 35,
    },

    customerNotes: e.notes ?? null,
  };
}

/**
 * Build a bare-bones Proposal from an quote alone, for quotes that have
 * no originating inquiry (manually-created quotes). The customer
 * still gets a coherent page, just without rich wedding details.
 */
export function buildProposalFromQuoteAlone(
  e: QuoteRow,
  client: { firstName?: string | null; lastName?: string | null } | null,
): Proposal {
  return {
    version: 1,
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    eventType: e.eventType,
    eventDate: e.eventDate ? new Date(e.eventDate).toISOString() : null,
    guestCount: e.guestCount ?? 0,
    venue: {
      name: e.venue ?? undefined,
      street: e.venueAddress ?? undefined,
      city: e.venueCity ?? undefined,
      state: e.venueState ?? undefined,
      zip: e.venueZip ?? undefined,
    },
    menuSelections: [],
    appetizers: [],
    desserts: [],
    lineItems: coerceLineItems(e.items),
    pricing: {
      subtotalCents: e.subtotal,
      taxCents: e.tax,
      totalCents: e.total,
      depositPercent: 35,
    },
    customerNotes: e.notes ?? null,
  };
}
