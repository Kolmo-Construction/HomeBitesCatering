// Email templates — one function per message type. Each returns
// { subject, html, text } so the caller can hand the result directly to sendEmail().
//
// Styling is inline CSS (required for email clients). Tone matches the customer
// event page: warm, serif-y, celebration-focused. Admin-facing templates are
// tighter and more informational.

import { getSiteConfig, getReviewConfig } from "./siteConfig";

interface TemplateResult {
  subject: string;
  html: string;
  text: string;
}

// ─── Shared layout helper ─────────────────────────────────────────────────────

function layout(innerHtml: string, preheader?: string): string {
  const config = getSiteConfig();
  // Preheader = that preview text most inboxes show next to the subject
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>`
    : "";
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${config.businessName}</title>
  </head>
  <body style="margin:0;padding:0;background:#faf7f2;font-family:Georgia,'Times New Roman',serif;color:#1f2937;">
    ${preheaderHtml}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f2;">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
            <tr>
              <td style="padding:24px 32px 8px 32px;border-bottom:1px solid #eadfcf;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#111827;">${config.businessName}</div>
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#9a7d3d;font-style:italic;margin-top:2px;">${config.tagline}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 24px 32px;font-size:16px;line-height:1.55;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px;border-top:1px solid #eadfcf;font-size:12px;color:#6b7280;text-align:center;">
                ${config.businessName} · ${config.address}<br />
                <a href="tel:${config.phone}" style="color:#9a7d3d;text-decoration:none;">${config.phone}</a> ·
                <a href="mailto:${config.email}" style="color:#9a7d3d;text-decoration:none;">${config.email}</a>
              </td>
            </tr>
          </table>
          <div style="max-width:560px;margin-top:12px;font-size:11px;color:#9ca3af;text-align:center;">
            You're receiving this because you booked an event (or requested a quote) with ${config.businessName}.
            If you believe this was sent in error, just reply and let us know.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function btn(label: string, href: string): string {
  return `<div style="margin:20px 0;text-align:center;">
    <a href="${href}" style="display:inline-block;padding:12px 28px;background:#059669;color:#ffffff;text-decoration:none;border-radius:6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;">${label}</a>
  </div>`;
}

function heading(text: string): string {
  return `<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#111827;margin:0 0 12px 0;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px 0;color:#1f2937;">${text}</p>`;
}

function italic(text: string): string {
  return `<p style="margin:0 0 12px 0;color:#6b7280;font-style:italic;">${text}</p>`;
}

