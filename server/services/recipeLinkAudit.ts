// Menu → Recipe link audit + emailed report.
//
// Reads every menu's `categoryItems` JSONB, classifies each item as:
//   linked   — has a recipeId that exists in the recipes table
//   unlinked — no recipeId at all
//   broken   — has a recipeId that no longer exists
//
// Renders a detailed HTML/text report listing every single unlinked and
// broken item (not just samples), grouped by menu → category, and emails
// it to the configured recipient via the shared Resend helper.

import { db } from "../db";
import { menus, recipes } from "@shared/schema";
import { sendEmail } from "../utils/email";

export type ItemRef = {
  menu: string;
  category: string;
  name: string;
  itemId?: string;
  recipeId?: number;
};

export interface RecipeLinkAuditReport {
  generatedAt: Date;
  totals: {
    items: number;
    linked: number;
    unlinked: number;
    broken: number;
    coveragePct: number;
  };
  byMenu: Array<{
    name: string;
    total: number;
    linked: number;
    unlinked: number;
    broken: number;
    byCategory: Array<{
      category: string;
      total: number;
      linked: number;
      unlinked: number;
      broken: number;
    }>;
  }>;
  unlinkedItems: ItemRef[];
  brokenItems: ItemRef[];
}

export async function runRecipeLinkAudit(): Promise<RecipeLinkAuditReport> {
  const allMenus = await db.select().from(menus);
  const allRecipes = await db.select().from(recipes);
  const recipeIds = new Set(allRecipes.map((r) => r.id));

  const report: RecipeLinkAuditReport = {
    generatedAt: new Date(),
    totals: { items: 0, linked: 0, unlinked: 0, broken: 0, coveragePct: 0 },
    byMenu: [],
    unlinkedItems: [],
    brokenItems: [],
  };

  for (const menu of allMenus) {
    const cats = (menu.categoryItems as Record<string, any[]>) || {};
    const menuEntry = {
      name: menu.name,
      total: 0,
      linked: 0,
      unlinked: 0,
      broken: 0,
      byCategory: [] as RecipeLinkAuditReport["byMenu"][number]["byCategory"],
    };

    for (const [category, items] of Object.entries(cats)) {
      const catEntry = { category, total: 0, linked: 0, unlinked: 0, broken: 0 };
      for (const item of items || []) {
        report.totals.items++;
        menuEntry.total++;
        catEntry.total++;

        if (item.recipeId) {
          if (recipeIds.has(item.recipeId)) {
            report.totals.linked++;
            menuEntry.linked++;
            catEntry.linked++;
          } else {
            report.totals.broken++;
            menuEntry.broken++;
            catEntry.broken++;
            report.brokenItems.push({
              menu: menu.name,
              category,
              name: item.name,
              itemId: item.id,
              recipeId: item.recipeId,
            });
          }
        } else {
          report.totals.unlinked++;
          menuEntry.unlinked++;
          catEntry.unlinked++;
          report.unlinkedItems.push({
            menu: menu.name,
            category,
            name: item.name,
            itemId: item.id,
          });
        }
      }
      if (catEntry.total > 0) menuEntry.byCategory.push(catEntry);
    }

    if (menuEntry.total > 0) report.byMenu.push(menuEntry);
  }

  report.totals.coveragePct = report.totals.items
    ? Math.round((report.totals.linked / report.totals.items) * 100)
    : 100;

  return report;
}

