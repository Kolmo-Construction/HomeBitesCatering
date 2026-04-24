// Event invoicing — Square Checkout link issuance for deposits and balances.
//
// Both helpers are idempotent: calling twice for the same event reuses the
// existing payment-link URL rather than re-charging or re-emailing. The
// admin accept handler, public accept handler, contract-signed webhook,
// admin manual-trigger endpoints, and the 24h-before-event scheduler all
// funnel through these.

import { eq } from "drizzle-orm";
import { db } from "../db";
import { events, clients, quotes } from "@shared/schema";
import { createCheckoutLink } from "./paymentService";
import { getDepositPercent, getEmailConfig } from "../utils/siteConfig";
import { sendEmailInBackground } from "../utils/email";
import {
  depositRequestCustomerEmail,
  balanceRequestCustomerEmail,
} from "../utils/emailTemplates";

export async function ensureEventDepositCheckout(
  eventId: number,
): Promise<{ url: string | null; error?: string }> {
  const [ev] = await db.select().from(events).where(eq(events.id, eventId));
  if (!ev) return { url: null, error: "event not found" };
  if (ev.depositPaidAt) return { url: ev.depositSquarePaymentLinkUrl, error: "already paid" };
  if (ev.depositSquarePaymentLinkUrl) return { url: ev.depositSquarePaymentLinkUrl };

  const [client] = await db.select().from(clients).where(eq(clients.id, ev.clientId));
  const [est] = ev.quoteId
    ? await db.select().from(quotes).where(eq(quotes.id, ev.quoteId))
    : [null as any];
  if (!est) return { url: null, error: "no quote — cannot determine amount" };

  const depositPercent = ev.depositPercent ?? getDepositPercent();
  const depositCents = Math.round((est.total * depositPercent) / 100);

  const emailCfg = getEmailConfig();
  const link = await createCheckoutLink({
    amountCents: depositCents,
    name: `Home Bites ${est.eventType.replace(/_/g, " ")} — Deposit`,
    note: `${depositPercent}% deposit for ${ev.eventType} on ${new Date(ev.eventDate).toLocaleDateString()}`,
    redirectUrl: `${emailCfg.publicBaseUrl.replace(/\/$/, "")}/event/${ev.viewToken || ev.id}?paid=deposit`,
    referenceId: `event-deposit-${eventId}`,
    email: client?.email ?? null,
    phone: client?.phone ?? null,
  });
  if (link.skipped) return { url: null, error: "square not configured" };
  if (!link.created || !link.paymentLinkUrl) return { url: null, error: link.error || "link failed" };

  await db
    .update(events)
    .set({
      depositAmountCents: depositCents,
      depositSquarePaymentLinkId: link.paymentLinkId || null,
      depositSquarePaymentLinkUrl: link.paymentLinkUrl,
      depositSquareOrderId: link.orderId || null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  if (client?.email) {
    const tpl = depositRequestCustomerEmail({
      customerFirstName: client.firstName || "there",
      eventType: ev.eventType,
      eventDate: ev.eventDate,
      depositCents,
      paymentUrl: link.paymentLinkUrl,
    });
    sendEmailInBackground({
      to: client.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      clientId: client.id,
      eventId,
      templateKey: "deposit_request_customer",
    });
  }
  return { url: link.paymentLinkUrl };
}

export async function ensureEventBalanceCheckout(
  eventId: number,
): Promise<{ url: string | null; error?: string }> {
  const [ev] = await db.select().from(events).where(eq(events.id, eventId));
  if (!ev) return { url: null, error: "event not found" };
  if (ev.balancePaidAt) return { url: ev.balanceSquarePaymentLinkUrl, error: "already paid" };
  if (ev.balanceSquarePaymentLinkUrl) return { url: ev.balanceSquarePaymentLinkUrl };

  const [client] = await db.select().from(clients).where(eq(clients.id, ev.clientId));
  const [est] = ev.quoteId
    ? await db.select().from(quotes).where(eq(quotes.id, ev.quoteId))
    : [null as any];
  if (!est) return { url: null, error: "no quote — cannot determine balance" };

  const depositPercent = ev.depositPercent ?? getDepositPercent();
  const depositCents = ev.depositAmountCents ?? Math.round((est.total * depositPercent) / 100);
  const balanceCents = Math.max(0, est.total - depositCents);

  const emailCfg = getEmailConfig();
  const link = await createCheckoutLink({
    amountCents: balanceCents,
    name: `Home Bites ${est.eventType.replace(/_/g, " ")} — Balance`,
    note: `Final balance for ${ev.eventType} on ${new Date(ev.eventDate).toLocaleDateString()}`,
    redirectUrl: `${emailCfg.publicBaseUrl.replace(/\/$/, "")}/event/${ev.viewToken || ev.id}?paid=balance`,
    referenceId: `event-balance-${eventId}`,
    email: client?.email ?? null,
    phone: client?.phone ?? null,
  });
  if (link.skipped) return { url: null, error: "square not configured" };
  if (!link.created || !link.paymentLinkUrl) return { url: null, error: link.error || "link failed" };

  await db
    .update(events)
    .set({
      balanceAmountCents: balanceCents,
      balanceSquarePaymentLinkId: link.paymentLinkId || null,
      balanceSquarePaymentLinkUrl: link.paymentLinkUrl,
      balanceSquareOrderId: link.orderId || null,
      balanceRequestedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  if (client?.email) {
    const tpl = balanceRequestCustomerEmail({
      customerFirstName: client.firstName || "there",
      eventType: ev.eventType,
      eventDate: ev.eventDate,
      balanceCents,
      paymentUrl: link.paymentLinkUrl,
    });
    sendEmailInBackground({
      to: client.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      clientId: client.id,
      eventId,
      templateKey: "balance_request_customer",
    });
  }
  return { url: link.paymentLinkUrl };
}
