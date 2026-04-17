// Contract service — BoldSign e-signature integration.
// Wraps BoldSign's REST API via `fetch` (no SDK). Gracefully skips when
// BOLDSIGN_API_KEY is unset, so the rest of the booking flow still works and
// Mike can send a paper/PDF contract manually.
//
// Flow:
//   1. generateContractHtml(...) builds a signable HTML doc
//   2. sendContractForSignature(contract, html) posts to BoldSign, returns
//      documentId + signer-specific signing URL
//   3. BoldSign sends the signer an email with their link
//   4. On signing → webhook fires → verifyAndParseWebhook maps to our status
//
// Docs: https://developers.boldsign.com/documents/send-document

import { createHmac, timingSafeEqual } from "crypto";
import { getBoldSignConfig, getSiteConfig } from "../utils/siteConfig";
import type { Proposal } from "@shared/proposal";

export interface SendContractArgs {
  contractId: number;
  title: string;
  message: string;
  signerName: string;
  signerEmail: string;
  documentHtml: string;
  // Days the signer has to complete before BoldSign expires it
  expiryDays?: number;
}

export interface SendContractResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
  providerDocId?: string;
  signingUrl?: string;
}

function formatMoneyCents(cents: number | null | undefined): string {
  if (cents == null) return "$0.00";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/**
 * Build an HTML representation of the contract, snapshotting the proposal state
 * plus standard T&Cs. Intended to be rendered by BoldSign — keep CSS inline.
 */
export function generateContractHtml(args: {
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string | Date | null;
  guestCount: number | null;
  venue: string | null;
  totalCents: number;
  depositPercent: number;
  proposal?: Proposal | null;
}): string {
  const site = getSiteConfig();
  const depositCents = Math.round((args.totalCents * args.depositPercent) / 100);
  const balanceCents = args.totalCents - depositCents;
  const eventDate = args.eventDate
    ? new Date(args.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "TBD";

  const menuBlock = args.proposal?.menuSelections?.length
    ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;">
        <thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">Category</th><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">Item</th></tr></thead>
        <tbody>
          ${args.proposal.menuSelections
            .map(
              (sel: any) =>
                `<tr><td style="padding:6px;border-bottom:1px solid #f3f3f3;">${sel.category || ""}</td><td style="padding:6px;border-bottom:1px solid #f3f3f3;">${sel.name || ""}</td></tr>`,
            )
            .join("")}
        </tbody>
       </table>`
    : "<p><em>Menu details per the accepted proposal.</em></p>";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${site.businessName} — Event Catering Contract</title>
</head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1f2937; max-width: 780px; margin: 24px auto; padding: 0 16px; line-height: 1.55;">
  <div style="border-bottom: 2px solid #9a7d3d; padding-bottom: 12px; margin-bottom: 18px;">
    <h1 style="margin: 0; font-size: 24px; color: #111827;">${site.businessName}</h1>
    <p style="margin: 4px 0 0; color: #6b7280; font-style: italic;">Event Catering Services Agreement</p>
  </div>

  <p>This agreement ("Agreement") is between <strong>${site.businessName}</strong> ("Caterer"), ${site.address}, and <strong>${args.clientName}</strong> ("Client"), reached by email at ${args.clientEmail}.</p>

  <h2 style="font-size: 18px; margin-top: 24px;">1. Event Details</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Event type</td><td style="padding:6px 0;"><strong>${args.eventType.replace(/_/g, " ")}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Event date</td><td style="padding:6px 0;"><strong>${eventDate}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Guest count</td><td style="padding:6px 0;">${args.guestCount ?? "TBD"}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Venue</td><td style="padding:6px 0;">${args.venue || "TBD"}</td></tr>
  </table>

  <h2 style="font-size: 18px; margin-top: 24px;">2. Menu &amp; Service</h2>
  ${menuBlock}

  <h2 style="font-size: 18px; margin-top: 24px;">3. Fees &amp; Payment Schedule</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:6px 0;color:#6b7280;width:160px;">Grand total</td><td style="padding:6px 0;"><strong>${formatMoneyCents(args.totalCents)}</strong></td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Deposit (${args.depositPercent}%)</td><td style="padding:6px 0;"><strong>${formatMoneyCents(depositCents)}</strong> — due on signing to secure date</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;">Balance</td><td style="padding:6px 0;"><strong>${formatMoneyCents(balanceCents)}</strong> — due 7 days before event</td></tr>
  </table>

  <h2 style="font-size: 18px; margin-top: 24px;">4. Terms</h2>
  <ol style="padding-left: 20px;">
    <li><strong>Confirmation.</strong> Your event date is confirmed only once this Agreement is signed and the deposit has been received.</li>
    <li><strong>Cancellation.</strong> Deposits are non-refundable if the event is cancelled less than 30 days before the event date. Cancellations 30+ days out receive a 50% deposit refund.</li>
    <li><strong>Guest count changes.</strong> Final guest count must be confirmed 7 days before the event. Increases after that are accommodated if possible and billed at the per-guest rate. Decreases do not reduce the quoted total.</li>
    <li><strong>Menu changes.</strong> Minor changes requested up to 7 days before the event are included at no extra cost. Major changes may affect pricing.</li>
    <li><strong>Venue access.</strong> Client is responsible for coordinating venue access, utilities (water/power), and any venue-specific permits or fees.</li>
    <li><strong>Leftovers.</strong> Uneaten food prepared for the event is left with the Client unless otherwise agreed.</li>
    <li><strong>Liability.</strong> Caterer carries general liability insurance; Client is responsible for guest behavior and any venue damages not directly caused by Caterer.</li>
    <li><strong>Force majeure.</strong> In the event of circumstances beyond either party's reasonable control (extreme weather, illness, government order), the parties will work in good faith to reschedule; deposits are transferable to the rescheduled date.</li>
  </ol>

  <h2 style="font-size: 18px; margin-top: 24px;">5. Signatures</h2>
  <p>By signing below, both parties agree to the terms above.</p>
  <table style="width:100%;margin-top:28px;">
    <tr>
      <td style="width: 50%; padding-right: 16px; vertical-align: top;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">CLIENT</p>
        <div style="border-bottom: 1px solid #9ca3af; height: 36px;">{{Signature}}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${args.clientName} · ${args.clientEmail}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 10px;">Date: {{DateSigned}}</div>
      </td>
      <td style="width: 50%; padding-left: 16px; vertical-align: top;">
        <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">CATERER</p>
        <div style="border-bottom: 1px solid #9ca3af; height: 36px;">${site.chef.firstName} ${site.chef.lastName}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${site.businessName}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 10px;">Date: ${new Date().toLocaleDateString("en-US")}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send the contract to BoldSign for signature. Returns { providerDocId,
 * signingUrl } when BoldSign is configured; { skipped: true } otherwise.
 */
export async function sendContractForSignature(args: SendContractArgs): Promise<SendContractResult> {
  const cfg = getBoldSignConfig();
  if (!cfg.apiKey) {
    console.log(`[boldsign] skipped contract ${args.contractId} — BOLDSIGN_API_KEY not set`);
    return { sent: false, skipped: true };
  }

  try {
    const response = await fetch(`${cfg.apiBase}/v1/document/send`, {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: args.title,
        message: args.message,
        signers: [
          {
            name: args.signerName,
            emailAddress: args.signerEmail,
            signerOrder: 1,
            signerType: "Signer",
            formFields: [
              // Minimal fields: a signature box + date. Coordinates relative to
              // the last page. Anyone using template-mode can override later.
              {
                id: "signature_client",
                fieldType: "Signature",
                pageNumber: 1,
                bounds: { x: 60, y: 720, width: 200, height: 40 },
                isRequired: true,
              },
              {
                id: "date_signed",
                fieldType: "DateSigned",
                pageNumber: 1,
                bounds: { x: 60, y: 770, width: 150, height: 20 },
              },
            ],
          },
        ],
        files: [], // We send HTML via `documentHtml`
        documentHtml: args.documentHtml,
        expiryDays: args.expiryDays ?? 30,
        senderDetail: { name: cfg.senderName, email: cfg.senderEmail },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[boldsign] API error ${response.status}:`, body.slice(0, 500));
      return { sent: false, skipped: false, error: `BoldSign ${response.status}: ${body.slice(0, 200)}` };
    }

    const data = (await response.json()) as any;
    const providerDocId: string | undefined = data?.documentId || data?.DocumentId;
    // Signing URL may come back inline or have to be fetched separately. BoldSign
    // typically emails the signer, so we can leave the admin-side URL null.
    const signingUrl: string | undefined = data?.signingUrl || data?.signerUrls?.[0]?.signUrl;

    if (!providerDocId) {
      return { sent: false, skipped: false, error: "BoldSign did not return a documentId" };
    }

    return { sent: true, skipped: false, providerDocId, signingUrl };
  } catch (error: any) {
    console.error(`[boldsign] sendContractForSignature failed:`, error);
    return { sent: false, skipped: false, error: error?.message || String(error) };
  }
}

