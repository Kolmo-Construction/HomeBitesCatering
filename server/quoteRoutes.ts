import { Router, type Request, type Response } from "express";
import { db } from "./db";
import {
  venues,
  promoCodes,
  inquiries,
  inquiryInvites,
  menus,
  insertVenueSchema,
  insertPromoCodeSchema,
  insertInquirySchema,
} from "@shared/schema";
import { eq, desc, sql, and, ilike, isNull } from "drizzle-orm";
import { analyzeInquiry } from "./services/quoteAiService";
import { calculateQuotePricing, refreshMenuPricingCache } from "./utils/quotePricing";
import { calculateMenuMargin, calculateMenuMarginDetail } from "./utils/menuMargin";
import { calculateShoppingListForInquiry } from "./utils/shoppingList";
import { getEmailConfig } from "./utils/siteConfig";
import { sendEmailInBackground } from "./utils/email";
import { sendOwnerSmsInBackground } from "./services/smsService";
import { newInquiryOwnerSms } from "./utils/smsTemplates";
import { storage } from "./storage";
import {
  newInquiryCustomerAckEmail,
  newInquiryAdminEmail,
} from "./utils/emailTemplates";
import { buildProposalFromInquiry } from "./lib/proposalFromInquiry";

const router = Router();

// Sub-router for inquiry endpoints — mounted at /api/inquiries in index.ts.
// Paths inside are relative to that mount (e.g. "/" for list, "/:id" for one).
export const inquiryRouter = Router();

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

// Batch: margin analysis for ALL menus (dashboard summary)
router.get("/menus/margins", async (_req: Request, res: Response) => {
  try {
    const allMenus = await db
      .select({ id: menus.id, name: menus.name })
      .from(menus)
      .orderBy(menus.displayOrder, menus.name);
    const results = await Promise.all(
      allMenus.map(async (m) => ({
        menuId: m.id,
        menuName: m.name,
        tiers: await calculateMenuMargin(m.id),
      })),
    );
    return res.json(results);
  } catch (error) {
    console.error("Error calculating all menu margins:", error);
    return res.status(500).json({ message: "Failed to calculate menu margins" });
  }
});

// Drill-down: full breakdown for a single tier (categories + per-item recipe cost)
router.get("/menus/:id/margin/:tierKey", async (req: Request, res: Response) => {
  try {
    const menuId = parseInt(req.params.id);
    if (isNaN(menuId)) return res.status(400).json({ message: "Invalid menu ID" });
    const detail = await calculateMenuMarginDetail(menuId, req.params.tierKey);
    if (!detail) return res.status(404).json({ message: "Menu or tier not found" });
    return res.json(detail);
  } catch (error) {
    console.error("Error calculating menu margin detail:", error);
    return res.status(500).json({ message: "Failed to calculate menu margin detail" });
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

// Require an authenticated staff session. Returns the viewer's role, or sends a
// 401/403 response and returns null to the caller (caller should early-return).
// Falls back to a DB lookup if the role isn't cached in the session yet —
// needed for sessions created before the login handler started caching userRole.
async function requireStaffSession(req: Request, res: Response): Promise<string | null> {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  let role = req.session.userRole || "";
  if (!role) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        role = user.role;
        req.session.userRole = user.role;
      }
    } catch (err) {
      console.error("Failed to fetch user role for session:", err);
    }
  }
  if (role !== "admin" && role !== "user" && role !== "chef") {
    res.status(403).json({ message: "Insufficient permissions" });
    return null;
  }
  return role;
}

