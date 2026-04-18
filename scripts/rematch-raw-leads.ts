/**
 * One-shot backfill: runs autoMatchRawLead over every currently unlinked
 * raw lead. Safe to re-run — matcher is idempotent.
 *
 *   DATABASE_URL=... npx tsx scripts/rematch-raw-leads.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { rawLeads } from "../shared/schema";
import { and, inArray, isNull } from "drizzle-orm";
import { autoMatchRawLead } from "../server/services/rawLeadMatcher";

async function main() {
  const candidates = await db
    .select()
    .from(rawLeads)
    .where(
      and(
        inArray(rawLeads.status, ["new", "needs_manual_review"]),
        isNull(rawLeads.createdOpportunityId),
      ),
    );

  console.log(`Found ${candidates.length} unlinked raw leads. Running matcher…`);

  let matched = 0;
  const hits: Array<{ id: number; reason: string; clientId?: number; oppId?: number }> = [];
  for (const lead of candidates) {
    const r = await autoMatchRawLead(lead);
    if (r.matched) {
      matched++;
      hits.push({
        id: lead.id,
        reason: r.reason || "unknown",
        clientId: r.clientId,
        oppId: r.opportunityId,
      });
    }
  }

  console.log(`\n✓ Matched ${matched}/${candidates.length}\n`);
  if (hits.length > 0) {
    console.table(hits);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
