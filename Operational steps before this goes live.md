# Operational steps before this goes live

Tracker for non-code setup (accounts, env vars, webhooks, smoke tests).
Tick each box as you complete it.

---

## P0-1 — SMS owner alerts (Twilio)

- [ ] Sign up at twilio.com/try-twilio (free trial, no credit card needed)
- [ ] Buy a Twilio phone number (uses trial credit)
- [ ] Verify your mobile as a Caller ID
- [ ] Add env vars on Railway:
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_PHONE_NUMBER` (+1…)
  - [ ] `OWNER_SMS_NUMBER` (+1… — Mike's mobile)
- [ ] Smoke test: submit a test public inquiry → SMS lands on Mike's phone within 60s → `communications` table has a new row with `type='sms'`, `source='twilio'`

---

## P0-2 — "I Need More Info" + consultation booking (Cal.com)

- [ ] Create a Cal.com account (self-host or hosted)
- [ ] Create event type: **Consultation** (15–30 min, Zoom + phone options)
- [ ] Create event type: **Tasting** (separate slug, used later in P1-1)
- [ ] On the Consultation event, add a custom question:
  - slug: `estimateToken`
  - type: text
  - visibility: hidden (or optional)
- [ ] Register a webhook in Cal.com → **Settings → Developer → Webhooks**:
  - URL: `<PUBLIC_BASE_URL>/api/cal-webhook`
  - Secret: paste the same value you'll set as `CAL_COM_WEBHOOK_SECRET`
  - Triggers: `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`
- [ ] Add env vars on Railway:
  - [ ] `CAL_COM_EMBED_URL` (e.g. `https://cal.com/homebites/consultation`)
  - [ ] `CAL_COM_TASTING_URL` (e.g. `https://cal.com/homebites/tasting`)
  - [ ] `CAL_COM_WEBHOOK_SECRET`
- [ ] Smoke test:
  - [ ] Open a sent quote → click **I need more info** → type a note → submit → iframe renders Cal.com
  - [ ] Book a slot → owner email + SMS land
  - [ ] Reload the quote page → "✓ Call scheduled for …" shows
  - [ ] Cancel the Cal.com booking → `consultation_booked_at` clears on next page load

---

## P0-3 — Decline feedback email + magic-link form

Nothing to configure — uses existing Resend + Twilio setup.

- [ ] Smoke test:
  - [ ] Decline a sent test quote → client inbox gets the "Thank you — one quick favor" email within 60s
  - [ ] Mike's phone gets the owner SMS alert
  - [ ] Click the magic link in the email → form loads with the client's name
  - [ ] Pick a category (e.g. **Pricing**) + optional note → submit → thank-you state
  - [ ] `estimates` row shows `decline_category = 'pricing'` and `decline_feedback_submitted_at` set
  - [ ] Mike's inbox gets the "decline feedback — consider re-engaging" owner email

---

## P0-4 — Post-event review + referral email

- [ ] In Google Business Profile, grab the "short review URL" (Home → Get more reviews → Share review form)
- [ ] Add env vars on Railway:
  - [ ] `GOOGLE_REVIEW_URL` (e.g. `https://g.page/r/…/review`)
  - [ ] `REFERRAL_CREDIT_DOLLARS` (optional — defaults to `100`)
- [ ] Confirm the Railway cron scheduler hits `POST /api/cron/event-reminders` daily with header `x-cron-secret: $CRON_SECRET`
- [ ] Smoke test:
  - [ ] Set a test event's `event_date` to yesterday, `status='completed'`
  - [ ] Trigger cron manually: `curl -X POST -H "x-cron-secret: <secret>" <base>/api/cron/event-reminders`
  - [ ] Client inbox gets the "How did everything go?" email with review + referral CTAs
  - [ ] `events.review_request_sent_at` is stamped
  - [ ] Re-running the cron does NOT double-send

---

## P1-3 — Cal.com widget on inquiry thank-you

Reuses the P0-2 Cal.com env vars — no new credentials needed.

- [ ] Smoke test:
  - [ ] Open `/request-quote` in incognito → fill out a test inquiry → submit
  - [ ] Confirmation card shows on the left, Cal.com iframe on the right (desktop) or stacked (mobile)
  - [ ] Name + email fields are prefilled inside the Cal.com iframe
  - [ ] Book a slot → customer receives Cal.com confirmation email
  - [ ] Mike's existing Cal.com notifications fire (no app-side round-trip since the inquiry doesn't have an estimate yet — handled at proposal stage by P0-2)
  - [ ] Unset `CAL_COM_EMBED_URL` → confirmation card shows centered with no empty right column (graceful degradation)

---

## P1-2 — Auto-send follow-up drip engine

This one is gated so nothing fires until you flip the flag — do the smoke tests first.

