import { Router, type Request, type Response } from "express";
import { db } from "./db";
import {
  venues,
  promoCodes,
  quoteRequests,
  menus,
  insertVenueSchema,
  insertPromoCodeSchema,
  insertQuoteRequestSchema,
} from "@shared/schema";
import { eq, desc, sql, and, ilike } from "drizzle-orm";
import { analyzeQuoteRequest } from "./services/quoteAiService";
import { calculateQuotePricing, refreshMenuPricingCache } from "./utils/quotePricing";
import { calculateMenuMargin } from "./utils/menuMargin";
import { calculateShoppingListForQuoteRequest } from "./utils/shoppingList";

const router = Router();

// ============================================
// PUBLIC MENUS (for quote form)
// ============================================

// Returns all menus marked displayOnCustomerForm = true, with packages + category items
router.get("/menus/public", async (_req: Request, res: Response) => {
  try {
    const publicMenus = await db
      .select()
      .from(menus)
      .where(eq(menus.displayOnCustomerForm, true))
      .orderBy(menus.displayOrder, menus.name);
    return res.json(publicMenus);
  } catch (error) {
    console.error("Error fetching public menus:", error);
    return res.status(500).json({ message: "Failed to fetch public menus" });
  }
});

// Get margin analysis for a menu (admin — shows food cost percentages per tier)
router.get("/menus/:id/margin", async (req: Request, res: Response) => {
  try {
    const menuId = parseInt(req.params.id);
    if (isNaN(menuId)) return res.status(400).json({ message: "Invalid menu ID" });
    const analysis = await calculateMenuMargin(menuId);
    return res.json(analysis);
  } catch (error) {
    console.error("Error calculating menu margin:", error);
    return res.status(500).json({ message: "Failed to calculate menu margin" });
  }
});

// Get aggregated shopping list for a specific quote request
// Returns all ingredients needed (scaled to guest count) grouped by category
router.get("/quote-requests/:id/shopping-list", async (req: Request, res: Response) => {
  try {
    const quoteRequestId = parseInt(req.params.id);
    if (isNaN(quoteRequestId)) return res.status(400).json({ message: "Invalid quote request ID" });

    // Optional override for portion multiplier (e.g., ?multiplier=0.8)
    const multiplierParam = req.query.multiplier;
    const portionMultiplier = multiplierParam ? parseFloat(multiplierParam as string) : undefined;

    const shoppingList = await calculateShoppingListForQuoteRequest(quoteRequestId, {
      portionMultiplier,
    });

    if (!shoppingList) return res.status(404).json({ message: "Quote request not found" });
    return res.json(shoppingList);
  } catch (error) {
    console.error("Error generating shopping list:", error);
    return res.status(500).json({ message: "Failed to generate shopping list" });
  }
});

// Get shopping list for an event (looks up the originating quote request via estimate link)
router.get("/events/:id/shopping-list", async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    // Find the event's estimate, then find the originating quote request
    const { events } = await import("@shared/schema");
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!event.estimateId) {
      return res.status(404).json({
        message: "Event is not linked to an estimate — cannot generate shopping list",
      });
    }

    // Find the quote request that was converted to this estimate
    const [originatingQuote] = await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.estimateId, event.estimateId));

    if (!originatingQuote) {
      return res.status(404).json({
        message: "No original quote request found for this event — shopping list requires structured menu data",
      });
    }

    const multiplierParam = req.query.multiplier;
    const portionMultiplier = multiplierParam ? parseFloat(multiplierParam as string) : undefined;

    const shoppingList = await calculateShoppingListForQuoteRequest(originatingQuote.id, {
      portionMultiplier,
    });

    if (!shoppingList) return res.status(404).json({ message: "Failed to generate shopping list" });
    return res.json(shoppingList);
  } catch (error) {
    console.error("Error generating event shopping list:", error);
    return res.status(500).json({ message: "Failed to generate shopping list" });
  }
});

// ============================================
// VENUES
// ============================================

// List all active venues
router.get("/venues", async (_req: Request, res: Response) => {
  try {
    const allVenues = await db
      .select()
      .from(venues)
      .where(eq(venues.isActive, true))
      .orderBy(venues.name);
    return res.json(allVenues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    return res.status(500).json({ message: "Failed to fetch venues" });
  }
});

// Get single venue
router.get("/venues/:id", async (req: Request, res: Response) => {
  try {
    const [venue] = await db.select().from(venues).where(eq(venues.id, parseInt(req.params.id)));
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    return res.json(venue);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch venue" });
  }
});

// Create venue
router.post("/venues", async (req: Request, res: Response) => {
  try {
    const parsed = insertVenueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid venue data", errors: parsed.error.format() });

    const [venue] = await db.insert(venues).values(parsed.data).returning();
    return res.status(201).json(venue);
  } catch (error) {
    console.error("Error creating venue:", error);
    return res.status(500).json({ message: "Failed to create venue" });
  }
});

// Update venue
router.patch("/venues/:id", async (req: Request, res: Response) => {
  try {
    const [updated] = await db
      .update(venues)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(venues.id, parseInt(req.params.id)))
      .returning();
    if (!updated) return res.status(404).json({ message: "Venue not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update venue" });
  }
});