function pct(n: number, d: number): string {
  if (!d) return "100%";
  return `${Math.round((n / d) * 100)}%`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function groupByMenuCategory(items: ItemRef[]): Map<string, Map<string, ItemRef[]>> {
  const map = new Map<string, Map<string, ItemRef[]>>();
  for (const it of items) {
    if (!map.has(it.menu)) map.set(it.menu, new Map());
    const cats = map.get(it.menu)!;
    if (!cats.has(it.category)) cats.set(it.category, []);
    cats.get(it.category)!.push(it);
  }
  return map;
}

export function renderRecipeLinkAuditText(report: RecipeLinkAuditReport): string {
  const lines: string[] = [];
  const dateStr = report.generatedAt.toISOString().slice(0, 10);
  lines.push(`Menu → Recipe link audit — generated ${dateStr}`);
  lines.push("");
  lines.push(
    `Overall: ${report.totals.linked} / ${report.totals.items} items linked (${report.totals.coveragePct}% coverage)`,
  );
  lines.push(`  Unlinked: ${report.totals.unlinked}`);
  lines.push(`  Broken:   ${report.totals.broken}`);
  lines.push("");
  lines.push("Per menu:");
  for (const m of report.byMenu) {
    lines.push(
      `  ${m.name}: ${m.linked}/${m.total} (${pct(m.linked, m.total)}) — unlinked ${m.unlinked}, broken ${m.broken}`,
    );
    for (const c of m.byCategory) {
      lines.push(
        `    ${c.category}: ${c.linked}/${c.total} (${pct(c.linked, c.total)})`,
      );
    }
  }

  if (report.brokenItems.length) {
    lines.push("");
    lines.push(`=== Broken links (${report.brokenItems.length}) ===`);
    const grouped = groupByMenuCategory(report.brokenItems);
    for (const [menu, cats] of grouped) {
      lines.push(`[${menu}]`);
      for (const [cat, items] of cats) {
        for (const it of items) {
          lines.push(`  ${cat} → ${it.name}  (recipeId=${it.recipeId}, itemId=${it.itemId ?? "?"})`);
        }
      }
    }
  }

  if (report.unlinkedItems.length) {
    lines.push("");
    lines.push(`=== Unlinked items (${report.unlinkedItems.length}) ===`);
    const grouped = groupByMenuCategory(report.unlinkedItems);
    for (const [menu, cats] of grouped) {
      lines.push(`[${menu}]`);
      for (const [cat, items] of cats) {
        lines.push(`  ${cat}:`);
        for (const it of items) {
          lines.push(`    - ${it.name}${it.itemId ? `  (${it.itemId})` : ""}`);
        }
      }
    }
  }

  lines.push("");
  lines.push("Next steps:");
  lines.push("  1. For broken links: confirm correct existing recipe or acknowledge the recipe no longer exists.");
  lines.push("  2. For menus with 0% coverage (Italy, Vegan): recipes need to be built before linking.");
  lines.push("  3. For partial-coverage menus: likely name-match work — recipe exists under a slightly different name.");
  return lines.join("\n");
}

export function renderRecipeLinkAuditHtml(report: RecipeLinkAuditReport): string {
  const dateStr = report.generatedAt.toISOString().slice(0, 10);

  const menuRows = report.byMenu
    .map((m) => {
      const rowBg = m.linked === 0 ? "background:#fff5f5;" : "";
      return `<tr style="${rowBg}"><td style="border:1px solid #ddd;padding:6px;">${escapeHtml(m.name)}</td><td align="right" style="border:1px solid #ddd;padding:6px;">${m.linked} / ${m.total}</td><td align="right" style="border:1px solid #ddd;padding:6px;">${pct(m.linked, m.total)}</td><td align="right" style="border:1px solid #ddd;padding:6px;">${m.unlinked}</td><td align="right" style="border:1px solid #ddd;padding:6px;">${m.broken}</td></tr>`;
    })
    .join("");

  const perCategoryBlocks = report.byMenu
    .map((m) => {
      const cats = m.byCategory
        .map(
          (c) =>
            `<li>${escapeHtml(c.category)}: ${c.linked}/${c.total} (${pct(c.linked, c.total)})${c.broken ? ` · <span style="color:#b00;">${c.broken} broken</span>` : ""}</li>`,
        )
        .join("");
      return `<p style="margin:6px 0 2px 0;"><strong>${escapeHtml(m.name)}</strong></p><ul style="margin:0 0 8px 18px;padding:0;">${cats}</ul>`;
    })
    .join("");

  const brokenHtml = (() => {
    if (!report.brokenItems.length) return "<p>None 🎉</p>";
    const grouped = groupByMenuCategory(report.brokenItems);
    const blocks: string[] = [];
    for (const [menu, cats] of grouped) {
      const items: string[] = [];
      for (const [cat, list] of cats) {
        for (const it of list) {
          items.push(
            `<li>${escapeHtml(cat)} → <strong>${escapeHtml(it.name)}</strong> (recipeId ${it.recipeId}${it.itemId ? `, itemId <code>${escapeHtml(it.itemId)}</code>` : ""})</li>`,
          );
        }
      }
      blocks.push(
        `<p style="margin:6px 0 2px 0;"><strong>${escapeHtml(menu)}</strong></p><ul style="margin:0 0 8px 18px;padding:0;">${items.join("")}</ul>`,
      );
    }
    return blocks.join("");
  })();

  const unlinkedHtml = (() => {
    if (!report.unlinkedItems.length) return "<p>None 🎉</p>";
    const grouped = groupByMenuCategory(report.unlinkedItems);
    const blocks: string[] = [];
    for (const [menu, cats] of grouped) {
      const catBlocks: string[] = [];
      for (const [cat, list] of cats) {
        const items = list
          .map(
            (it) =>
              `<li>${escapeHtml(it.name)}${it.itemId ? ` <span style="color:#888;">(${escapeHtml(it.itemId)})</span>` : ""}</li>`,
          )
          .join("");
        catBlocks.push(
          `<p style="margin:4px 0 2px 12px;"><em>${escapeHtml(cat)}</em> — ${list.length}</p><ul style="margin:0 0 6px 32px;padding:0;">${items}</ul>`,
        );
      }
      blocks.push(
        `<p style="margin:8px 0 2px 0;"><strong>${escapeHtml(menu)}</strong> (${cats.size} categor${cats.size === 1 ? "y" : "ies"})</p>${catBlocks.join("")}`,
      );
    }
    return blocks.join("");
  })();

  return `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #222; line-height: 1.5; max-width: 720px;">
<p>Menu → Recipe link audit — ${dateStr}</p>

<p><strong>Overall:</strong> ${report.totals.linked} / ${report.totals.items} items linked (${report.totals.coveragePct}% coverage) · ${report.totals.unlinked} unlinked · ${report.totals.broken} broken</p>

<h3 style="margin-top:20px;">By menu</h3>
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
  <thead>
    <tr style="background:#f5f5f5;">
      <th align="left" style="border:1px solid #ddd;padding:6px;">Menu</th>
      <th align="right" style="border:1px solid #ddd;padding:6px;">Linked / Total</th>
      <th align="right" style="border:1px solid #ddd;padding:6px;">Coverage</th>
      <th align="right" style="border:1px solid #ddd;padding:6px;">Unlinked</th>
      <th align="right" style="border:1px solid #ddd;padding:6px;">Broken</th>
    </tr>
  </thead>
  <tbody>${menuRows}</tbody>
</table>

<h3 style="margin-top:20px;">By category</h3>
${perCategoryBlocks}

<h3 style="margin-top:20px;color:#b00;">Broken links (${report.brokenItems.length})</h3>
<p style="color:#555;font-size:13px;margin-top:0;">These items have a <code>recipeId</code> that no longer matches any recipe in the system — silently worse than unlinked, because anything reading the link will mis-resolve or fail.</p>
${brokenHtml}

<h3 style="margin-top:20px;">Unlinked items (${report.unlinkedItems.length})</h3>
<p style="color:#555;font-size:13px;margin-top:0;">These items have no <code>recipeId</code>. They can't feed into costing, ingredient aggregation, prep sheets, or the living-recipe flow until linked.</p>
${unlinkedHtml}

<h3 style="margin-top:20px;">Next steps</h3>
<ol>
  <li>For each broken link above: confirm whether the item should re-point at an existing recipe (and which one) or whether the recipe simply no longer exists.</li>
  <li>For menus at 0% coverage (Italy, Vegan): recipes need to be built from scratch before they can be linked.</li>
  <li>For partial-coverage menus (Greece, Taco condiments): most of these likely already have a recipe under a slightly different name — a name-match pass should close most of the gap.</li>
</ol>

<p style="color:#888;font-size:12px;margin-top:24px;">This report runs automatically every 8 hours while any items remain unlinked or broken.</p>
</body></html>`;
}

export async function runAndEmailRecipeLinkAudit(
  recipient: string,
): Promise<{ sent: boolean; totals: RecipeLinkAuditReport["totals"] }> {
  const report = await runRecipeLinkAudit();
  const unresolved = report.totals.unlinked + report.totals.broken;

  // If everything is clean, don't nag — just log and skip.
  if (unresolved === 0) {
    console.log(
      `[recipeLinkAudit] coverage 100% — ${report.totals.items} items all linked, skipping email`,
    );
    return { sent: false, totals: report.totals };
  }

  const subject = `Menu → Recipe link audit: ${report.totals.unlinked} unlinked, ${report.totals.broken} broken (${report.totals.coveragePct}% coverage)`;
  const text = renderRecipeLinkAuditText(report);
  const html = renderRecipeLinkAuditHtml(report);

  const result = await sendEmail({
    to: recipient,
    subject,
    html,
    text,
    templateKey: "internal_recipe_link_audit",
  });

  if (result.sent) {
    console.log(
      `[recipeLinkAudit] report sent to ${recipient} — ${report.totals.unlinked} unlinked, ${report.totals.broken} broken`,
    );
  } else if (result.error) {
    console.error(`[recipeLinkAudit] send failed: ${result.error}`);
  }

  return { sent: result.sent, totals: report.totals };
}