/**
 * BoldSign webhook signature verification. Uses HMAC-SHA256 over the raw body
 * with BOLDSIGN_WEBHOOK_SECRET. Header is `x-boldsign-signature`, base64.
 * Returns true (with warn) when secret is unset, so local dev is unblocked.
 */
export function verifyBoldSignWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
): boolean {
  const cfg = getBoldSignConfig();
  if (!cfg.webhookSecret) {
    console.warn("[boldsign] webhook received but BOLDSIGN_WEBHOOK_SECRET unset — accepting (INSECURE, dev only)");
    return true;
  }
  if (!signatureHeader) return false;
  try {
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const expected = createHmac("sha256", cfg.webhookSecret).update(body).digest("base64");
    if (signatureHeader.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch (err) {
    console.error("[boldsign] verify error:", err);
    return false;
  }
}

/** Map a BoldSign event name to our `contract_status` enum. */
export function boldSignEventToStatus(
  eventName: string | undefined,
): "sent" | "viewed" | "signed" | "declined" | "expired" | "cancelled" | null {
  if (!eventName) return null;
  const name = eventName.toLowerCase();
  if (name.includes("sent")) return "sent";
  if (name.includes("viewed") || name.includes("opened")) return "viewed";
  if (name.includes("completed") || name.includes("signed") || name.includes("finished")) return "signed";
  if (name.includes("declined") || name.includes("rejected")) return "declined";
  if (name.includes("expired")) return "expired";
  if (name.includes("revoked") || name.includes("cancelled") || name.includes("canceled")) return "cancelled";
  return null;
}
