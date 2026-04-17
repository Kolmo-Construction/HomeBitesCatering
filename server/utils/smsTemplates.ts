// SMS templates — one function per message type. Each returns { body } so
// the caller can hand the result directly to sendSms() / sendOwnerSmsInBackground().
//
// Keep bodies ≤160 chars where possible so they land as a single SMS segment
// (cheaper, faster, no concatenation edge cases). Use short URLs — the
// dashboard is already on a short host.

import { getSmsConfig } from "./siteConfig";

interface SmsTemplateResult {
  body: string;
}

// Truncate a string to at most `max` chars, adding an ellipsis if trimmed.
function clip(s: string | null | undefined, max: number): string {
  if (!s) return "";
  const t = String(s).trim();
  return t.length <= max ? t : t.slice(0, Math.max(0, max - 1)) + "…";
}

// Format a date as short US-style (e.g. "Jun 5, 2026"). Returns "TBD" if no date.
function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return "TBD";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Inquiry → Owner alert ────────────────────────────────────────────────────

interface NewInquiryOwnerSmsArgs {
  firstName: string;
  lastName?: string | null;
  eventType?: string | null;
  guestCount?: number | null;
  eventDate?: Date | string | null;
  source?: string | null;
  opportunityId?: number | null;
  rawLeadId?: number | null;
  // Public base URL is injected by the service; tests can override
  baseUrl?: string;
}

/**
 * Alert SMS to the owner when a new inquiry lands. Target ≤160 chars for a
 * single SMS segment — Twilio will still send longer bodies as concatenated
 * messages, but single-segment is cheaper and more reliable.
 */
export function newInquiryOwnerSms(args: NewInquiryOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;

  const name = clip(
    `${args.firstName || ""}${args.lastName ? " " + args.lastName : ""}`.trim() || "Unknown",
    40
  );
  const eventType = clip(args.eventType || "event", 20);
  const guests = args.guestCount ? `${args.guestCount}` : "?";
  const date = formatShortDate(args.eventDate);
  const source = clip(args.source || "website", 15);

  // Path: prefer opportunity detail, fallback to raw leads list
  const path = args.opportunityId
    ? `/opportunities/${args.opportunityId}`
    : args.rawLeadId
    ? `/raw-leads/${args.rawLeadId}`
    : "/pipeline";
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const body = `New inquiry: ${name}, ${eventType} for ${guests} on ${date}. Source: ${source}. ${url}`;

  return { body };
}

// ─── P2-1: Contract signed → Owner alert ─────────────────────────────────────

interface ContractSignedOwnerSmsArgs {
  customerName: string;
  eventDate?: Date | string | null;
  estimateId?: number | null;
  opportunityId?: number | null;
  baseUrl?: string;
}

export function contractSignedOwnerSms(args: ContractSignedOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 30);
  const date = formatShortDate(args.eventDate);
  const path = args.opportunityId
    ? `/opportunities/${args.opportunityId}`
    : args.estimateId
    ? `/estimates/${args.estimateId}`
    : "/pipeline";
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const body = `🖋️ ${name} signed contract (${date}). Deposit link queued. ${url}`;
  return { body };
}

// ─── P2-2: Deposit / balance paid → Owner alert ──────────────────────────────

interface PaymentReceivedOwnerSmsArgs {
  customerName: string;
  amountCents: number;
  paymentKind: "deposit" | "balance";
  eventId: number;
  baseUrl?: string;
}

export function paymentReceivedOwnerSms(args: PaymentReceivedOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 25);
  const amount = `$${(args.amountCents / 100).toFixed(2)}`;
  const kind = args.paymentKind === "deposit" ? "Deposit" : "Balance";
  const url = `${baseUrl.replace(/\/$/, "")}/events/${args.eventId}`;
  const body = `💰 ${kind} paid: ${name} ${amount}. ${url}`;
  return { body };
}

// ─── P1-1: Tasting booked → Owner alert ──────────────────────────────────────

interface TastingBookedOwnerSmsArgs {
  customerName: string;
  scheduledAt: Date | string;
  guestCount: number;
  tastingId: number;
  baseUrl?: string;
}

export function tastingBookedOwnerSms(args: TastingBookedOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 25);
  const d = args.scheduledAt instanceof Date ? args.scheduledAt : new Date(args.scheduledAt);
  const when = isNaN(d.getTime())
    ? "TBD"
    : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const url = `${baseUrl.replace(/\/$/, "")}/admin/tastings/${args.tastingId}`;
  const body = `🍴 Tasting booked: ${name} × ${args.guestCount}, ${when}. ${url}`;
  return { body };
}

