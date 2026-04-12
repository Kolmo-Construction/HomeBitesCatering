# HomeBites Quote System — Architecture & Roadmap

## What's Built

The HomeBites catering app now has an end-to-end quote pipeline that replaces the external JotForm with a fully-integrated system:

```
┌──────────────────────┐         ┌──────────────────────┐
│   Customer flow      │         │    Admin flow        │
├──────────────────────┤         ├──────────────────────┤
│                      │         │                      │
│  /request-quote      │         │  /quote-requests     │
│  (public, 8 steps)   │         │  (inbox + AI view)   │
│         │            │         │         │            │
│         ▼            │         │         ▼            │
│  quote_requests ─────┼─────────┼─→ Review + convert   │
│  table (structured)  │         │         │            │
│         │            │         │         ▼            │
│         ▼            │         │  /menus              │
│  AI analysis runs    │         │  (tier editor)       │
│  in background       │         │         │            │
│         │            │         │         ▼            │
│         ▼            │         │  /estimates          │
│  aiAnalysis JSONB    │         │  (pre-filled quote)  │
│  populated           │         │         │            │
│                      │         │         ▼            │
└──────────────────────┘         │  Send → Client       │
                                 │  accepts → Event     │
                                 └──────────────────────┘
```

---

## Key Components

### 1. Public Quote Form (`/request-quote`)

**File:** `client/src/pages/RequestQuote.tsx`

An 8-step multi-page form replacing the JotForm:

1. **Contact & Event** — referral source, promo code validation, event type, name/email/phone, date, guest count, times
2. **Venue** — venue dropdown (25 pre-loaded Seattle venues from the database), address auto-fill, kitchen facilities, ceremony timing for weddings
3. **Service Style** — buffet / plated / family-style / cocktail / breakfast / sandwich / food truck / kids party, cocktail hour and main meal timing
4. **Menu** — theme cards (from database), tier cards with per-person pricing, **item selection per category** with real-time upcharges
5. **Appetizers & Desserts** — 8 appetizer categories with lot-size selectors, dessert catalog
6. **Beverages & Bar** — alcoholic/non-alcoholic, dry vs wet hire, liquor quality, bar equipment
7. **Equipment & Dietary** — linens/serving ware/furniture rentals, dietary restrictions, allergies
8. **Review & Submit** — full summary, live pricing breakdown, decision timeline, referral needs

**Improvements over the JotForm:**
- 8 steps vs 44 pages (progressive disclosure, not field dump)
- Real-time pricing sidebar visible from step 4 onward
- Live promo code validation against the database
- Venue auto-fill from a queryable database
- Structured data output (every selection maps to a database entity)
- Logo and branding on the form header

### 2. Admin Quote Inbox (`/quote-requests`)

**File:** `client/src/pages/QuoteRequests.tsx`

Two-panel layout for managing incoming quote requests:

**Left panel** — filterable list of quote requests (All / New / Reviewing / Quoted / Converted / Archived), with AI complexity score dots (green/yellow/red).

**Right panel** — full detail view of the selected quote:
- **AI Analysis card** with complexity score, prep hours, staff count, margin estimate, pricing confidence progress bar, auto-generated sales notes, suggested upsells, suggested alternatives. Runs automatically on submission, can be re-triggered manually.
- **Event Details card** — type, date, time, guest count, venue, ceremony
- **Service & Menu card** — service type, menu theme/tier, selected items grouped by category with upcharges
- **Extras card** — appetizers, desserts, beverages, equipment with quantities
- **Dietary & Notes card** — restrictions, allergies, editable internal notes
- **Pricing Summary** — per-person, subtotal, service fee, tax, total
- **Convert button** — one-click conversion creating a Client + Opportunity + pre-filled Estimate

### 3. Admin Menu Management (`/menus`)

**File:** `client/src/pages/menus.tsx` + `client/src/components/menu/MenuPackageEditor.tsx`

The existing menus tab is extended with:
- **Tier count** column showing how many packages each menu has
- **On Quote Form** toggle — controls whether a menu appears on `/request-quote`
- **Settings (⚙️) icon** — opens the MenuPackageEditor dialog

**MenuPackageEditor** is a modal with two tabs:

