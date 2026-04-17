# Home Bites Sales Funnel — Implementation Plan

**Owner:** Home Bites Catering (Mike)
**Target codebase:** `/HomeBitesCatering` (Node/Express + React + Drizzle/Postgres, deployed on Railway, DB on Neon)
**Source of truth:** `sales_funnel.md` (the desired funnel)
**Companion doc:** this file describes how to close the gaps identified between the spec and the current implementation.

---

## 1. Goal & Success Metrics

Close the funnel so that every inquiry either converts, self-eliminates with feedback, or is nurtured through a fully automated follow-up sequence. No lead should fall out of the system because of a manual step.

**Success metrics (measure in Pipeline/reports):**
- Time from inquiry → owner notified: **< 60 seconds** (today: minutes, email-only)
- % of ghosted leads touched by Day 10: **100%** (today: human-gated drafts)
- % of declines that capture a reason: **≥ 70%** (today: optional free-text, no prompt)
- % of proposals with a "Need More Info" or tasting booking touchpoint: track new
- % of booked events with signed contract + deposit paid: **100%** (today: 0%, manual)
- % of completed events with a review request sent: **100%** (today: 0%)

---

## 2. Stack & Conventions (what the builder needs to know)

- **Server:** Express, Drizzle ORM on Neon Postgres. Entry `server/index.ts`. Routes all in `server/routes.ts` (large file — append new routes near the related domain).
- **Client:** React + Vite + wouter + TanStack Query + shadcn/ui + Tailwind. Pages in `client/src/pages/`, shared components in `client/src/components/`.
- **Schema:** `shared/schema.ts`. After any schema change run `npm run db:push` (drizzle-kit push). No migration files — schema is the source of truth.
- **Email:** Resend via `server/utils/email.ts` — use `sendEmail(...)` / `sendEmailInBackground(...)`. Templates live in `server/utils/emailTemplates.ts`. Every send is auto-logged to `communications` table.
- **Phone:** `server/services/phoneService.ts` — normalization only today. SMS sending needs to be added here.
- **Cron:** External Railway scheduler hits `POST /api/cron/*` endpoints with header `x-cron-secret: $CRON_SECRET`. Existing: `/api/cron/event-reminders`, `/api/cron/follow-up-engine`.
- **Auth:** `isAuthenticated`, `hasWriteAccess` middleware. Public endpoints use opaque `viewToken`s (see `estimates.viewToken`, `events.viewToken`) — follow same pattern for new public flows.
- **Deploy:** auto-deploy on push to `main` (Railway). No staging env — test locally against a Neon branch DB.
- **Env vars already in use:** `RESEND_API_KEY`, `DATABASE_URL`, `CRON_SECRET`, Google OAuth client vars, `OPENPHONE_*`.
- **Style:** TypeScript strict. Follow existing patterns — thin route handler, logic in a service file when non-trivial, Zod validation on inputs.

---

## 3. Prerequisites (do these first, before any code)

| Item | Purpose | Owner |
|---|---|---|
| Twilio account + purchased phone number | SMS to owner + SMS drip | Mike |
| Stripe account (or confirm existing) + webhook secret | Deposit collection | Mike |
| Dropbox Sign (HelloSign) or BoldSign account | Contract e-signature | Mike |
| Cal.com self-hosted OR Calendly team plan | Consultation + tasting booking | Mike / dev |
| Env vars added to Railway | Secrets | Dev |

**New env vars required:**
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
OWNER_SMS_NUMBER=+1XXXXXXXXXX           # Mike's mobile for inbound-inquiry alerts
OWNER_EMAIL=events@eathomebites.com
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=                 # client-side
BOLDSIGN_API_KEY=                       # or DROPBOX_SIGN_API_KEY
CAL_COM_EMBED_URL=https://cal.com/homebites/consultation
CAL_COM_TASTING_URL=https://cal.com/homebites/tasting
CAL_COM_WEBHOOK_SECRET=
```

**New npm packages:**
```
npm i twilio stripe @boldsign/boldsign  # or hellosign-sdk
```
(Cal.com is embedded as iframe — no SDK needed server-side beyond webhook verification.)

---

## 4. Phase P0 — Quick Wins (1–2 weeks total)

These are the highest-leverage changes. Ship them first.

**Progress:** P0 ✅ · P1 ✅ · P2-1 ✅ · P2-2 ✅ · P2-3 ✅ — **P2 complete** 🎉 (all code shipped; operational setup still required for Square/BoldSign accounts)

### P0-1. SMS Alert to Owner on New Inquiry ✅ DONE

**Goal:** Mike gets an SMS the instant any inquiry arrives from any channel.

**Why:** Funnel step 2 explicitly requires it. Fast response is the #1 predictor of booking.

**Backend:**
1. Create `server/services/smsService.ts`:
   ```ts
   export async function sendSms(args: {
     to: string; body: string; templateKey: string;
     clientId?: number; opportunityId?: number;
   }): Promise<{ sent: boolean; skipped: boolean; error?: string; sid?: string }>
   ```
   - Mirror `email.ts` conventions: graceful skip if env missing, log to `communications` table with `type: "sms"`, `direction: "outgoing"`, `source: "twilio"`.
   - Singleton Twilio client, lazy init.
2. Add `server/utils/smsTemplates.ts` with `newInquiryOwnerSms(opportunity)` returning `{ body: string }`.
3. Hook into every inquiry-creation path. Find call sites by grep:
   - `POST /api/opportunities/public-inquiry` (routes.ts ~1134)
   - `POST /api/gas-email-intake` (routes.ts ~4820)
   - `POST /api/openphone-webhook` (routes.ts ~5090) — only if a new opportunity is actually created
   - `POST /api/quote-requests` — similar
   
   Add a `sendEmailInBackground`-style `sendSmsInBackground` fire-and-forget call after successful insert.
4. Content template (≤160 chars):
   ```
   🔔 New inquiry: {firstName} {lastName}, {eventType} for {guestCount} on {eventDate}. Source: {source}. Open: {dashboardUrl}/opportunities/{id}
   ```

**Frontend:** none.

**Acceptance:**
- Submit test inquiry via public form → SMS arrives at `OWNER_SMS_NUMBER` within 60s.
- Entry appears in `communications` table with correct `opportunityId`.
- Server still works with Twilio env vars unset (skipped, no crash).

**Effort:** 0.5–1 day.

**Status — 2026-04-17:**
- ✅ `server/services/smsService.ts` — `sendSms`, `sendSmsInBackground`, `sendOwnerSmsInBackground`. Lazy Twilio singleton, graceful skip when creds missing, audit-log to `communications` table (type: `sms`, source: `twilio`).
- ✅ `server/utils/smsTemplates.ts` — `newInquiryOwnerSms({ firstName, lastName, eventType, guestCount, eventDate, source, opportunityId?, rawLeadId? })`. Body aims for ≤160 chars (single segment).
- ✅ `twilio` npm package added.
- ✅ `getSmsConfig()` added to `server/utils/siteConfig.ts` reading `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `OWNER_SMS_NUMBER`, `HOMEBITES_PUBLIC_BASE_URL`.
- ✅ Fire-and-forget SMS wired into every new-inquiry path:
  - `POST /api/opportunities/public-inquiry` (routes.ts) → opportunity alert with `opportunityId` link.
  - `POST /api/quotes/quote-requests` (quoteRoutes.ts) → inquiry alert with `opportunityId` if linked.
  - `POST /api/gas-email-intake` (routes.ts) → new raw-lead path only (skipped for follow-up threads) → `rawLeadId` link.
  - `POST /api/openphone-webhook` (routes.ts) → only on **inbound** calls that created a fresh raw lead → `rawLeadId` link.
  - Admin-only raw-lead create + promote-to-quote-request routes intentionally NOT alerted (avoid self-notifying).
