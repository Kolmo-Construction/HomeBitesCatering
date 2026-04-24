// Background job scheduler — registered at server startup.
//
// Uses node-cron. Schedules:
//   - Every 8 hours: run the menu → recipe link audit and email the report.
//   - Every 30 minutes: fire the balance invoice for events ~7 days out.
//     Policy: balance must be settled 24h before event start; sending the link
//     a week ahead gives the customer 6 days to pay before unpaid follow-ups
//     escalate. The `balance_due_window` follow-up surfaces unpaid balances
//     to admin as P0 near the deadline.
//
// Gating:
//   - Disabled entirely when ENABLE_BACKGROUND_JOBS is explicitly "false"
//     (useful in dev / CI / review apps so local boots don't spam email).
//   - Defaults to ON in production; defaults to OFF in development unless
//     the env var is set to "true".
//
// No boot-kick: jobs only fire on their cron schedule. Railway restarts on
// every push to main, so a boot-kick would email on every deploy.

import cron from "node-cron";
import { and, eq, gte, lte, isNull, ne } from "drizzle-orm";
import { db } from "../db";
import { events } from "@shared/schema";
import { runAndEmailRecipeLinkAudit } from "../services/recipeLinkAudit";
import { ensureEventBalanceCheckout } from "../services/eventInvoicing";

const RECIPE_AUDIT_RECIPIENT =
  process.env.RECIPE_AUDIT_RECIPIENT || "hello@eathomebites.com";

// Every 8 hours, on the hour: 00:00, 08:00, 16:00 server time.
const EVERY_8_HOURS = "0 */8 * * *";
// Every 30 minutes — balance-invoice sweep window is 7 days, so cadence isn't
// tight; this just keeps recently-accepted bookings from waiting hours for
// their first invoice when they slot into the 7-day horizon.
const EVERY_30_MIN = "*/30 * * * *";

// Send the balance invoice this many milliseconds before event start.
const BALANCE_INVOICE_LEAD_MS = 7 * 24 * 60 * 60 * 1000;

function jobsEnabled(): boolean {
  const raw = (process.env.ENABLE_BACKGROUND_JOBS || "").toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV === "production";
}

// Sweep: find events whose start is inside the next 7 days, with no balance
// invoice already requested, and fire ensureEventBalanceCheckout for each.
// The helper is idempotent (skips if a link or payment already exists, and
// stamps balanceRequestedAt so the next tick won't re-send), so this is safe
// to re-run on every cron firing.
async function runBalanceInvoiceSweep(): Promise<void> {
  const now = new Date();
  const horizon = new Date(now.getTime() + BALANCE_INVOICE_LEAD_MS);

  const due = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        gte(events.startTime, now),
        lte(events.startTime, horizon),
        isNull(events.balanceRequestedAt),
        isNull(events.balancePaidAt),
        isNull(events.deletedAt),
        ne(events.status, "cancelled" as any),
      ),
    );

  if (due.length === 0) return;
  console.log(`[scheduler] balance-invoice sweep: ${due.length} event(s) within 7 days`);

  for (const row of due) {
    try {
      const result = await ensureEventBalanceCheckout(row.id);
      if (result.error && result.error !== "already paid") {
        console.warn(`[scheduler] balance invoice for event ${row.id}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[scheduler] balance invoice for event ${row.id} failed:`, err);
    }
  }
}

export function registerScheduledJobs(): void {
  if (!jobsEnabled()) {
    console.log(
      `[scheduler] background jobs disabled (NODE_ENV=${process.env.NODE_ENV}, ENABLE_BACKGROUND_JOBS=${process.env.ENABLE_BACKGROUND_JOBS ?? "unset"})`,
    );
    return;
  }

  cron.schedule(EVERY_8_HOURS, async () => {
    try {
      await runAndEmailRecipeLinkAudit(RECIPE_AUDIT_RECIPIENT);
    } catch (err) {
      console.error("[scheduler] recipe link audit failed:", err);
    }
  });

  cron.schedule(EVERY_30_MIN, async () => {
    try {
      await runBalanceInvoiceSweep();
    } catch (err) {
      console.error("[scheduler] balance invoice sweep failed:", err);
    }
  });

  console.log(
    `[scheduler] registered: recipe link audit every 8h → ${RECIPE_AUDIT_RECIPIENT}; balance invoice sweep every 30m (7-day lead)`,
  );
}
