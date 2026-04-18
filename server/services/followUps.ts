/**
 * Follow-ups inbox — computed on the fly.
 *
 * Unions 16 source queries across the full funnel (inquiries, quotes, events,
 * contracts, tastings, communications, followUpDrafts, rawLeads,
 * opportunities) into a normalized list keyed by `<type>:<sourceId>` so the
 * per-user state overlay (snooze/dismiss/in-progress) can apply without
 * mutating source records.
 */

import { db } from "../db";
import {
  inquiries,
  quotes,
  events,
  contracts,
  tastings,
  communications,
  followUpDrafts,
  rawLeads,
  opportunities,
  clients,
  followUpStates,
} from "@shared/schema";
import { and, eq, isNull, isNotNull, lte, gte, sql, inArray, or, desc } from "drizzle-orm";

export type FollowUpUrgency = "P0" | "P1" | "P2" | "P3";
export type FollowUpState = "open" | "snoozed" | "dismissed" | "in_progress";

export type FollowUpType =
  | "change_request_open"
  | "inquiry_unread"
  | "info_requested"
  | "quote_unviewed"
  | "quote_viewed_no_action"
  | "tasting_unpaid"
  | "contract_unsigned"
  | "deposit_overdue"
  | "balance_due_window"
  | "auto_draft_pending"
  | "decline_feedback"
  | "drip_paused_stuck"
  | "unmatched_email"
  | "review_not_requested"
  | "tasting_no_show"
  | "lost_lead_nurture";

export interface FollowUpItem {
  key: string; // "<type>:<sourceId>"
  type: FollowUpType;
  urgency: FollowUpUrgency;
  title: string;
  subtitle: string;
  ageSeconds: number;
  sourceAge: string; // ISO timestamp marker we check on dismiss to know if source changed
  subjectId: number | string;
  eventId: number | null;
  clientId: number | null;
  opportunityId: number | null;
  quoteId: number | null;
  links: { primary: string; reply?: string };
  actions: string[];
  userState: {
    state: FollowUpState;
    snoozeUntil: string | null;
    note: string | null;
  };
}

export interface FollowUpCounts {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  total: number;
}

export interface ListFollowUpsOptions {
  userId: number;
  urgency?: FollowUpUrgency[];
  types?: FollowUpType[];
  includeSnoozed?: boolean;
  includeDismissed?: boolean;
}

// Tunable SLA thresholds (hours). Can be moved to a settings table later.
const SLA = {
  CHANGE_REQUEST_AGE_MIN: 0, // any age
  INQUIRY_UNREAD_HOURS: 24,
  INFO_REQUESTED_HOURS: 24,
  QUOTE_UNVIEWED_HOURS: 72,
  QUOTE_VIEWED_NO_ACTION_HOURS: 48,
  TASTING_UNPAID_LEAD_HOURS: 48,
  CONTRACT_UNSIGNED_DAYS: 5,
  DEPOSIT_OVERDUE_DAYS: 3,
  BALANCE_DUE_DAYS_BEFORE: 3,
  DRIP_PAUSED_STUCK_DAYS: 7,
  UNMATCHED_HOURS: 48,
  REVIEW_AFTER_EVENT_HOURS: 24,
  LOST_LEAD_QUIET_DAYS: 30,
  LOST_LEAD_AGE_DAYS: 90,
};

function hoursAgo(d: Date | null | undefined): number {
  if (!d) return 0;
  return (Date.now() - new Date(d).getTime()) / 3_600_000;
}

function ageSeconds(d: Date | null | undefined): number {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 1000);
}

function iso(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString();
}

// ---------------------------------------------------------------------------
// Source queries — each returns an array of partial FollowUpItem (without
// userState). The loader merges them, applies the per-user state overlay,
// and filters based on snoozed/dismissed status.
// ---------------------------------------------------------------------------