function formatDate(iso: string | Date | null): string {
  if (!iso) return "a date to be confirmed";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── 1. Quote sent to customer ────────────────────────────────────────────────

export function quoteSentEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  guestCount: number | null;
  publicQuoteUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const dateStr = formatDate(args.eventDate);
  const subject = `Your Homebites quote for your ${eventTypeLabel}`;

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Thank you for thinking of us for your <strong>${eventTypeLabel}</strong> on <strong>${dateStr}</strong>${args.guestCount ? ` for ${args.guestCount} guests` : ""}. Your quote is ready.`)}
     ${paragraph(`You can review everything — menu, pricing, event details — and accept or decline with a single tap. No login needed.`)}
     ${btn("View Your Quote", args.publicQuoteUrl)}
     ${paragraph(`If you have any questions at all, just reply to this email or call ${config.chef.firstName} directly at ${config.chef.phone}. We'd love to hear from you.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Your catering quote for ${dateStr} is ready — review, accept, or decline anytime.`
  );

  const text = `Hi ${args.customerFirstName},

Thank you for thinking of us for your ${eventTypeLabel} on ${dateStr}${args.guestCount ? ` for ${args.guestCount} guests` : ""}. Your quote is ready.

Review the menu, pricing, and event details — accept or decline anytime:
${args.publicQuoteUrl}

If you have any questions, reply to this email or call ${config.chef.firstName} at ${config.chef.phone}.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── 2. Admin notification: customer viewed the quote ────────────────────────

export function quoteViewedAdminEmail(args: {
  customerName: string;
  eventType: string;
  eventDate: string | Date | null;
  totalCents: number | null;
  adminQuoteUrl: string;
}): TemplateResult {
  const formattedTotal =
    args.totalCents != null
      ? `$${(args.totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : "—";
  const subject = `${args.customerName} just viewed their quote`;

  const html = layout(
    `${heading(`Quote viewed`)}
     ${paragraph(`<strong>${args.customerName}</strong> just opened the ${args.eventType.replace(/_/g, " ")} quote for ${formatDate(args.eventDate)}.`)}
     ${paragraph(`Quote total: <strong>${formattedTotal}</strong>`)}
     ${btn("Open the Quote", args.adminQuoteUrl)}
     ${italic(`This is an automated notification from your Homebites admin portal.`)}`,
    `${args.customerName} just opened their quote.`
  );

  const text = `${args.customerName} just opened their quote for ${formatDate(args.eventDate)}.
Quote total: ${formattedTotal}
${args.adminQuoteUrl}`;

  return { subject, html, text };
}

// ─── 3a. Customer confirmation after accepting ───────────────────────────────

export function quoteAcceptedCustomerEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  publicEventUrl: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `You're booked! Your ${args.eventType.replace(/_/g, " ")} with ${config.businessName}`;

  const html = layout(
    `${heading(`You're booked!`)}
     ${paragraph(`Hi ${args.customerFirstName}, thank you for trusting us with your <strong>${args.eventType.replace(/_/g, " ")}</strong> on <strong>${formatDate(args.eventDate)}</strong>. We are so excited to cook for you.`)}
     ${paragraph(`We'll be in touch shortly to finalize any remaining details and handle the deposit.`)}
     ${args.publicEventUrl ? paragraph(`In the meantime, your personal event page is ready — bookmark it and check in anytime:`) : ""}
     ${args.publicEventUrl ? btn("Open My Event Page", args.publicEventUrl) : ""}
     ${paragraph(`If anything comes up before the day, just reply to this email or reach out to ${config.chef.firstName} directly at ${config.chef.phone}.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `You're booked! Here's your personal event page.`
  );

  const text = `Hi ${args.customerFirstName},

You're booked! Thank you for trusting us with your ${args.eventType.replace(/_/g, " ")} on ${formatDate(args.eventDate)}. We are so excited to cook for you.

${args.publicEventUrl ? `Your personal event page:\n${args.publicEventUrl}\n\n` : ""}We'll be in touch shortly to finalize details and handle the deposit.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── 3b. Admin notification: quote accepted ──────────────────────────────────

export function quoteAcceptedAdminEmail(args: {
  customerName: string;
  customerEmail: string;
  eventType: string;
  eventDate: string | Date | null;
  totalCents: number | null;
  adminEventUrl: string;
}): TemplateResult {
  const formattedTotal =
    args.totalCents != null
      ? `$${(args.totalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : "—";
  const subject = `🎉 ${args.customerName} accepted the quote`;

  const html = layout(
    `${heading(`Quote accepted!`)}
     ${paragraph(`<strong>${args.customerName}</strong> (${args.customerEmail}) just accepted the <strong>${args.eventType.replace(/_/g, " ")}</strong> quote for ${formatDate(args.eventDate)}.`)}
     ${paragraph(`Total: <strong>${formattedTotal}</strong>`)}
     ${paragraph(`A confirmed event has been created automatically — shopping list, prep schedule, and checklist are all ready.`)}
     ${btn("Open the Event", args.adminEventUrl)}
     ${italic(`Automated notification from your Homebites admin portal.`)}`,
    `${args.customerName} accepted the quote — event is booked.`
  );

  const text = `${args.customerName} (${args.customerEmail}) just accepted the quote for ${formatDate(args.eventDate)}.
Total: ${formattedTotal}
Open: ${args.adminEventUrl}`;

  return { subject, html, text };
}

// ─── 4. Event reminder to customer (parametric by days-out) ──────────────────

export type ReminderKind = "14d" | "7d" | "2d" | "day_of" | "thank_you";

export function eventReminderEmail(args: {
  kind: ReminderKind;
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  guestCount: number | null;
  publicEventUrl: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const dateStr = formatDate(args.eventDate);

  const copy: Record<ReminderKind, { subject: string; heading: string; body: string; preheader: string }> = {
    "14d": {
      subject: `Your event is in 2 weeks — quick check-in`,
      heading: `Two weeks to go!`,
      body: `Your <strong>${args.eventType.replace(/_/g, " ")}</strong> on <strong>${dateStr}</strong> is two weeks away. We're starting to ramp up prep on our end. Could you confirm your final guest count in the next week or so? We're currently planning for <strong>${args.guestCount ?? "TBD"} guests</strong>. If anything has changed, just reply and let us know.`,
      preheader: `Your event is in 2 weeks — please confirm the final headcount.`,
    },
    "7d": {
      subject: `One week to go — let us know about any dietary changes`,
      heading: `One week to go`,
      body: `We're a week out from your <strong>${args.eventType.replace(/_/g, " ")}</strong> on <strong>${dateStr}</strong>. If any dietary needs have come up — new allergies, guest preferences, anything — this is the right moment to tell us so we can adjust our prep. Otherwise, everything is on track on our end.`,
      preheader: `One week to go — send any dietary updates.`,
    },
    "2d": {
      subject: `48 hours — we're prepping now`,
      heading: `48 hours out`,
      body: `Your <strong>${args.eventType.replace(/_/g, " ")}</strong> is <strong>in 2 days</strong>. Our team is in prep mode — ingredients are in, the menu is locked, we're cooking. See you very soon.`,
      preheader: `48 hours — our team is prepping your food.`,
    },
    day_of: {
      subject: `Today's the day`,
      heading: `Today's the day ✨`,
      body: `We're on our way to make your <strong>${args.eventType.replace(/_/g, " ")}</strong> everything you hoped for. Thank you for letting us be part of it.`,
      preheader: `Today's the day — see you soon!`,
    },
    thank_you: {
      subject: `Thank you for letting us be part of your day`,
      heading: `Thank you`,
      body: `It was an honor to cook for your <strong>${args.eventType.replace(/_/g, " ")}</strong>. We hope it was everything you hoped for — and if there's anything we can do better next time, we'd love to hear from you. If you'd ever like to book with us again, we'd be thrilled to be part of your next celebration.`,
      preheader: `Thank you for letting us be part of your day.`,
    },
  };

  const { subject, heading: headingText, body, preheader } = copy[args.kind];
  const showButton = !!args.publicEventUrl && args.kind !== "thank_you";

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${heading(headingText)}
     ${paragraph(body)}
     ${showButton ? btn("Open My Event Page", args.publicEventUrl!) : ""}
     ${paragraph(`Anything to share? Just reply to this email or call ${config.chef.firstName} at ${config.chef.phone}.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    preheader
  );

  const text = `Hi ${args.customerFirstName},

${headingText}

${body.replace(/<[^>]+>/g, "")}

${args.publicEventUrl ? `Your event page: ${args.publicEventUrl}\n\n` : ""}— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── 5. Link recovery (find-my-event) ────────────────────────────────────────

export function findMyEventEmail(args: {
  customerFirstName: string;
  publicEventUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `Here's your Homebites event page`;

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Here's the link to your event page:`)}
     ${btn("Open My Event Page", args.publicEventUrl)}
     ${paragraph(`Bookmark this so you can check in any time — menu, timeline, what's coming up. Any questions, just reply.`)}
     ${italic(`— The ${config.businessName} team`)}`,
    `Here's your event page link.`
  );

  const text = `Hi ${args.customerFirstName},

Here's your event page:
${args.publicEventUrl}

Bookmark this so you can check in any time.

— The ${config.businessName} team`;

  return { subject, html, text };
}

// ─── 6. New inquiry — customer acknowledgment ────────────────────────────────

export function newInquiryCustomerAckEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `We got your inquiry — we'll be in touch soon`;

  const html = layout(
    `${heading(`Thank you, ${args.customerFirstName}!`)}
     ${paragraph(`We received your inquiry for a <strong>${args.eventType.replace(/_/g, " ")}</strong> on <strong>${formatDate(args.eventDate)}</strong>. ${config.chef.firstName} will personally review it and get back to you within 24 hours with a quote.`)}
     ${paragraph(`In the meantime, if you have any questions or want to add details, just reply to this email or call ${config.chef.firstName} directly at ${config.chef.phone}.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Thank you — we'll be in touch within 24 hours.`
  );

  const text = `Thank you, ${args.customerFirstName}!

We received your inquiry for a ${args.eventType.replace(/_/g, " ")} on ${formatDate(args.eventDate)}. ${config.chef.firstName} will get back to you within 24 hours with a quote.

Questions? Reply to this email or call ${config.chef.phone}.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── 7. New inquiry — admin notification ─────────────────────────────────────

export function newInquiryAdminEmail(args: {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  eventType: string;
  eventDate: string | Date | null;
  guestCount: number;
  menuTheme: string | null;
  menuTier: string | null;
  estimatedTotalCents: number | null;
  adminInquiryUrl: string;
}): TemplateResult {
  const totalLabel =
    args.estimatedTotalCents != null
      ? `$${(args.estimatedTotalCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : "—";
  const subject = `New inquiry: ${args.customerName} · ${args.eventType.replace(/_/g, " ")}`;

  const html = layout(
    `${heading(`New inquiry`)}
     ${paragraph(`<strong>${args.customerName}</strong> just submitted an inquiry.`)}
     <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin:12px 0;">
       <tr><td style="color:#6b7280;width:140px;">Contact</td><td>${args.customerEmail}${args.customerPhone ? ` · ${args.customerPhone}` : ""}</td></tr>
       <tr><td style="color:#6b7280;">Event</td><td>${args.eventType.replace(/_/g, " ")} on ${formatDate(args.eventDate)}</td></tr>
       <tr><td style="color:#6b7280;">Guests</td><td>${args.guestCount}</td></tr>
       <tr><td style="color:#6b7280;">Menu</td><td>${args.menuTheme ? `${args.menuTheme.replace(/_/g, " ")}${args.menuTier ? ` / ${args.menuTier}` : ""}` : "—"}</td></tr>
       <tr><td style="color:#6b7280;">Estimated total</td><td><strong>${totalLabel}</strong></td></tr>
     </table>
     ${btn("Review in Admin", args.adminInquiryUrl)}
     ${italic(`Automated notification from your Homebites admin portal.`)}`,
    `New inquiry from ${args.customerName} — ${args.eventType.replace(/_/g, " ")}.`
  );

  const text = `New inquiry from ${args.customerName}

Contact: ${args.customerEmail}${args.customerPhone ? ` · ${args.customerPhone}` : ""}
Event: ${args.eventType.replace(/_/g, " ")} on ${formatDate(args.eventDate)}
Guests: ${args.guestCount}
Menu: ${args.menuTheme ?? "—"}${args.menuTier ? ` / ${args.menuTier}` : ""}
Estimated total: ${totalLabel}

Review: ${args.adminInquiryUrl}`;

  return { subject, html, text };
}

// ─── 8. Inquiry invitation: admin sends customer a link to fill out the form ──

export function inquiryInvitationEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  inquiryUrl: string;
  personalNote?: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const dateStr = formatDate(args.eventDate);
  const subject = `${config.businessName} — let's plan your ${eventTypeLabel}!`;

  const noteHtml = args.personalNote
    ? paragraph(args.personalNote.replace(/\n/g, "<br />"))
    : "";
  const noteText = args.personalNote ? `${args.personalNote}\n\n` : "";

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${noteHtml}
     ${paragraph(`Thank you for your interest in having us cater your <strong>${eventTypeLabel}</strong> on <strong>${dateStr}</strong>. We'd love to put together the perfect menu for you.`)}
     ${paragraph(`To get started, fill out our quick menu planner — pick your theme, select your dishes, and tell us about any dietary needs. It only takes a few minutes.`)}
     ${btn("Plan Your Menu", args.inquiryUrl)}
     ${paragraph(`Once we receive your selections, we'll prepare a personalized quote and get back to you promptly.`)}
     ${paragraph(`Questions? Reply to this email or call ${config.chef.firstName} at ${config.chef.phone}.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Let's plan the menu for your ${eventTypeLabel} — fill out our quick planner.`
  );

  const text = `Hi ${args.customerFirstName},

${noteText}Thank you for your interest in having us cater your ${eventTypeLabel} on ${dateStr}. We'd love to put together the perfect menu for you.

Fill out our quick menu planner to get started:
${args.inquiryUrl}

Once we receive your selections, we'll prepare a personalized quote and get back to you promptly.

Questions? Reply to this email or call ${config.chef.firstName} at ${config.chef.phone}.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── Follow-Up Draft Templates (Tier 1) ──────────────────────────────────────
// Generate initial draft content. Admin reviews & edits before sending.

export function followUpInquiryNotOpened(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  inquiryUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const dateStr = formatDate(args.eventDate);
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Still interested in catering for your ${eventTypeLabel}?`;
  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`A few days ago we sent you a link to plan the menu for your ${eventTypeLabel}${args.eventDate ? ` on ${dateStr}` : ""}. We wanted to make sure it didn't get lost in your inbox!`)}
     ${btn("Plan Your Menu", args.inquiryUrl)}
     ${paragraph("It only takes a few minutes, and we'll send you a personalized quote based on your selections.")}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Quick reminder about your ${eventTypeLabel} catering`
  );
  const text = `Hi ${args.customerFirstName}, A few days ago we sent you a link to plan the menu for your ${eventTypeLabel}. Plan your menu here: ${args.inquiryUrl} — ${config.chef.firstName} and the ${config.businessName} team`;
  return { subject, html, text };
}

export function followUpInquiryNotSubmitted(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  inquiryUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const dateStr = formatDate(args.eventDate);
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Need help with your ${eventTypeLabel} menu?`;
  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`We noticed you started looking at menu options for your ${eventTypeLabel}${args.eventDate ? ` on ${dateStr}` : ""} but didn't finish. No worries — you can pick up right where you left off!`)}
     ${btn("Continue Planning", args.inquiryUrl)}
     ${paragraph("If you have any questions about the menu, we're happy to chat.")}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Pick up where you left off on your ${eventTypeLabel} menu`
  );
  const text = `Hi ${args.customerFirstName}, We noticed you started planning your ${eventTypeLabel} menu but didn't finish. Continue here: ${args.inquiryUrl} — ${config.chef.firstName} and the ${config.businessName} team`;
  return { subject, html, text };
}

export function followUpQuoteNotViewed(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  quoteUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Your ${eventTypeLabel} quote is ready`;
  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Just a friendly reminder — your personalized quote for your ${eventTypeLabel} is waiting for you.`)}
     ${btn("View Your Quote", args.quoteUrl)}
     ${paragraph("Take a look and let us know if you have any questions!")}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Your ${eventTypeLabel} quote is ready to review`
  );
  const text = `Hi ${args.customerFirstName}, Your personalized quote for your ${eventTypeLabel} is ready: ${args.quoteUrl} — ${config.chef.firstName} and the ${config.businessName} team`;
  return { subject, html, text };
}

export function followUpQuoteNoAction(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  quoteUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Any questions about your ${eventTypeLabel} quote?`;
  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`We wanted to check in — do you have any questions about the quote for your ${eventTypeLabel}?`)}
     ${btn("Review Your Quote", args.quoteUrl)}
     ${paragraph(`We're happy to adjust the menu, pricing, or any details. Just reply to this email or give ${config.chef.firstName} a call.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Checking in on your ${eventTypeLabel} quote`
  );
  const text = `Hi ${args.customerFirstName}, Do you have any questions about the quote for your ${eventTypeLabel}? ${args.quoteUrl} — ${config.chef.firstName} and the ${config.businessName} team`;
  return { subject, html, text };
}