// Strip financial fields from a shopping list response for non-admin roles.
// Keeps labor HOURS (operational) and supplier/SKU/quantity info.
function sanitizeShoppingListForRole(list: any, role: string) {
  if (role === "admin") return list;

  const stripLine = (line: any) => ({ ...line, estimatedCost: undefined });
  const safe = {
    ...list,
    totalEstimatedCost: undefined,
    totalLaborCost: undefined,
    totalFullyLoadedCost: undefined,
    allLines: Array.isArray(list.allLines) ? list.allLines.map(stripLine) : list.allLines,
  };
  if (list.groupedByCategory && typeof list.groupedByCategory === "object") {
    safe.groupedByCategory = {};
    for (const [cat, lines] of Object.entries(list.groupedByCategory)) {
      safe.groupedByCategory[cat] = Array.isArray(lines) ? (lines as any[]).map(stripLine) : lines;
    }
  }
  return safe;
}

// Get aggregated shopping list for a specific quote request
// Returns all ingredients needed (scaled to guest count) grouped by category
inquiryRouter.get("/:id/shopping-list", async (req: Request, res: Response) => {
  try {
    const role = await requireStaffSession(req, res);
    if (!role) return;

    const inquiryId = parseInt(req.params.id);
    if (isNaN(inquiryId)) return res.status(400).json({ message: "Invalid quote request ID" });

    // Optional override for portion multiplier (e.g., ?multiplier=0.8)
    const multiplierParam = req.query.multiplier;
    const portionMultiplier = multiplierParam ? parseFloat(multiplierParam as string) : undefined;

    const shoppingList = await calculateShoppingListForInquiry(inquiryId, {
      portionMultiplier,
    });

    if (!shoppingList) return res.status(404).json({ message: "Quote request not found" });
    return res.json(sanitizeShoppingListForRole(shoppingList, role));
  } catch (error) {
    console.error("Error generating shopping list:", error);
    return res.status(500).json({ message: "Failed to generate shopping list" });
  }
});

// Get shopping list for an event (looks up the originating quote request via quote link)
router.get("/events/:id/shopping-list", async (req: Request, res: Response) => {
  try {
    const role = await requireStaffSession(req, res);
    if (!role) return;

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    // Find the event's quote, then find the originating quote request
    const { events } = await import("@shared/schema");
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!event.quoteId) {
      return res.status(404).json({
        message: "Event is not linked to an quote — cannot generate shopping list",
      });
    }

    // Find the quote request that was converted to this quote
    const [originatingQuote] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.quoteId, event.quoteId));

    if (!originatingQuote) {
      return res.status(404).json({
        message: "No original quote request found for this event — shopping list requires structured menu data",
      });
    }

    const multiplierParam = req.query.multiplier;
    const portionMultiplier = multiplierParam ? parseFloat(multiplierParam as string) : undefined;

    const shoppingList = await calculateShoppingListForInquiry(originatingQuote.id, {
      portionMultiplier,
    });

    if (!shoppingList) return res.status(404).json({ message: "Failed to generate shopping list" });
    return res.json(sanitizeShoppingListForRole(shoppingList, role));
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
inquiryRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { status, eventType } = req.query;
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(inquiries.status, status as any));
    }
    if (eventType && eventType !== "all") {
      conditions.push(eq(inquiries.eventType, eventType as string));
    }

    const requests = await db
      .select()
      .from(inquiries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inquiries.createdAt));

    return res.json(requests);
  } catch (error) {
    console.error("Error fetching quote requests:", error);
    return res.status(500).json({ message: "Failed to fetch quote requests" });
  }
});

// Get single quote request
inquiryRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const [request] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, parseInt(req.params.id)));
    if (!request) return res.status(404).json({ message: "Quote request not found" });
    return res.json(request);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch quote request" });
  }
});

