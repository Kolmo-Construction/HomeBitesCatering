// Email sending helper. Wraps Resend with graceful degradation so the app works
// without RESEND_API_KEY — every send call returns { sent, skipped, error? }
// instead of throwing. When skipped, the caller falls back to mailto or just
// logs the intent.
//
// Every successful send is logged to the `communications` table as an outgoing
// email so the admin has an audit trail of what the system sent on its behalf.

import { Resend } from "resend";
import { db } from "../db";
import { communications } from "@shared/schema";
import { getEmailConfig } from "./siteConfig";

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  // Optional linkage for the communications audit log
  clientId?: number | null;
  eventId?: number | null;
  opportunityId?: number | null;
  // Template key for analytics / debugging
  templateKey: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
  messageId?: string;
}

// Singleton, built lazily so the server starts even without RESEND_API_KEY
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const cfg = getEmailConfig();
  if (!cfg.resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(cfg.resendApiKey);
  }
  return resendClient;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const cfg = getEmailConfig();
  const toList = Array.isArray(args.to) ? args.to : [args.to];

  if (!cfg.resendApiKey) {
    console.log(
      `[email] skipped ${args.templateKey} to ${toList.join(", ")} — RESEND_API_KEY not configured`
    );
    return { sent: false, skipped: true };
  }

  const client = getResendClient();
  if (!client) {
    return { sent: false, skipped: true };
  }

  try {
    const fromAddress = `${cfg.fromName} <${cfg.fromEmail}>`;
    const result = await client.emails.send({
      from: fromAddress,
      to: toList,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo || cfg.replyToEmail,
    });

    if (result.error) {
      console.error(`[email] resend error for ${args.templateKey}:`, result.error);
      return { sent: false, skipped: false, error: result.error.message };
    }

    const messageId = result.data?.id;

    // Log to communications table (audit trail). Best-effort — never fail the
    // send if the audit log insert itself errors.
    try {
      await db.insert(communications).values({
        type: "email",
        direction: "outgoing",
        timestamp: new Date(),
        source: "resend",
        externalId: messageId ?? null,
        subject: args.subject,
        fromAddress: fromAddress,
        toAddress: toList.join(", "),
        bodyRaw: args.html,
        bodySummary: args.text.slice(0, 500),
        clientId: args.clientId ?? null,
        eventId: args.eventId ?? null,
        opportunityId: args.opportunityId ?? null,
        metaData: {
          template: args.templateKey,
          messageId: messageId ?? null,
        },
      } as any);
    } catch (logError) {
      console.warn(
        `[email] sent ok but failed to log to communications for ${args.templateKey}:`,
        logError
      );
    }

    return { sent: true, skipped: false, messageId };
  } catch (error: any) {
    console.error(`[email] send failed for ${args.templateKey}:`, error);
    return { sent: false, skipped: false, error: error?.message || String(error) };
  }
}

// Fire-and-forget helper: send in the background, never block the caller,
// swallow errors (they're already logged inside sendEmail).
export function sendEmailInBackground(args: SendEmailArgs): void {
  sendEmail(args).catch((err) => {
    console.error(`[email] background send failed for ${args.templateKey}:`, err);
  });
}