async function sourceChangeRequests(): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: communications.id,
      eventId: communications.eventId,
      clientId: communications.clientId,
      subject: communications.subject,
      bodyRaw: communications.bodyRaw,
      metaData: communications.metaData,
      timestamp: communications.timestamp,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(communications)
    .leftJoin(clients, eq(communications.clientId, clients.id))
    .where(
      and(
        eq(communications.source, "portal_change_request"),
        sql`(${communications.metaData} ->> 'status') IS DISTINCT FROM 'resolved'`,
      ),
    )
    .orderBy(desc(communications.timestamp));

  return rows.map((r) => {
    const category = (r.metaData as any)?.category || "other";
    const who = [r.clientFirst, r.clientLast].filter(Boolean).join(" ") || "Customer";
    const body = r.bodyRaw || "(empty request)";
    return mkItem({
      type: "change_request_open",
      urgency: "P0",
      subjectId: r.id,
      eventId: r.eventId,
      clientId: r.clientId,
      opportunityId: null,
      quoteId: null,
      title: `Change request · ${category}`,
      subtitle: `${who}${r.eventId ? ` · event #${r.eventId}` : ""} — ${body.slice(0, 80)}${body.length > 80 ? "…" : ""}`,
      timestamp: r.timestamp,
      primaryLink: r.eventId ? `/events/${r.eventId}` : "#",
      actions: ["reply", "resolve", "snooze", "dismiss"],
    });
  });
}

async function sourceInquiryUnread(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.INQUIRY_UNREAD_HOURS * 3_600_000);
  const rows = await db
    .select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      eventType: inquiries.eventType,
      eventDate: inquiries.eventDate,
      submittedAt: inquiries.submittedAt,
      guestCount: inquiries.guestCount,
    })
    .from(inquiries)
    .where(
      and(
        eq(inquiries.status, "submitted"),
        lte(inquiries.submittedAt, cutoff),
      ),
    )
    .orderBy(inquiries.submittedAt);

  return rows.map((r) =>
    mkItem({
      type: "inquiry_unread",
      urgency: "P0",
      subjectId: r.id,
      eventId: null,
      clientId: null,
      opportunityId: null,
      quoteId: null,
      title: "New inquiry waiting",
      subtitle: `${r.firstName} ${r.lastName} · ${r.eventType}${r.guestCount ? ` · ${r.guestCount} guests` : ""}`,
      timestamp: r.submittedAt,
      primaryLink: `/inquiries?id=${r.id}`,
      actions: ["convert", "view", "snooze", "dismiss"],
    }),
  );
}

async function sourceInfoRequested(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.INFO_REQUESTED_HOURS * 3_600_000);
  const rows = await db
    .select({
      id: quotes.id,
      clientId: quotes.clientId,
      opportunityId: quotes.opportunityId,
      infoRequestedAt: quotes.infoRequestedAt,
      consultationBookedAt: quotes.consultationBookedAt,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(
      and(
        isNotNull(quotes.infoRequestedAt),
        isNull(quotes.consultationBookedAt),
        lte(quotes.infoRequestedAt, cutoff),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "info_requested",
      urgency: "P0",
      subjectId: r.id,
      eventId: null,
      clientId: r.clientId,
      opportunityId: r.opportunityId,
      quoteId: r.id,
      title: "Customer asked for more info",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · quote #${r.id} — consultation not booked`,
      timestamp: r.infoRequestedAt,
      primaryLink: `/quotes/${r.id}/view`,
      actions: ["send_consult_link", "reply", "snooze", "dismiss"],
    }),
  );
}