// Submit a new quote request (PUBLIC — no auth required)
inquiryRouter.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = insertInquirySchema.safeParse(req.body);
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

    // If submission came from a Mike-initiated invite, resolve the invite row
    // so we can (a) link the resulting inquiry back, (b) inherit the invite's
    // clientId, and (c) mark the invite as submitted after insert.
    let matchedInvite: typeof inquiryInvites.$inferSelect | undefined;
    const inviteToken = typeof req.body.inviteToken === 'string' ? req.body.inviteToken : undefined;
    if (inviteToken) {
      const [row] = await db.select().from(inquiryInvites).where(eq(inquiryInvites.token, inviteToken));
      if (row && !row.submittedAt) matchedInvite = row;
    }

    const [request] = await db
      .insert(inquiries)
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
        ...(req.body.opportunityId ? { opportunityId: parseInt(req.body.opportunityId) } : {}),
      } as any)
      .returning();

    // Stamp the invite as submitted and link to the new inquiry row
    if (matchedInvite) {
      await db.update(inquiryInvites)
        .set({ submittedAt: new Date(), submittedInquiryId: request.id })
        .where(eq(inquiryInvites.id, matchedInvite.id));
    }

    // Fire-and-forget: run AI analysis in background, then try auto-quote
    analyzeInquiry(request)
      .then(async (analysis) => {
        await db
          .update(inquiries)
          .set({ aiAnalysis: analysis as any, updatedAt: new Date() })
          .where(eq(inquiries.id, request.id));
        console.log(`AI analysis completed for quote #${request.id}`);

        // Tier 1: Auto-Quote — if the request is standard, auto-create a draft quote.
        // Admin MUST review and send manually. Nothing goes to the customer automatically.
        try {
          await tryAutoQuote(request, analysis);
        } catch (autoErr) {
          console.warn(`Auto-quote evaluation failed for quote #${request.id}:`, autoErr);
        }
      })
      .catch((err) => console.error(`AI analysis failed for quote #${request.id}:`, err));

    // Fire customer auto-acknowledgment + admin notification.
    // Fire-and-forget — email latency doesn't block the customer's form submission.
    try {
      const emailCfg = getEmailConfig();

      // Customer ack
      const customerTemplate = newInquiryCustomerAckEmail({
        customerFirstName: request.firstName,
        eventType: request.eventType,
        eventDate: request.eventDate,
      });
      sendEmailInBackground({
        to: request.email,
        subject: customerTemplate.subject,
        html: customerTemplate.html,
        text: customerTemplate.text,
        templateKey: 'new_inquiry_customer_ack',
      });

      // Admin notification
      const adminInquiryUrl = `${emailCfg.publicBaseUrl}/inquiries?id=${request.id}`;
      const adminTemplate = newInquiryAdminEmail({
        customerName: `${request.firstName} ${request.lastName}`,
        customerEmail: request.email,
        customerPhone: request.phone,
        eventType: request.eventType,
        eventDate: request.eventDate,
        guestCount: request.guestCount,
        menuTheme: request.menuTheme,
        menuTier: request.menuTier,
        estimatedTotalCents: request.estimatedTotalCents,
        adminInquiryUrl,
      });
      sendEmailInBackground({
        to: emailCfg.adminNotificationEmail,
        subject: adminTemplate.subject,
        html: adminTemplate.html,
        text: adminTemplate.text,
        templateKey: 'new_inquiry_admin',
      });

      // Owner SMS alert (P0-1)
      sendOwnerSmsInBackground({
        ...newInquiryOwnerSms({
          firstName: request.firstName,
          lastName: request.lastName,
          eventType: request.eventType,
          guestCount: request.guestCount,
          eventDate: request.eventDate,
          source: request.source || 'quote_form',
          opportunityId: request.opportunityId,
        }),
        templateKey: 'new_inquiry_owner_alert',
        opportunityId: request.opportunityId ?? null,
      });
    } catch (notifyError) {
      console.warn('Failed to fire new-inquiry notifications:', notifyError);
    }

    return res.status(201).json(request);
  } catch (error) {
    console.error("Error creating quote request:", error);
    return res.status(500).json({ message: "Failed to submit quote request" });
  }
});

