// SMS sending helper. Wraps Twilio with graceful degradation so the app works
// without TWILIO_* credentials — every send call returns { sent, skipped, error? }
// instead of throwing. When skipped, the caller should not treat it as a failure.
//
// Every successful send is logged to the `communications` table as an outgoing
// SMS so the admin has an audit trail of what the system sent on its behalf.
//
// Mirrors the structure of server/utils/email.ts.

import twilio from "twilio";
import type { Twilio } from "twilio";
import { db } from "../db";
import { communications } from "@shared/schema";
import { getSmsConfig } from "../utils/siteConfig";
import { normalizePhoneNumber, isValidPhone } from "./phoneService";

export interface SendSmsArgs {
  to: string;
  body: string;
  templateKey: string;
  // Optional linkage for the communications audit log
  clientId?: number | null;
  eventId?: number | null;
  opportunityId?: number | null;
}

export interface SendSmsResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
  sid?: string;
}

// Singleton, built lazily so the server starts even without Twilio creds
let twilioClient: Twilio | null = null;
function getTwilioClient(): Twilio | null {
  const cfg = getSmsConfig();
  if (!cfg.twilioAccountSid || !cfg.twilioAuthToken) return null;
  if (!twilioClient) {
    twilioClient = twilio(cfg.twilioAccountSid, cfg.twilioAuthToken);
  }
  return twilioClient;
}

export async function sendSms(args: SendSmsArgs): Promise<SendSmsResult> {
  const cfg = getSmsConfig();

  if (!cfg.twilioAccountSid || !cfg.twilioAuthToken || !cfg.twilioFromNumber) {
    console.log(
      `[sms] skipped ${args.templateKey} to ${args.to} — Twilio env not configured`
    );
    return { sent: false, skipped: true };
  }

  const toNormalized = normalizePhoneNumber(args.to);
  if (!isValidPhone(toNormalized)) {
    console.error(`[sms] invalid 'to' number for ${args.templateKey}: ${args.to}`);
    return { sent: false, skipped: false, error: "Invalid 'to' phone number" };
  }

  const client = getTwilioClient();
  if (!client) {
    return { sent: false, skipped: true };
  }

  try {
    const message = await client.messages.create({
      to: toNormalized,
      from: cfg.twilioFromNumber,
      body: args.body,
    });

    // Log to communications table (audit trail). Best-effort — never fail the
    // send if the audit log insert itself errors.
    try {
      await db.insert(communications).values({
        type: "sms",
        direction: "outgoing",
        timestamp: new Date(),
        source: "twilio",
        externalId: message.sid ?? null,
        fromAddress: cfg.twilioFromNumber,
        toAddress: toNormalized,
        bodyRaw: args.body,
        bodySummary: args.body.slice(0, 500),
        clientId: args.clientId ?? null,
        eventId: args.eventId ?? null,
        opportunityId: args.opportunityId ?? null,
        metaData: {
          template: args.templateKey,
          sid: message.sid ?? null,
          status: message.status ?? null,
        },
      } as any);
    } catch (logError) {
      console.warn(
        `[sms] sent ok but failed to log to communications for ${args.templateKey}:`,
        logError
      );
    }

    return { sent: true, skipped: false, sid: message.sid };
  } catch (error: any) {
    console.error(`[sms] send failed for ${args.templateKey}:`, error);
    return { sent: false, skipped: false, error: error?.message || String(error) };
  }
}

// Fire-and-forget helper: send in the background, never block the caller,
// swallow errors (they're already logged inside sendSms).
export function sendSmsInBackground(args: SendSmsArgs): void {
  sendSms(args).catch((err) => {
    console.error(`[sms] background send failed for ${args.templateKey}:`, err);
  });
}

// Convenience: send an SMS to the configured owner number. No-op if owner
// number is not set. Used for inquiry alerts and internal notifications.
export function sendOwnerSmsInBackground(args: Omit<SendSmsArgs, "to">): void {
  const cfg = getSmsConfig();
  if (!cfg.ownerSmsNumber) {
    console.log(
      `[sms] skipped owner alert ${args.templateKey} — OWNER_SMS_NUMBER not configured`
    );
    return;
  }
  sendSmsInBackground({ ...args, to: cfg.ownerSmsNumber });
}