**Tiers tab:**
- Create/edit/delete Bronze/Silver/Gold/Diamond (or any custom tier)
- Set per-person price in cents (displayed as dollars)
- Set minimum guest count (e.g., Bronze requires 50+)
- Define selection limits per category (e.g., Silver BBQ = 4 proteins, 3 sides, 2 salads, 3 condiments, 2 sauces)
- **Food cost % badge** (when recipes are linked) showing margin health:
  - 🟢 Excellent (< 25%)
  - 🟢 Healthy (25-32%)
  - 🟡 Tight (32-40%)
  - 🔴 Unhealthy (> 40%)

**Item Catalog tab:**
- Add/remove categories (protein, side, salad, salsa, condiment, sauce, spread, pasta, etc.)
- Add/remove items per category with name and per-person upcharge
- Items can optionally link to recipes (`recipeId`) for real food cost calculation

### 4. AI Quote Analysis Service

**File:** `server/services/quoteAiService.ts`

Runs automatically when a quote request is submitted (fire-and-forget background task). Uses OpenRouter with the same model cascade as the existing lead analysis:
1. **DeepSeek V3** (primary, free)
2. **Gemini 2.0 Flash** (fallback)
3. **Claude 3 Haiku** (final fallback)

Returns a structured `QuoteAiAnalysis` object stored in `quote_requests.aiAnalysis`:

```typescript
{
  eventComplexityScore: number,        // 1-10
  estimatedPrepHours: number,
  recommendedStaffCount: number,
  suggestedUpsells: [{item, reason, estimatedValue}],
  suggestedAlternatives: [{original, suggestion, reason}],
  pricingConfidence: number,           // 0-1
  marginEstimate: number,              // % food cost
  autoGeneratedNotes: string,          // sales team briefing
  analyzedAt: string,                  // ISO timestamp
}
```

**Phase 3 enhancement:** when the selected menu has recipes linked to its category items, the AI receives real margin data from the database (food cost %, margin/person, linked vs unlinked items), so its recommendations are grounded in actual costs.

### 5. Pricing Engine

**File:** `server/utils/quotePricing.ts`

Server-side pricing calculation that runs on every quote submission and re-calculation:

```
Food subtotal     = tier price × guest count + sum of item upcharges × guest count
Appetizer total   = sum of (price per piece × lot size)
Dessert total     = sum of (price per piece × lot size)
Beverage estimate = (rate × drinking guests × hours × quality multiplier) + table water
Equipment total   = sum of (price per unit × quantity)
─────────────────
Subtotal          = food + appetizers + desserts + beverages + equipment
Service fee       = subtotal × (15% standard, 20% full service)
Discount          = (subtotal + fee) × promo %
Tax               = (subtotal + fee - discount) × 10.1% (WA default)
─────────────────
TOTAL             = subtotal + fee - discount + tax
```

Tier prices are read from the `menus` table via a 60-second in-memory cache, so admin price changes propagate automatically.

### 6. Margin Analysis

**File:** `server/utils/menuMargin.ts`

For each tier of a menu, calculates:
1. **Estimated food cost per person** — uses `calculateIngredientCost` from linked recipes
2. **Food cost %** — estimated cost / tier price
3. **Margin per person** — tier price - food cost
4. **Status** — excellent / healthy / tight / unhealthy
5. **Linked item count** — how many category items have real recipes attached
6. **Unlinked item count** — items missing recipe links (not yet counted in cost)

Exposed via `GET /api/quotes/menus/:id/margin`.

---

## Database Schema

### New Tables

| Table | Purpose |
|-------|---------|
| `venues` | 25 pre-loaded Seattle-area venues with addresses, contacts, kitchen facilities |
| `promo_codes` | Discount codes (KNOT0525 = 5%, SUNHB15 = 15%, FRIHB10 = 10%) with usage tracking |
| `quote_requests` | Structured customer quote submissions with AI analysis and pricing |

### Extended Tables

**`menus`** gained these columns:
- `themeKey` (text) — slug for the quote form to reference (e.g., `taco_fiesta`, `bbq`)
- `packages` (jsonb) — array of `MenuPackageTier` objects with prices and limits
- `categoryItems` (jsonb) — `Record<category, MenuCategoryItem[]>` for the item catalog
- `displayOrder` (int) — ordering on the quote form

