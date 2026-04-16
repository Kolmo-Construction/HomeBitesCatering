# Sales Funnel Audit & Modernization Plan

**Date:** 2026-04-15
**Scope:** Leads → Opportunities → Inquiries → Quotes → Clients → Events

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Gap Analysis by Stage](#gap-analysis-by-stage)
3. [Cross-Cutting Gaps](#cross-cutting-gaps)
4. [Modernization Roadmap (16 Items)](#modernization-roadmap)
   - [Tier 1: High Impact — Reduce Manual Work](#tier-1-high-impact--reduce-manual-work)
   - [Tier 2: Better Visibility & Tracking](#tier-2-better-visibility--tracking)
   - [Tier 3: Revenue & Client Experience](#tier-3-revenue--client-experience)
   - [Tier 4: Data Integrity & Developer Experience](#tier-4-data-integrity--developer-experience)

---

## Current Architecture

| # | Stage | DB Table | Route | Statuses | Key Files |
|---|-------|----------|-------|----------|-----------|
| 1 | **Leads** | `rawLeads` | `/raw-leads` | new, under_review, qualified, disqualified, archived, junk, parsing_failed, needs_manual_review | `pages/rawLeadsPage.tsx`, `shared/schema.ts:785-829` |
| 2 | **Opportunities** | `opportunities` | `/opportunities` | new, contacted, qualified, proposal, booked, archived | `pages/OpportunityDetailPage.tsx`, `shared/schema.ts:138-160` |
| 3 | **Inquiries** | `quoteRequests` | `/quote-requests` | draft, submitted, reviewing, quoted, converted, disqualified, expired, archived | `pages/QuoteRequests.tsx`, `server/quoteRoutes.ts` |
| 4 | **Quotes** | `estimates` | `/estimates` | draft, sent, viewed, accepted, declined | `pages/estimates.tsx`, `components/quote/QuoteProposalView.tsx` |
| 5 | **Clients** | `clients` | `/clients` | prospect, customer | `pages/clients.tsx`, `components/clients/ClientForm.tsx` |
| 6 | **Events** | `events` | `/events` | confirmed, in-progress, completed, cancelled | `pages/Events.tsx`, `pages/PublicEventPage.tsx` |

### Current Flow Diagram

```
Email / Web Form / Manual Entry
        │
        ▼
   ┌─────────┐   manual    ┌──────────────┐  send inquiry  ┌───────────┐
   │  Leads   │ ─────────► │ Opportunities │ ─────────────► │ Inquiries │
   │ rawLeads │  promote    │ opportunities │   (email link) │ quoteReqs │
   └─────────┘              └──────────────┘                └───────────┘
                                                                  │
                                                        manual "Convert"
                                                                  │
                                                                  ▼
   ┌─────────┐  auto on    ┌─────────┐  auto on accept   ┌───────────┐
   │  Events  │ ◄────────  │ Clients │  ◄──────────────── │  Quotes   │
   │  events  │  estimate   │ clients │   creates client   │ estimates │
   └─────────┘  accepted    └─────────┘   + estimate       └───────────┘
```

---

## Gap Analysis by Stage

### Stage 1 → 2: Leads → Opportunities

| Gap | Detail | Impact |
|-----|--------|--------|
| **Duplicate data model** | `rawLeads` and `opportunities` both represent "a person interested in catering." Converting a raw lead copies data into a new opportunity row — no live link between them. | Stale data, manual effort, two places to look for the same person. |
| **No automated promotion** | AI scores leads (urgency, budget, clarity) but never auto-promotes. Always requires a manual click. | High-scoring leads wait in queue alongside spam. |
| **No duplicate detection** | Two emails from the same person create two raw leads. No merge or dedup logic. | Fragmented history, double outreach, embarrassing to the customer. |
| **No assignment routing** | New opportunities land with `assignedTo: null`. No round-robin, territory, or capacity-based assignment. | Leads sit unowned. Slower response time. |

### Stage 2 → 3: Opportunities → Inquiries

| Gap | Detail | Impact |
|-----|--------|--------|
| **No automated follow-up** | If inquiry is sent (`inquirySentAt`) but not opened (`inquiryViewedAt` is null) after 48h, nothing happens. No reminder email, no alert. | Deals go cold. The salesperson must manually check each opportunity's inquiry status. |
| **No re-send tracking** | "Send Inquiry" generates a new token each time. No UI to see send history or how many times you've pinged. | No way to know if you already followed up, risk of over-pinging. |
| **Multiple overlapping public forms** | 4 customer-facing forms: `PublicInquiryForm`, `PublicEventInquiryPage`, `RequestQuote`, `ComprehensiveWeddingInquiry`. Inconsistent data capture. | Customer confusion, maintenance burden, inconsistent data. |
| **No lightweight "question" path** | The flow is one-directional: fill out full form or nothing. No way for a customer to ask a quick question first. | Potential customers who aren't ready for a full form drop off entirely. |

### Stage 3 → 4: Inquiries → Quotes

| Gap | Detail | Impact |
|-----|--------|--------|
| **Heavy manual conversion** | Converting a quote request into an estimate requires clicking "Convert," which creates 3 records (Client + Opportunity + Estimate) at once. Then the proposal must be edited before sending. | Slow turnaround. Staff bottleneck on straightforward requests. |
| **No auto-quote for standard requests** | System has server-side pricing + AI analysis but never auto-generates an estimate. | Standard requests (e.g., silver tier, 50 guests, standard menu) wait for the same manual process as complex custom events. |
| **No customer-side editing** | Once submitted, the customer cannot revise their quote request (change guest count, swap menu items). They must call/email, and staff edits manually. | Friction for the customer, extra work for staff, risk of miscommunication. |
| **AI analysis underutilized** | AI runs on submission (event complexity, margin estimate, upsell suggestions) but results aren't surfaced prominently or used to prioritize the review queue. | High-margin opportunities don't get prioritized. Upsell suggestions are buried. |
| **No SLA tracking** | No timer showing "this inquiry has been waiting X days for a quote." No alerts when response time exceeds a target. | No accountability on response times. Inquiries can sit for days unnoticed. |

### Stage 4 → 5: Quotes → Clients

| Gap | Detail | Impact |
|-----|--------|--------|
| **No quote versioning** | Editing a quote overwrites the `proposal` JSONB. No revision history, no diff, no "v1 was $5,000, v2 was $4,200." | Can't see negotiation history. Can't roll back a mistake. Customer disputes are he-said-she-said. |
| **No PDF generation** | Quotes are shared as web links only. The `viewToken` approach is good for tracking, but many clients need a downloadable PDF. | Corporate clients need PDFs for internal approval chains. Venue coordinators expect a PDF on file. |
| **No expiry enforcement** | `expiresAt` exists on the estimates table but nothing happens when it passes. No auto-expire status change, no "expiring soon" email. | Stale quotes accumulate in "sent" status indefinitely. Menu pricing drifts but old quotes stay valid. |
| **No deposit/payment collection** | Proposal shows 35% deposit but there's no way to collect it. No Square checkout, no payment status. | Acceptance doesn't mean commitment. Manual deposit collection is slow and error-prone. |
| **Thin client profile** | Client record: name, email, phone, company, address, notes. No dietary preferences, no event history dashboard, no lifetime value, no preferred menu themes. | Repeat customers start from scratch every time. No personalized service. |

### Stage 5 → 6: Clients → Events

| Gap | Detail | Impact |
|-----|--------|--------|
| **No staff assignment** | The checklist has "staff_assigned" as a checkbox, but there's no actual staff scheduling model. Can't assign Chef A, Server B, Driver C. | No visibility into who is working which event. Scheduling conflicts are invisible. |
| **No financial tracking on events** | Events have no payment fields. To see "deposit paid, balance $3,200 due," you must navigate back to the estimate. | Kitchen/ops team can't see payment status. No single view of event financials. |
| **No run-of-show timeline** | Events have start/end time but no detailed timeline (setup 3pm, cocktails 5pm, dinner 6:30pm, breakdown 9pm). Checklist is binary, not time-bound. | Day-of execution relies on memory or external docs. New staff can't self-orient. |
| **Communication gap** | Events page says "Email & call history — coming soon." Communications exist on opportunities/clients but aren't surfaced in the event view. | During event prep, the team can't see prior customer conversations without leaving the event page. |

---

## Cross-Cutting Gaps

| # | Gap | Detail |
|---|-----|--------|
| 1 | **No pipeline/kanban view** | Every stage is a flat list or table. No visual board showing deals moving through stages with drag-and-drop. |
| 2 | **No conversion metrics** | Dashboard shows counts (active opportunities, pending estimates) but not rates (what % of opportunities become booked events?). |
| 3 | **No time-in-stage tracking** | No way to answer "how long do opportunities sit in 'contacted'?" No aging reports. |
| 4 | **No automated inter-stage reminders** | If an opportunity hasn't moved in 7 days, no one is alerted. Deals go cold silently across every stage. |
| 5 | **Fragmented contact timeline** | A person's journey spans `rawLeads`, `opportunities`, `quoteRequests`, `clients`, and `events` with separate communication queries for each. No unified view. |
| 6 | **Status enum inconsistency** | Opportunities use free `text("status")` while raw leads and quote requests use proper `pgEnum`. The opportunity form even shows statuses (`negotiation`, `won`, `lost`) that the schema doesn't define. |
| 7 | **No bulk actions** | Can't bulk-archive stale opportunities, bulk-reassign leads, or bulk-send follow-ups. |
| 8 | **No email sequences/drip campaigns** | Every touchpoint is manual. No automated "Day 1: intro → Day 3: follow-up → Day 7: last chance" sequences. |

---

## Modernization Roadmap

### Tier 1: High Impact — Reduce Manual Work

---

#### 1. Merge Leads + Opportunities Into One Stage

**Problem:** Raw leads and opportunities are the same concept at different maturity levels, stored in two tables with a manual copy-paste conversion step. This creates stale data, duplicate records, and wasted clicks.

**Current state:**
- `rawLeads` table: AI-parsed incoming emails/forms. Statuses: new → under_review → qualified → promoted.
- `opportunities` table: Manually created from raw leads or entered directly. Statuses: new → contacted → qualified → proposal → booked → archived.
- Conversion copies fields from raw lead to a new opportunity row. No live link.

**Proposed change:**
- Unify into a single `opportunities` table with an expanded status enum:
  ```
  raw → qualified → contacted → proposal → booked → archived → disqualified → junk
  ```
- AI scoring, email parsing, and source tracking become fields on the opportunity (they already partially are).
- The "Leads" sidebar tab becomes a filtered view of opportunities with `status = raw` or `status = qualified`.
- The "Opportunities" tab shows everything from `contacted` onward.
- Eliminate the manual "promote to opportunity" step entirely — qualifying a lead is just a status change.

**Affected files:**
- `shared/schema.ts` — Merge `rawLeads` fields into `opportunities`, create proper `pgEnum` for status.
- `server/routes.ts` — Consolidate `/api/raw-leads` and `/api/opportunities` endpoints.
- `server/storage.ts` — Merge storage methods.
- `client/src/pages/rawLeadsPage.tsx` — Becomes a filtered view of opportunities.
- `client/src/components/layout/Sidebar.tsx` — "Leads" links to opportunities filtered by early statuses.
- Migration script to move existing `rawLeads` rows into `opportunities`.

**Acceptance criteria:**
- [ ] Single `opportunities` table with unified status enum.
- [ ] "Leads" sidebar tab shows opportunities in `raw`/`qualified` statuses.
- [ ] "Opportunities" tab shows `contacted` and beyond.
- [ ] AI scoring, email parsing fields preserved as opportunity fields.
- [ ] No data loss from existing raw leads.
- [ ] Existing opportunity workflows (send inquiry, status changes) unaffected.

---

#### 2. Auto-Follow-Up Engine

**Problem:** After sending an inquiry or quote, the system tracks open/view timestamps but never acts on them. Stalled deals rot in silence because no one is automatically reminded.

**Current state:**
- Opportunities track: `inquirySentAt`, `inquiryViewedAt`.
- Estimates track: `sentAt`, `viewedAt`, `expiresAt`.
- No scheduled jobs or triggers that act on these timestamps.
- The only automated emails are: inquiry invitation, quote request acknowledgment, quote sent, and event reminders.

**Proposed change:**
- Add a daily cron job (similar to the existing `event-reminders` cron) that scans for stalled items:

| Trigger | Condition | Action |
|---------|-----------|--------|
| Inquiry not opened | `inquirySentAt` > 48h ago, `inquiryViewedAt` is null | Send reminder email to customer, create internal alert |
| Inquiry opened but not submitted | `inquiryViewedAt` > 72h ago, no linked `quoteRequest` | Send "still interested?" email, alert salesperson |
| Quote not viewed | `estimate.sentAt` > 48h ago, `viewedAt` is null | Send reminder email, alert salesperson |
| Quote viewed but no action | `estimate.viewedAt` > 5 days ago, status still `viewed` | Send "any questions?" email, alert salesperson |
| Quote expiring soon | `estimate.expiresAt` within 3 days | Send "expiring soon" email to customer |
| Opportunity stale | No status change in 7+ days, status not `booked`/`archived` | Alert assigned salesperson |

- Add `lastFollowUpAt` field to prevent over-pinging (minimum 48h between automated emails).
- All automated emails should be deduped via `completedTasks` pattern (like event reminders).
- Admin setting to enable/disable and configure thresholds.

**Affected files:**
- `server/routes.ts` — New cron endpoint `POST /api/cron/follow-up-engine`.
- `server/utils/emailTemplates.ts` — New templates for each follow-up type.
- `shared/schema.ts` — Add `lastFollowUpAt` to opportunities and estimates.
- `client/src/pages/dashboard.tsx` — Show "stalled deals" alert card.
- `client/src/pages/OpportunityDetailPage.tsx` — Show follow-up history in the inquiry status tracker.

**Acceptance criteria:**
- [ ] Cron job runs daily, idempotent (safe to call multiple times).
- [ ] Customer receives maximum one automated follow-up per 48h window.
- [ ] Salesperson sees internal alerts for stalled opportunities on dashboard.
- [ ] Follow-up emails are trackable (logged in communications table).
- [ ] Admin can disable automated follow-ups globally or per-opportunity.

---

#### 3. Auto-Quote for Standard Requests

**Problem:** Every quote request — even straightforward ones — requires manual conversion (create client, create estimate, build proposal, send). For standard menu selections with typical guest counts, this is 15-20 minutes of staff time that could be zero.

**Current state:**
- Server-side pricing calculation exists (`server/utils/quotePricing.ts`).
- AI analysis provides complexity score, margin estimate, and confidence level.
- Proposal builder exists (`server/lib/proposalFromQuoteRequest.ts`).
- All the pieces for auto-quoting exist but aren't wired together.

**Proposed change:**
- After a quote request is submitted and AI analysis completes, evaluate auto-quote eligibility:
  ```
  Eligible if ALL of:
    - eventComplexityScore ≤ 4 (out of 10)
    - pricingConfidence ≥ 0.85
    - Standard menu theme (not "custom")
    - Guest count between 20 and 150
    - No equipment rentals requiring external vendor
    - No custom dietary accommodations beyond standard options
  ```
- If eligible: auto-create Client (prospect) + Estimate (draft) + build Proposal.
- Set estimate status to `draft` (not `sent`) so staff can review before it goes out.
- Flag the estimate with `autoGenerated: true` for visibility.
- Notify staff: "Auto-quote generated for [Name]'s [event type] — review and send."
- Staff clicks "Send" after a quick review, or edits first.

**Affected files:**
- `server/quoteRoutes.ts` — Add auto-quote logic after AI analysis completes.
- `server/services/quoteAiService.ts` — Return auto-quote eligibility alongside analysis.
- `shared/schema.ts` — Add `autoGenerated` boolean to estimates.
- `client/src/pages/QuoteRequests.tsx` — Badge showing "Auto-quoted" on eligible requests.
- `client/src/components/estimates/EstimateList.tsx` — Filter/badge for auto-generated estimates.

**Acceptance criteria:**
- [ ] Standard quote requests get an auto-generated estimate within 2 minutes of submission.
- [ ] Auto-generated estimates are clearly flagged and require staff review before sending.
- [ ] Staff can edit any auto-generated estimate before sending.
- [ ] Complex/custom requests bypass auto-quote and follow existing manual flow.
- [ ] Admin can adjust eligibility thresholds.

---

#### 4. Consolidate Public Inquiry Forms

**Problem:** There are 4+ public-facing inquiry forms with overlapping purpose, inconsistent fields, and no clear routing. A customer can land on any of them.

**Current state:**
- `PublicInquiryForm.tsx` (192KB) — Full multi-step wizard, all event types.
- `PublicEventInquiryPage.tsx` (26KB) — Simpler step-based form.
- `RequestQuote.tsx` (116KB) — Pre-filled from inquiry token, full menu selection.
- `ComprehensiveWeddingInquiry.tsx` — Wedding-specific with 100+ questions.
- No clear routing logic for which form a customer should use.

**Proposed change:**
- Create a single adaptive inquiry form at one URL (`/inquiry` or `/get-started`).
- The form adapts based on event type selection in step 1:
  - **Wedding:** Shows ceremony details, partner info, wedding-specific service options.
  - **Corporate:** Shows company name, billing contact, AV/presentation needs.
  - **Birthday / Baby Shower / Celebration:** Shows honoree info, theme preferences.
  - **Food Truck / Mobile Bartending:** Shows location requirements, power/water.
- Shared steps across all types: contact info, date/guest count, menu selection, dietary, review.
- Event-type-specific steps conditionally rendered.
- Retire the other 3 forms. Redirect their URLs to the new unified form.
- `RequestQuote` remains as the token-pre-filled variant (it serves a different purpose: returning customer filling in details after inquiry invitation).

**Affected files:**
- New: `client/src/pages/UnifiedInquiryForm.tsx` — Single adaptive form.
- Deprecate: `PublicInquiryForm.tsx`, `PublicEventInquiryPage.tsx`, `ComprehensiveWeddingInquiry.tsx`.
- `client/src/App.tsx` — Update public routes, add redirects.
- `server/routes.ts` — Ensure `POST /api/opportunities/public-inquiry` handles the unified payload.

**Acceptance criteria:**
- [ ] Single form URL for all new inquiries.
- [ ] Form adapts question flow based on event type.
- [ ] All data previously captured by individual forms is still captured.
- [ ] Old form URLs redirect to new form.
- [ ] Mobile-responsive, accessible, fast-loading.

---

### Tier 2: Better Visibility & Tracking

---

#### 5. Pipeline Kanban Board

**Problem:** Every funnel stage is a flat list/table. There's no visual representation of deals moving through the pipeline.

**Current state:**
- Opportunities, inquiries, and estimates each have list views with status badges.
- No cross-stage visualization.
- Dashboard shows 4 stat cards but no pipeline view.

**Proposed change:**
- Add a "Pipeline" page accessible from the sidebar (or as a tab on the Dashboard).
- Kanban board with columns representing the unified funnel stages:
  ```
  Raw → Qualified → Contacted → Inquiry Sent → Quote Sent → Accepted → Booked
  ```
- Each card shows: customer name, event type, event date, guest count, dollar value (if quote exists), days in stage.
- Color coding by priority (hot = red border, high = orange, etc.).
- Drag-and-drop to change status (with confirmation for significant transitions like "booked").
- Click a card to open the detail view for that stage.
- Filters: by event type, by assigned salesperson, by date range.

**Affected files:**
- New: `client/src/pages/Pipeline.tsx` — Kanban board component.
- New: `client/src/components/pipeline/PipelineCard.tsx` — Individual deal card.
- `client/src/components/layout/Sidebar.tsx` — Add "Pipeline" nav item.
- `client/src/App.tsx` — Add route.
- `server/routes.ts` — May need a `/api/pipeline` endpoint that joins opportunities + estimates for the unified view.

**Acceptance criteria:**
- [ ] Visual kanban board showing all active deals across stages.
- [ ] Drag-and-drop status changes with optimistic UI.
- [ ] Cards show key info at a glance (name, event type, date, value, days in stage).
- [ ] Filterable by salesperson, event type, priority, date range.
- [ ] Responsive: usable on tablet (horizontal scroll on mobile).

---

#### 6. Conversion Funnel Dashboard

**Problem:** The dashboard shows point-in-time counts but no conversion rates or trends. You can't answer "what % of opportunities become booked events?" or "where do we lose the most deals?"

**Current state:**
- Dashboard shows: active opportunities count, pending estimates count, upcoming events count, this month's revenue.
- No historical comparison, no conversion rates, no funnel visualization.

**Proposed change:**
- Add a funnel visualization widget to the Dashboard or Reports page showing:
  ```
  This Month:
  ┌─────────────────────────────────────┐
  │  Leads: 40                          │  100%
  ├───────────────────────────────┐     │
  │  Opportunities: 25            │     │  62%
  ├─────────────────────────┐     │     │
  │  Inquiries: 12          │     │     │  48%
  ├───────────────────┐     │     │     │
  │  Quotes Sent: 8   │     │     │     │  67%
  ├─────────────┐     │     │     │     │
  │  Booked: 5  │     │     │     │     │  62%
  └─────────────┘     │     │     │     │
  ```
- Stage-to-stage conversion rates.
- Month-over-month comparison.
- Click into any stage to see what's stuck.
- Average time to close (first contact to booked).
- Average time per stage.
- Revenue per stage (total value of deals in each status).

**Affected files:**
- New: `client/src/components/dashboard/FunnelChart.tsx` — Funnel visualization.
- New: `server/routes.ts` — `GET /api/reports/funnel` endpoint returning aggregated counts by status and date range.
- `client/src/pages/dashboard.tsx` — Add funnel widget.
- `client/src/pages/reports.tsx` — Full reports page with detailed funnel analytics.

**Acceptance criteria:**
- [ ] Visual funnel showing count and conversion rate at each stage.
- [ ] Date range selector (this week, this month, this quarter, custom).
- [ ] Month-over-month comparison view.
- [ ] Average time-in-stage and average time-to-close metrics.
- [ ] Click-through to filtered list of deals in each stage.

---

#### 7. Time-in-Stage Alerts

**Problem:** There's no tracking of when a record enters a status, so you can't identify stalled deals or measure pipeline velocity.

**Current state:**
- `createdAt` and `updatedAt` exist on all tables.
- `updatedAt` changes on any field update, not just status changes. You can't distinguish "status changed 2 days ago" from "notes were edited 2 days ago."
- No status change history.

**Proposed change:**
- Add a `statusChangedAt` timestamp to opportunities, quote requests, and estimates. Updated only when `status` field changes.
- Add a `statusHistory` JSONB array field: `[{ status, changedAt, changedBy }]` for audit trail.
- Dashboard alert card: "Deals needing attention" showing records that have exceeded stage thresholds:
  - Opportunity in `contacted` > 5 days
  - Opportunity in `qualified` > 3 days
  - Quote request in `submitted` > 2 days (SLA)
  - Estimate in `sent` > 5 days
  - Estimate in `viewed` > 3 days
- Configurable thresholds per stage.

**Affected files:**
- `shared/schema.ts` — Add `statusChangedAt` and `statusHistory` to opportunities, quoteRequests, estimates.
- `server/storage.ts` — Update methods to set `statusChangedAt` when status changes, append to `statusHistory`.
- `server/routes.ts` — PATCH endpoints detect status changes and update history.
- New: `client/src/components/dashboard/StaleDealsAlert.tsx` — Dashboard widget.
- `client/src/pages/dashboard.tsx` — Include stale deals widget.

**Acceptance criteria:**
- [ ] `statusChangedAt` accurately reflects last status change (not last edit).
- [ ] `statusHistory` records every status transition with timestamp and user.
- [ ] Dashboard shows stale deal alerts with configurable thresholds.
- [ ] Alert links to the stale record for quick action.

---

#### 8. Unified Contact Timeline

**Problem:** A person's journey is fragmented across `rawLeads`, `opportunities`, `quoteRequests`, `clients`, and `events` with separate communication queries for each. You can't see the full story in one place.

**Current state:**
- Communications table links to `opportunityId`, `clientId`, and `eventId` — but these are queried separately.
- `GET /api/opportunities/:id/communications` returns only opportunity-linked comms.
- `GET /api/clients/:id/communications` returns only client-linked comms.
- Events don't surface communications at all ("coming soon" note in Events.tsx).
- A customer who went Lead → Opportunity → Inquiry → Quote → Client → Event has their emails scattered across 3-4 entity links.

**Proposed change:**
- Build a "Contact Timeline" component that aggregates all touchpoints for a given email address:
  1. Raw lead communications (via email match).
  2. Opportunity communications (via `opportunityId`).
  3. Quote request events (submission, status changes — synthetic entries).
  4. Estimate events (sent, viewed, accepted/declined — synthetic entries).
  5. Client communications (via `clientId`).
  6. Event milestones (reminders sent, checklist completions).
- Add this component to:
  - Opportunity Detail Page (existing Communications tab — enhance it).
  - Client Detail Page (new tab).
  - Event Detail Page (replace "coming soon" placeholder).
- New API endpoint: `GET /api/contacts/:email/timeline` that joins all tables.

**Affected files:**
- New: `client/src/components/shared/ContactTimeline.tsx` — Reusable timeline component.
- New: `server/routes.ts` — `GET /api/contacts/:email/timeline` endpoint.
- `client/src/pages/OpportunityDetailPage.tsx` — Replace Communications tab content.
- `client/src/pages/clients.tsx` — Add timeline tab to client detail view.
- `client/src/pages/Events.tsx` — Replace "coming soon" with timeline component.

**Acceptance criteria:**
- [ ] Single timeline view showing every touchpoint for a contact across all stages.
- [ ] Entries sorted chronologically with clear stage markers.
- [ ] Reusable component embedded in Opportunity, Client, and Event detail views.
- [ ] Includes both human communications and system events (quote sent, viewed, etc.).
- [ ] Performant: single API call, not N+1 queries.

---

### Tier 3: Revenue & Client Experience

---

#### 9. Quote Versioning

**Problem:** Editing a quote overwrites the `proposal` JSONB blob. There's no revision history, no ability to compare versions, and no audit trail of what changed.

**Current state:**
- `PATCH /api/estimates/:id/proposal` overwrites `proposal` field entirely.
- No version number, no previous state stored.
- If a customer disputes "that's not what you quoted me," there's no proof.
- Price negotiations have no paper trail.

**Proposed change:**
- Add an `estimateVersions` table:
  ```
  id, estimateId, version (integer), proposal (jsonb), pricing snapshot,
  changedBy (userId), changeNote (text), createdAt
  ```
- Every time the proposal is updated, the previous version is saved before overwriting.
- `estimate.currentVersion` tracks the active version number.
- Admin can view version history: "v1: $5,000 → v2: $4,200 (dropped appetizers) → v3: $4,500 (added desserts)."
- Diff view highlighting what changed between versions.
- Customer-facing quote page shows current version only.

**Affected files:**
- `shared/schema.ts` — New `estimateVersions` table, add `currentVersion` to estimates.
- `server/storage.ts` — Version management methods.
- `server/routes.ts` — `PATCH /api/estimates/:id/proposal` saves previous version first. New `GET /api/estimates/:id/versions`.
- New: `client/src/components/estimates/VersionHistory.tsx` — Admin version browser.
- `client/src/pages/AdminEstimatePreview.tsx` — Add version history panel.

**Acceptance criteria:**
- [ ] Every proposal edit creates a version snapshot automatically.
- [ ] Admin can view full version history with timestamps and who made the change.
- [ ] Version diff showing what changed (price, items, guest count).
- [ ] Customer always sees the latest version.
- [ ] Optional change note when editing ("customer requested 20 fewer guests").

---

#### 10. Payment & Deposit Integration

**Problem:** The public quote page shows a 35% deposit amount but there's no way to actually collect it. Acceptance is just a button click with no financial commitment.

**Current state:**
- Proposal pricing shows `depositPercent` (default 35%).
- "Accept" endpoint creates event and graduates client but doesn't collect money.
- No payment tracking anywhere in the system.
- Deposit collection happens outside the system (Venmo, check, manual invoice).

**Proposed change:**
- Integrate Square Checkout into the quote acceptance flow:
  1. Customer clicks "Accept & Pay Deposit" on public quote page.
  2. Square Checkout session created with deposit amount.
  3. On successful payment: estimate marked accepted, event created, client graduated.
  4. Payment record stored in new `payments` table.
- Add a `payments` table:
  ```
  id, estimateId, eventId, clientId, type (deposit/final/partial),
  amountCents, squarePaymentId, squareOrderId, status (pending/completed/failed/refunded),
  paidAt, refundedAt, createdAt
  ```
- Event detail page shows payment status: deposit paid, balance due, fully paid.
- Support for partial payments and final balance collection.
- Admin can manually record offline payments (check, cash, Venmo).

**Affected files:**
- `shared/schema.ts` — New `payments` table.
- New: `server/services/squareService.ts` — Square integration.
- `server/routes.ts` — Square webhook handler, payment recording endpoints.
- `client/src/pages/PublicQuote.tsx` — Replace "Accept" with "Accept & Pay Deposit" → Square Checkout.
- `client/src/pages/Events.tsx` — Payment status card in event detail.
- New: `client/src/components/payments/PaymentTracker.tsx` — Reusable payment status component.

**Acceptance criteria:**
- [ ] Customer can pay deposit via Square during quote acceptance.
- [ ] Payment status visible on event detail page.
- [ ] Admin can record offline payments.
- [ ] Balance tracking: deposit paid → remaining balance → fully paid.
- [ ] Square webhook handles payment confirmations reliably.
- [ ] Refund capability for cancellations.

---

#### 11. Client Portal with Event-Themed Pages

**Problem:** Clients have no self-service area. They can view a single event via token link, but can't see all their events, update preferences, or manage their account. Additionally, the current public event page (`PublicEventPage.tsx`) has a generic design regardless of event type.

**Current state:**
- `PublicEventPage.tsx` — Generic event page accessed via `/event/:token`. Shows event details, menu, dietary notes, chef bio. Same look for every event type.
- `FindMyEvent.tsx` — Email-based event link recovery. Returns a single link.
- No multi-event dashboard for clients.
- No preference saving for repeat customers.
- No visual differentiation between a wedding page and a corporate event page.

**Proposed change:**

**Part A: Client Portal**
- Authenticated client area at `/my-events` (login via email magic link or password).
- Dashboard showing:
  - Upcoming events with countdown.
  - Past events with review/reorder capability.
  - Active quotes pending their action.
  - Saved preferences (dietary restrictions, favorite menus, preferred service style).
  - Communication history with the catering team.
- Repeat order flow: "Book again" pre-fills a new inquiry with previous event details.
- Profile management: update contact info, dietary preferences, company details.

**Part B: Event-Themed Public Pages**
- Each event type gets its own visual theme applied to the public event page and client portal:

| Event Type | Theme | Color Palette | Visual Elements |
|------------|-------|---------------|-----------------|
| **Wedding** | Elegant / Romantic | Soft golds, ivory, blush pink, sage green | Floral accents, script typography, ring/heart motifs, soft textures |
| **Corporate** | Professional / Clean | Navy, charcoal, white, accent blue | Geometric patterns, sans-serif typography, company logo placement, clean lines |
| **Birthday** | Festive / Fun | Bright colors, confetti palette (varies by age group) | Balloons, confetti, playful typography, celebration icons |
| **Baby Shower** | Soft / Whimsical | Pastel blues, pinks, mint, lavender, cream | Stork/baby motifs, soft rounded shapes, gentle typography, cloud/star accents |
| **Engagement** | Celebratory / Romantic | Champagne gold, rose, warm neutrals | Champagne glass motifs, sparkle effects, elegant script |
| **Anniversary** | Classic / Timeless | Silver/gold (depending on milestone), deep burgundy, cream | Milestone badges, elegant frames, classic typography |
| **Graduation** | Achievement / School Spirit | School colors (customizable), gold accents | Cap/tassel motifs, achievement badges, bold typography |
| **Holiday Party** | Festive / Seasonal | Seasonal colors (red/green for winter, pastels for spring) | Seasonal decorations, warm lighting feel, festive patterns |
| **Fundraiser** | Cause-Driven / Elegant | Organization brand colors + gold/silver | Cause ribbon, elegant layout, donation acknowledgment section |
| **Conference / Workshop** | Modern / Informational | Brand-neutral blues, grays, white | Schedule layout, speaker sections, agenda-style formatting |
| **Reunion** | Nostalgic / Warm | Warm earth tones, vintage accents | Photo collage areas, timeline elements, memory motifs |
| **Food Truck** | Casual / Street | Bold primary colors, chalkboard textures | Truck illustrations, street food vibes, hand-drawn typography |
| **Mobile Bartending** | Cocktail / Lounge | Dark backgrounds, neon accents, amber/gold | Cocktail glass motifs, bar menu styling, mood lighting feel |

- Implementation: theme system with CSS variables and component variants.
  ```typescript
  // Theme config per event type
  const eventThemes = {
    wedding: {
      primary: '#C4A86B',        // Soft gold
      secondary: '#F5E6D3',      // Ivory
      accent: '#D4A5A5',         // Blush
      background: '#FFF9F5',     // Warm white
      fontHeading: 'Playfair Display',
      fontBody: 'Lora',
      pattern: 'floral',
      icon: 'rings',
    },
    corporate: {
      primary: '#1B3A5C',        // Navy
      secondary: '#F8F9FA',      // Light gray
      accent: '#2E86AB',         // Accent blue
      background: '#FFFFFF',
      fontHeading: 'Inter',
      fontBody: 'Inter',
      pattern: 'geometric',
      icon: 'briefcase',
    },
    birthday: {
      primary: '#FF6B6B',        // Coral
      secondary: '#FFE66D',      // Yellow
      accent: '#4ECDC4',         // Teal
      background: '#FFF8F0',     // Warm cream
      fontHeading: 'Poppins',
      fontBody: 'Nunito',
      pattern: 'confetti',
      icon: 'cake',
    },
    baby_shower: {
      primary: '#B8D4E3',        // Soft blue
      secondary: '#F2D7D9',      // Soft pink
      accent: '#C5E0B4',         // Mint
      background: '#FAFBFF',     // Almost white
      fontHeading: 'Quicksand',
      fontBody: 'Nunito',
      pattern: 'clouds',
      icon: 'baby',
    },
    // ... additional themes per event type
  };
  ```
- The `PublicEventPage.tsx` reads `event.eventType` and applies the matching theme.
- Theme wraps the entire page: header, cards, typography, accent colors, background patterns, and icons.
- Fallback to a neutral elegant theme for unrecognized event types.

**Affected files:**
- New: `client/src/lib/eventThemes.ts` — Theme definitions and config for all event types.
- New: `client/src/components/themed/ThemedEventLayout.tsx` — Wrapper component applying theme CSS variables.
- New: `client/src/components/themed/ThemedHeader.tsx` — Event-type-specific header with motifs.
- New: `client/src/pages/ClientPortal.tsx` — Authenticated client dashboard.
- New: `client/src/pages/ClientLogin.tsx` — Magic link login for clients.
- Refactor: `client/src/pages/PublicEventPage.tsx` — Wrap in `ThemedEventLayout`, use theme-aware components.
- `shared/schema.ts` — Add `clientPreferences` JSONB to clients table (dietary, menu favorites, etc.).
- `server/routes.ts` — Client portal API endpoints, magic link auth.

**Acceptance criteria:**
- [ ] Each event type has a distinct, professional visual theme.
- [ ] Theme applies to: public event page, client portal event cards, quote page.
- [ ] Themes are defined in one config file — easy to add/modify.
- [ ] Fallback theme for any event type not explicitly themed.
- [ ] Client portal shows all events, quotes, and preferences for a logged-in client.
- [ ] Magic link login: client enters email, receives link, lands on portal.
- [ ] Repeat order flow: "Book again" from past event.
- [ ] Mobile-responsive themed pages.

---

#### 12. PDF Quote Generation

**Problem:** Quotes are shared only as web links. Corporate clients, venue coordinators, and planners often need a downloadable PDF for internal approvals, filing, or printing.

**Current state:**
- Proposals rendered as HTML via `QuoteProposalView.tsx`.
- `viewToken`-based sharing works for digital viewing.
- No server-side or client-side PDF generation.

**Proposed change:**
- Server-side PDF generation using a library like `@react-pdf/renderer` or `puppeteer` (headless Chrome rendering the existing proposal page).
- Endpoint: `GET /api/estimates/:id/pdf` → returns PDF binary.
- Public endpoint: `GET /api/public/quote/:token/pdf` → returns PDF (no auth, token-based).
- PDF includes: company branding, event details, full menu with pricing, line items, totals, deposit info, terms & conditions, expiry date.
- "Download PDF" button on both admin preview and customer-facing quote page.
- PDF file name: `HomeBites-Quote-{lastName}-{eventDate}.pdf`.

**Affected files:**
- New: `server/services/pdfGenerator.ts` — PDF generation service.
- `server/routes.ts` — PDF download endpoints.
- `client/src/pages/PublicQuote.tsx` — Add "Download PDF" button.
- `client/src/pages/AdminEstimatePreview.tsx` — Add "Download PDF" button.

**Acceptance criteria:**
- [ ] PDF generation from any estimate with a proposal.
- [ ] PDF matches the web proposal in content and branding.
- [ ] Available to both admin (authenticated) and customer (token-based).
- [ ] Includes terms, expiry date, and deposit information.
- [ ] Generated server-side (not client-side) for consistency.

---

### Tier 4: Data Integrity & Developer Experience

---

#### 13. Enforce Status Enums in Schema

**Problem:** Opportunities use free `text("status")` while raw leads and quote requests use proper `pgEnum`. The opportunity form even shows statuses (`negotiation`, `won`, `lost`) that the schema doesn't define.

**Current state:**
- `opportunities.status`: `text("status").default("new")` with a comment listing valid values.
- `rawLeads.status`: Proper `rawLeadStatusEnum` pgEnum.
- `quoteRequests.status`: Proper `quoteRequestStatusEnum` pgEnum.
- `estimates.status`: `text("status").default("draft")` — also free text.
- `events.status`: `text("status").default("confirmed")` — also free text.
- OpportunityForm component includes statuses not in the schema comment.

**Proposed change:**
- Create proper `pgEnum` for all status fields:
  ```sql
  CREATE TYPE opportunity_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'booked', 'archived');
  CREATE TYPE estimate_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined');
  CREATE TYPE event_status AS ENUM ('confirmed', 'in_progress', 'completed', 'cancelled');
  ```
- Update Drizzle schema to use these enums.
- Fix OpportunityForm to only show statuses that exist in the enum.
- Migration to convert existing text columns to enum columns.
- Database-level constraint prevents invalid status values.

**Affected files:**
- `shared/schema.ts` — Add pgEnum definitions, update column types.
- `client/src/components/opportunities/OpportunityForm.tsx` — Fix status dropdown to match schema.
- Migration file — ALTER TABLE to convert text → enum.
- All PATCH endpoints — Ensure status values are validated.

**Acceptance criteria:**
- [ ] All status fields use `pgEnum` — invalid values rejected at database level.
- [ ] Form dropdowns match schema-defined statuses exactly.
- [ ] Migration handles existing data gracefully (map any non-standard values).
- [ ] TypeScript types auto-derived from enum definitions.

---

#### 14. Duplicate Detection & Merge

**Problem:** No deduplication logic exists. The same person can appear as multiple raw leads, multiple opportunities, and multiple clients with no merge path.

**Current state:**
- `OpportunityForm` checks for existing clients by email/phone and shows an alert, but only when *creating* an opportunity.
- No similar check when creating raw leads or when emails arrive.
- No merge capability — if duplicates exist, you have to manually copy data and delete one.

**Proposed change:**
- **On create (all entities):** Check for existing records with matching email or phone.
  - Show match with link: "This looks like [Name] — an existing [opportunity/client]. Link to them instead?"
  - Options: link to existing, merge into existing, create new anyway.
- **Merge tool:** Admin page to merge two records:
  - Select primary record (keeps its ID).
  - Secondary record's communications, contact identifiers, and notes are moved to primary.
  - Secondary record is soft-deleted.
  - All foreign keys (estimates, events, quote requests) re-pointed to primary.
- **Periodic duplicate scan:** Background job that identifies likely duplicates (same email, similar name + phone) and surfaces them in a "Potential Duplicates" admin view.

**Affected files:**
- New: `server/services/deduplication.ts` — Duplicate detection logic.
- New: `client/src/pages/DuplicateReview.tsx` — Admin duplicate management page.
- `server/routes.ts` — `GET /api/admin/duplicates`, `POST /api/admin/merge`.
- `client/src/components/opportunities/OpportunityForm.tsx` — Enhanced dupe check.
- `client/src/components/clients/ClientForm.tsx` — Add dupe check.

**Acceptance criteria:**
- [ ] Creating any record checks for duplicates by email and phone.
- [ ] User can choose to link, merge, or create new when duplicate found.
- [ ] Merge tool re-links all dependent records (communications, estimates, events).
- [ ] Periodic background scan surfaces potential duplicates for review.
- [ ] Merge is audited: log shows "Record #42 merged into #17 by [user] on [date]."

---

#### 15. Soft Delete & Audit Trail

**Problem:** Deletes are hard — a deleted opportunity, client, or event is gone permanently. There's no "undo," no recycle bin, and no audit trail of who changed what.

**Current state:**
- DELETE endpoints remove rows from the database (`DELETE FROM ... WHERE id = ?`).
- `createdAt` and `updatedAt` exist but don't capture *what* changed or *who* changed it.
- No activity/audit log for entity changes.

**Proposed change:**
- **Soft delete:** Add `deletedAt` timestamp to all core tables (opportunities, clients, estimates, events, quoteRequests). Queries filter by `deletedAt IS NULL` by default.
- **Audit log table:**
  ```
  id, entityType (opportunity/client/estimate/event/quoteRequest),
  entityId, action (created/updated/deleted/restored/merged),
  userId, changes (jsonb — diff of old vs new values),
  ipAddress, createdAt
  ```
- All create/update/delete operations write to the audit log.
- Admin "Activity Log" page showing recent changes across all entities.
- "Trash" view showing soft-deleted records with restore capability.
- Auto-purge: permanently delete records that have been in trash for 90+ days.

**Affected files:**
- `shared/schema.ts` — Add `deletedAt` to all core tables. New `auditLog` table.
- `server/storage.ts` — All list/get methods add `WHERE deletedAt IS NULL`. Delete methods set `deletedAt` instead of removing.
- `server/middleware/audit.ts` — Middleware that logs changes to audit table.
- New: `client/src/pages/ActivityLog.tsx` — Admin audit log viewer.
- New: `client/src/pages/Trash.tsx` — Soft-deleted record browser with restore.

**Acceptance criteria:**
- [ ] Delete operations set `deletedAt` instead of removing rows.
- [ ] All list/get queries exclude soft-deleted records.
- [ ] Admin can view and restore soft-deleted records.
- [ ] Audit log captures every create/update/delete with before/after diff.
- [ ] Auto-purge permanently removes records deleted 90+ days ago.
- [ ] Audit log accessible to admins with search and entity filtering.

---

#### 16. Bulk Actions

**Problem:** Every action in the system is one-at-a-time. You can't select 20 stale opportunities and archive them, or reassign 10 leads to a new salesperson at once.

**Current state:**
- List views (LeadList, OpportunityList, ClientList, EstimateList) have no selection mechanism.
- All status changes, deletes, and assignments are per-record via detail views.

**Proposed change:**
- Add checkbox selection to all list views.
- Bulk action toolbar appears when 1+ records are selected:
  - **Opportunities:** Bulk archive, bulk reassign, bulk change status, bulk delete.
  - **Inquiries:** Bulk mark as reviewing, bulk disqualify, bulk archive.
  - **Estimates:** Bulk mark expired, bulk delete drafts.
  - **Clients:** Bulk merge (select 2), bulk delete.
- "Select all" / "Select all matching filter" for large batches.
- Confirmation dialog showing count and action before executing.
- Backend: `POST /api/opportunities/bulk-action` with `{ ids: [...], action: 'archive' | 'reassign' | ... }`.

**Affected files:**
- `client/src/components/ui/data-table.tsx` — Add row selection with checkboxes.
- New: `client/src/components/shared/BulkActionToolbar.tsx` — Floating toolbar component.
- `server/routes.ts` — Bulk action endpoints for each entity.
- Each list component — Wire up selection state and bulk toolbar.

**Acceptance criteria:**
- [ ] Checkbox selection on all list views.
- [ ] Bulk action toolbar with context-appropriate actions.
- [ ] Confirmation dialog showing exactly what will happen.
- [ ] Backend processes bulk actions in a single transaction.
- [ ] "Select all matching current filter" for large datasets.
- [ ] Audit log captures bulk actions with all affected record IDs.

---

## Implementation Priority Matrix

| # | Item | Effort | Impact | Dependencies |
|---|------|--------|--------|--------------|
| 1 | Merge Leads + Opportunities | Large | High | None (do first) |
| 13 | Enforce Status Enums | Small | Medium | Pairs with #1 |
| 2 | Auto-Follow-Up Engine | Medium | High | #7 (needs statusChangedAt) |
| 7 | Time-in-Stage Alerts | Small | Medium | #13 (needs proper enums) |
| 4 | Consolidate Public Forms | Large | High | None |
| 3 | Auto-Quote for Standard | Medium | High | None |
| 8 | Unified Contact Timeline | Medium | High | None |
| 5 | Pipeline Kanban Board | Medium | High | #1 (unified stages) |
| 6 | Conversion Funnel Dashboard | Medium | Medium | #7 (needs time tracking) |
| 9 | Quote Versioning | Medium | Medium | None |
| 12 | PDF Quote Generation | Small | Medium | None |
| 15 | Soft Delete & Audit Trail | Medium | Medium | None |
| 14 | Duplicate Detection & Merge | Medium | Medium | #15 (soft delete for merges) |
| 16 | Bulk Actions | Medium | Medium | None |
| 10 | Payment & Deposit Integration | Large | High | Square account setup |
| 11 | Client Portal + Event Themes | Large | High | #10 (payment for full flow) |