- [ ] Add env vars on Railway:
  - [ ] `FOLLOWUP_AUTOSEND_ENABLED=false` (keep off until tested)
- [ ] Register a daily cron (Railway scheduler) hitting `POST /api/cron/drip-engine` with header `x-cron-secret: $CRON_SECRET` (same secret as other crons; pick a quiet time like 9am PT)
- [ ] Smoke test WITHOUT auto-send (flag off):
  - [ ] Open a sent quote as a test customer → quote-view endpoint stamps `opportunities.follow_up_sequence_started_at`
  - [ ] Check `DripPanel` on the opportunity detail page → shows "Step 0/5" and a warning that `FOLLOWUP_AUTOSEND_ENABLED` is off
  - [ ] Trigger cron manually: `curl -X POST -H "x-cron-secret: <secret>" <base>/api/cron/drip-engine` → response shows `disabled: true`
- [ ] Smoke test WITH auto-send (flag on):
  - [ ] Set `FOLLOWUP_AUTOSEND_ENABLED=true`, redeploy
  - [ ] In Neon: `UPDATE opportunities SET follow_up_sequence_started_at = now() - interval '2 days 1 hour', follow_up_sequence_step = 0 WHERE id = <test_opp_id>`
  - [ ] Trigger cron manually → Day 2 email lands in customer inbox, `follow_up_sequence_step = 1`
  - [ ] Advance back-dating to 3d → Day 3 SMS lands (if `phone` on file)
  - [ ] Advance to 7d → a `follow_up_drafts` row with `type='drip_phone_call'` appears AND Mike gets owner SMS "☎️ Call …"
  - [ ] Reply to the customer's email (via GAS intake) → `DripPanel` flips to "Paused", subsequent cron runs skip this opp
  - [ ] Click "Resume" on the panel → next cron run continues from where it paused

---

## P1-1 — Tasting booking + Square Checkout

### Square setup (sandbox first!)