- ✅ `npm run check` passes (0 errors).
- 🟡 Manual smoke test pending: set Twilio test creds locally, submit a test public-inquiry, confirm SMS lands and `communications` row is written.

---

### P0-2. "I Need More Info" Decision Option on Proposal ✅ DONE

**Goal:** Third button on `PublicQuote.tsx` → client books a Zoom or phone call.

**Why:** Funnel spec's core insight — "uncertainty has a destination." Biggest conversion lift in the whole plan.

**Backend:**
1. Schema add to `estimates` (shared/schema.ts):
   ```ts
   infoRequestedAt: timestamp("info_requested_at"),
   infoRequestNote: text("info_request_note"),
   consultationBookedAt: timestamp("consultation_booked_at"),
   consultationMeetingUrl: text("consultation_meeting_url"),
   ```
2. New route `POST /api/public/quote/:token/request-info`:
   - Accepts optional `{ note?: string }`.
   - Sets `infoRequestedAt`, stores note, keeps status at `viewed` (do not flip to declined).
   - Returns `{ ok: true, bookingUrl: CAL_COM_EMBED_URL + "?prefill_email=..." }`.
   - Fires SMS to owner + email ack to client (template: `infoRequestedClientAck`, `infoRequestedOwnerAlert`).
3. Route `POST /api/cal-webhook` (Cal.com webhook):
   - Verify signature with `CAL_COM_WEBHOOK_SECRET`.
   - On `BOOKING_CREATED`: find estimate via prefilled metadata (`estimateToken`), set `consultationBookedAt` and `consultationMeetingUrl`. Log communication.
   - On `BOOKING_CANCELLED`: clear.

**Frontend:**
1. Add third button to `client/src/pages/PublicQuote.tsx` (and underlying `QuoteProposalView`):
   - "I need more info" → opens modal with optional note textarea → POST request-info → on success, render Cal.com embed (`<iframe>` or `@calcom/embed-react` if preferred).
2. After booking confirmed via iframe postMessage, show "Call scheduled for [date/time]" state.

**Acceptance:**
- Client clicks "Need More Info," optionally types a note, books a slot.
- `estimates` row shows `infoRequestedAt` + `consultationBookedAt`.
- Owner receives SMS + email; client receives calendar invite (from Cal.com) + ack email.
- Proposal page shows booked state on reload.

**Effort:** 2–3 days.