export function followUpQuoteExpiringSoon(args: {
  customerFirstName: string;
  eventType: string;
  quoteUrl: string;
  expiresAt: string | Date;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const expiryDate = formatDate(args.expiresAt);
  const subject = `Your ${eventTypeLabel} quote expires soon`;
  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Quick heads-up — your quote for your ${eventTypeLabel} expires on ${expiryDate}. After that, pricing may change based on availability.`)}
     ${btn("Accept Your Quote", args.quoteUrl)}
     ${paragraph("If you need more time or want to discuss changes, just let us know!")}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Your ${eventTypeLabel} quote expires on ${expiryDate}`
  );
  const text = `Hi ${args.customerFirstName}, Your quote for your ${eventTypeLabel} expires on ${expiryDate}. Review: ${args.quoteUrl} — ${config.chef.firstName} and the ${config.businessName} team`;
  return { subject, html, text };
}

// ─── P0-2: "I Need More Info" — client ack ────────────────────────────────────

export function infoRequestedClientAckEmail(args: {
  customerFirstName: string;
  eventType: string;
  bookingUrl: string;
  note?: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Let's talk through your ${eventTypeLabel}`;

  const noteHtml = args.note
    ? `<div style="background:#faf7f2;border-left:3px solid #9a7d3d;padding:12px 16px;margin:14px 0;color:#374151;font-style:italic;">"${args.note}"</div>`
    : "";

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Thanks for flagging that you'd like to talk through a few more details before deciding — that's exactly what we'd want you to do. A short call is usually the fastest way to get answers on menu, logistics, pricing, or anything else.`)}
     ${noteHtml}
     ${paragraph(`Pick any time that works for you on ${config.chef.firstName}'s calendar — Zoom or phone, your choice.`)}
     ${btn("Book a time to talk", args.bookingUrl)}
     ${paragraph(`If none of those times work, just reply to this email and we'll find one that does.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Book a quick call about your ${eventTypeLabel}.`
  );

  const text = `Hi ${args.customerFirstName},

Thanks for flagging that you'd like to talk through a few more details. A short call is usually the fastest way to get answers on menu, logistics, pricing, or anything else.${args.note ? `\n\nYou wrote: "${args.note}"` : ""}

Pick any time on ${config.chef.firstName}'s calendar — Zoom or phone:
${args.bookingUrl}

If none of those times work, just reply to this email.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── P0-2: "I Need More Info" — owner alert ───────────────────────────────────

export function infoRequestedOwnerEmail(args: {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  eventType: string;
  eventDate: string | Date | null;
  note?: string | null;
  adminQuoteUrl: string;
}): TemplateResult {
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `${args.customerName} wants more info before deciding`;

  const noteHtml = args.note
    ? `<div style="background:#fff7ed;border-left:3px solid #c2410c;padding:12px 16px;margin:14px 0;color:#374151;">${args.note}</div>`
    : `<p style="margin:0 0 12px 0;color:#6b7280;font-style:italic;">No note left.</p>`;

  const html = layout(
    `${heading(`Info requested`)}
     ${paragraph(`<strong>${args.customerName}</strong> just clicked "I need more info" on their quote.`)}
     ${noteHtml}
     <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin:12px 0;">
       <tr><td style="color:#6b7280;width:140px;">Contact</td><td>${args.customerEmail}${args.customerPhone ? ` · ${args.customerPhone}` : ""}</td></tr>
       <tr><td style="color:#6b7280;">Event</td><td>${eventTypeLabel} on ${formatDate(args.eventDate)}</td></tr>
     </table>
     ${paragraph(`They've been shown a Cal.com link to book a call. You'll get another alert when they book.`)}
     ${btn("Open in Admin", args.adminQuoteUrl)}`,
    `${args.customerName} wants to talk before deciding — book alert to follow.`
  );

  const text = `${args.customerName} clicked "I need more info" on their quote.

${args.note ? `Note: ${args.note}\n` : "No note left.\n"}
Contact: ${args.customerEmail}${args.customerPhone ? ` · ${args.customerPhone}` : ""}
Event: ${eventTypeLabel} on ${formatDate(args.eventDate)}

They've been given a Cal.com link — booking alert will follow.

Admin: ${args.adminQuoteUrl}`;

  return { subject, html, text };
}

// ─── P0-3: Quote declined — feedback request (client) ────────────────────────

export function quoteDeclinedFeedbackEmail(args: {
  customerFirstName: string;
  eventType: string;
  feedbackUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Thank you — one quick favor`;

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Thank you for taking the time to review our proposal for your ${eventTypeLabel} — we truly appreciate the opportunity.`)}
     ${paragraph(`If you don&rsquo;t mind sharing, we&rsquo;d love to better understand your decision. It helps us improve and, in some cases, lets us revisit options that may fit better.`)}
     ${paragraph(`Would you say the main reason was:`)}
     <ul style="margin:0 0 16px 20px;color:#1f2937;">
       <li>Pricing / budget</li>
       <li>Not quite the right menu or style</li>
       <li>Timing or logistics</li>
       <li>Something else</li>
     </ul>
     ${btn("Share a quick reason", args.feedbackUrl)}
     ${paragraph(`Takes about 10 seconds — no login needed. If you&rsquo;re open to reconnecting, we&rsquo;d be happy to see if there&rsquo;s a way to adjust the proposal.`)}
     ${paragraph(`Either way, we truly appreciate you considering ${config.businessName} and wish you all the best with your ${eventTypeLabel}!`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `One quick question about your decision — takes 10 seconds.`
  );

  const text = `Hi ${args.customerFirstName},

Thank you for taking the time to review our proposal for your ${eventTypeLabel} — we truly appreciate the opportunity.

If you don't mind sharing, we'd love to better understand your decision. Would you say the main reason was:
  • Pricing / budget
  • Not quite the right menu or style
  • Timing or logistics
  • Something else

Share a quick reason: ${args.feedbackUrl}

If you're open to reconnecting, we'd be happy to adjust the proposal. Either way, we appreciate you considering ${config.businessName}.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── P0-3: Decline feedback submitted — owner alert ──────────────────────────

export function declineFeedbackOwnerEmail(args: {
  customerName: string;
  customerEmail: string;
  eventType: string;
  eventDate: string | Date | null;
  category: string;
  notes: string | null;
  adminQuoteUrl: string;
}): TemplateResult {
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const categoryLabel: Record<string, string> = {
    pricing: "Pricing / budget",
    menu: "Menu / style",
    timing: "Timing / logistics",
    other: "Other",
  };
  const catNice = categoryLabel[args.category] || args.category;
  const reEngage = args.category === "pricing" || args.category === "menu";
  const subject = `${args.customerName} left feedback: ${catNice}${reEngage ? " — consider re-engaging" : ""}`;

  const html = layout(
    `${heading(`Decline feedback`)}
     ${paragraph(`<strong>${args.customerName}</strong> shared why they passed on the ${eventTypeLabel} proposal.`)}
     <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin:12px 0;">
       <tr><td style="color:#6b7280;width:140px;">Category</td><td><strong>${catNice}</strong></td></tr>
       <tr><td style="color:#6b7280;">Event</td><td>${eventTypeLabel} on ${formatDate(args.eventDate)}</td></tr>
       <tr><td style="color:#6b7280;">Contact</td><td>${args.customerEmail}</td></tr>
     </table>
     ${args.notes ? `<div style="background:#faf7f2;border-left:3px solid #9a7d3d;padding:12px 16px;margin:14px 0;color:#374151;font-style:italic;">${args.notes}</div>` : ""}
     ${reEngage ? paragraph(`<strong>Consider re-engaging</strong> — this feedback category often converts when the proposal is adjusted.`) : ""}
     ${btn("Open in Admin", args.adminQuoteUrl)}`,
    `${args.customerName} left decline feedback — ${catNice}.`
  );

  const text = `${args.customerName} shared why they passed on the ${eventTypeLabel} proposal.

Category: ${catNice}
Event: ${eventTypeLabel} on ${formatDate(args.eventDate)}
Contact: ${args.customerEmail}
${args.notes ? `\nNotes: ${args.notes}\n` : ""}
${reEngage ? "Consider re-engaging — this feedback category often converts when the proposal is adjusted.\n" : ""}
Admin: ${args.adminQuoteUrl}`;

  return { subject, html, text };
}

// ─── P0-2: Consultation booked — owner + client confirmation ─────────────────

export function consultationBookedOwnerEmail(args: {
  customerName: string;
  scheduledAt: string | Date;
  meetingUrl: string | null;
  adminQuoteUrl: string;
}): TemplateResult {
  const when = formatDate(args.scheduledAt);
  const subject = `${args.customerName} booked a consultation`;

  const html = layout(
    `${heading(`Consultation booked`)}
     ${paragraph(`<strong>${args.customerName}</strong> just booked a call for <strong>${when}</strong>.`)}
     ${args.meetingUrl ? btn("Join Meeting", args.meetingUrl) : ""}
     ${btn("Open in Admin", args.adminQuoteUrl)}`,
    `${args.customerName} booked a call for ${when}.`
  );

  const text = `${args.customerName} booked a consultation for ${when}.
${args.meetingUrl ? `\nMeeting: ${args.meetingUrl}` : ""}
Admin: ${args.adminQuoteUrl}`;

  return { subject, html, text };
}

// ─── P2-1: Contract sent / signed ─────────────────────────────────────────────

export function contractSentCustomerEmail(args: {
  customerFirstName: string;
  eventType: string;
  signingUrl: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Your ${eventTypeLabel} contract is ready to sign`;

  const cta = args.signingUrl
    ? btn("Review & Sign", args.signingUrl)
    : paragraph(`Check your inbox — the contract was sent to you directly by our e-sign provider. If it hasn&rsquo;t arrived within a few minutes, check spam or reply to this email and we&rsquo;ll resend.`);

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Great — we&rsquo;ve put together the contract for your ${eventTypeLabel}. Review the terms, sign electronically, and you&rsquo;re one step away from locking in your date.`)}
     ${cta}
     ${paragraph(`Once signed, we&rsquo;ll send you a deposit link (35% of total) to officially confirm. Questions? Just reply to this email.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Your ${eventTypeLabel} contract is ready.`
  );
  const text = `Hi ${args.customerFirstName},

We've put together the contract for your ${eventTypeLabel}.${args.signingUrl ? `\n\nReview and sign: ${args.signingUrl}` : "\n\nCheck your inbox for the e-sign email."}

Once signed, we'll send a deposit link to confirm. Questions? Reply anytime.

— ${config.chef.firstName}`;
  return { subject, html, text };
}

export function contractSignedOwnerEmail(args: {
  customerName: string;
  eventType: string;
  eventDate: string | Date | null;
  totalCents: number;
  adminUrl: string;
}): TemplateResult {
  const subject = `🖋️ ${args.customerName} signed the contract`;
  const html = layout(
    `${heading(`Contract signed`)}
     ${paragraph(`<strong>${args.customerName}</strong> just signed the ${args.eventType.replace(/_/g, " ")} contract.`)}
     ${paragraph(`Deposit email has been queued automatically — you&rsquo;ll get another alert once they pay.`)}
     ${btn("Open in Admin", args.adminUrl)}`,
    `${args.customerName} signed the contract.`
  );
  const text = `${args.customerName} signed the ${args.eventType.replace(/_/g, " ")} contract.

Deposit email queued. Admin: ${args.adminUrl}`;
  return { subject, html, text };
}

// ─── P2-2: Deposit / balance requests ────────────────────────────────────────

export function depositRequestCustomerEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  depositCents: number;
  paymentUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const dateStr = formatDate(args.eventDate);
  const subject = `Let's confirm your ${eventTypeLabel} — deposit`;

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Thanks for signing the contract! To officially lock in ${dateStr}, please complete the deposit below.`)}
     ${paragraph(`Deposit: <strong>$${(args.depositCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> (35% of your grand total)`)}
     ${btn("Pay deposit", args.paymentUrl)}
     ${paragraph(`This deposit secures your date. The balance is due 7 days before the event.`)}
     ${italic(`— ${config.chef.firstName}`)}`,
    `Deposit link for your ${eventTypeLabel} on ${dateStr}.`
  );
  const text = `Hi ${args.customerFirstName},

Thanks for signing! To lock in ${dateStr}, please complete the deposit of $${(args.depositCents / 100).toFixed(2)} (35% of total).

Pay here: ${args.paymentUrl}

Balance is due 7 days before the event.

— ${config.chef.firstName}`;
  return { subject, html, text };
}

export function balanceRequestCustomerEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  balanceCents: number;
  paymentUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const dateStr = formatDate(args.eventDate);
  const subject = `Balance due for your ${eventTypeLabel}`;

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Your ${eventTypeLabel} is almost here! The final balance is due before the event on ${dateStr}.`)}
     ${paragraph(`Balance: <strong>$${(args.balanceCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>`)}
     ${btn("Pay balance", args.paymentUrl)}
     ${paragraph(`If anything has changed — guest count, menu, logistics — just reply and we&rsquo;ll sort it out.`)}
     ${italic(`— ${config.chef.firstName}`)}`,
    `Balance due for your ${eventTypeLabel}.`
  );
  const text = `Hi ${args.customerFirstName},

Your ${eventTypeLabel} is coming up on ${dateStr}. The balance of $${(args.balanceCents / 100).toFixed(2)} is due before the event.

Pay here: ${args.paymentUrl}

— ${config.chef.firstName}`;
  return { subject, html, text };
}

export function paymentReceivedCustomerEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  amountCents: number;
  paymentKind: "deposit" | "balance";
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const dateStr = formatDate(args.eventDate);
  const amountStr = `$${(args.amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const kindStr = args.paymentKind === "deposit" ? "deposit" : "balance";
  const subject = args.paymentKind === "deposit"
    ? `Deposit received — your ${eventTypeLabel} is locked in`
    : `Balance paid — all set for your ${eventTypeLabel}`;

  const nextLine = args.paymentKind === "deposit"
    ? `Your date on <strong>${dateStr}</strong> is officially confirmed. We&rsquo;ll circle back about 2 weeks out to finalize any remaining details.`
    : `Everything&rsquo;s set. We&rsquo;ll see you on <strong>${dateStr}</strong>!`;

  const html = layout(
    `${heading(`Thank you, ${args.customerFirstName}!`)}
     ${paragraph(`We received your ${kindStr} of <strong>${amountStr}</strong>.`)}
     ${paragraph(nextLine)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `${args.paymentKind === "deposit" ? "Deposit" : "Balance"} received.`
  );
  const text = `Thank you, ${args.customerFirstName}!

We received your ${kindStr} of ${amountStr}.

${args.paymentKind === "deposit"
    ? `Your date on ${dateStr} is officially confirmed. We'll circle back about 2 weeks out to finalize details.`
    : `Everything's set. See you on ${dateStr}!`}

— ${config.chef.firstName}`;
  return { subject, html, text };
}

export function paymentReceivedOwnerEmail(args: {
  customerName: string;
  amountCents: number;
  paymentKind: "deposit" | "balance";
  eventId: number;
  adminUrl: string;
}): TemplateResult {
  const amount = `$${(args.amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const subject = `💰 ${args.paymentKind === "deposit" ? "Deposit" : "Balance"} received: ${args.customerName} — ${amount}`;
  const html = layout(
    `${heading(`${args.paymentKind === "deposit" ? "Deposit" : "Balance"} received`)}
     ${paragraph(`<strong>${args.customerName}</strong> just paid <strong>${amount}</strong>.`)}
     ${btn("Open in Admin", args.adminUrl)}`,
    `${args.paymentKind} paid: ${args.customerName} ${amount}`
  );
  const text = `${args.paymentKind === "deposit" ? "Deposit" : "Balance"} received from ${args.customerName}: ${amount}

Admin: ${args.adminUrl}`;
  return { subject, html, text };
}

// ─── P1-1: Tasting flow ───────────────────────────────────────────────────────

function formatMoneyCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(d: Date | string | null): string {
  if (!d) return "TBD";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Customer email — payment link after they book a tasting slot
export function tastingPaymentEmail(args: {
  customerFirstName: string;
  scheduledAt: Date | string;
  guestCount: number;
  totalPriceCents: number;
  paymentUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const when = formatDateTime(args.scheduledAt);
  const total = formatMoneyCents(args.totalPriceCents);
  const subject = `Your Home Bites tasting is booked — complete payment`;

  const html = layout(
    `${heading(`You're booked, ${args.customerFirstName}!`)}
     ${paragraph(`Thank you for scheduling a tasting — we&rsquo;re looking forward to cooking for you.`)}
     <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin:12px 0;">
       <tr><td style="color:#6b7280;width:140px;">When</td><td><strong>${when}</strong></td></tr>
       <tr><td style="color:#6b7280;">Guests</td><td>${args.guestCount}</td></tr>
       <tr><td style="color:#6b7280;">Total</td><td><strong>${total}</strong></td></tr>
     </table>
     ${paragraph(`To confirm your slot, please complete payment below — it takes about 20 seconds.`)}
     ${btn(`Pay ${total} to confirm`, args.paymentUrl)}
     ${paragraph(`If anything changes or you have questions, just reply to this email.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Tasting booked for ${when} — complete payment to confirm.`
  );

  const text = `You're booked, ${args.customerFirstName}!

Thank you for scheduling a tasting.

When: ${when}
Guests: ${args.guestCount}
Total: ${total}

To confirm your slot, please complete payment: ${args.paymentUrl}

Questions? Just reply to this email.

— ${config.chef.firstName}`;

  return { subject, html, text };
}

// Owner email — someone just booked a tasting
export function tastingBookedOwnerEmail(args: {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  scheduledAt: Date | string;
  guestCount: number;
  totalPriceCents: number;
  adminUrl: string;
}): TemplateResult {
  const when = formatDateTime(args.scheduledAt);
  const total = formatMoneyCents(args.totalPriceCents);
  const subject = `New tasting: ${args.customerName} · ${when}`;

  const html = layout(
    `${heading(`Tasting booked`)}
     ${paragraph(`<strong>${args.customerName}</strong> just booked a tasting via Cal.com. Payment link has been emailed to them.`)}
     <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin:12px 0;">
       <tr><td style="color:#6b7280;width:140px;">When</td><td><strong>${when}</strong></td></tr>
       <tr><td style="color:#6b7280;">Guests</td><td>${args.guestCount}</td></tr>
       <tr><td style="color:#6b7280;">Total</td><td>${total}</td></tr>
       <tr><td style="color:#6b7280;">Email</td><td>${args.customerEmail || "—"}</td></tr>
       <tr><td style="color:#6b7280;">Phone</td><td>${args.customerPhone || "—"}</td></tr>
     </table>
     ${btn("Open in Admin", args.adminUrl)}`,
    `Tasting booked: ${args.customerName} · ${when}`
  );

  const text = `Tasting booked: ${args.customerName}

When: ${when}
Guests: ${args.guestCount}
Total: ${total}
Email: ${args.customerEmail || "—"}
Phone: ${args.customerPhone || "—"}

Admin: ${args.adminUrl}`;

  return { subject, html, text };
}

// Customer email — tasting payment received
export function tastingPaidCustomerEmail(args: {
  customerFirstName: string;
  scheduledAt: Date | string;
  guestCount: number;
  totalPriceCents: number;
}): TemplateResult {
  const config = getSiteConfig();
  const when = formatDateTime(args.scheduledAt);
  const total = formatMoneyCents(args.totalPriceCents);
  const subject = `Payment received — see you at your tasting`;

  const html = layout(
    `${heading(`Thank you, ${args.customerFirstName}!`)}
     ${paragraph(`Your payment of <strong>${total}</strong> has been received. Your tasting is officially confirmed.`)}
     <table cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin:12px 0;">
       <tr><td style="color:#6b7280;width:140px;">When</td><td><strong>${when}</strong></td></tr>
       <tr><td style="color:#6b7280;">Guests</td><td>${args.guestCount}</td></tr>
     </table>
     ${paragraph(`We&rsquo;ll send a quick reminder the day before. If anything changes, just reply to this email.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Payment received — tasting confirmed for ${when}.`
  );

  const text = `Thank you, ${args.customerFirstName}!

Your payment of ${total} has been received. Your tasting is confirmed.

When: ${when}
Guests: ${args.guestCount}

We'll send a reminder the day before. Questions? Just reply.

— ${config.chef.firstName}`;

  return { subject, html, text };
}

// ─── P1-2: Auto-send follow-up drip — customer-facing ─────────────────────────

// Day 2 — Soft check-in
export function dripDay2SoftEmail(args: {
  customerFirstName: string;
  eventType: string;
  quoteUrl: string;
  tastingUrl?: string | null;
  bookingUrl?: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `A quick check-in on your ${eventTypeLabel}`;

  const tastingLine = args.tastingUrl
    ? paragraph(`We also offer tastings if you&rsquo;d like to experience the food firsthand and meet our team — it&rsquo;s a great way to get a feel for everything before deciding. <a href="${args.tastingUrl}">Book a tasting</a>.`)
    : paragraph(`We also offer tastings if you&rsquo;d like to experience the food firsthand and meet our team — just reply and we&rsquo;ll set one up.`);

  const callLine = args.bookingUrl
    ? paragraph(`If it would be helpful, you&rsquo;re also welcome to <a href="${args.bookingUrl}">schedule a quick call</a> so we can go through everything together.`)
    : "";

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`I just wanted to follow up and see if you had any questions about the proposal or if there&rsquo;s anything you&rsquo;d like to adjust.`)}
     ${paragraph(`If you&rsquo;re still exploring options, I completely understand — happy to help refine the menu or adjust things to better fit your vision, guest count, or budget.`)}
     ${tastingLine}
     ${callLine}
     ${btn("Review your proposal", args.quoteUrl)}
     ${paragraph(`Looking forward to your thoughts!`)}
     ${italic(`— ${config.chef.firstName}`)}`,
    `Following up on your ${eventTypeLabel} proposal.`
  );

  const text = `Hi ${args.customerFirstName},

I just wanted to follow up and see if you had any questions about the proposal or if there's anything you'd like to adjust. Happy to refine the menu or adjust to better fit your vision, guest count, or budget.

We also offer tastings if you'd like to experience the food firsthand${args.tastingUrl ? `: ${args.tastingUrl}` : " — just reply and we'll set one up"}.${args.bookingUrl ? `\n\nOr schedule a quick call: ${args.bookingUrl}` : ""}

Review your proposal: ${args.quoteUrl}

Looking forward to your thoughts!
— ${config.chef.firstName}`;

  return { subject, html, text };
}

// Day 5 — Value + comparison + tasting
export function dripDay5ValueEmail(args: {
  customerFirstName: string;
  eventType: string;
  quoteUrl: string;
  tastingUrl?: string | null;
  bookingUrl?: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const subject = `Checking in on your ${eventTypeLabel} plans`;

  const ctaTasting = args.tastingUrl
    ? btn("Schedule a tasting", args.tastingUrl)
    : "";
  const ctaCall = args.bookingUrl
    ? btn("Book a quick call", args.bookingUrl)
    : "";

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`I wanted to follow up and see where things are at with your catering plans.`)}
     ${paragraph(`If you&rsquo;re still reviewing options, I completely understand — this is usually when couples and hosts are comparing proposals. I&rsquo;m happy to help walk through everything and make sure you&rsquo;re comparing apples to apples.`)}
     ${paragraph(`A lot of clients at this stage find it helpful to schedule either a <strong>tasting</strong> or a quick <strong>phone or Zoom call</strong>. It&rsquo;s a great way to experience the food, meet our team, and get a real sense of how everything comes together.`)}
     ${paragraph(`We can also adjust the proposal to better fit your vision or budget if needed.`)}
     ${ctaTasting}
     ${ctaCall}
     ${paragraph(`Would you like to schedule a quick call or Zoom to go over everything — or set up a tasting?`)}
     ${btn("Review your proposal", args.quoteUrl)}
     ${italic(`— ${config.chef.firstName}`)}`,
    `Comparing caterers? Let's make it easy.`
  );

  const text = `Hi ${args.customerFirstName},

I wanted to follow up and see where things are at with your catering plans.

If you're still reviewing options, I completely understand — this is usually when people are comparing proposals. Happy to walk through everything to make sure you're comparing apples to apples.

A lot of clients at this stage find it helpful to schedule a tasting or a quick phone/Zoom call. Great way to experience the food, meet our team, and get a real sense of how everything comes together. We can also adjust the proposal to better fit your vision or budget.
${args.tastingUrl ? `\nTasting: ${args.tastingUrl}\n` : ""}${args.bookingUrl ? `Book a call: ${args.bookingUrl}\n` : ""}
Review your proposal: ${args.quoteUrl}

Would you like to schedule a quick call or set up a tasting?

— ${config.chef.firstName}`;

  return { subject, html, text };
}

// Day 10 — Final urgency + close
export function dripDay10FinalEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  quoteUrl: string;
  tastingUrl?: string | null;
  bookingUrl?: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const dateStr = formatDate(args.eventDate);
  const subject = `One last check-in about your ${eventTypeLabel}`;

  const ctaCall = args.bookingUrl
    ? btn("Book a quick call", args.bookingUrl)
    : "";

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`I just wanted to reach out one last time regarding your event on <strong>${dateStr}</strong>.`)}
     ${paragraph(`We&rsquo;re beginning to finalize our calendar and wanted to check in before we close out availability.`)}
     ${paragraph(`If you&rsquo;re still interested, we&rsquo;d be happy to reconnect, adjust the proposal, schedule a tasting, or set up a quick phone call or Zoom to answer any final questions.`)}
     ${ctaCall}
     ${btn("Review your proposal", args.quoteUrl)}
     ${paragraph(`If you&rsquo;ve decided to go another direction, no worries at all — we truly appreciate the opportunity.`)}
     ${paragraph(`Wishing you all the best!`)}
     ${italic(`— ${config.chef.firstName}`)}`,
    `Final check-in about your ${eventTypeLabel} on ${dateStr}.`
  );

  const text = `Hi ${args.customerFirstName},

I just wanted to reach out one last time regarding your event on ${dateStr}. We're beginning to finalize our calendar and wanted to check in before closing out availability.

If you're still interested, we'd be happy to reconnect, adjust the proposal, schedule a tasting, or set up a quick phone call or Zoom.
${args.bookingUrl ? `\nBook a call: ${args.bookingUrl}\n` : ""}${args.tastingUrl ? `Schedule a tasting: ${args.tastingUrl}\n` : ""}
Review your proposal: ${args.quoteUrl}

If you've decided to go another direction, no worries at all — we truly appreciate the opportunity.

Wishing you all the best!
— ${config.chef.firstName}`;

  return { subject, html, text };
}

// ─── P0-4: Post-event review + referral request ──────────────────────────────

export function eventReviewRequestEmail(args: {
  customerFirstName: string;
  eventType: string;
  eventDate: string | Date | null;
  // Optional override for the Google review URL; falls back to env via getReviewConfig().
  googleReviewUrl?: string | null;
  referralCreditDollars?: number;
}): TemplateResult {
  const config = getSiteConfig();
  const review = getReviewConfig();
  const eventTypeLabel = args.eventType.replace(/_/g, " ");
  const reviewUrl = args.googleReviewUrl ?? review.googleReviewUrl;
  const credit = args.referralCreditDollars ?? review.referralCreditDollars;

  const subject = `How did everything go, ${args.customerFirstName}?`;

  const reviewBlock = reviewUrl
    ? `${paragraph(`If you enjoyed the food and service, a quick Google review means the world to a small team like ours — it&rsquo;s the single biggest thing that helps new couples and families find us.`)}
       ${btn("Leave a Google review", reviewUrl)}`
    : `${paragraph(`If you enjoyed the food and service, a quick review means the world to a small team like ours. Just reply to this email and we&rsquo;ll point you to the right spot.`)}`;

  const html = layout(
    `${heading(`Hi ${args.customerFirstName},`)}
     ${paragraph(`Thank you so much for having us be part of your ${eventTypeLabel}! It was genuinely a pleasure cooking for you and your guests — we hope everything felt seamless and that the food lived up to the moment.`)}
     ${paragraph(`A quick favor — two things, either or both:`)}
     ${reviewBlock}
     ${paragraph(`<strong>Know someone planning an event?</strong> Send them our way — we&rsquo;ll send you a <strong>$${credit} credit</strong> for any referral that books with us. Just have them mention your name when they reach out.`)}
     ${paragraph(`Either way, thank you again. We&rsquo;d love to cook for you again someday.`)}
     ${italic(`— ${config.chef.firstName} and the ${config.businessName} team`)}`,
    `Thank you — how did everything go?`
  );

  const text = `Hi ${args.customerFirstName},

Thank you so much for having us be part of your ${eventTypeLabel}! It was genuinely a pleasure cooking for you and your guests.

A quick favor — two things, either or both:

${reviewUrl ? `• Leave a Google review — it's the single biggest thing that helps small teams like ours: ${reviewUrl}\n\n` : ""}• Know someone planning an event? Send them our way — we'll send you a $${credit} credit for any referral that books with us.

Either way, thank you again. We'd love to cook for you again someday.

— ${config.chef.firstName} and the ${config.businessName} team`;

  return { subject, html, text };
}

// ─── Auth: password reset, username reminder, password changed ────────────────
//
// Staff-facing (admins/chefs using the CMS). Tone is shorter and more
// functional than the celebration-copy customer templates above.

export function passwordResetRequestedEmail(args: {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
  ipAddress?: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `Reset your ${config.businessName} password`;
  const ipLine = args.ipAddress
    ? paragraph(`This request came from <strong>${args.ipAddress}</strong>. If that wasn&rsquo;t you, you can ignore this email — your password won&rsquo;t change.`)
    : paragraph(`If you didn&rsquo;t request this, you can ignore this email — your password won&rsquo;t change.`);

  const html = layout(
    `${heading(`Reset your password`)}
     ${paragraph(`Hi ${args.firstName},`)}
     ${paragraph(`Use the button below to pick a new password. This link expires in <strong>${args.expiresInMinutes} minutes</strong> and can only be used once.`)}
     ${btn("Reset password", args.resetUrl)}
     ${paragraph(`Or paste this link into your browser:<br/><a href="${args.resetUrl}" style="color:#9a7d3d;word-break:break-all;">${args.resetUrl}</a>`)}
     ${ipLine}`,
    `Reset your password — link expires in ${args.expiresInMinutes} minutes.`
  );

  const text = `Hi ${args.firstName},

Use this link to pick a new password (expires in ${args.expiresInMinutes} minutes, single-use):

${args.resetUrl}

If you didn't request this, ignore this email — your password won't change.`;

  return { subject, html, text };
}

export function usernameReminderEmail(args: {
  firstName: string;
  username: string;
  loginUrl: string;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `Your ${config.businessName} username`;

  const html = layout(
    `${heading(`Your username`)}
     ${paragraph(`Hi ${args.firstName},`)}
     ${paragraph(`Your username is <strong>${args.username}</strong>.`)}
     ${btn("Go to sign in", args.loginUrl)}
     ${paragraph(`If you also need a new password, use the &ldquo;Forgot password&rdquo; link on the sign-in page.`)}`,
    `Your username is ${args.username}.`
  );

  const text = `Hi ${args.firstName},

Your username is: ${args.username}

Sign in at ${args.loginUrl}. If you also need a new password, use "Forgot password" on that page.`;

  return { subject, html, text };
}

export function passwordChangedEmail(args: {
  firstName: string;
  when: Date;
  ipAddress?: string | null;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `Your ${config.businessName} password was changed`;
  const whenStr = args.when.toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
  const ipLine = args.ipAddress ? ` from <strong>${args.ipAddress}</strong>` : ``;

  const html = layout(
    `${heading(`Password changed`)}
     ${paragraph(`Hi ${args.firstName},`)}
     ${paragraph(`Your ${config.businessName} password was changed on <strong>${whenStr}</strong>${ipLine}.`)}
     ${paragraph(`If this was you, no action needed. If it wasn&rsquo;t, reply to this email or call us immediately so we can lock the account.`)}`,
    `Security notice: your password was just changed.`
  );

  const text = `Hi ${args.firstName},

Your ${config.businessName} password was changed on ${whenStr}${args.ipAddress ? ` from ${args.ipAddress}` : ""}.

If this wasn't you, reply to this email or call us right away.`;

  return { subject, html, text };
}

export function userInvitedEmail(args: {
  firstName: string;
  inviterName: string;
  acceptUrl: string;
  expiresInDays: number;
}): TemplateResult {
  const config = getSiteConfig();
  const subject = `You're invited to ${config.businessName}`;

  const html = layout(
    `${heading(`Welcome to ${config.businessName}`)}
     ${paragraph(`Hi ${args.firstName},`)}
     ${paragraph(`${args.inviterName} invited you to join the ${config.businessName} team. Use the link below to pick a username and password — the invite expires in <strong>${args.expiresInDays} days</strong>.`)}
     ${btn("Accept invitation", args.acceptUrl)}
     ${paragraph(`If you weren&rsquo;t expecting this, you can safely ignore it.`)}`,
    `${args.inviterName} invited you to ${config.businessName}.`
  );

  const text = `Hi ${args.firstName},

${args.inviterName} invited you to join the ${config.businessName} team. Accept and set your password here (expires in ${args.expiresInDays} days):

${args.acceptUrl}

If you weren't expecting this, you can ignore this email.`;

  return { subject, html, text };
}