// ─── P1-1: Tasting paid → Owner alert ────────────────────────────────────────

interface TastingPaidOwnerSmsArgs {
  customerName: string;
  totalPriceCents: number;
  tastingId: number;
  baseUrl?: string;
}

export function tastingPaidOwnerSms(args: TastingPaidOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 25);
  const total = `$${(args.totalPriceCents / 100).toFixed(2)}`;
  const url = `${baseUrl.replace(/\/$/, "")}/admin/tastings/${args.tastingId}`;
  const body = `💰 Tasting paid: ${name} ${total}. ${url}`;
  return { body };
}

// ─── P1-2: Day-3 drip SMS (to the customer) ──────────────────────────────────

interface DripDay3SmsArgs {
  firstName: string;
  chefFirstName?: string;
}

export function dripDay3CustomerSms(args: DripDay3SmsArgs): SmsTemplateResult {
  const first = clip(args.firstName || "there", 20);
  const chef = args.chefFirstName || "Mike";
  // 160-char budget. Single segment when possible.
  const body = `Hey ${first}, this is ${chef} from Home Bites — just checking in on the proposal. Happy to adjust anything, set up a tasting, or jump on a quick call 👍`;
  return { body };
}

// ─── P1-2: Day-7 phone-call task → Owner alert ───────────────────────────────

interface DripDay7OwnerSmsArgs {
  customerName: string;
  customerPhone?: string | null;
  opportunityId: number;
  baseUrl?: string;
}

export function dripDay7OwnerSms(args: DripDay7OwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 30);
  const phoneStr = args.customerPhone ? ` (${args.customerPhone})` : "";
  const url = `${baseUrl.replace(/\/$/, "")}/opportunities/${args.opportunityId}`;
  const body = `☎️ Call ${name}${phoneStr} today (Day 7 drip). ${url}`;
  return { body };
}

// ─── Quote declined → Owner alert ─────────────────────────────────────────────

interface QuoteDeclinedOwnerSmsArgs {
  customerName: string;
  eventDate?: Date | string | null;
  reason?: string | null;
  estimateId: number;
  baseUrl?: string;
}

export function quoteDeclinedOwnerSms(args: QuoteDeclinedOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 30);
  const date = formatShortDate(args.eventDate);
  const reason = args.reason ? `: "${clip(args.reason, 50)}"` : "";
  const url = `${baseUrl.replace(/\/$/, "")}/estimates/${args.estimateId}`;

  const body = `Declined: ${name} (${date})${reason}. ${url}`;

  return { body };
}

// ─── Decline feedback submitted → Owner alert ─────────────────────────────────

interface DeclineFeedbackOwnerSmsArgs {
  customerName: string;
  category: string;
  estimateId: number;
  baseUrl?: string;
}

export function declineFeedbackOwnerSms(args: DeclineFeedbackOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 30);
  const cat = clip(args.category, 20);
  const url = `${baseUrl.replace(/\/$/, "")}/estimates/${args.estimateId}`;

  const body = `Decline feedback from ${name}: ${cat}. ${url}`;

  return { body };
}

// ─── "I Need More Info" → Owner alert ─────────────────────────────────────────

interface InfoRequestedOwnerSmsArgs {
  customerName: string;
  eventDate?: Date | string | null;
  note?: string | null;
  estimateId: number;
  baseUrl?: string;
}

export function infoRequestedOwnerSms(args: InfoRequestedOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 30);
  const date = formatShortDate(args.eventDate);
  const url = `${baseUrl.replace(/\/$/, "")}/estimates/${args.estimateId}`;

  const noteSnippet = args.note ? `: "${clip(args.note, 50)}"` : "";
  const body = `Info requested by ${name} (${date})${noteSnippet}. ${url}`;

  return { body };
}

// ─── Consultation booked → Owner alert ────────────────────────────────────────

interface ConsultationBookedOwnerSmsArgs {
  customerName: string;
  scheduledAt: Date | string;
  estimateId: number;
  baseUrl?: string;
}

export function consultationBookedOwnerSms(args: ConsultationBookedOwnerSmsArgs): SmsTemplateResult {
  const cfg = getSmsConfig();
  const baseUrl = args.baseUrl || cfg.publicBaseUrl;
  const name = clip(args.customerName || "Client", 30);
  const when = (() => {
    const d = args.scheduledAt instanceof Date ? args.scheduledAt : new Date(args.scheduledAt);
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  })();
  const url = `${baseUrl.replace(/\/$/, "")}/estimates/${args.estimateId}`;

  const body = `Consultation booked: ${name}, ${when}. ${url}`;

  return { body };
}