async function sourceQuoteUnviewed(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.QUOTE_UNVIEWED_HOURS * 3_600_000);
  const rows = await db
    .select({
      id: quotes.id,
      clientId: quotes.clientId,
      opportunityId: quotes.opportunityId,
      sentAt: quotes.sentAt,
      total: quotes.total,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(
      and(
        eq(quotes.status, "sent"),
        isNull(quotes.viewedAt),
        lte(quotes.sentAt, cutoff),
      ),
    )
    .orderBy(quotes.sentAt);

  return rows.map((r) =>
    mkItem({
      type: "quote_unviewed",
      urgency: "P1",
      subjectId: r.id,
      eventId: null,
      clientId: r.clientId,
      opportunityId: r.opportunityId,
      quoteId: r.id,
      title: "Quote sent, not viewed",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · quote #${r.id} · $${((r.total || 0) / 100).toLocaleString()}`,
      timestamp: r.sentAt,
      primaryLink: `/quotes/${r.id}/view`,
      actions: ["resend", "sms", "snooze", "dismiss"],
    }),
  );
}

async function sourceQuoteViewedNoAction(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.QUOTE_VIEWED_NO_ACTION_HOURS * 3_600_000);
  const rows = await db
    .select({
      id: quotes.id,
      clientId: quotes.clientId,
      opportunityId: quotes.opportunityId,
      viewedAt: quotes.viewedAt,
      total: quotes.total,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(
      and(
        eq(quotes.status, "viewed"),
        lte(quotes.viewedAt, cutoff),
        isNull(quotes.acceptedAt),
        isNull(quotes.declinedAt),
      ),
    )
    .orderBy(quotes.viewedAt);

  return rows.map((r) =>
    mkItem({
      type: "quote_viewed_no_action",
      urgency: "P1",
      subjectId: r.id,
      eventId: null,
      clientId: r.clientId,
      opportunityId: r.opportunityId,
      quoteId: r.id,
      title: "Quote viewed, no action",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · quote #${r.id} · $${((r.total || 0) / 100).toLocaleString()}`,
      timestamp: r.viewedAt,
      primaryLink: `/quotes/${r.id}/view`,
      actions: ["draft_follow_up", "call", "snooze", "dismiss"],
    }),
  );
}

async function sourceTastingUnpaid(): Promise<FollowUpItem[]> {
  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + SLA.TASTING_UNPAID_LEAD_HOURS * 3_600_000);
  const rows = await db
    .select({
      id: tastings.id,
      clientId: tastings.clientId,
      opportunityId: tastings.opportunityId,
      quoteId: tastings.quoteId,
      scheduledAt: tastings.scheduledAt,
      firstName: tastings.firstName,
      lastName: tastings.lastName,
      totalPriceCents: tastings.totalPriceCents,
    })
    .from(tastings)
    .where(
      and(
        eq(tastings.status, "scheduled"),
        isNull(tastings.paidAt),
        gte(tastings.scheduledAt, windowStart),
        lte(tastings.scheduledAt, windowEnd),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "tasting_unpaid",
      urgency: "P1",
      subjectId: r.id,
      eventId: null,
      clientId: r.clientId,
      opportunityId: r.opportunityId,
      quoteId: r.quoteId,
      title: "Tasting scheduled, not paid",
      subtitle: `${r.firstName ?? ""} ${r.lastName ?? ""} · $${((r.totalPriceCents || 0) / 100).toLocaleString()} — ${new Date(r.scheduledAt).toLocaleDateString()}`,
      timestamp: r.scheduledAt,
      primaryLink: `/tasting`,
      actions: ["resend_payment", "cancel", "snooze", "dismiss"],
    }),
  );
}

async function sourceContractUnsigned(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.CONTRACT_UNSIGNED_DAYS * 86_400_000);
  const rows = await db
    .select({
      id: contracts.id,
      eventId: contracts.eventId,
      clientId: contracts.clientId,
      quoteId: contracts.quoteId,
      sentAt: contracts.sentAt,
      status: contracts.status,
      signingUrl: contracts.signingUrl,
    })
    .from(contracts)
    .where(
      and(
        inArray(contracts.status, ["sent", "viewed"]),
        lte(contracts.sentAt, cutoff),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "contract_unsigned",
      urgency: "P1",
      subjectId: r.id,
      eventId: r.eventId,
      clientId: r.clientId,
      opportunityId: null,
      quoteId: r.quoteId,
      title: "Contract sent, not signed",
      subtitle: `Contract #${r.id} · ${r.status} · ${Math.round(hoursAgo(r.sentAt) / 24)}d old`,
      timestamp: r.sentAt,
      primaryLink: r.eventId ? `/events/${r.eventId}` : `/quotes/${r.quoteId}/view`,
      actions: ["resend_contract", "copy_signing_link", "snooze", "dismiss"],
    }),
  );
}

