// Email templates — one function per message type. Each returns
// { subject, html, text } so the caller can hand the result directly to sendEmail().
//
// Styling is inline CSS (required for email clients). Tone matches the customer
// event page: warm, serif-y, celebration-focused. Admin-facing templates are
// tighter and more informational.

import { getSiteConfig } from "./siteConfig";

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
