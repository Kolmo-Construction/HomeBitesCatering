import { Router, type Request, type Response } from "express";
import { db } from "./db";
import {
  venues,
  promoCodes,
  quoteRequests,
  insertVenueSchema,
  insertPromoCodeSchema,
  insertQuoteRequestSchema,
} from "@shared/schema";
import { eq, desc, sql, and, ilike } from "drizzle-orm";

const router = Router();

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

    const [request] = await db
      .insert(quoteRequests)
      .values({
        ...parsed.data,
        discountPercent: parsed.data.discountPercent?.toString() ?? null,
        venueAddress: parsed.data.venueAddress as any,
        billingAddress: parsed.data.billingAddress as any,
        status: "submitted",
        submittedAt: new Date(),
      } as any)
      .returning();

    return res.status(201).json(request);
  } catch (error) {
    console.error("Error creating quote request:", error);
    return res.status(500).json({ message: "Failed to submit quote request" });
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

// Convert quote request to opportunity
router.post("/quote-requests/:id/convert", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
    if (!request) return res.status(404).json({ message: "Quote request not found" });

    // Import opportunities table dynamically to avoid circular deps
    const { opportunities } = await import("@shared/schema");

    // Create opportunity from quote request data
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
    }).returning();

    // Link quote request to opportunity
    await db
      .update(quoteRequests)
      .set({
        status: "converted",
        opportunityId: opportunity.id,
        convertedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quoteRequests.id, id));

    return res.json({ opportunity, message: "Quote request converted to opportunity" });
  } catch (error) {
    console.error("Error converting quote request:", error);
    return res.status(500).json({ message: "Failed to convert quote request" });
  }
});

export default router;