async function sourceDepositOverdue(): Promise<FollowUpItem[]> {
  // Deposit overdue = contract signed > N days ago, and event.deposit_paid_at null.
  const cutoff = new Date(Date.now() - SLA.DEPOSIT_OVERDUE_DAYS * 86_400_000);
  const rows = await db
    .select({
      id: events.id,
      clientId: events.clientId,
      quoteId: events.quoteId,
      eventDate: events.eventDate,
      depositAmountCents: events.depositAmountCents,
      depositPaidAt: events.depositPaidAt,
      contractSignedAt: contracts.signedAt,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(events)
    .leftJoin(contracts, eq(contracts.eventId, events.id))
    .leftJoin(clients, eq(events.clientId, clients.id))
    .where(
      and(
        isNull(events.depositPaidAt),
        isNotNull(contracts.signedAt),
        lte(contracts.signedAt, cutoff),
        isNull(events.deletedAt),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "deposit_overdue",
      urgency: "P1",
      subjectId: r.id,
      eventId: r.id,
      clientId: r.clientId,
      opportunityId: null,
      quoteId: r.quoteId,
      title: "Deposit overdue",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · event #${r.id} · $${((r.depositAmountCents || 0) / 100).toLocaleString()} due`,
      timestamp: r.contractSignedAt,
      primaryLink: `/events/${r.id}`,
      actions: ["send_payment_link", "text_customer", "snooze", "dismiss"],
    }),
  );
}

async function sourceBalanceDueWindow(): Promise<FollowUpItem[]> {
  const windowEnd = new Date(Date.now() + SLA.BALANCE_DUE_DAYS_BEFORE * 86_400_000);
  const rows = await db
    .select({
      id: events.id,
      clientId: events.clientId,
      quoteId: events.quoteId,
      eventDate: events.eventDate,
      balanceAmountCents: events.balanceAmountCents,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(events)
    .leftJoin(clients, eq(events.clientId, clients.id))
    .where(
      and(
        isNull(events.balancePaidAt),
        lte(events.eventDate, windowEnd),
        gte(events.eventDate, new Date()),
        isNull(events.deletedAt),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "balance_due_window",
      urgency: "P0",
      subjectId: r.id,
      eventId: r.id,
      clientId: r.clientId,
      opportunityId: null,
      quoteId: r.quoteId,
      title: "Balance due soon",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · event ${new Date(r.eventDate).toLocaleDateString()} · $${((r.balanceAmountCents || 0) / 100).toLocaleString()}`,
      timestamp: r.eventDate,
      primaryLink: `/events/${r.id}`,
      actions: ["send_invoice", "call", "snooze", "dismiss"],
    }),
  );
}

async function sourceAutoDraftPending(): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: followUpDrafts.id,
      opportunityId: followUpDrafts.opportunityId,
      type: followUpDrafts.type,
      createdAt: followUpDrafts.createdAt,
      subject: followUpDrafts.subject,
    })
    .from(followUpDrafts)
    .where(eq(followUpDrafts.status, "pending"))
    .orderBy(followUpDrafts.createdAt);

  return rows.map((r) =>
    mkItem({
      type: "auto_draft_pending",
      urgency: "P2",
      subjectId: r.id,
      eventId: null,
      clientId: null,
      opportunityId: r.opportunityId,
      quoteId: null,
      title: "Follow-up draft ready",
      subtitle: `${r.type} · ${r.subject || "(no subject)"}`,
      timestamp: r.createdAt,
      primaryLink: `/follow-up-drafts?id=${r.id}`,
      actions: ["review", "edit", "snooze", "dismiss"],
    }),
  );
}

async function sourceDeclineFeedback(): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: quotes.id,
      clientId: quotes.clientId,
      opportunityId: quotes.opportunityId,
      declineFeedbackSubmittedAt: quotes.declineFeedbackSubmittedAt,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(quotes)
    .leftJoin(clients, eq(quotes.clientId, clients.id))
    .where(isNotNull(quotes.declineFeedbackSubmittedAt))
    .orderBy(desc(quotes.declineFeedbackSubmittedAt))
    .limit(50);

  return rows.map((r) =>
    mkItem({
      type: "decline_feedback",
      urgency: "P2",
      subjectId: r.id,
      eventId: null,
      clientId: r.clientId,
      opportunityId: r.opportunityId,
      quoteId: r.id,
      title: "Decline feedback submitted",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · quote #${r.id}`,
      timestamp: r.declineFeedbackSubmittedAt,
      primaryLink: `/quotes/${r.id}/view`,
      actions: ["acknowledge", "nurture", "snooze", "dismiss"],
    }),
  );
}

async function sourceDripPausedStuck(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.DRIP_PAUSED_STUCK_DAYS * 86_400_000);
  const rows = await db
    .select({
      id: opportunities.id,
      firstName: opportunities.firstName,
      lastName: opportunities.lastName,
      followUpSequencePausedAt: opportunities.followUpSequencePausedAt,
    })
    .from(opportunities)
    .where(
      and(
        isNotNull(opportunities.followUpSequencePausedAt),
        lte(opportunities.followUpSequencePausedAt, cutoff),
        isNull(opportunities.deletedAt),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "drip_paused_stuck",
      urgency: "P2",
      subjectId: r.id,
      eventId: null,
      clientId: null,
      opportunityId: r.id,
      quoteId: null,
      title: "Drip paused, stuck",
      subtitle: `${r.firstName} ${r.lastName} · paused ${Math.round(hoursAgo(r.followUpSequencePausedAt) / 24)}d`,
      timestamp: r.followUpSequencePausedAt,
      primaryLink: `/opportunities/${r.id}`,
      actions: ["resume_drip", "lose", "snooze", "dismiss"],
    }),
  );
}

