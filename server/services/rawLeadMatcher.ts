/**
 * Raw-lead auto-matching.
 *
 * When a raw lead is ingested (Google Apps Script, webhook, etc.), try to
 * match the extracted email/phone against existing contact_identifiers /
 * clients. On a hit, link the raw lead to the known client+opportunity so it
 * stops showing up as "unmatched" in the follow-ups inbox, and log an
 * `incoming` communication on that client's timeline.
 *
 * Non-match = no-op. Lead keeps status='new' for admin review.
 *
 * Errors are caught and logged; matching is best-effort and never blocks
 * ingestion.
 */

import { db } from "../db";
import {
  rawLeads,
  opportunities,
  communications,
  contactIdentifiers,
  clients,
  type RawLead,
} from "@shared/schema";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { normalizePhoneNumber } from "./phoneService";

export interface MatchResult {
  matched: boolean;
  clientId?: number;
  opportunityId?: number;
  reason?: string; // "email" | "phone" — which identifier hit
  communicationId?: number;
}

/**
 * Try to find a client/opportunity match for this raw lead and, if found,
 * link + log. Returns the result; does not throw.
 */
export async function autoMatchRawLead(lead: RawLead): Promise<MatchResult> {
  try {
    // 1. Gather candidate identifiers to try in priority order.
    const emailCandidate = (lead.extractedProspectEmail || "")
      .trim()
      .toLowerCase();
    const phoneCandidate = normalizePhoneNumber(
      lead.extractedProspectPhone || "",
    );

    const candidates: Array<{ value: string; kind: "email" | "phone" }> = [];
    if (emailCandidate && /@/.test(emailCandidate)) {
      candidates.push({ value: emailCandidate, kind: "email" });
    }
    if (phoneCandidate && phoneCandidate.length >= 10) {
      candidates.push({ value: phoneCandidate, kind: "phone" });
    }

    if (candidates.length === 0) {
      return { matched: false };
    }

    // 2. Resolve each candidate against contact_identifiers first, then
    //    fall back to clients.email / clients.phone directly.
    let clientId: number | undefined;
    let opportunityId: number | undefined;
    let matchedOn: "email" | "phone" | undefined;

    for (const c of candidates) {
      // Contact identifiers (preferred — explicitly maintained)
      const [ident] = await db
        .select({
          clientId: contactIdentifiers.clientId,
          opportunityId: contactIdentifiers.opportunityId,
        })
        .from(contactIdentifiers)
        .where(
          sql`lower(trim(${contactIdentifiers.value})) = ${c.value}`,
        )
        .limit(1);

      if (ident?.clientId) {
        clientId = ident.clientId;
        opportunityId = ident.opportunityId ?? undefined;
        matchedOn = c.kind;
        break;
      }
      if (ident?.opportunityId && !ident.clientId) {
        // Opportunity-only identifier (pre-customer lead)
        const [opp] = await db
          .select({ id: opportunities.id, clientId: opportunities.clientId })
          .from(opportunities)
          .where(eq(opportunities.id, ident.opportunityId));
        if (opp) {
          opportunityId = opp.id;
          clientId = opp.clientId ?? undefined;
          matchedOn = c.kind;
          break;
        }
      }

      // Fallback: direct lookup on the clients table.
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            isNull(clients.deletedAt),
            or(
              sql`lower(trim(${clients.email})) = ${c.value}`,
              sql`replace(${clients.phone}, '-', '') = replace(${c.value}, '-', '')`,
            ),
          ),
        )
        .limit(1);
      if (client) {
        clientId = client.id;
        matchedOn = c.kind;
        break;
      }
    }

    if (!clientId && !opportunityId) {
      return { matched: false };
    }

    // 3. If we have a client but no opportunity, grab their most recent
    //    opportunity to attach timeline context.
    if (clientId && !opportunityId) {
      const [opp] = await db
        .select({ id: opportunities.id })
        .from(opportunities)
        .where(
          and(eq(opportunities.clientId, clientId), isNull(opportunities.deletedAt)),
        )
        .orderBy(desc(opportunities.createdAt))
        .limit(1);
      if (opp) opportunityId = opp.id;
    }

    // 4. Update the raw lead — link it and promote past `new` so the
    //    follow-ups inbox + admin UI know it's handled.
    await db
      .update(rawLeads)
      .set({
        status: "qualified",
        createdOpportunityId: opportunityId ?? null,
      })
      .where(eq(rawLeads.id, lead.id));

    // 5. Log an incoming communication on the matched client's timeline.
    const subject =
      lead.eventSummary ||
      lead.extractedMessageSummary ||
      `Inbound email from ${lead.extractedProspectName || lead.extractedProspectEmail || "known contact"}`;
    const bodyRaw =
      (lead.rawData as any)?.body ||
      (lead.rawData as any)?.emailBody ||
      lead.extractedMessageSummary ||
      null;

    const [comm] = await db
      .insert(communications)
      .values({
        clientId: clientId ?? null,
        opportunityId: opportunityId ?? null,
        type: "email",
        direction: "incoming",
        source: `auto_match_${lead.source}`,
        timestamp: lead.receivedAt,
        subject: subject.slice(0, 500),
        bodyRaw: bodyRaw,
        bodySummary: lead.extractedMessageSummary ?? null,
        metaData: {
          rawLeadId: lead.id,
          matchedOn,
          autoMatched: true,
        },
      } as any)
      .returning({ id: communications.id });

    console.log(
      `[rawLeadMatcher] auto-matched raw_lead #${lead.id} on ${matchedOn} → client #${clientId ?? "-"}, opp #${opportunityId ?? "-"}`,
    );

    return {
      matched: true,
      clientId,
      opportunityId,
      reason: matchedOn,
      communicationId: comm?.id,
    };
  } catch (err) {
    console.error(`[rawLeadMatcher] match failed for raw_lead #${lead.id}:`, err);
    return { matched: false };
  }
}