---

## Admin Workflow

### When a New Quote Comes In

1. **Customer submits** `/request-quote` → quote lands in `quote_requests` table
2. **AI analyzes** the request in the background (5-15 seconds)
3. **Admin sees** a new entry in **Quote Requests** inbox with AI insights
4. **Admin reviews** the AI complexity score, margin estimate, upsell suggestions, and sales briefing
5. **Admin decides:**
   - Needs more info? → Mark as "reviewing", add internal notes, reach out to customer
   - Ready to quote? → Click **"Convert to Estimate"**
6. **Conversion creates**:
   - New **Client** in the clients table
   - New **Opportunity** in the sales pipeline (status: "qualified")
   - New **Estimate** with all line items pre-filled from the quote data
7. **Admin edits** the estimate in the Quotes tab, refines pricing if needed, then sends to client
8. **Client accepts** via the client portal → event gets created

### When a Menu Changes

1. Go to **Menus** → find the theme to update
2. Click the **⚙️ Settings** icon → **MenuPackageEditor** opens
3. **Tiers tab**: update prices, selection limits, or add a new tier
4. **Item Catalog tab**: add new items, remove discontinued ones, update upcharges
5. Click **Save** → changes propagate to the customer quote form within 60 seconds
6. Any future quotes will use the new prices automatically

### When Ingredient Prices Change

1. Go to **Base Ingredients** → update purchase prices
2. If category items are linked to recipes → margin % automatically recalculates
3. Watch the margin badges in the MenuPackageEditor for red/yellow warnings
4. Raise tier prices to maintain target food cost (28-32%)

---

## API Reference

### Public (no auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/quotes/menus/public` | Menus with `displayOnCustomerForm=true` |
| `GET` | `/api/quotes/venues` | Active venues |
| `POST` | `/api/quotes/promo-codes/validate` | Validate a promo code |
| `POST` | `/api/quotes/quote-requests` | Submit a new quote request |

### Admin (authenticated)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/quotes/quote-requests` | List all quote requests |
| `GET` | `/api/quotes/quote-requests/:id` | Single quote request |
| `PATCH` | `/api/quotes/quote-requests/:id` | Update status, internal notes |
| `POST` | `/api/quotes/quote-requests/:id/analyze` | Re-run AI analysis |
| `POST` | `/api/quotes/quote-requests/:id/recalculate-pricing` | Re-calculate pricing from current DB |
| `POST` | `/api/quotes/quote-requests/:id/convert` | Convert to Client + Opportunity + Estimate |
| `GET` | `/api/quotes/menus/:id/margin` | Food cost margin breakdown per tier |

---

## What's Next

The quote system is functional end-to-end, but here are the logical next steps in order of impact:

### Priority 1 — Close the Revenue Loop

These finish the journey from "customer accepts quote" to "money in the bank":

1. **Estimate-to-Invoice conversion**
   - New `invoices` table linked to estimates
   - Generate invoice when an estimate is accepted
   - Due dates, payment terms, status (draft/sent/paid/overdue/partial)