async function sourceUnmatchedEmail(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.UNMATCHED_HOURS * 3_600_000);
  // Only surface raw leads that still need attention — specifically those
  // that haven't been promoted to an opportunity. `status='new'` alone isn't
  // enough because legacy leads may have been processed without the status
  // ever flipping (the admin "Process" action creates the opportunity but
  // doesn't update raw_leads.status).
  const rows = await db
    .select({
      id: rawLeads.id,
      extractedName: rawLeads.extractedProspectName,
      extractedEmail: rawLeads.extractedProspectEmail,
      receivedAt: rawLeads.receivedAt,
      source: rawLeads.source,
    })
    .from(rawLeads)
    .where(
      and(
        inArray(rawLeads.status, ["needs_manual_review", "new"]),
        isNull(rawLeads.createdOpportunityId),
        lte(rawLeads.receivedAt, cutoff),
      ),
    )
    .orderBy(rawLeads.receivedAt);

  return rows.map((r) =>
    mkItem({
      type: "unmatched_email",
      urgency: "P3",
      subjectId: r.id,
      eventId: null,
      clientId: null,
      opportunityId: null,
      quoteId: null,
      title: "Unmatched inbound",
      subtitle: `${r.extractedName || r.extractedEmail || "Unknown"} · ${r.source}`,
      timestamp: r.receivedAt,
      primaryLink: `/raw-leads/${r.id}`,
      actions: ["match", "junk", "snooze", "dismiss"],
    }),
  );
}

async function sourceReviewNotRequested(): Promise<FollowUpItem[]> {
  const cutoff = new Date(Date.now() - SLA.REVIEW_AFTER_EVENT_HOURS * 3_600_000);
  const rows = await db
    .select({
      id: events.id,
      clientId: events.clientId,
      eventDate: events.eventDate,
      clientFirst: clients.firstName,
      clientLast: clients.lastName,
    })
    .from(events)
    .leftJoin(clients, eq(events.clientId, clients.id))
    .where(
      and(
        lte(events.eventDate, cutoff),
        isNull(events.reviewRequestSentAt),
        isNull(events.deletedAt),
      ),
    );

  return rows.map((r) =>
    mkItem({
      type: "review_not_requested",
      urgency: "P3",
      subjectId: r.id,
      eventId: r.id,
      clientId: r.clientId,
      opportunityId: null,
      quoteId: null,
      title: "Review request not sent",
      subtitle: `${r.clientFirst ?? ""} ${r.clientLast ?? ""} · event ${new Date(r.eventDate).toLocaleDateString()}`,
      timestamp: r.eventDate,
      primaryLink: `/events/${r.id}`,
      actions: ["send_review_request", "skip", "snooze", "dismiss"],
    }),
  );
}

