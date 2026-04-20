// Background job scheduler — registered at server startup.
//
// Uses node-cron. Schedules:
//   - Every 8 hours: run the menu → recipe link audit and email the report.
//
// Gating:
//   - Disabled entirely when ENABLE_BACKGROUND_JOBS is explicitly "false"
//     (useful in dev / CI / review apps so local boots don't spam email).
//   - Defaults to ON in production; defaults to OFF in development unless
//     the env var is set to "true".

import cron from "node-cron";
import { runAndEmailRecipeLinkAudit } from "../services/recipeLinkAudit";

const RECIPE_AUDIT_RECIPIENT =
  process.env.RECIPE_AUDIT_RECIPIENT || "hello@eathomebites.com";

// Every 8 hours, on the hour: 00:00, 08:00, 16:00 server time.
const EVERY_8_HOURS = "0 */8 * * *";

function jobsEnabled(): boolean {
  const raw = (process.env.ENABLE_BACKGROUND_JOBS || "").toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV === "production";
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

  console.log(
    `[scheduler] registered: recipe link audit every 8 hours → ${RECIPE_AUDIT_RECIPIENT}`,
  );

  // Kick off an immediate run on boot so the first report lands right away
  // rather than waiting until the next 8-hour boundary. Fire-and-forget so
  // a slow audit never blocks the listening server.
  runAndEmailRecipeLinkAudit(RECIPE_AUDIT_RECIPIENT).catch((err) =>
    console.error("[scheduler] initial recipe link audit failed:", err),
  );
}