2. **Payment tracking**
   - New `payments` table for recording deposits and balances
   - 35% deposit workflow (HomeBites's standard)
   - Partial payment support

3. **PDF proposal generation**
   - Generate a branded PDF from an estimate
   - Include menu selections, pricing breakdown, terms
   - Attach to emails sent to clients

4. **Estimate email sending**
   - The Gmail API already handles reading — add sending
   - Canned templates: initial response, estimate follow-up, booking confirmation
   - Merge fields for client name, event date, menu, etc.

5. **Stripe/Square integration**
   - Accept online deposit payments directly from estimate email
   - Auto-update estimate status when deposit is received

### Priority 2 — Stop Leads Going Cold

6. **Follow-up reminders & tasks**
   - When a quote hasn't been responded to in X days, flag it
   - When an estimate was sent but not viewed/accepted after Y days, surface it
   - Task-based workflow tied to opportunities

7. **Automated status transitions**
   - Accept estimate → auto-create event
   - Record deposit → auto-confirm event
   - Reduce manual data entry

8. **Daily digest email**
   - Morning briefing: new quote requests, estimates sent, estimates expiring soon, upcoming events

### Priority 3 — Operational Prep (Event Execution)

9. **Event prep sheets**
   - For a confirmed event, generate:
     - Shopping list (aggregate ingredients × guest count across all menu items)
     - Prep timeline
     - Staff assignments
     - Equipment checklist
   - The recipe/ingredient data already exists — this is pure aggregation

10. **Equipment rental inventory**
    - Track rental equipment stock
    - Check availability when creating events
    - Flag conflicts

11. **Travel fee calculator**
    - Auto-calculate surcharge for venues >10 miles from 1005 Terrace St
    - OpenRouteService API already in env vars — just needs wiring

### Priority 4 — Client Experience

12. **Client portal**
    - Clients already have a `client` role — build them a dashboard
    - View event details, menu selections, estimate/invoice status
    - Accept/decline estimates directly (endpoint exists but UI is partial)
    - Message the catering team

13. **Interactive menu customization**
    - Let clients browse and customize their menu package within tier limits
    - Same UI as the public quote form, but tied to their specific estimate
    - Feed changes back as estimate revisions

### Priority 5 — Intelligence & Reporting

14. **Revenue dashboard**
    - Total booked revenue, pipeline value, average deal size
    - Conversion rates (lead → quote → estimate → booking)
    - Seasonal trends

15. **Food cost reporting**
    - Actual food cost % per event (after ingredient costs drift)
    - Flag events where margin is thin
    - Show which menu items drive the most margin

16. **Recipe linking UI**
    - Currently, menu items need to be linked to recipes manually by editing JSON
    - Build a dropdown in MenuPackageEditor to pick from existing recipes
    - When linked, margin badges light up automatically

17. **AI-powered upsell automation**
    - Phase C of AI is already in place — extend it to suggest add-ons on conversion
    - Auto-draft a follow-up email with the upsells the AI recommended

### Priority 6 — Polish

18. **Split food truck menu** — the JotForm had a separate food truck menu with its own items (burgers, wraps, sides). Currently, food truck events fall back to the custom menu flow.

19. **Breakfast/brunch menu** — the JotForm had Grab-and-Go, Continental, American, and Full Monty breakfast flows. Not yet ported.

20. **Sandwich factory menu** — similar story; currently falls back to custom.

21. **Multi-language support** — some Seattle clients prefer Spanish; the form is English-only.

22. **Email templates management** — admin UI to edit the canned email templates without touching code.

---

## Recommended Starting Point

**Priority 1, items 1-3.** The biggest gap today is: once an admin converts a quote request to an estimate and the client accepts, nothing automates the rest. Mike still has to manually generate an invoice, collect a deposit, and track payments in a spreadsheet or QuickBooks.

Closing that loop would:
- Save hours per booking
- Eliminate missed deposits
- Give a clean revenue dashboard
- Set up the foundation for Stripe/Square later

Each of those three pieces is ~1-2 days of focused work.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite + shadcn/ui + TanStack Query + wouter + react-hook-form
- **Backend:** Express + Drizzle ORM + PostgreSQL (Neon)
- **Hosting:** Railway (auto-deploy on push to main once GitHub integration is connected)
- **AI:** OpenRouter with DeepSeek → Gemini → Claude fallback cascade
- **File storage:** GCP Cloud Storage (email archival)
- **Email sync:** Gmail API

## File Map

```
shared/schema.ts                         All table definitions + types
server/
  quoteRoutes.ts                         Quote requests, venues, promo codes, margin endpoint
  services/
    quoteAiService.ts                    Claude-powered quote analysis
    aiService.ts                         Existing lead analysis (for reference)
  utils/
    quotePricing.ts                      Server-side pricing calculation with DB cache
    menuMargin.ts                        Food cost margin calculation from recipes
client/src/
  pages/
    RequestQuote.tsx                     Public 8-step quote form
    QuoteRequests.tsx                    Admin inbox with AI panel
    menus.tsx                            Admin menus list (tier count, toggle, edit)
  components/
    menu/
      MenuPackageEditor.tsx              Tier/item editor modal with margin display
scripts/
  migrate-quote-tables.mjs               Initial quote system migration
  migrate-menu-packages.mjs              Menu package column migration
  seed-venues-promos.mjs                 Seed venues and promo codes
  seed-menu-themes.mjs                   Seed 6 themes with tiers and items
```