// ============================================
// PROMO CODES
// ============================================

// List promo codes
router.get("/promo-codes", async (_req: Request, res: Response) => {
  try {
    const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    return res.json(codes);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch promo codes" });
  }
});

// Validate a promo code (public endpoint — used by the quote form)
router.post("/promo-codes/validate", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });

    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase().trim()));

    if (!promo) return res.status(404).json({ message: "Invalid promo code" });
    if (!promo.isActive) return res.status(400).json({ message: "Promo code is no longer active" });
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      return res.status(400).json({ message: "Promo code has expired" });
    }
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return res.status(400).json({ message: "Promo code usage limit reached" });
    }

    return res.json({
      valid: true,
      id: promo.id,
      code: promo.code,
      discountPercent: promo.discountPercent,
      description: promo.description,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to validate promo code" });
  }
});

// Create promo code
router.post("/promo-codes", async (req: Request, res: Response) => {
  try {
    const data = { ...req.body, code: req.body.code?.toUpperCase().trim() };
    const parsed = insertPromoCodeSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ message: "Invalid promo code data", errors: parsed.error.format() });

    const [promo] = await db.insert(promoCodes).values({
      ...parsed.data,
      discountPercent: parsed.data.discountPercent.toString(),
    }).returning();
    return res.status(201).json(promo);
  } catch (error: any) {
    if (error?.code === '23505') return res.status(409).json({ message: "Promo code already exists" });
    return res.status(500).json({ message: "Failed to create promo code" });
  }
});

// ============================================
// QUOTE REQUESTS
// ============================================

// List quote requests (admin)
router.get("/quote-requests", async (req: Request, res: Response) => {
  try {
    const { status, eventType } = req.query;
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(quoteRequests.status, status as any));
    }
    if (eventType && eventType !== "all") {
      conditions.push(eq(quoteRequests.eventType, eventType as string));
    }

    const requests = await db
      .select()
      .from(quoteRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(quoteRequests.createdAt));

    return res.json(requests);
  } catch (error) {
    console.error("Error fetching quote requests:", error);
    return res.status(500).json({ message: "Failed to fetch quote requests" });
  }
});

// Get single quote request
router.get("/quote-requests/:id", async (req: Request, res: Response) => {
  try {
    const [request] = await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.id, parseInt(req.params.id)));
    if (!request) return res.status(404).json({ message: "Quote request not found" });
    return res.json(request);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch quote request" });
  }
});

// Submit a new quote request (PUBLIC — no auth required)
router.post("/quote-requests", async (req: Request, res: Response) => {
  try {
    const parsed = insertQuoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid quote request data",
        errors: parsed.error.format(),
      });
    }

    // If promo code used, increment usage
    if (parsed.data.promoCodeId) {
      await db
        .update(promoCodes)
        .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
        .where(eq(promoCodes.id, parsed.data.promoCodeId));
    }

    // Calculate pricing server-side (refresh menu cache first to use current DB prices)
    if (parsed.data.menuTheme) {
      await refreshMenuPricingCache(parsed.data.menuTheme);
    }
    const pricing = calculateQuotePricing(parsed.data);

    const [request] = await db
      .insert(quoteRequests)
      .values({
        ...parsed.data,
        discountPercent: parsed.data.discountPercent?.toString() ?? null,
        venueAddress: parsed.data.venueAddress as any,
        billingAddress: parsed.data.billingAddress as any,
        status: "submitted",
        submittedAt: new Date(),
        estimatedPerPersonCents: pricing.perPersonCents,
        estimatedSubtotalCents: pricing.subtotalCents,
        estimatedServiceFeeCents: pricing.serviceFeeCents,
        estimatedTaxCents: pricing.taxCents,
        estimatedTotalCents: pricing.totalCents,
      } as any)
      .returning();

    // Fire-and-forget: run AI analysis in background
    analyzeQuoteRequest(request)
      .then(async (analysis) => {
        await db
          .update(quoteRequests)
          .set({ aiAnalysis: analysis as any, updatedAt: new Date() })
          .where(eq(quoteRequests.id, request.id));
        console.log(`AI analysis completed for quote #${request.id}`);
      })
      .catch((err) => console.error(`AI analysis failed for quote #${request.id}:`, err));

    return res.status(201).json(request);
  } catch (error) {
    console.error("Error creating quote request:", error);
    return res.status(500).json({ message: "Failed to submit quote request" });
  }
});

