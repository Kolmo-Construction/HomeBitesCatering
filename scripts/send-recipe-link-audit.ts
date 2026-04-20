/**
 * One-off: run the menu → recipe link audit right now and email the detailed
 * report via Resend. Same logic the 8-hourly scheduled job uses; this lets
 * you trigger an immediate send without waiting for the next cron tick.
 */
import { runAndEmailRecipeLinkAudit } from "../server/services/recipeLinkAudit";

const recipient =
  process.env.RECIPE_AUDIT_RECIPIENT || "hello@eathomebites.com";

async function main() {
  const result = await runAndEmailRecipeLinkAudit(recipient);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.sent ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