// Re-calculate pricing for an existing quote request (admin)
inquiryRouter.post("/:id/recalculate-pricing", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });

    if (request.menuTheme) {
      await refreshMenuPricingCache(request.menuTheme);
    }
    const pricing = calculateQuotePricing(request);
    const [updated] = await db
      .update(inquiries)
      .set({
        estimatedPerPersonCents: pricing.perPersonCents,
        estimatedSubtotalCents: pricing.subtotalCents,
        estimatedServiceFeeCents: pricing.serviceFeeCents,
        estimatedTaxCents: pricing.taxCents,
        estimatedTotalCents: pricing.totalCents,
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, id))
      .returning();

    return res.json({ ...updated, pricingBreakdown: pricing });
  } catch (error) {
    console.error("Error recalculating pricing:", error);
    return res.status(500).json({ message: "Failed to recalculate pricing" });
  }
});

// Re-run AI analysis on a quote request (admin)
inquiryRouter.post("/:id/analyze", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });

    const analysis = await analyzeInquiry(request);
    const [updated] = await db
      .update(inquiries)
      .set({ aiAnalysis: analysis as any, updatedAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning();

    return res.json(updated);
  } catch (error) {
    console.error("Error analyzing quote request:", error);
    return res.status(500).json({ message: "Failed to analyze quote request" });
  }
});

// Update quote request (admin — status changes, internal notes, AI analysis)
inquiryRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: any = { ...req.body, updatedAt: new Date() };

    // If converting, set timestamp
    if (req.body.status === "converted") {
      updateData.convertedAt = new Date();
    }

    const [updated] = await db
      .update(inquiries)
      .set(updateData)
      .where(eq(inquiries.id, id))
      .returning();

    if (!updated) return res.status(404).json({ message: "Quote request not found" });
    return res.json(updated);
  } catch (error) {
    console.error("Error updating quote request:", error);
    return res.status(500).json({ message: "Failed to update quote request" });
  }
});