// Re-calculate pricing for an existing quote request (admin)
router.post("/quote-requests/:id/recalculate-pricing", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });

    if (request.menuTheme) {
      await refreshMenuPricingCache(request.menuTheme);
    }
    const pricing = calculateQuotePricing(request);
    const [updated] = await db
      .update(quoteRequests)
      .set({
        estimatedPerPersonCents: pricing.perPersonCents,
        estimatedSubtotalCents: pricing.subtotalCents,
        estimatedServiceFeeCents: pricing.serviceFeeCents,
        estimatedTaxCents: pricing.taxCents,
        estimatedTotalCents: pricing.totalCents,
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id))
      .returning();

    return res.json({ ...updated, pricingBreakdown: pricing });
  } catch (error) {
    console.error("Error recalculating pricing:", error);
    return res.status(500).json({ message: "Failed to recalculate pricing" });
  }
});

// Re-run AI analysis on a quote request (admin)
router.post("/quote-requests/:id/analyze", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });

    const analysis = await analyzeQuoteRequest(request);
    const [updated] = await db
      .update(quoteRequests)
      .set({ aiAnalysis: analysis as any, updatedAt: new Date() })
      .where(eq(quoteRequests.id, id))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Error analyzing quote request:", error);
    return res.status(500).json({ message: "Failed to analyze quote request" });
  }
});

// Update quote request (admin — status changes, internal notes, AI analysis)
router.patch("/quote-requests/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: any = { ...req.body, updatedAt: new Date() };

    // If converting, set timestamp
    if (req.body.status === "converted") {
      updateData.convertedAt = new Date();
    }

    const [updated] = await db
      .update(quoteRequests)
      .set(updateData)
      .where(eq(quoteRequests.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Quote request not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error updating quote request:", error);
    return res.status(500).json({ message: "Failed to update quote request" });
  }
});