async function sourceTastingNoShow(): Promise<FollowUpItem[]> {
  const rows = await db
    .select({
      id: tastings.id,
      firstName: tastings.firstName,
      lastName: tastings.lastName,
      scheduledAt: tastings.scheduledAt,
      updatedAt: tastings.updatedAt,
    })
    .from(tastings)
    .where(eq(tastings.status, "no_show"))
    .orderBy(desc(tastings.updatedAt));

  return rows.map((r) =>
    mkItem({
      type: "tasting_no_show",
      urgency: "P2",
      subjectId: r.id,
      eventId: null,
      clientId: null,
      opportunityId: null,
      quoteId: null,
      title: "Tasting no-show",
      subtitle: `${r.firstName ?? ""} ${r.lastName ?? ""} · ${new Date(r.scheduledAt).toLocaleDateString()}`,
      timestamp: r.updatedAt,
      primaryLink: `/tasting`,
      actions: ["reach_out", "lose", "snooze", "dismiss"],
    }),
  );
}

async function sourceLostLeadNurture(): Promise<FollowUpItem[]> {
  const ageCutoff = new Date(Date.now() - SLA.LOST_LEAD_AGE_DAYS * 86_400_000);
  const quietCutoff = new Date(Date.now() - SLA.LOST_LEAD_QUIET_DAYS * 86_400_000);
  const rows = await db
    .select({
      id: opportunities.id,
      firstName: opportunities.firstName,
      lastName: opportunities.lastName,
      statusChangedAt: opportunities.statusChangedAt,
      lastFollowUpAt: opportunities.lastFollowUpAt,
      lostReason: opportunities.lostReason,
    })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.status, "lost"),
        lte(opportunities.statusChangedAt, ageCutoff),
        or(
          isNull(opportunities.lastFollowUpAt),
          lte(opportunities.lastFollowUpAt, quietCutoff),
        ),
        isNull(opportunities.deletedAt),
      ),
    );

  return rows
    .filter((r) => {
      const reason = (r.lostReason || "").toLowerCase();
      // Skip permanent-loss reasons where nurture is pointless.
      return !["spam", "junk", "wrong_fit", "bad_fit", "disqualified"].some((bad) =>
        reason.includes(bad),
      );
    })
    .map((r) =>
      mkItem({
        type: "lost_lead_nurture",
        urgency: "P3",
        subjectId: r.id,
        eventId: null,
        clientId: null,
        opportunityId: r.id,
        quoteId: null,
        title: "Quiet lost lead",
        subtitle: `${r.firstName} ${r.lastName}${r.lostReason ? ` · ${r.lostReason}` : ""}`,
        timestamp: r.lastFollowUpAt || r.statusChangedAt,
        primaryLink: `/opportunities/${r.id}`,
        actions: ["nurture", "archive", "snooze", "dismiss"],
      }),
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MkItemArgs {
  type: FollowUpType;
  urgency: FollowUpUrgency;
  subjectId: number;
  eventId: number | null;
  clientId: number | null;
  opportunityId: number | null;
  quoteId: number | null;
  title: string;
  subtitle: string;
  timestamp: Date | null | undefined;
  primaryLink: string;
  actions: string[];
}

function mkItem(args: MkItemArgs): FollowUpItem {
  return {
    key: `${args.type}:${args.subjectId}`,
    type: args.type,
    urgency: args.urgency,
    title: args.title,
    subtitle: args.subtitle,
    ageSeconds: ageSeconds(args.timestamp),
    sourceAge: iso(args.timestamp),
    subjectId: args.subjectId,
    eventId: args.eventId,
    clientId: args.clientId,
    opportunityId: args.opportunityId,
    quoteId: args.quoteId,
    links: { primary: args.primaryLink },
    actions: args.actions,
    userState: { state: "open", snoozeUntil: null, note: null },
  };
}

// ---------------------------------------------------------------------------
// Public entry — returns overlay-merged, filtered items with counts
// ---------------------------------------------------------------------------

export async function listFollowUps(
  opts: ListFollowUpsOptions,
): Promise<{ items: FollowUpItem[]; counts: FollowUpCounts }> {
  const all = (
    await Promise.all([
      sourceChangeRequests(),
      sourceInquiryUnread(),
      sourceInfoRequested(),
      sourceQuoteUnviewed(),
      sourceQuoteViewedNoAction(),
      sourceTastingUnpaid(),
      sourceContractUnsigned(),
      sourceDepositOverdue(),
      sourceBalanceDueWindow(),
      sourceAutoDraftPending(),
      sourceDeclineFeedback(),
      sourceDripPausedStuck(),
      sourceUnmatchedEmail(),
      sourceReviewNotRequested(),
      sourceTastingNoShow(),
      sourceLostLeadNurture(),
    ])
  ).flat();

  // Load the per-user state overlay in one query.
  const stateRows = await db
    .select()
    .from(followUpStates)
    .where(eq(followUpStates.userId, opts.userId));
  const stateMap = new Map(stateRows.map((s) => [s.itemKey, s]));

  const now = Date.now();

  const overlaid = all
    .map((item) => {
      const s = stateMap.get(item.key);
      if (!s) return item;
      // Snooze expired — treat as open.
      if (s.state === "snoozed" && s.snoozeUntil && new Date(s.snoozeUntil).getTime() <= now) {
        return {
          ...item,
          userState: { state: "open" as const, snoozeUntil: null, note: s.note ?? null },
        };
      }
      // Dismissed but source record changed — treat as open again.
      if (s.state === "dismissed" && s.dismissedAtSource && s.dismissedAtSource !== item.sourceAge) {
        return {
          ...item,
          userState: { state: "open" as const, snoozeUntil: null, note: s.note ?? null },
        };
      }
      return {
        ...item,
        userState: {
          state: s.state as FollowUpState,
          snoozeUntil: s.snoozeUntil ? new Date(s.snoozeUntil).toISOString() : null,
          note: s.note ?? null,
        },
      };
    })
    // Filter by user state — only "open" and "in_progress" show unless explicitly included.
    .filter((item) => {
      if (item.userState.state === "open" || item.userState.state === "in_progress") return true;
      if (item.userState.state === "snoozed") return opts.includeSnoozed === true;
      if (item.userState.state === "dismissed") return opts.includeDismissed === true;
      return false;
    })
    // Type filter
    .filter((item) => (opts.types && opts.types.length > 0 ? opts.types.includes(item.type) : true))
    // Urgency filter
    .filter((item) =>
      opts.urgency && opts.urgency.length > 0 ? opts.urgency.includes(item.urgency) : true,
    );

  // Sort: in_progress first, then urgency tier, then oldest first within tier.
  const urgencyRank: Record<FollowUpUrgency, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  overlaid.sort((a, b) => {
    if (a.userState.state === "in_progress" && b.userState.state !== "in_progress") return -1;
    if (b.userState.state === "in_progress" && a.userState.state !== "in_progress") return 1;
    const ur = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (ur !== 0) return ur;
    return b.ageSeconds - a.ageSeconds;
  });

  // Counts (over the unfiltered open set — what actually needs attention).
  const openOnly = all.filter((item) => {
    const s = stateMap.get(item.key);
    if (!s) return true;
    if (s.state === "snoozed" && s.snoozeUntil && new Date(s.snoozeUntil).getTime() <= now) return true;
    if (s.state === "dismissed" && s.dismissedAtSource !== item.sourceAge) return true;
    return s.state === "in_progress";
  });
  const counts: FollowUpCounts = { p0: 0, p1: 0, p2: 0, p3: 0, total: openOnly.length };
  for (const it of openOnly) {
    if (it.urgency === "P0") counts.p0++;
    else if (it.urgency === "P1") counts.p1++;
    else if (it.urgency === "P2") counts.p2++;
    else counts.p3++;
  }

  return { items: overlaid, counts };
}

// ---------------------------------------------------------------------------
// Per-user state mutations (called from API endpoints)
// ---------------------------------------------------------------------------

export async function snoozeItem(
  userId: number,
  itemKey: string,
  snoozeUntil: Date,
  note?: string,
): Promise<void> {
  await db
    .insert(followUpStates)
    .values({
      userId,
      itemKey,
      state: "snoozed",
      snoozeUntil,
      note: note ?? null,
    })
    .onConflictDoUpdate({
      target: [followUpStates.userId, followUpStates.itemKey],
      set: {
        state: "snoozed",
        snoozeUntil,
        note: note ?? null,
        dismissedAtSource: null,
        updatedAt: new Date(),
      },
    });
}

export async function dismissItem(
  userId: number,
  itemKey: string,
  sourceAge: string,
  note?: string,
): Promise<void> {
  await db
    .insert(followUpStates)
    .values({
      userId,
      itemKey,
      state: "dismissed",
      dismissedAtSource: sourceAge,
      note: note ?? null,
    })
    .onConflictDoUpdate({
      target: [followUpStates.userId, followUpStates.itemKey],
      set: {
        state: "dismissed",
        dismissedAtSource: sourceAge,
        note: note ?? null,
        snoozeUntil: null,
        updatedAt: new Date(),
      },
    });
}

export async function pinItem(userId: number, itemKey: string, note?: string): Promise<void> {
  await db
    .insert(followUpStates)
    .values({
      userId,
      itemKey,
      state: "in_progress",
      note: note ?? null,
    })
    .onConflictDoUpdate({
      target: [followUpStates.userId, followUpStates.itemKey],
      set: {
        state: "in_progress",
        note: note ?? null,
        snoozeUntil: null,
        dismissedAtSource: null,
        updatedAt: new Date(),
      },
    });
}

export async function unpinItem(userId: number, itemKey: string): Promise<void> {
  // Simply delete the state row — returns to "open".
  await db
    .delete(followUpStates)
    .where(and(eq(followUpStates.userId, userId), eq(followUpStates.itemKey, itemKey)));
}

export async function setItemNote(
  userId: number,
  itemKey: string,
  note: string,
): Promise<void> {
  // Need an existing row or a new "in_progress" so note survives.
  await db
    .insert(followUpStates)
    .values({ userId, itemKey, state: "in_progress", note })
    .onConflictDoUpdate({
      target: [followUpStates.userId, followUpStates.itemKey],
      set: { note, updatedAt: new Date() },
    });
}

/**
 * Nightly cleanup — remove state rows whose item_key points at a source we
 * can no longer find (source deleted). Keeps the table from bloating.
 */
export async function cleanupOrphanStates(): Promise<{ removed: number }> {
  const rows = await db.select({ key: followUpStates.itemKey }).from(followUpStates);
  const uniqueKeys = Array.from(new Set(rows.map((r) => r.key)));
  const orphans: string[] = [];

  for (const key of uniqueKeys) {
    const [type, idStr] = key.split(":");
    const id = Number(idStr);
    if (!type || !id) {
      orphans.push(key);
      continue;
    }
    let exists = false;
    switch (type) {
      case "change_request_open":
      case "decline_feedback": {
        const r = await db.select({ id: sql<number>`1` }).from(communications).where(eq(communications.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "inquiry_unread": {
        const r = await db.select({ id: sql<number>`1` }).from(inquiries).where(eq(inquiries.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "info_requested":
      case "quote_unviewed":
      case "quote_viewed_no_action": {
        const r = await db.select({ id: sql<number>`1` }).from(quotes).where(eq(quotes.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "tasting_unpaid":
      case "tasting_no_show": {
        const r = await db.select({ id: sql<number>`1` }).from(tastings).where(eq(tastings.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "contract_unsigned": {
        const r = await db.select({ id: sql<number>`1` }).from(contracts).where(eq(contracts.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "deposit_overdue":
      case "balance_due_window":
      case "review_not_requested": {
        const r = await db.select({ id: sql<number>`1` }).from(events).where(eq(events.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "auto_draft_pending": {
        const r = await db.select({ id: sql<number>`1` }).from(followUpDrafts).where(eq(followUpDrafts.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "drip_paused_stuck":
      case "lost_lead_nurture": {
        const r = await db.select({ id: sql<number>`1` }).from(opportunities).where(eq(opportunities.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      case "unmatched_email": {
        const r = await db.select({ id: sql<number>`1` }).from(rawLeads).where(eq(rawLeads.id, id)).limit(1);
        exists = r.length > 0;
        break;
      }
      default:
        exists = false;
    }
    if (!exists) orphans.push(key);
  }

  if (orphans.length === 0) return { removed: 0 };
  await db.delete(followUpStates).where(inArray(followUpStates.itemKey, orphans));
  return { removed: orphans.length };
}