// Convert quote request → Client + Opportunity + Quote (full pipeline)
inquiryRouter.post("/:id/convert", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });

    // Belt-and-suspenders guard: refuse if this inquiry has ANY downstream rows
    // already linked, regardless of the admin-editable status field. Previously we
    // only checked status === "converted", which could be defeated by flipping the
    // status dropdown back to "reviewing" in the admin UI — that produced duplicate
    // client/opportunity/quote rows on the second convert.
    if (request.status === "converted" || request.opportunityId || request.quoteId) {
      return res.status(400).json({
        message: "This inquiry has already been converted to a quote.",
        opportunityId: request.opportunityId,
        quoteId: request.quoteId,
      });
    }

    const { opportunities, clients, quotes } = await import("@shared/schema");

    // 1. Create or reuse client (dedup by email)
    const billingAddr = request.billingAddress as any;
    const [existingClient] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.email, request.email), isNull(clients.deletedAt)))
      .limit(1);

    const client = existingClient ?? (await db.insert(clients).values({
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
    }).returning())[0];

    // Auto-seed contact identifiers for matching engine
    if (!existingClient) {
      try {
        await storage.seedClientIdentifiers(client.id, client.email, client.phone);
      } catch (seedErr) {
        console.error('Warning: failed to seed identifiers for new client:', seedErr);
      }
    }

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
      // P2-3: propagate UTM attribution so reporting can break down booked
      // opportunities by campaign, not just by top-level source.
      utmSource: request.source || null,
      utmMedium: request.utmMedium || null,
      utmCampaign: request.utmCampaign || null,
      utmContent: request.utmContent || null,
      utmTerm: request.utmTerm || null,
      referrer: request.referrer || null,
      priority: "medium",
      clientId: client.id,
    } as any).returning();

    // 3. Build quote line items from structured quote data
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

    // 4. Create the quote
    const venueAddr = request.venueAddress as any;
    const [quote] = await db.insert(quotes).values({
      clientId: client.id,
      opportunityId: opportunity.id,
      eventType: request.eventType,
      eventDate: request.eventDate,
      guestCount: request.guestCount,
      // Fallback to the street address when no venue name was provided so
      // downstream pages (and the event record) don't end up with a blank
      // venue that renders as "TBD".
      venue: request.venueName || venueAddr?.street || undefined,
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

    // Build and persist the full customer-facing Proposal blob. This is the
    // single source of truth for the public quote page — everything the couple
    // sees is rendered from this field. Admin edits go through PATCH on the
    // quote and overwrite this blob directly.
    const proposal = await buildProposalFromInquiry(request, quote);
    const [quoteWithProposal] = await db
      .update(quotes)
      .set({ proposal: proposal as any, updatedAt: new Date() })
      .where(eq(quotes.id, quote.id))
      .returning();

    // 5. Update quote request with all links
    await db
      .update(inquiries)
      .set({
        status: "converted",
        opportunityId: opportunity.id,
        quoteId: quote.id,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, id));

    return res.json({
      client,
      opportunity,
      quote: quoteWithProposal,
      message: "Quote request converted: client, opportunity, and quote created",
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

// ─── Tier 1: Auto-Quote Draft Generation ─────────────────────────────────────
// Evaluates whether a submitted quote request is "standard" enough to auto-generate
// a draft quote. The quote is created with status="draft" and autoGenerated=true.
// Admin sees it in the quotes list, reviews it, and sends manually.
async function tryAutoQuote(request: any, analysis: any): Promise<void> {
  // Eligibility check — all must pass
  const complexity = analysis?.eventComplexityScore;
  const confidence = analysis?.pricingConfidence;
  const isStandardMenu = request.menuTheme && request.menuTheme !== 'custom';
  const hasReasonableGuestCount = request.guestCount && request.guestCount >= 20 && request.guestCount <= 150;
  const hasMinimalEquipment = !request.equipment || !(request.equipment as any)?.items?.length;

  if (!complexity || complexity > 4) {
    console.log(`Auto-quote skipped for quote #${request.id}: complexity ${complexity} > 4`);
    return;
  }
  if (!confidence || confidence < 0.85) {
    console.log(`Auto-quote skipped for quote #${request.id}: confidence ${confidence} < 0.85`);
    return;
  }
  if (!isStandardMenu) {
    console.log(`Auto-quote skipped for quote #${request.id}: custom menu`);
    return;
  }
  if (!hasReasonableGuestCount) {
    console.log(`Auto-quote skipped for quote #${request.id}: guest count ${request.guestCount} outside 20-150`);
    return;
  }

  // Already converted?
  if (request.quoteId || request.opportunityId) {
    console.log(`Auto-quote skipped for quote #${request.id}: already converted`);
    return;
  }

  console.log(`Auto-quote eligible for quote #${request.id} — generating draft...`);

  const { opportunities, clients, quotes } = await import("@shared/schema");

  // 1. Create or reuse client (dedup by email)
  const billingAddr = request.billingAddress as any;
  const [existingAutoClient] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.email, request.email), isNull(clients.deletedAt)))
    .limit(1);

  const client = existingAutoClient ?? (await db.insert(clients).values({
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
  }).returning())[0];

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
      `[Auto-generated from quote request #${request.id}]`,
    ].filter(Boolean).join("\n"),
    status: "qualified",
    opportunitySource: request.source || "website",
    // P2-3: UTM attribution on auto-quoted opportunities too
    utmSource: request.source || null,
    utmMedium: request.utmMedium || null,
    utmCampaign: request.utmCampaign || null,
    utmContent: request.utmContent || null,
    utmTerm: request.utmTerm || null,
    referrer: request.referrer || null,
    priority: "medium",
    clientId: client.id,
    statusChangedAt: new Date(),
  } as any).returning();

  // 3. Build line items (same logic as manual convert)
  const lineItems: Array<{ id: string; name: string; quantity: number; price: number }> = [];
  let itemCounter = 1;

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
        price: pricePerPerson,
      });
    }
  }

  const appetizers = (request.appetizers as any)?.selections || [];
  for (const app of appetizers) {
    lineItems.push({
      id: `item_${itemCounter++}`,
      name: `Appetizer: ${app.itemName}`,
      quantity: app.quantity || 1,
      price: Math.round((app.pricePerPiece || 0) * 100),
    });
  }

  const desserts = (request.desserts as any[]) || [];
  for (const d of desserts) {
    lineItems.push({
      id: `item_${itemCounter++}`,
      name: `Dessert: ${d.itemName}`,
      quantity: d.quantity || 1,
      price: Math.round((d.pricePerPiece || 0) * 100),
    });
  }

  // Calculate totals
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFeeRate = request.serviceStyle === 'full_service' ? 0.20 : 0.15;
  const serviceFeeCents = Math.round(subtotalCents * serviceFeeRate);
  const taxRate = 0.101;
  const taxCents = Math.round((subtotalCents + serviceFeeCents) * taxRate);
  const totalCents = subtotalCents + serviceFeeCents + taxCents;

  const discountPct = request.discountPercent ? parseFloat(request.discountPercent) / 100 : 0;
  const discountCents = Math.round(totalCents * discountPct);
  const finalTotalCents = totalCents - discountCents;

  if (serviceFeeCents > 0) {
    lineItems.push({ id: `item_${itemCounter++}`, name: `Service Fee (${Math.round(serviceFeeRate * 100)}%)`, quantity: 1, price: serviceFeeCents });
  }
  if (discountCents > 0) {
    lineItems.push({ id: `item_${itemCounter++}`, name: `Discount (${request.discountPercent}%)`, quantity: 1, price: -discountCents });
  }

  // 4. Create draft quote (autoGenerated = true)
  const venueAddr = request.venueAddress as any;
  const [quote] = await db.insert(quotes).values({
    clientId: client.id,
    opportunityId: opportunity.id,
    eventType: request.eventType,
    eventDate: request.eventDate,
    guestCount: request.guestCount,
    venue: request.venueName || venueAddr?.street || undefined,
    venueAddress: venueAddr?.street || undefined,
    venueCity: venueAddr?.city || undefined,
    venueZip: venueAddr?.zip || undefined,
    items: JSON.stringify(lineItems),
    subtotal: subtotalCents + serviceFeeCents - discountCents,
    tax: taxCents,
    total: finalTotalCents,
    status: "draft",
    autoGenerated: true,
    notes: [
      `[AUTO-GENERATED] Review before sending.`,
      request.specialRequests,
      request.menuTheme ? `Menu: ${formatThemeName(request.menuTheme)} - ${capitalize(request.menuTier || '')}` : null,
      request.serviceType ? `Service type: ${request.serviceType}` : null,
      request.serviceStyle ? `Service style: ${request.serviceStyle}` : null,
      (request.dietary as any)?.restrictions?.length ? `Dietary: ${(request.dietary as any).restrictions.join(', ')}` : null,
      (request.dietary as any)?.allergies?.length ? `Allergies: ${(request.dietary as any).allergies.join(', ')}` : null,
    ].filter(Boolean).join("\n"),
  }).returning();

  // Build proposal blob
  const proposal = await buildProposalFromInquiry(request, quote);
  await db.update(quotes)
    .set({ proposal: proposal as any, updatedAt: new Date() })
    .where(eq(quotes.id, quote.id));

  // 5. Link quote request to created records
  await db.update(inquiries)
    .set({
      status: "converted",
      opportunityId: opportunity.id,
      quoteId: quote.id,
      convertedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(inquiries.id, request.id));

  console.log(`Auto-quote generated: quote #${request.id} → client #${client.id}, opportunity #${opportunity.id}, quote #${quote.id} (DRAFT)`);
}

export default router;