- [ ] Sign up at [developer.squareup.com](https://developer.squareup.com) (or log in with existing Square account)
- [ ] Create an application → "Home Bites Catering"
- [ ] Copy from the app dashboard:
  - [ ] **Sandbox access token** → `SQUARE_ACCESS_TOKEN`
  - [ ] **Sandbox application ID** → `SQUARE_APPLICATION_ID`
  - [ ] **Sandbox location ID** → `SQUARE_LOCATION_ID`
- [ ] In the app → **Webhooks**:
  - [ ] Create subscription, URL: `<PUBLIC_BASE_URL>/api/webhooks/square`
  - [ ] Events: `payment.created`, `payment.updated`, `order.fulfilled`
  - [ ] Copy the **signature key** → `SQUARE_WEBHOOK_SIGNATURE_KEY`
- [ ] Add env vars on Railway:
  - [ ] `SQUARE_ACCESS_TOKEN`
  - [ ] `SQUARE_APPLICATION_ID`
  - [ ] `SQUARE_LOCATION_ID`
  - [ ] `SQUARE_WEBHOOK_SIGNATURE_KEY`
  - [ ] `SQUARE_ENVIRONMENT=sandbox` (flip to `production` when ready)
  - [ ] `SQUARE_WEBHOOK_NOTIFICATION_URL=<PUBLIC_BASE_URL>/api/webhooks/square` (must match exactly what Square posts to)
  - [ ] `TASTING_PRICE_CENTS=12500` (optional — defaults to $125)

### Cal.com tasting event

- [ ] Create a Cal.com event type named **Tasting** with a memorable slug (e.g. `tasting`)
- [ ] If you use a different slug, set `CAL_TASTING_EVENT_SLUG=<slug>` on Railway
- [ ] Add a custom question `guestCount` (number, required) — defaults to 2 if omitted
- [ ] Confirm the existing `CAL_COM_WEBHOOK_SECRET` is configured (set in P0-2) — the same webhook handles both consultations and tastings
- [ ] Grab the public URL and set `CAL_COM_TASTING_URL` on Railway

### Smoke test

- [ ] Visit `/tasting` in incognito → Cal.com iframe renders
- [ ] Book a slot using a test email, set guestCount=2
- [ ] Server logs show the webhook firing, a `tastings` row is created, Square Checkout link URL is stored
- [ ] Customer inbox receives "Your Home Bites tasting is booked — complete payment" with Pay button
- [ ] Mike's inbox gets the owner email, phone gets SMS "🍴 Tasting booked: …"
- [ ] Click the Pay button → Square sandbox checkout → pay with test card (e.g. `4111 1111 1111 1111`)
- [ ] After redirect to `/tasting/thanks?tid=…`, page shows "Paid" + confirmation details
- [ ] Square webhook fires → `tastings.paid_at` is stamped, `tastings.square_payment_id` is stored
- [ ] Customer inbox gets "Payment received — see you at your tasting"
- [ ] Mike's phone gets SMS "💰 Tasting paid: …"
- [ ] Open a sent quote → the "🍴 Book a tasting first" link is visible next to Need More Info / Decline
- [ ] Cancel the Cal.com booking → `tastings.status` flips to `'cancelled'` on next webhook
- [ ] Flip `SQUARE_ENVIRONMENT=production` and repeat with a real (refundable) micro-payment only when confident

---

## P2-1 — Contracts + E-signature (BoldSign)

### BoldSign setup

- [ ] Create account at [boldsign.com](https://boldsign.com) (free tier: 5 docs/mo)
- [ ] Developer → API → copy **API key** → `BOLDSIGN_API_KEY`
- [ ] Developer → Webhooks → create subscription:
  - URL: `<PUBLIC_BASE_URL>/api/webhooks/boldsign`
  - Events: Document Sent, Document Viewed, Document Completed, Document Declined, Document Expired, Document Revoked
  - Copy signature secret → `BOLDSIGN_WEBHOOK_SECRET`
- [ ] Add env vars on Railway:
  - [ ] `BOLDSIGN_API_KEY`
  - [ ] `BOLDSIGN_WEBHOOK_SECRET`
  - [ ] `BOLDSIGN_SENDER_EMAIL` (optional — defaults to `HOMEBITES_FROM_EMAIL`)
  - [ ] `BOLDSIGN_SENDER_NAME` (optional)

### Smoke test

- [ ] Accept a test quote → `contracts` row is auto-created (status `draft`)
- [ ] Open the opportunity detail page → **Contract panel** shows "Draft — not sent" + **Send contract** button
- [ ] Click **Send contract** → BoldSign dispatches email to customer, panel status flips to **Sent**
- [ ] Customer opens email → clicks signing link → BoldSign webhook fires → panel status = **Viewed**
- [ ] Customer signs → webhook fires → panel status = **Signed ✓**, "View PDF" link appears
- [ ] Mike gets owner email "🖋️ {name} signed the contract" + SMS
- [ ] Deposit email is auto-dispatched to the customer (see P2-2 smoke test continuation)

---

## P2-2 — Deposit + Balance collection (Square)

Reuses P1-1's Square setup. Just two more event types in the webhook subscription:

- [ ] In Square Developer → Webhooks, confirm the existing subscription already covers `payment.created`, `payment.updated`, `order.fulfilled` (same as tastings — no config change needed)
- [ ] Add env vars on Railway (optional):
  - [ ] `DEPOSIT_PERCENT` (default `35`)
- [ ] Smoke test (deposit):
  - [ ] After P2-1 smoke test (contract signed) → customer receives "Let's confirm your event — deposit" email with Pay button
  - [ ] `events.deposit_amount_cents` = 35% of estimate total, `events.deposit_square_payment_link_url` set
  - [ ] Customer pays in Square sandbox (test card `4111 1111 1111 1111`) → redirects to `/event/:token?paid=deposit`
  - [ ] Webhook fires → `events.deposit_paid_at` stamped, `events.deposit_square_payment_id` stored
  - [ ] Customer email: "Deposit received — your event is locked in"
  - [ ] Mike: owner email + SMS "💰 Deposit paid: …"
- [ ] Smoke test (balance, 7-day reminder):
  - [ ] Set a test event's `event_date` to exactly 7 days from today (midnight) → trigger `POST /api/cron/event-reminders`
  - [ ] `balanceResults` in response shows the event → `events.balance_requested_at` stamped + customer email sent with balance Pay link
  - [ ] Customer pays → webhook fires → `events.balance_paid_at` + confirmation emails fire
  - [ ] Re-running the cron doesn't re-send (idempotent via `balance_requested_at`)

---

## P2-3 — Lead source attribution

No env setup needed — works out of the box.

- [ ] Smoke test:
  - [ ] Visit `/request-quote?utm_source=thekno&utm_medium=referral&utm_campaign=spring2026&source=knot` in incognito → submit
  - [ ] `opportunities.opportunity_source = 'thekno'`, `utm_source`, `utm_medium`, `utm_campaign` columns populated (after the quote-request is converted to an opportunity by Mike, or directly if submitted via the simpler public-inquiry form)
  - [ ] `GET /api/reports/funnel` → response includes `bySource: { thekno: { count: 1, booked: 0, revenue: 0, utmCampaigns: { spring2026: 1 } } }`
- [ ] Future polish (not blocking):
  - [ ] Add a source-filter chip on the Pipeline page (data is exposed — just needs UI work)
  - [ ] Update GAS to sniff sender domain (knot.com → source=knot, zola.com → source=zola, etc.) — lives in Google Apps Script, not this repo