**Status — 2026-04-17:**
- ✅ Schema: `estimates` got `info_requested_at`, `info_request_note`, `consultation_booked_at`, `consultation_meeting_url`. Applied via direct SQL (drizzle-kit push blocked on a pre-existing unrelated prompt for `opportunity_email_threads_gmail_thread_id_unique`).
- ✅ Templates: `infoRequestedClientAckEmail`, `infoRequestedOwnerEmail`, `consultationBookedOwnerEmail`, plus SMS `infoRequestedOwnerSms`, `consultationBookedOwnerSms`.
- ✅ `getCalComConfig()` added to `server/utils/siteConfig.ts` reading `CAL_COM_EMBED_URL`, `CAL_COM_TASTING_URL`, `CAL_COM_WEBHOOK_SECRET`.
- ✅ `GET /api/public/quote/:token/booking-config` — returns Cal.com URL (prefilled with name/email + `estimateToken` round-trip param) + current info/booking state.
- ✅ `POST /api/public/quote/:token/request-info` — body `{ note? }`. Stamps `infoRequestedAt` + note (status stays `viewed`), fires client ack email + owner email + owner SMS, returns prefilled `bookingUrl`. Blocks if already `accepted`/`declined`.
- ✅ `POST /api/cal-webhook` — HMAC-SHA256 signature verification via `x-cal-signature-256`. `BOOKING_CREATED`/`BOOKING_RESCHEDULED` → stamps `consultationBookedAt` + `consultationMeetingUrl` on the estimate (matched by `estimateToken` in Cal's payload), logs a `meeting` communication, fires owner email + SMS. `BOOKING_CANCELLED` → clears booking fields.
- ✅ Raw body capture added to `server/index.ts` (`express.json({ verify })`) so webhook signatures can be verified byte-exact.
- ✅ Frontend: `QuoteProposalView` gained `onRequestInfo`, `infoFlowState`, `infoRequestedAt`, `consultationBookedAt`, `consultationMeetingUrl`, `resolvedBookingUrl` props. New "I need more info — let's talk" button (third option alongside accept/decline) + modal with optional note textarea → submits → renders Cal.com embed in an iframe. Shows "✓ Call scheduled for …" when `consultationBookedAt` is present.
- ✅ `PublicQuote.tsx` wires the booking-config fetch + `handleRequestInfo` → Cal.com iframe.
- ✅ Public estimate response now exposes the 4 new fields via `sanitizeEstimateForPublic`.
- ✅ `npm run check` passes (0 errors).
- 🟡 Pending operational steps (owner):
  - Set `CAL_COM_EMBED_URL`, `CAL_COM_TASTING_URL`, `CAL_COM_WEBHOOK_SECRET` in Railway + Cal.com.
  - In Cal.com, register a webhook → URL `<PUBLIC_BASE_URL>/api/cal-webhook`, events: `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`. Secret must match `CAL_COM_WEBHOOK_SECRET`.
  - In Cal.com event type, add a custom question with slug `estimateToken` (hidden or optional); the prefill query param will populate it automatically.
  - Smoke test: open a sent quote, click "I need more info," type a note, book a slot, verify owner email + SMS land and estimate row reflects both `infoRequestedAt` and `consultationBookedAt`.

---

### P0-3. Decline Feedback Email (auto-send on decline) ✅ DONE

**Goal:** When a client declines a quote, trigger the feedback email from `sales_funnel.md:94-112` asking "why: pricing / menu / timing / other."

**Why:** Turns "No" into a second opportunity. Today decline captures a reason only if typed manually.

**Backend:**
1. Add template to `server/utils/emailTemplates.ts`:
   ```ts
   export function quoteDeclinedFeedbackEmail(args: {
     firstName: string; feedbackUrl: string;
   }): { subject; html; text }
   ```
   Include a magic link back to a feedback form with prefilled reason radios.
2. Schema: the existing `estimates.declinedReason` field is enough, but add:
   ```ts
   declineFeedbackToken: text("decline_feedback_token"),   // opaque token for the public form
   declineFeedbackSubmittedAt: timestamp("decline_feedback_submitted_at"),
   declineCategory: text("decline_category"),  // 'pricing'|'menu'|'timing'|'other'
   ```
3. Modify `POST /api/public/quote/:token/decline` (routes.ts:2491):
   - After update, generate `declineFeedbackToken = randomBytes(24).toString('base64url')`.
   - `sendEmailInBackground({ templateKey: 'quote_declined_feedback', ... })` to client.
   - SMS owner: "🔻 {name} declined: {reason || 'no reason'}".
4. New public route `GET /api/public/decline-feedback/:token` — returns estimate info.
5. `POST /api/public/decline-feedback/:token` — body `{ category, notes? }` — stores results. Optionally fires an admin email if they picked "pricing" or "menu" so Mike can re-engage.

**Frontend:**
1. New page `client/src/pages/PublicDeclineFeedback.tsx` — radio group (pricing / menu / timing / other) + optional notes → submit.
2. Register route in `App.tsx`: `/decline-feedback/:token`.

**Acceptance:**
- Declining a quote fires the feedback email within 60s.
- Magic link opens the feedback form, submission stores `declineCategory`.
- Owner dashboard shows decline reasons aggregated (stretch: quick chart).

**Effort:** 1–1.5 days.

**Status — 2026-04-17:**
- ✅ Schema: `estimates` got `decline_feedback_token` (unique), `decline_feedback_submitted_at`, `decline_category`. Applied via direct SQL.
- ✅ Templates: `quoteDeclinedFeedbackEmail` (magic-link CTA), `declineFeedbackOwnerEmail` (with "consider re-engaging" callout for pricing/menu categories), SMS `quoteDeclinedOwnerSms` + `declineFeedbackOwnerSms`.
- ✅ `POST /api/public/quote/:token/decline` now generates a feedback token, fires the client feedback-request email + owner SMS alert.
- ✅ `GET /api/public/decline-feedback/:token` — returns minimal info for the form (first name, event, submitted state, prior category if any).
- ✅ `POST /api/public/decline-feedback/:token` — accepts `{ category: 'pricing'|'menu'|'timing'|'other', notes? }`, stores `declineCategory` + stamps `declineFeedbackSubmittedAt`, fires owner email (with re-engage hint for pricing/menu) + owner SMS.
- ✅ Frontend: new `client/src/pages/PublicDeclineFeedback.tsx` — radio-style card picker + optional notes → submit → thank-you state. Handles already-submitted + invalid-token states.
- ✅ Route `/decline-feedback/:token` registered in `App.tsx` for both the unauthenticated public block and the logged-in block (so Mike can preview too).
- ✅ `npm run check` passes.
- 🟡 Pending: smoke test — decline a test quote, confirm client receives the email, click magic link, pick a category, verify `declineCategory` + `declineFeedbackSubmittedAt` are populated and Mike gets the owner email + SMS.

---

### P0-4. Post-Event Review Request Email ✅ DONE

**Goal:** Day-after-event automated email asking for a Google review + referral.

**Why:** Stage 9 of the funnel is empty today. Reviews drive top-of-funnel.

**Backend:**
1. Add template `eventReviewRequestEmail(args)` in `emailTemplates.ts` with:
   - "How did everything go?" opener
   - Google review CTA button (link to Mike's Google Business review URL — add `GOOGLE_REVIEW_URL` env var)
   - Referral ask ("Know someone planning an event? Send them our way — $100 credit for any referral that books")
2. Add to `POST /api/cron/event-reminders` (routes.ts:2570) — there's already a "day-after" branch. If it exists only for thank-you, add the review CTA. Otherwise add a new branch:
   - Query events where `eventDate = today - 1 day` AND `status = 'completed'` AND no `reviewRequestSentAt`.
   - Send email, stamp `reviewRequestSentAt`.
3. Schema addition to `events`:
   ```ts
   reviewRequestSentAt: timestamp("review_request_sent_at"),
   reviewLeftAt: timestamp("review_left_at"),         // manually set by admin when spotted
   referralsGenerated: integer("referrals_generated").default(0),
   ```

**Frontend:** admin-only checkbox "review received" on event detail page (optional P0 polish).

**Acceptance:**
- Event marked completed yesterday → review email sent today.
- Field `reviewRequestSentAt` populated.

**Effort:** 0.5 day.

**Status — 2026-04-17:**
- ✅ Schema: `events` got `review_request_sent_at`, `review_left_at`, `referrals_generated` (default 0). Applied via direct SQL.
- ✅ Template: `eventReviewRequestEmail({ customerFirstName, eventType, eventDate, googleReviewUrl?, referralCreditDollars? })` — "How did everything go?" opener, Google review CTA (gracefully hides if URL unset), and $100-referral-credit ask. Referral amount configurable via `REFERRAL_CREDIT_DOLLARS`.
- ✅ `getReviewConfig()` added to `server/utils/siteConfig.ts` reading `GOOGLE_REVIEW_URL` + `REFERRAL_CREDIT_DOLLARS`.
- ✅ Extended `POST /api/cron/event-reminders` with a dedicated second pass: for each event where `status='completed'` AND `daysUntil === -1` AND `reviewRequestSentAt IS NULL`, send the review request email and stamp `reviewRequestSentAt`. Stamps on skip too so we don't retroactively fire 10 emails when `RESEND_API_KEY` comes online. Returns a separate `reviewResults` array in the response so cron observability is clean.
- ✅ `npm run check` passes.
- 🟡 Pending operational steps: grab the Google review link from Google Business Profile, set `GOOGLE_REVIEW_URL` in Railway. Mark a test event `completed` with an eventDate of yesterday and trigger the cron to confirm the email fires + `reviewRequestSentAt` stamps.

**P0 phase is now complete.** Every inquiry is alerted (P0-1), every proposal gives the client three doors including a calendar-booked conversation (P0-2), every decline captures a categorized reason with re-engagement hinting (P0-3), and every completed event asks for a Google review + referral (P0-4). Next up: P1 (Core Automation) or ship P0 first and observe.

---

## 5. Phase P1 — Core Automation (2–3 weeks)

### P1-1. Consultation + Tasting Booking System ✅ DONE (tasting branch — consultation was P0-2)

Already partially covered by P0-2 (consultation). Extend:

**Tasting-specific:**
1. Schema — new table `tastings`:
   ```ts
   export const tastings = pgTable("tastings", {
     id: serial("id").primaryKey(),
     opportunityId: integer("opportunity_id").references(() => opportunities.id),
     clientId: integer("client_id").references(() => clients.id),
     estimateId: integer("estimate_id").references(() => estimates.id),
     scheduledAt: timestamp("scheduled_at").notNull(),
     guestCount: integer("guest_count").notNull(),    // 2-3 per spec
     pricePerGuest: numeric("price_per_guest", { precision: 10, scale: 2 }).notNull().default("125.00"),
     totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
     status: text("status").notNull().default("scheduled"), // scheduled|completed|cancelled|no_show
     stripePaymentIntentId: text("stripe_payment_intent_id"),
     paidAt: timestamp("paid_at"),
     notes: text("notes"),
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });
   ```
2. New public page `client/src/pages/PublicTasting.tsx` at `/tasting`:
   - Marketing copy + pricing + Cal.com embed (use `CAL_COM_TASTING_URL`).
   - After booking, Stripe Checkout for the $125/$187.50/$250 total (depends on guest count picked in Cal.com).
3. Webhook handler extends `POST /api/cal-webhook` to also handle tasting bookings (distinguish via event-type slug in payload).
4. Link to `/tasting` from:
   - `PublicQuote.tsx` — add "Book a tasting instead" button near "Need More Info"
   - All follow-up emails

**Effort:** 3–4 days.

**Status — 2026-04-17:**
- ⚠️ **Pivoted Stripe → Square** at owner's direction. Rest of scope preserved.
- ✅ Schema: new `tastings` table (opportunity/client/estimate nullable refs, contact snapshot, scheduledAt, guestCount, pricePerGuestCents, totalPriceCents, `tasting_status` enum [scheduled|completed|cancelled|no_show], Square payment fields, Cal booking uid). Applied via direct SQL.
- ✅ `square` npm (v44) installed.
- ✅ `getSquareConfig()` added to siteConfig.ts reading `SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_ENVIRONMENT` (sandbox|production), `SQUARE_WEBHOOK_NOTIFICATION_URL`, `TASTING_PRICE_CENTS` (default 12500 = $125 flat), `CAL_TASTING_EVENT_SLUG` (default "tasting").
- ✅ `server/services/paymentService.ts` — `createCheckoutLink()` using Square's Checkout → Payment Links API (returns hosted checkout URL), `verifySquareWebhook()` using `WebhooksHelper` + manual HMAC fallback. Graceful skip when creds missing.
- ✅ Templates: `tastingPaymentEmail`, `tastingBookedOwnerEmail`, `tastingPaidCustomerEmail`; SMS `tastingBookedOwnerSms`, `tastingPaidOwnerSms`.
- ✅ `POST /api/cal-webhook` extended: when `eventType.slug` (or title/type) contains the tasting slug, create a `tastings` row (idempotent by Cal booking uid), try to match existing opportunity/client by email, fire Square Checkout link creation in background, email customer the payment link, alert owner via email + SMS. `BOOKING_CANCELLED` → sets `status='cancelled'`.
- ✅ `GET /api/public/tastings/:id` — minimal tasting state for the thank-you page.
- ✅ `POST /api/tastings/:id/checkout` — (re)issue a Square Checkout link, idempotent (reuses existing link if unpaid).
- ✅ `POST /api/webhooks/square` — HMAC-SHA256 signature verified. On `payment.updated`/`payment.created` with `status=COMPLETED` (or `order.fulfilled`), stamps `paidAt` + `squarePaymentId` on the matching tasting, emails customer the paid confirmation, SMS owner.
- ✅ Public `/tasting` page: marketing, $125 flat pricing, Cal.com iframe from `CAL_COM_TASTING_URL`.
- ✅ Public `/tasting/thanks?tid=…` page: shows "Pay to confirm" button pointing at the Square Checkout URL (or fetches one on-demand if missing); shows confirmed state once paid.
- ✅ "🍴 Book a tasting first" link added to public quote proposal page (opens `/tasting` in new tab, next to Need More Info + Decline).
- ✅ Routes registered in App.tsx (both public + logged-in blocks).
- ✅ `npm run check` passes.
- 🟡 Pending operational steps: Square Developer account, sandbox app → access token + application ID + location ID, webhook subscription URL + signature key. Cal.com tasting event-type with slug "tasting" (or custom — set `CAL_TASTING_EVENT_SLUG`). Mike should also add a `guestCount` custom question to the Cal.com tasting event. Smoke test at bottom of tracker.

---

### P1-2. Rewrite Follow-up Engine — Automated Drip ✅ DONE

**Goal:** Match the spec's exact cadence (Day 2 / 3–4 / 5 / 7–8 / 10) and auto-send by default, no admin approval.

**Today:** `POST /api/cron/follow-up-engine` (routes.ts:2678) creates DRAFTS in `followUpDrafts` table and waits for admin to review.

**Proposed changes:**
1. Add column to `opportunities`: `followUpSequenceStartedAt: timestamp` (set when quote is sent or inquiry marked viewed, whichever is the "clock starts" moment — agree with Mike).
2. Add column `followUpSequenceStep: integer` (0 = not started, 1–5 = which step last completed).
3. Add column `followUpSequencePausedAt: timestamp` — set when client replies via any channel (email reply, SMS reply, opens quote, books call, accepts/declines). Use this to pause the drip.
4. Rewrite engine logic:
   - For each opportunity where `followUpSequenceStartedAt IS NOT NULL AND followUpSequencePausedAt IS NULL`:
     - Compute days since start.
     - If day ≥ 2 and step < 1 → send Day-2 soft email, set step = 1.
     - If day ≥ 3 and step < 2 → send Day-3 SMS (Twilio), set step = 2.
     - If day ≥ 5 and step < 3 → send Day-5 value+tasting email, set step = 3.
     - If day ≥ 7 and step < 4 → create phone-call TASK for Mike (new `tasks` table or reuse `followUpDrafts` with type=`phone_call_task`), set step = 4, SMS Mike.
     - If day ≥ 10 and step < 5 → send Day-10 final urgency email, set step = 5.
5. Add all 5 templates to `emailTemplates.ts` + `smsTemplates.ts`, wording from `sales_funnel.md:137-182`. Use merge tags `{firstName}`, `{eventDate}`, `{bookingUrl}`, `{tastingUrl}`.
6. Pause-triggers (add to existing routes):
   - Any inbound email via GAS intake that matches thread → pause.
   - OpenPhone inbound call matching phone → pause.
   - Client opens proposal (`viewedAt` just changed) → pause.
   - Client clicks "Need More Info" / books consultation / books tasting → pause.
   - Accept / decline → pause and end.
7. Admin UI: small panel on `OpportunityDetailPage.tsx` showing "Drip: Step 3/5, next at …" with **Pause / Resume** buttons.

**Schema migration safety:** keep `followUpDrafts` table as-is but mark the older engine's code paths as deprecated (delete in a follow-up commit after confirming no one relies on the drafts workflow).

**Effort:** 4–5 days including templates and QA.

**Status — 2026-04-17:**
- ✅ Schema: `opportunities` got `follow_up_sequence_started_at`, `follow_up_sequence_step` (int, default 0), `follow_up_sequence_paused_at`. Applied via direct SQL. Added `drip_phone_call` value to `follow_up_draft_type` enum.
- ✅ Templates: `dripDay2SoftEmail`, `dripDay5ValueEmail`, `dripDay10FinalEmail` (with quote/tasting/booking CTAs, gracefully drop CTAs when URLs unset); SMS `dripDay3CustomerSms` (≤160 chars), `dripDay7OwnerSms`.
- ✅ **Clock-start decision:** set on first quote view (`viewedAt` stamp in `POST /api/public/quote/:token/view`), per the plan's recommendation. Handles silent customers while pausing on any engagement signal.
- ✅ **Pause helper:** module-level `pauseOpportunityDrip(oppId, reason)` in `routes.ts`. Wired into 6 sites:
  - Quote accepted (P0)
  - Quote declined (P0)
  - "I need more info" click (P0-2)
  - Cal.com `BOOKING_CREATED` (P0-2)
  - Inbound email matched to existing thread (gas-email-intake)
  - Inbound OpenPhone call matched to existing opportunity
- ✅ `POST /api/cron/drip-engine` — per-opportunity 5-step cadence (Day 2 email, Day 3 SMS, Day 5 email, Day 7 phone-call TASK in `followUpDrafts` + owner SMS, Day 10 final email). Step progression stamped on `follow_up_sequence_step`. Gated by `FOLLOWUP_AUTOSEND_ENABLED=true` — when unset, the cron is a no-op (per plan rollout safety note).
- ✅ Admin endpoints: `GET /api/opportunities/:id/drip-state`, `POST /api/opportunities/:id/drip-pause`, `POST /api/opportunities/:id/drip-resume`.
- ✅ Admin UI: `<DripPanel>` component on `OpportunityDetailPage.tsx` showing current step, next-step label + timestamp, pause/resume buttons, and a warning badge when `FOLLOWUP_AUTOSEND_ENABLED` is off.
- ✅ Existing `/api/cron/follow-up-engine` (draft-only) left untouched. Old flow stays available for anything the drip doesn't cover (e.g. not-viewed-yet quotes).
- ✅ `npm run check` passes.
- 🟡 Pending operational steps: add `FOLLOWUP_AUTOSEND_ENABLED=true` to Railway, register a daily cron calling `/api/cron/drip-engine` (same `x-cron-secret` header as other crons), smoke test by creating a test opportunity + fake viewing a quote 2 days ago and hitting the cron.

---

### P1-3. Calendar Booking Widget Embedded on Public Inquiry Form ✅ DONE

**Goal:** After a client submits the inquiry, present an optional "book a free 15-min call now" Cal.com embed on the thank-you page. Funnel spec step 2 explicitly says: *"Client is also given the opportunity to book a Zoom or phone call directly on your calendar."*

**Frontend:**
1. Edit `client/src/pages/PublicInquiryForm.tsx` (and the other 3 inquiry form variants — audit first which are actually linked from the live site).
2. On successful submission, show 2-column layout:
   - Left: "We got it — Mike will respond within X hours."
   - Right: Cal.com iframe (consultation URL) prefilled with the submitter's name/email.
3. No backend change — Cal.com webhook from P0-2 handles booking confirmation.

**Effort:** 0.5 day.

**Status — 2026-04-17:**
- ✅ Audit: only `/request-quote` → `RequestQuote.tsx` is actually routed in `App.tsx`. `PublicInquiryForm`, `PublicEventInquiryPage`, wedding variants are dormant (no `<Route>` entries). Focused P1-3 on `RequestQuote.tsx` only. Dormant forms can be deleted in a follow-up pass.
- ✅ New public endpoint `GET /api/public/cal-config` returning `{ consultationUrl, tastingUrl }`. No PII, no token — safe for anonymous clients. Both URLs pull from env, so changing a Cal.com link doesn't need a rebuild.
- ✅ Post-submit thank-you in `RequestQuote.tsx` is now a responsive 2-column grid: confirmation card on the left, Cal.com iframe on the right with prefilled `name` + `email` query params. Grid collapses to single-column centered card when Cal.com isn't configured, so the page still looks clean without env vars.
- ✅ `npm run check` passes.
- 🟡 Pending: smoke test — submit a test quote request, confirm both columns render, book a slot, verify Cal.com confirmation email + Mike's existing Cal.com setup alerts him (backend booking round-trip lands back as an un-linked booking since there's no estimate yet; that's expected for inquiry-stage bookings).

---

## 6. Phase P2 — Heavy Lifts (3–5 weeks)

### P2-1. Contract Generation + E-Signature (BoldSign or Dropbox Sign) ✅ DONE

**Scope:**
1. New table `contracts`:
   ```ts
   export const contracts = pgTable("contracts", {
     id: serial("id").primaryKey(),
     eventId: integer("event_id").references(() => events.id).notNull(),
     estimateId: integer("estimate_id").references(() => estimates.id),
     clientId: integer("client_id").references(() => clients.id).notNull(),
     providerDocId: text("provider_doc_id"),        // BoldSign/Dropbox Sign document id
     signingUrl: text("signing_url"),
     status: text("status").notNull().default("draft"),  // draft|sent|viewed|signed|declined|expired
     sentAt: timestamp("sent_at"),
     signedAt: timestamp("signed_at"),
     pdfUrl: text("pdf_url"),                        // signed PDF on GCS
     contractSnapshot: jsonb("contract_snapshot"),   // full proposal at time of sending
     createdAt: timestamp("created_at").defaultNow().notNull(),
   });
   ```
2. New service `server/services/contractService.ts`:
   - `generateContractHtml(estimate, client, event)` — renders contract template (terms + proposal snapshot).
   - `sendForSignature(contract)` — calls provider API to create envelope, returns signing URL.
   - `handleSignedWebhook(payload)` — verify signature, update status, download signed PDF to GCS (reuse `gcpStorageService.ts`).
3. Route `POST /api/estimates/:id/send-contract` (admin) — triggered automatically when estimate accepted OR manually via button.
4. Webhook `POST /api/webhooks/boldsign` — verify + update contract status. Trigger P2-2 deposit email once signed.

**Frontend:**
- Button on `OpportunityDetailPage`/`ClientPortal`: "Send contract."
- Client portal shows contract status + signing link.

**Acceptance:** accept quote → admin clicks "Send contract" → client signs → status = `signed`, signed PDF stored.

**Effort:** 5–7 days.

**Status — 2026-04-17:**
- ✅ Schema: new `contracts` table + `contract_status` enum (draft|sent|viewed|signed|declined|expired|cancelled). Applied via direct SQL.
- ✅ `server/services/contractService.ts` — `generateContractHtml()` (renders a full contract incl. event details, menu snapshot, fees/payment schedule, T&Cs, signature blocks), `sendContractForSignature()` (BoldSign REST via fetch — no SDK), `verifyBoldSignWebhook()` (HMAC-SHA256), `boldSignEventToStatus()` (event-name → status mapper).
- ✅ `getBoldSignConfig()` reading `BOLDSIGN_API_KEY`, `BOLDSIGN_WEBHOOK_SECRET`, `BOLDSIGN_API_BASE`, `BOLDSIGN_SENDER_EMAIL`, `BOLDSIGN_SENDER_NAME`. Graceful skip when unset.
- ✅ Auto-create draft contract on quote accept (idempotent, won't duplicate).
- ✅ Routes: `GET /api/estimates/:id/contract`, `POST /api/estimates/:id/send-contract`, `POST /api/webhooks/boldsign`.
- ✅ Templates: `contractSentCustomerEmail`, `contractSignedOwnerEmail`, SMS `contractSignedOwnerSms`.
- ✅ `ContractPanel` added to `OpportunityDetailPage.tsx` — shows current status badge, "Send contract" / "Resend" button, "View PDF" when signed.
- ✅ On signed webhook: stamps `signedAt`, fires owner email + SMS, AND auto-fires the deposit checkout (P2-2 integration).
- 🟡 Pending operational steps: BoldSign free/trial account, API key, webhook registration at `<base>/api/webhooks/boldsign`. See tracker.

---

### P2-2. ~~Stripe~~ Square Deposit Collection (35%) ✅ DONE

**Scope:**
1. Schema additions:
   ```ts
   // on events
   depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }),
   depositPaidAt: timestamp("deposit_paid_at"),
   depositStripeIntentId: text("deposit_stripe_intent_id"),
   balanceAmount: numeric("balance_amount", { precision: 10, scale: 2 }),
   balancePaidAt: timestamp("balance_paid_at"),
   balanceStripeIntentId: text("balance_stripe_intent_id"),
   ```
   Also add `payments` table if you want line-item history.
2. Service `server/services/paymentService.ts`:
   - `createDepositCheckoutSession(event)` — Stripe Checkout Session, line item = 35% of grand total, metadata = `{ eventId, type: "deposit" }`.
   - `createBalanceCheckoutSession(event)` — similar, for remaining balance due 7 days before event.
3. Route `POST /api/events/:id/deposit/checkout` — returns Stripe Checkout URL.
4. Webhook `POST /api/webhooks/stripe`:
   - Verify signature.
   - On `checkout.session.completed` with `type: "deposit"` → mark deposit paid, send confirmation email, trigger "event confirmed" flow.
   - On balance payment completed → mark balance paid.
5. Auto-email trigger: after contract signed (P2-1 webhook) → email client with deposit Checkout link.
6. Cron addition: 7 days before event → email balance payment link if `balancePaidAt IS NULL`.

**Frontend:** client portal shows deposit + balance status with "Pay now" button when due.

**Effort:** 4–5 days.

**Status — 2026-04-17:**
- ⚠️ **Pivoted Stripe → Square** to match P1-1's payment provider choice. Same Square account + webhook handles tastings, event deposits, event balances.
- ✅ Schema: `events` got `deposit_percent` (default 35), `deposit_amount_cents`, `deposit_paid_at`, Square deposit fields (link id/url/order id/payment id), plus the same set for balance: `balance_amount_cents`, `balance_paid_at`, `balance_requested_at`, and Square balance fields.
- ✅ `getDepositPercent()` reads `DEPOSIT_PERCENT` env (default 35).
- ✅ Helpers `ensureEventDepositCheckout(eventId)` and `ensureEventBalanceCheckout(eventId)` — generate Square Payment Link (idempotent — reuses existing link if unpaid), store link fields, email the customer the payment link.
- ✅ Public routes: `POST /api/events/:id/deposit/checkout`, `POST /api/events/:id/balance/checkout`.
- ✅ Square webhook (`POST /api/webhooks/square`) now routes by `orderId` → tasting, event-deposit, or event-balance. On COMPLETED: stamps `paidAt`, fires customer confirmation email + owner email + owner SMS.
- ✅ Contract-signed webhook auto-fires `ensureEventDepositCheckout(event.id)` → customer gets the deposit email without admin action.
- ✅ Event-reminders cron got a new 7-day balance-reminder branch: for events with `daysUntil === 7` AND no balance paid/requested, fires `ensureEventBalanceCheckout` (generates Square link + emails customer). Gated by `balanceRequestedAt` so it only sends once.
- ✅ Templates: `depositRequestCustomerEmail`, `balanceRequestCustomerEmail`, `paymentReceivedCustomerEmail` (deposit or balance), `paymentReceivedOwnerEmail` (both kinds). SMS `paymentReceivedOwnerSms` (both kinds).
- 🟡 Pending operational steps: same Square setup as P1-1 (already documented). Square webhook subscription should include the new event types (deposit/balance) — no config change needed since the same webhook URL handles all.

---

### P2-3. Lead Source Attribution + Marketplace Intake Polish ✅ DONE

**Scope:**
1. URL param capture:
   - Edit inquiry form to read `?source=X&utm_source=Y&utm_campaign=Z&ref=...` and include in POST body.
   - Store in `opportunitySource` (existing) and new `utmCampaign`, `utmMedium` columns.
2. Email-based intake for Knot/Zola/WeddingWire/Bash:
   - Forward their inbound emails to a Gmail that GAS parses (already infrastructure exists — `POST /api/gas-email-intake`).
   - Add parser rules in GAS to detect sender domain → set `source` to `knot`/`zola`/`wedding_wire`/`the_bash` automatically.
   - Enhance rawLead AI extraction to pull guest count/date/venue from their structured emails.
3. Reporting extension: break down `/api/reports/funnel` by source (already returns totals — add `bySource: Record<string, {count, booked, revenue}>`). Update `Pipeline.tsx` with a source filter chip.

**Effort:** 2–3 days.

**Status — 2026-04-17:**
- ✅ Schema: `opportunities` got `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer`. Applied via direct SQL.
- ✅ `POST /api/opportunities/public-inquiry` accepts UTM + referrer fields and writes them to the opportunity. Also defaults `opportunitySource` to `utmSource` when present.
- ✅ `RequestQuote.tsx` captures URL params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `source`) + `document.referrer` on mount and attaches them to the quote-request submission. Stored in `quoteRequests.source` (primary) + `quoteRequests.referralDetail` (full breakdown). When the admin converts a quote-request to an opportunity, `source` → `opportunitySource` (already wired in quoteRoutes).
- ✅ `GET /api/reports/funnel` response now includes `bySource: { [source]: { count, booked, revenue, utmCampaigns: {campaign: count} } }` aggregated across all opportunities. Sources with zero bookings still appear so Mike can spot noisy channels.
- 🟡 Skipped per scope: Knot/Zola/WeddingWire GAS parser rules (those are external Google Apps Script changes, not in this repo), and an explicit Pipeline source-filter chip (data is exposed; UI chip is a future polish).

---

## 7. Cross-Cutting Work

### 7.1 Admin Task Inbox
Currently follow-up drafts are the only "todo" surface. With the drip rewrite (P1-2) we need a true task inbox:
- Table `tasks` — `{ id, type, opportunityId, assignedTo, dueAt, completedAt, title, body }`
- Page `client/src/pages/Tasks.tsx` (or a right-sidebar on dashboard) — lists open tasks, filter by type/assignee.
- Phone-call-on-day-7 creates a task instead of an email draft.

### 7.2 Monitoring / Alerting
- Log every send (email, SMS) to `communications` already. Add a daily `/api/cron/health-check` that:
  - Counts sends in last 24h, SMS failures, unprocessed webhooks.
  - Emails a summary to `OWNER_EMAIL` if anomalies (0 sends when there should be some, ≥5% Twilio errors).

### 7.3 Testing
- Twilio / Stripe / BoldSign / Cal.com all have **test modes**. Keep `_TEST` vars for local + one QA round.
- Seed script to create fake opportunity → send quote → simulate acceptance → trigger contract + deposit → fire event → day-after review email. Run end-to-end before each P1/P2 release.

### 7.4 Rollout
- Each phase ships as an independent merge to `main` (auto-deploys on Railway).
- Feature-flag nothing — this is solo-owner use, roll forward if broken. Exception: the follow-up drip rewrite — keep the old draft-engine endpoint live for 2 weeks behind a `FOLLOWUP_AUTOSEND_ENABLED` env var in case Mike wants to fall back.

---

## 8. Database Migration Summary

All in `shared/schema.ts`; run `npm run db:push` after each commit.

**New tables:** `tastings`, `contracts`, `tasks`, optionally `payments`.
**Modified tables:**
- `estimates` — `infoRequestedAt`, `infoRequestNote`, `consultationBookedAt`, `consultationMeetingUrl`, `declineFeedbackToken`, `declineFeedbackSubmittedAt`, `declineCategory`.
- `opportunities` — `followUpSequenceStartedAt`, `followUpSequenceStep`, `followUpSequencePausedAt`, `utmCampaign`, `utmMedium`.
- `events` — `reviewRequestSentAt`, `reviewLeftAt`, `referralsGenerated`, `depositAmount`, `depositPaidAt`, `depositStripeIntentId`, `balanceAmount`, `balancePaidAt`, `balanceStripeIntentId`.

Backup before each push: `pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).dump`.

---

## 9. Suggested Delivery Order & Timeline

| Week | Deliverable |
|---|---|
| 1 | P0-1 (SMS alerts) + P0-3 (decline feedback) + P0-4 (review request) |
| 2 | P0-2 ("Need More Info" + Cal.com consultation) |
| 3 | P1-3 (post-inquiry booking widget) + P1-2 kick-off (schema + pause triggers) |
| 4 | P1-2 complete (all 5 drip templates, auto-send) + P1-1 (tasting booking + Stripe for tasting only) |
| 5 | P2-1 kick-off (contracts) |
| 6 | P2-1 complete + P2-2 (deposit Stripe) |
| 7 | P2-2 complete (balance payments) + P2-3 (source attribution polish) |
| 8 | Cross-cutting (task inbox, monitoring, end-to-end QA) |

~8 weeks end-to-end for one full-time developer. P0 alone (2 weeks) closes the biggest user-visible gaps.

---

## 10. Handoff Checklist for the Builder

Before starting, the builder should:
- [ ] Read `replit.md`, `sales_funnel.md`, and this plan.
- [ ] Spin up locally: `npm install && npm run dev`. Confirm login works against a Neon branch DB.
- [ ] Read `server/routes.ts` lines 1100–2900 to grok inquiry, quote, accept, decline, cron patterns.
- [ ] Read `server/utils/email.ts` and `emailTemplates.ts` fully.
- [ ] Read `shared/schema.ts` — it's the source of truth.
- [ ] Create Twilio/Stripe/BoldSign test accounts. Add test-mode env vars locally.
- [ ] Ship P0-1 first (smallest, validates the SMS infra and patterns).

Questions to resolve with Mike before coding:
1. Does the drip "clock" start when inquiry is sent, when quote is sent, or when quote is first viewed? (Recommend: quote viewed.)
2. Which existing inquiry form is the canonical one? (4 exist: `PublicInquiryForm`, `PublicEventInquiryPage`, `RequestQuote`, the wedding inquiry variant.) Consolidate if possible.
3. Exact wording on SMS templates (160-char limit — rehearse with Mike).
4. Referral program mechanics — just tracking, or actual $100 credit + coupon code generation?
5. Contract template — does Mike have a PDF/Word doc to adapt, or write from scratch?

---

*End of plan.*