// Convert quote request → Client + Opportunity + Estimate (full pipeline)
router.post("/quote-requests/:id/convert", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });
    if (request.status === "converted") return res.status(400).json({ message: "Already converted" });

    const { opportunities, clients, estimates } = await import("@shared/schema");

    // 1. Create client as PROSPECT (graduates to 'customer' when they accept the estimate)
    const billingAddr = request.billingAddress as any;
    const [client] = await db.insert(clients).values({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone || undefined,
      company: request.companyName || undefined,
      address: billingAddr?.street || undefined,
      city: billingAddr?.city || undefined,
      state: billingAddr?.state || undefined,
      zip: billingAddr?.zip || undefined,
      type: 'prospect',
    }).returning();

    // 2. Create opportunity
    const [opportunity] = await db.insert(opportunities).values({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone || undefined,
      eventType: request.eventType,
      eventDate: request.eventDate,
      guestCount: request.guestCount,
      venue: request.venueName || undefined,
      notes: [
        request.specialRequests,
        request.menuTheme ? `Menu: ${request.menuTheme} (${request.menuTier})` : null,
        request.serviceType ? `Service: ${request.serviceType}` : null,
      ].filter(Boolean).join("\n"),
      status: "qualified",
      opportunitySource: request.source || "website",
      priority: "medium",
      clientId: client.id,
    }).returning();

    // 3. Build estimate line items from structured quote data
    const lineItems: Array<{ id: string; name: string; quantity: number; price: number }> = [];
    let itemCounter = 1;

    // Per-person food cost from menu tier
    if (request.menuTheme && request.menuTier && request.guestCount) {
      const tierPrices: Record<string, Record<string, number>> = {
        taco_fiesta: { bronze: 2800, silver: 3400, gold: 4000, diamond: 4600 },
        bbq: { bronze: 3200, silver: 3800, gold: 4600, diamond: 5400 },
        greece: { bronze: 3200, silver: 3800, gold: 4600, diamond: 5900 },
        kebab: { bronze: 3500, silver: 3900, gold: 4900, diamond: 6300 },
        italy: { bronze: 3200, silver: 3800, gold: 4600, diamond: 5800 },
        vegan: { bronze: 3400, silver: 4000, gold: 4600, diamond: 5400 },
      };
      const pricePerPerson = tierPrices[request.menuTheme]?.[request.menuTier] || 0;
      if (pricePerPerson > 0) {
        lineItems.push({
          id: `item_${itemCounter++}`,
          name: `${formatThemeName(request.menuTheme)} - ${capitalize(request.menuTier)} Package (${request.guestCount} guests)`,
          quantity: request.guestCount,
          price: pricePerPerson, // cents
        });
      }
    }

    // Appetizers
    const appetizers = (request.appetizers as any)?.selections || [];
    for (const app of appetizers) {
      lineItems.push({
        id: `item_${itemCounter++}`,
        name: `Appetizer: ${app.itemName}`,
        quantity: app.quantity || 1,
        price: Math.round((app.pricePerPiece || 0) * 100),
      });
    }

    // Desserts
    const desserts = (request.desserts as any[]) || [];
    for (const d of desserts) {
      lineItems.push({
        id: `item_${itemCounter++}`,
        name: `Dessert: ${d.itemName}`,
        quantity: d.quantity || 1,
        price: Math.round((d.pricePerPiece || 0) * 100),
      });
    }

    // Equipment
    const equipmentItems = (request.equipment as any)?.items || [];
    for (const e of equipmentItems) {
      lineItems.push({
        id: `item_${itemCounter++}`,
        name: `Rental: ${e.item}`,
        quantity: e.quantity || 1,
        price: Math.round((e.pricePerUnit || 0) * 100),
      });
    }

    // Calculate totals
    const subtotalCents = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const serviceFeeRate = request.serviceStyle === 'full_service' ? 0.20 : 0.15;
    const serviceFeeCents = Math.round(subtotalCents * serviceFeeRate);
    const taxRate = 0.101; // Default WA tax rate
    const taxCents = Math.round((subtotalCents + serviceFeeCents) * taxRate);
    const totalCents = subtotalCents + serviceFeeCents + taxCents;

    // Apply discount
    const discountPct = request.discountPercent ? parseFloat(request.discountPercent) / 100 : 0;
    const discountCents = Math.round(totalCents * discountPct);
    const finalTotalCents = totalCents - discountCents;

    // Add service fee as a line item
    if (serviceFeeCents > 0) {
      lineItems.push({
        id: `item_${itemCounter++}`,
        name: `Service Fee (${Math.round(serviceFeeRate * 100)}%)`,
        quantity: 1,
        price: serviceFeeCents,
      });
    }

    // Add discount as negative line item
    if (discountCents > 0) {
      lineItems.push({
        id: `item_${itemCounter++}`,
        name: `Discount (${request.discountPercent}%)`,
        quantity: 1,
        price: -discountCents,
      });
    }

    // 4. Create the estimate
    const venueAddr = request.venueAddress as any;
    const [estimate] = await db.insert(estimates).values({
      clientId: client.id,
      eventType: request.eventType,
      eventDate: request.eventDate,
      guestCount: request.guestCount,
      venue: request.venueName || undefined,
      venueAddress: venueAddr?.street || undefined,
      venueCity: venueAddr?.city || undefined,
      venueZip: venueAddr?.zip || undefined,
      items: JSON.stringify(lineItems),
      subtotal: subtotalCents + serviceFeeCents - discountCents,
      tax: taxCents,
      total: finalTotalCents,
      status: "draft",
      notes: [
        request.specialRequests,
        request.menuTheme ? `Menu: ${formatThemeName(request.menuTheme)} - ${capitalize(request.menuTier || '')}` : null,
        request.serviceType ? `Service type: ${request.serviceType}` : null,
        request.serviceStyle ? `Service style: ${request.serviceStyle}` : null,
        (request.dietary as any)?.restrictions?.length ? `Dietary: ${(request.dietary as any).restrictions.join(', ')}` : null,
        (request.dietary as any)?.allergies?.length ? `Allergies: ${(request.dietary as any).allergies.join(', ')}` : null,
      ].filter(Boolean).join("\n"),
    }).returning();

    // 5. Update quote request with all links
    await db
      .update(quoteRequests)
      .set({
        status: "converted",
        opportunityId: opportunity.id,
        estimateId: estimate.id,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id));

    return res.json({
      client,
      opportunity,
      estimate,
      message: "Quote request converted: client, opportunity, and estimate created",
    });
  } catch (error) {
    console.error("Error converting quote request:", error);
    return res.status(500).json({ message: "Failed to convert quote request" });
  }
});

function formatThemeName(theme: string): string {
  const names: Record<string, string> = {
    taco_fiesta: "Taco Fiesta",
    bbq: "American BBQ",
    greece: "Taste of Greece",
    kebab: "Kebab Party",
    italy: "Taste of Italy",
    vegan: "Vegan Menu",
    custom: "Custom Menu",
  };
  return names[theme] || theme;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default router;
